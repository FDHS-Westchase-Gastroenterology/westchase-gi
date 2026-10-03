import { randomUUID } from "node:crypto";

import { expect, test } from "@playwright/test";

import { appointmentCommandSchema } from "../../src/lib/portal/scheduling/contracts";
import { canPlaceOutcomeSchema } from "../../src/lib/portal/scheduling/grid-contracts";
import { resolveAppointmentStart } from "../../src/lib/portal/scheduling/time";
import { serviceDb } from "../harness/env";
import { createHandoffFixture, readHandoffRequest } from "../harness/handoff";
import {
  createSchedulingFixture,
  saveSettings,
  schedulingFixtureDate,
} from "../harness/scheduling";

/* The Day view's appointment actions (issue #354): where a dragged card may land, the move
   itself, and a cancel that says what becomes of the request. */

function at(date: string, time: string) {
  const instant = resolveAppointmentStart({ date, time });
  if (instant === null) throw new Error(`Invalid fixture time ${date} ${time}`);
  return instant;
}

function shift(date: string, days: number) {
  return new Date(Date.parse(`${date}T12:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
}

test("a request-linked cancel names one outcome for the request", () => {
  const base = {
    kind: "cancel",
    id: randomUUID(),
    expectedVersion: 1,
    reason: "Patient asked to cancel",
  } as const;
  for (const command of [
    // A request needs an outcome: a call-again date, or closed.
    { ...base, requestVersion: 2 },
    // Closed takes no date.
    { ...base, requestVersion: 2, requestOutcome: "close", callAgainOn: "2026-10-20" },
    // Call again needs one.
    { ...base, requestVersion: 2, requestOutcome: "call_again" },
    // No request, no outcome.
    { ...base, requestOutcome: "close" },
  ])
    expect(appointmentCommandSchema.safeParse(command).success).toBe(false);
  for (const command of [
    base,
    { ...base, requestVersion: 2, requestOutcome: "close" },
    { ...base, requestVersion: 2, requestOutcome: "call_again", callAgainOn: "2026-10-20" },
    // Commands sent before the outcome existed still mean call again.
    { ...base, requestVersion: 2, callAgainOn: "2026-10-20" },
  ])
    expect(appointmentCommandSchema.safeParse(command).success).toBe(true);
});

test("can_place answers each refusal a dropped card can meet, and a move lands across providers", async () => {
  const db = serviceDb();
  const fixture = await createSchedulingFixture(db, "day-place");
  try {
    const actor = fixture.staff.userId;
    const [chang, awad] = fixture.providerIds;
    const [tampa, lutz] = fixture.locationIds;
    const date = schedulingFixtureDate();
    const moving = await fixture.save(fixture.booking("10:00", 0, 0));
    const holding = await fixture.save(fixture.booking("11:00", 1, 1));
    if (!moving.ok || !holding.ok) throw new Error("Booking failed");
    const movingId = moving.id;

    async function canPlace(providerId: string, locationId: string, startsAt: string) {
      const result = await db.rpc("portal_can_place_appointment", {
        p_actor_id: actor,
        p_appointment_id: movingId,
        p_provider_id: providerId,
        p_location_id: locationId,
        p_starts_at: startsAt,
      });
      expect(result.error).toBeNull();
      return canPlaceOutcomeSchema.parse(result.data);
    }

    expect(await canPlace(awad, tampa, at(date, "15:00"))).toEqual({
      ok: true,
      placeable: true,
      startsAt: expect.any(String),
      endsAt: expect.any(String),
    });
    // A visit already there, buffers included: 11:30 meets the 11:00 visit's 5 minutes after.
    for (const time of ["11:00", "10:40", "11:30"])
      expect(await canPlace(awad, tampa, at(date, time))).toEqual({
        ok: true,
        placeable: false,
        refusal: "slot_booked",
        conflictId: holding.id,
      });
    expect(await canPlace(awad, tampa, at(date, "11:45"))).toMatchObject({ placeable: true });
    expect(await canPlace(awad, tampa, at(date, "18:00"))).toMatchObject({
      placeable: false,
      refusal: "outside_hours",
    });
    expect(await canPlace(awad, tampa, at(shift(date, -20), "10:00"))).toMatchObject({
      placeable: false,
      refusal: "in_past",
    });
    const closed = await saveSettings(db, actor, {
      kind: "add_location_closure",
      id: lutz,
      expectedVersion: 1,
      closedOn: shift(date, 1),
      note: "TEST holiday",
      dryRun: false,
    });
    expect(closed).toMatchObject({ ok: true });
    expect(await canPlace(awad, lutz, at(shift(date, 1), "10:00"))).toMatchObject({
      placeable: false,
      refusal: "closed_day",
    });
    // An answer about the card itself, not a refusal, for anything but a future scheduled visit.
    const outsider = await db.rpc("portal_can_place_appointment", {
      p_actor_id: randomUUID(),
      p_appointment_id: moving.id,
      p_provider_id: awad,
      p_location_id: tampa,
      p_starts_at: at(date, "15:00"),
    });
    expect(outsider.data).toEqual({ ok: false, code: "unauthorized" });

    // The drop: across providers, then Undo puts it back.
    const moved = await fixture.save({
      action: "command",
      idempotencyKey: randomUUID(),
      command: {
        kind: "reschedule",
        id: moving.id,
        expectedVersion: moving.version,
        providerId: awad,
        locationId: tampa,
        start: { date, time: "15:00" },
      },
    });
    expect(moved).toMatchObject({ ok: true, version: moving.version + 1 });
    const row = await db
      .from("appointments")
      .select("provider_id,starts_at")
      .eq("id", moving.id)
      .single();
    expect(row.error).toBeNull();
    expect(row.data?.provider_id).toBe(awad);
    expect(new Date(String(row.data?.starts_at)).toISOString()).toBe(
      new Date(at(date, "15:00")).toISOString(),
    );
    const undone = await fixture.save({
      action: "command",
      idempotencyKey: randomUUID(),
      command: { kind: "undo", id: moving.id, expectedVersion: moving.version + 1 },
    });
    expect(undone).toMatchObject({ ok: true, version: moving.version + 2 });
    const back = await db.from("appointments").select("provider_id").eq("id", moving.id).single();
    expect(back.data?.provider_id).toBe(chang);

    // A provider who doesn't see the type: refused while dragging, and on the drop.
    expect(
      await saveSettings(db, actor, {
        kind: "set_provider_types",
        id: awad,
        expectedVersion: 1,
        typeIds: [],
      }),
    ).toMatchObject({ ok: true });
    expect(await canPlace(awad, tampa, at(date, "15:00"))).toMatchObject({
      placeable: false,
      refusal: "type_not_offered",
    });
    expect(
      await fixture.save({
        action: "command",
        idempotencyKey: randomUUID(),
        command: {
          kind: "reschedule",
          id: moving.id,
          expectedVersion: moving.version + 2,
          providerId: awad,
          locationId: tampa,
          start: { date, time: "15:00" },
        },
      }),
    ).toMatchObject({ ok: false, code: "provider_not_eligible" });
  } finally {
    await fixture.dispose();
  }
});

test("cancelling a request's visit closes the request or sets it to call again, and Undo rebooks it", async () => {
  const db = serviceDb();
  const fixture = await createHandoffFixture(db, "day-cancel");
  try {
    const booked = await fixture.save(fixture.booking());
    if (!booked.ok || booked.request === undefined) throw new Error("Request booking failed");
    const bookedAt = booked.request.appointmentAt;

    const closed = await fixture.save({
      action: "command",
      idempotencyKey: randomUUID(),
      command: {
        kind: "cancel",
        id: booked.id,
        expectedVersion: 1,
        reason: "Patient asked to cancel",
        requestVersion: booked.request.version,
        requestOutcome: "close",
      },
    });
    expect(closed).toMatchObject({ ok: true, version: 2, request: { state: "closed" } });
    if (!closed.ok || closed.request === undefined) throw new Error("Cancel failed");
    expect(await readHandoffRequest(db, fixture.requestId)).toMatchObject({
      status: "closed",
      appointment_at: null,
    });
    const reopened = await fixture.save({
      action: "command",
      idempotencyKey: randomUUID(),
      command: {
        kind: "undo",
        id: booked.id,
        expectedVersion: 2,
        requestVersion: closed.request.version,
      },
    });
    expect(reopened).toMatchObject({
      ok: true,
      version: 3,
      request: { state: "booked", appointmentAt: bookedAt },
    });
    if (!reopened.ok || reopened.request === undefined) throw new Error("Undo failed");

    const callAgainOn = schedulingFixtureDate(1);
    const later = await fixture.save({
      action: "command",
      idempotencyKey: randomUUID(),
      command: {
        kind: "cancel",
        id: booked.id,
        expectedVersion: 3,
        reason: "Patient asked to cancel",
        requestVersion: reopened.request.version,
        requestOutcome: "call_again",
        callAgainOn,
      },
    });
    expect(later).toMatchObject({ ok: true, version: 4, request: { state: "contacted" } });
    if (!later.ok || later.request === undefined) throw new Error("Cancel failed");
    const waiting = await readHandoffRequest(db, fixture.requestId);
    expect(waiting).toMatchObject({ status: "contacted", appointment_at: null });
    expect(waiting.follow_up_at?.slice(0, 10)).toBe(callAgainOn);
    expect(
      await fixture.save({
        action: "command",
        idempotencyKey: randomUUID(),
        command: {
          kind: "undo",
          id: booked.id,
          expectedVersion: 4,
          requestVersion: later.request.version,
        },
      }),
    ).toMatchObject({
      ok: true,
      version: 5,
      request: { state: "booked", appointmentAt: bookedAt },
    });
  } finally {
    await fixture.dispose();
  }
});
