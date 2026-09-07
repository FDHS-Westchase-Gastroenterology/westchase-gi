import { randomUUID } from "node:crypto";

import { expect, test } from "@playwright/test";
import { z } from "zod";

import { serviceDb } from "../harness/env";
import { createHandoffFixture, readHandoffRequest } from "../harness/handoff";
import { schedulingFixtureDate } from "../harness/scheduling";

test("request booking saves both records once and rejects conflicts and stale request versions without a partial save", async () => {
  const db = serviceDb();
  const fixture = await createHandoffFixture(db, "handoff-book");
  try {
    const input = fixture.booking();
    const booked = await fixture.save(input);
    if (!booked.ok) throw new Error("Request booking failed");
    expect(booked.request).toMatchObject({ id: fixture.requestId, state: "booked", version: 2 });
    expect(await fixture.save(input)).toEqual(booked);
    expect(
      await fixture.save({
        ...input,
        command: { ...input.command, start: { date: schedulingFixtureDate(), time: "11:00" } },
      }),
    ).toEqual({ ok: false, code: "idempotency_conflict" });
    const request = await readHandoffRequest(db, fixture.requestId);
    expect(request).toMatchObject({ status: "booked", version: 2, follow_up_at: null });
    expect(request.appointment_at).toBe(booked.request?.appointmentAt);
    const transitions = await db
      .from("request_transitions")
      .select("command")
      .eq("request_id", fixture.requestId);
    expect(transitions.error).toBeNull();
    expect(transitions.data).toEqual([{ command: "confirm_booking_handoff" }]);

    const otherRequest = await fixture.addRequest(1);
    const conflict = {
      ...input,
      idempotencyKey: randomUUID(),
      command: {
        ...input.command,
        patientId: fixture.patientIds[1],
        sourceRequestId: otherRequest,
      },
    };
    expect(await fixture.save(conflict)).toEqual({ ok: false, code: "provider_conflict" });
    expect(await readHandoffRequest(db, otherRequest)).toMatchObject({
      status: "new",
      version: 1,
      appointment_at: null,
    });
    const receipts = await db
      .from("request_command_receipts")
      .select("idempotency_key")
      .eq("request_id", otherRequest);
    expect(receipts.error).toBeNull();
    expect(receipts.data).toEqual([]);
    const edited = await db.from("requests").update({ version: 2 }).eq("id", otherRequest);
    expect(edited.error).toBeNull();
    expect(
      await fixture.save({
        ...conflict,
        idempotencyKey: randomUUID(),
        command: { ...conflict.command, start: { date: schedulingFixtureDate(), time: "12:00" } },
      }),
    ).toEqual({ ok: false, code: "request_stale_version", currentVersion: 2 });
    const appointments = await db
      .from("appointments")
      .select("id")
      .eq("created_by", fixture.staff.userId);
    expect(appointments.error).toBeNull();
    expect(appointments.data).toEqual([{ id: booked.id }]);
  } finally {
    await fixture.dispose();
  }
});

test("rescheduling, cancellation, and Undo coordinate request state while old request commands cannot split an active booking", async () => {
  const db = serviceDb();
  const fixture = await createHandoffFixture(db, "handoff-corrections");
  try {
    const booked = await fixture.save(fixture.booking());
    if (!booked.ok) throw new Error("Request booking failed");
    const moved = await fixture.save({
      action: "command",
      idempotencyKey: randomUUID(),
      command: {
        kind: "reschedule",
        id: booked.id,
        expectedVersion: 1,
        requestVersion: 2,
        providerId: fixture.providerIds[0],
        locationId: fixture.locationIds[0],
        start: { date: schedulingFixtureDate(), time: "11:00" },
      },
    });
    expect(moved).toMatchObject({ ok: true, version: 2, request: { state: "booked", version: 3 } });
    if (!moved.ok) throw new Error("Rescheduling failed");
    expect((await readHandoffRequest(db, fixture.requestId)).appointment_at).toBe(
      moved.request?.appointmentAt,
    );
    expect(moved.request?.appointmentAt).not.toBe(booked.request?.appointmentAt);
    expect(
      await fixture.save({
        action: "command",
        idempotencyKey: randomUUID(),
        command: { kind: "undo", id: booked.id, expectedVersion: 2, requestVersion: 3 },
      }),
    ).toMatchObject({
      ok: true,
      version: 3,
      request: { version: 4, appointmentAt: booked.request?.appointmentAt },
    });

    const cancel = {
      action: "command",
      idempotencyKey: randomUUID(),
      command: {
        kind: "cancel",
        id: booked.id,
        expectedVersion: 3,
        requestVersion: 4,
        reason: "TEST patient requested cancellation",
        callAgainOn: schedulingFixtureDate(1),
      },
    } as const;
    const cancelled = await fixture.save(cancel);
    expect(cancelled).toMatchObject({
      ok: true,
      version: 4,
      request: { state: "contacted", version: 5, appointmentAt: null },
    });
    expect(await fixture.save(cancel)).toEqual(cancelled);
    const read = await db.rpc("portal_read_appointment", {
      p_actor_id: fixture.staff.userId,
      p_id: booked.id,
    });
    expect(read.error).toBeNull();
    expect(read.data).toMatchObject({
      ok: true,
      appointment: { request_workflow_managed: true },
      history: {
        items: expect.arrayContaining([
          expect.objectContaining({
            version: 4,
            request_id: fixture.requestId,
            request_after_version: 5,
            request_before: expect.objectContaining({ state: "booked" }),
          }),
        ]),
      },
    });
    const transition = await db
      .from("request_transitions")
      .select("id")
      .eq("request_id", fixture.requestId)
      .eq("resulting_version", 5)
      .single();
    expect(transition.error).toBeNull();
    const transitionId = z.object({ id: z.uuid() }).parse(transition.data).id;
    const separateUndo = await db.rpc("portal_execute_request_command", {
      p_actor_email: fixture.staff.email,
      p_request_id: fixture.requestId,
      p_expected_version: 5,
      p_idempotency_key: randomUUID(),
      p_fingerprint: "d".repeat(64),
      p_decision: { command: "undo_latest_transition", occurredAt: new Date().toISOString() },
      p_transition_id: transitionId,
    });
    expect(separateUndo.error).toBeNull();
    expect(separateUndo.data).toEqual({ ok: false, code: "illegal_transition" });
    expect(
      await fixture.save({
        action: "command",
        idempotencyKey: randomUUID(),
        command: { kind: "undo", id: booked.id, expectedVersion: 4, requestVersion: 5 },
      }),
    ).toMatchObject({ ok: true, version: 5, request: { state: "booked", version: 6 } });

    const split = await db
      .from("requests")
      .update({ appointment_at: new Date(Date.now() + 20 * 86_400_000).toISOString() })
      .eq("id", fixture.requestId);
    expect(split.error?.code).toBe("23514");
    expect((await readHandoffRequest(db, fixture.requestId)).appointment_at).toBe(
      booked.request?.appointmentAt,
    );
    const directReopen = await db.rpc("portal_execute_request_command", {
      p_actor_email: fixture.staff.email,
      p_request_id: fixture.requestId,
      p_expected_version: 6,
      p_idempotency_key: randomUUID(),
      p_fingerprint: "e".repeat(64),
      p_decision: { command: "reopen_request", occurredAt: new Date().toISOString() },
    });
    expect(directReopen.error).toBeNull();
    expect(directReopen.data).toEqual({ ok: false, code: "illegal_transition" });
  } finally {
    await fixture.dispose();
  }
});

test("a newer request edit prevents a coupled Undo and intake cleanup preserves the appointment without recreating the source", async () => {
  const db = serviceDb();
  const fixture = await createHandoffFixture(db, "handoff-history");
  try {
    const booked = await fixture.save(fixture.booking());
    if (!booked.ok) throw new Error("Request booking failed");
    expect(
      (await db.from("requests").update({ version: 3 }).eq("id", fixture.requestId)).error,
    ).toBeNull();
    expect(
      await fixture.save({
        action: "command",
        idempotencyKey: randomUUID(),
        command: { kind: "undo", id: booked.id, expectedVersion: 1, requestVersion: 3 },
      }),
    ).toEqual({ ok: false, code: "request_undo_unavailable" });
    const read = await db.rpc("portal_read_appointment", {
      p_actor_id: fixture.staff.userId,
      p_id: booked.id,
    });
    expect(read.error).toBeNull();
    expect(read.data).toMatchObject({
      ok: true,
      undo: null,
      request: { version: 3 },
    });
    expect((await db.from("requests").delete().eq("id", fixture.requestId)).error).toBeNull();
    const undone = await fixture.save({
      action: "command",
      idempotencyKey: randomUUID(),
      command: { kind: "undo", id: booked.id, expectedVersion: 1 },
    });
    expect(undone).toMatchObject({ ok: true, version: 2 });
    const retained = await db
      .from("appointments")
      .select("patient_id,source_request_id,status")
      .eq("id", booked.id)
      .single();
    expect(retained.error).toBeNull();
    expect(retained.data).toEqual({
      patient_id: fixture.patientIds[0],
      source_request_id: null,
      status: "cancelled",
    });
    const history = await db
      .from("scheduling_changes")
      .select("request_id,request_before")
      .eq("appointment_id", booked.id);
    expect(history.error).toBeNull();
    expect(JSON.stringify(history.data)).not.toContain("TEST handoff-history patient");
    expect(history.data?.every((row) => row.request_id === null)).toBe(true);
  } finally {
    await fixture.dispose();
  }
});
