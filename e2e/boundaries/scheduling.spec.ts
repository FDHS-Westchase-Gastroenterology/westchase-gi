import { randomUUID } from "node:crypto";

import { expect, test } from "@playwright/test";
import { z } from "zod";

import { appointmentAvailabilityOutcomeSchema } from "../../src/lib/portal/scheduling/read-contracts";
import { resolveAppointmentStart } from "../../src/lib/portal/scheduling/time";
import { expectDenied } from "../harness/assert";
import { publishableDb, serviceDb } from "../harness/env";
import { savePatient } from "../harness/patients";
import {
  createSchedulingFixture,
  saveScheduling,
  schedulingFixtureDate,
} from "../harness/scheduling";
import { insertRequest } from "./support";

const schedulingPageSchema = z.object({
  ok: z.literal(true),
  total: z.number(),
  items: z.array(z.object({ id: z.uuid() })),
  next: z.object({ startsAt: z.string(), id: z.uuid() }).nullable(),
});

test("concurrent appointments reject provider and patient overlaps across locations and save retries once", async () => {
  const db = serviceDb();
  const fixture = await createSchedulingFixture(db, "schedule-race");
  try {
    const firstInput = fixture.booking();
    const attempts = await Promise.all([fixture.save(firstInput), fixture.save(firstInput)]);
    expect(attempts[0]).toEqual(attempts[1]);
    const first = attempts[0];
    if (!first.ok) throw new Error("Initial booking failed");
    const conflicts = await Promise.all([
      fixture.save(fixture.booking("10:00", 1, 0, 1)),
      fixture.save(fixture.booking("10:00", 0, 1, 1)),
    ]);
    expect(conflicts).toEqual([
      { ok: false, code: "provider_conflict" },
      { ok: false, code: "patient_conflict" },
    ]);
    expect(await fixture.save(fixture.booking("10:30", 1))).toEqual({
      ok: false,
      code: "provider_conflict",
    });
    expect(await fixture.save(fixture.booking("10:40", 1))).toMatchObject({ ok: true });
    const race = await Promise.all([
      fixture.save(fixture.booking("12:00", 0)),
      fixture.save(fixture.booking("12:00", 1)),
    ]);
    expect(race.filter((result) => result.ok)).toHaveLength(1);
    expect(race.find((result) => !result.ok)).toEqual({ ok: false, code: "provider_conflict" });
    const rows = await db.from("appointments").select("id").eq("created_by", fixture.staff.userId);
    expect(rows.error).toBeNull();
    expect(rows.data).toHaveLength(3);
    const receipts = await db
      .from("scheduling_command_receipts")
      .select("idempotency_key")
      .eq("actor_id", fixture.staff.userId);
    expect(receipts.error).toBeNull();
    expect(receipts.data).toHaveLength(8);
    const reassigned = await db
      .from("appointments")
      .update({ patient_id: fixture.patientIds[1] })
      .eq("id", first.id);
    expect(reassigned.error?.code).toBe("23514");
  } finally {
    await fixture.dispose();
  }
});

test("rescheduling is atomic and Undo rechecks capacity while preserving one patient and full history", async () => {
  const db = serviceDb();
  const fixture = await createSchedulingFixture(db, "schedule-undo");
  try {
    const created = await fixture.save(fixture.booking());
    const other = await fixture.save(fixture.booking("11:00", 1));
    if (!created.ok || !other.ok) throw new Error("Booking setup failed");
    const move = {
      action: "command",
      idempotencyKey: randomUUID(),
      command: {
        kind: "reschedule",
        id: created.id,
        expectedVersion: 1,
        providerId: fixture.providerIds[0],
        locationId: fixture.locationIds[1],
        start: { date: schedulingFixtureDate(), time: "11:00" },
      },
    } as const;
    expect(await fixture.save(move)).toEqual({ ok: false, code: "provider_conflict" });
    const unchanged = await db
      .from("appointments")
      .select("version,location_id,patient_id")
      .eq("id", created.id)
      .single();
    expect(unchanged.data).toEqual({
      version: 1,
      location_id: fixture.locationIds[0],
      patient_id: fixture.patientIds[0],
    });
    expect(
      await fixture.save({
        ...move,
        command: { ...move.command, start: { ...move.command.start, time: "13:00" } },
      }),
    ).toMatchObject({ ok: true, version: 2 });
    const occupying = await fixture.save(fixture.booking("10:00", 1));
    if (!occupying.ok) throw new Error("Replacement booking failed");
    const undo = {
      action: "command",
      idempotencyKey: randomUUID(),
      command: { kind: "undo", id: created.id, expectedVersion: 2 },
    } as const;
    expect(await fixture.save(undo)).toEqual({ ok: false, code: "provider_conflict" });
    expect(
      await fixture.save({
        action: "command",
        idempotencyKey: randomUUID(),
        command: {
          kind: "cancel",
          id: occupying.id,
          expectedVersion: 1,
          reason: "TEST cancelled replacement",
        },
      }),
    ).toMatchObject({ ok: true, version: 2 });
    expect(await fixture.save(undo)).toMatchObject({ ok: true, version: 3 });
    expect(
      await fixture.save({
        ...undo,
        idempotencyKey: randomUUID(),
        command: { ...undo.command, expectedVersion: 3 },
      }),
    ).toEqual({ ok: false, code: "undo_unavailable" });
    const read = await db.rpc("portal_read_appointment", {
      p_actor_id: fixture.staff.userId,
      p_id: created.id,
    });
    expect(read.error).toBeNull();
    expect(read.data).toMatchObject({
      ok: true,
      appointment: {
        patient_id: fixture.patientIds[0],
        location_id: fixture.locationIds[0],
        version: 3,
      },
      history: { total: 3 },
      undo: null,
    });
    expect(
      await fixture.save({
        action: "command",
        idempotencyKey: randomUUID(),
        command: {
          kind: "cancel",
          id: created.id,
          expectedVersion: 1,
          reason: "TEST stale cancellation",
        },
      }),
    ).toEqual({ ok: false, code: "stale_version", currentVersion: 3 });
  } finally {
    await fixture.dispose();
  }
});

test("schedule configuration protects existing bookings, blocks closed time, and snapshots duration", async () => {
  const db = serviceDb();
  const fixture = await createSchedulingFixture(db, "schedule-hours");
  try {
    expect(await fixture.save(fixture.booking("08:00"))).toEqual({
      ok: false,
      code: "time_unavailable",
    });
    const created = await fixture.save(fixture.booking());
    if (!created.ok) throw new Error("Initial booking failed");
    const availability = await db.rpc("portal_available_appointment_slots", {
      p_actor_id: fixture.staff.userId,
      p_provider_id: fixture.providerIds[0],
      p_location_id: fixture.locationIds[0],
      p_date: schedulingFixtureDate(),
      p_appointment_type_id: fixture.typeId,
      p_patient_id: fixture.patientIds[0],
      p_interval_minutes: 5,
    });
    expect(availability.error).toBeNull();
    const choices = appointmentAvailabilityOutcomeSchema.parse(availability.data);
    if (!choices.ok) throw new Error("Availability read failed");
    expect(choices.patientChecked).toBe(true);
    expect(choices.slots.some(({ time }) => time === "10:00" || time === "10:30")).toBe(false);
    expect(choices.slots.some(({ time }) => time === "10:40")).toBe(true);
    expect(
      await fixture.save({
        action: "configure",
        idempotencyKey: randomUUID(),
        command: {
          kind: "save_provider",
          id: fixture.providerIds[0],
          expectedVersion: 1,
          name: "TEST Closed Provider",
          hours: [],
          exceptions: [],
        },
      }),
    ).toEqual({ ok: false, code: "schedule_in_use" });
    expect(
      await fixture.save({
        action: "configure",
        idempotencyKey: randomUUID(),
        command: {
          kind: "save_location",
          id: fixture.locationIds[0],
          expectedVersion: 1,
          name: "TEST Closed Location",
          active: false,
        },
      }),
    ).toEqual({ ok: false, code: "schedule_in_use" });
    const exceptionStart = resolveAppointmentStart({
      date: schedulingFixtureDate(),
      time: "13:00",
    });
    const exceptionEnd = resolveAppointmentStart({ date: schedulingFixtureDate(), time: "14:00" });
    if (exceptionStart === null || exceptionEnd === null)
      throw new Error("Invalid fixture exception");
    expect(
      await fixture.save({
        action: "configure",
        idempotencyKey: randomUUID(),
        command: {
          kind: "save_provider",
          id: fixture.providerIds[0],
          expectedVersion: 1,
          name: "TEST Limited Provider",
          hours: fixture.hours,
          exceptions: [
            {
              kind: "unavailable",
              locationId: null,
              startsAt: exceptionStart,
              endsAt: exceptionEnd,
            },
          ],
        },
      }),
    ).toMatchObject({ ok: true, version: 2 });
    expect(await fixture.save(fixture.booking("13:15", 1, 0, 1))).toEqual({
      ok: false,
      code: "time_unavailable",
    });
    expect(
      await fixture.save({
        action: "configure",
        idempotencyKey: randomUUID(),
        command: {
          kind: "save_appointment_type",
          id: fixture.typeId,
          expectedVersion: 1,
          name: "TEST Longer Visit",
          durationMinutes: 60,
          bufferBeforeMinutes: 10,
          bufferAfterMinutes: 10,
        },
      }),
    ).toMatchObject({ ok: true, version: 2 });
    expect(await fixture.save(fixture.booking("15:00", 1))).toEqual({
      ok: false,
      code: "type_changed",
      currentVersion: 2,
    });
    const stored = await db
      .from("appointments")
      .select("duration_minutes,buffer_before_minutes,buffer_after_minutes")
      .eq("id", created.id)
      .single();
    expect(stored.data).toEqual({
      duration_minutes: 30,
      buffer_before_minutes: 5,
      buffer_after_minutes: 5,
    });
    expect(
      await fixture.save({
        action: "command",
        idempotencyKey: randomUUID(),
        command: {
          kind: "reschedule",
          id: created.id,
          expectedVersion: 1,
          providerId: fixture.providerIds[0],
          locationId: fixture.locationIds[0],
          start: { date: schedulingFixtureDate(), time: "15:00" },
        },
      }),
    ).toMatchObject({ ok: true, version: 2 });
    const moved = await db
      .from("appointments")
      .select("duration_minutes")
      .eq("id", created.id)
      .single();
    expect(moved.data).toEqual({ duration_minutes: 30 });
  } finally {
    await fixture.dispose();
  }
});

test("scheduling authorizes live staff, restricts configuration, and preserves appointments after intake removal", async () => {
  const db = serviceDb();
  const browser = publishableDb();
  const fixture = await createSchedulingFixture(db, "schedule-access");
  const requestId = randomUUID();
  try {
    for (const table of [
      "appointments",
      "scheduling_providers",
      "scheduling_locations",
      "appointment_types",
      "provider_hours",
      "provider_time_exceptions",
      "scheduling_changes",
      "scheduling_command_receipts",
    ])
      expectDenied(await browser.from(table).select("*"));
    const signedIn = await browser.auth.signInWithPassword(fixture.staff);
    expect(signedIn.error).toBeNull();
    expectDenied(
      await browser.rpc("portal_list_appointments", {
        p_actor_id: fixture.staff.userId,
        p_patient_id: fixture.patientIds[0],
      }),
    );
    expectDenied(await browser.from("appointments").select("*"));
    await insertRequest(db, { id: requestId, name: "TEST retained appointment source" });
    expect(
      await savePatient(db, fixture.staff.userId, {
        kind: "link_request",
        patientId: fixture.patientIds[0],
        expectedVersion: 1,
        requestId,
      }),
    ).toMatchObject({ ok: true });
    const booking = fixture.booking();
    const sourceBooking = {
      ...booking,
      command: { ...booking.command, sourceRequestId: requestId, requestVersion: 1 },
    };
    const created = await fixture.save(sourceBooking);
    if (!created.ok) throw new Error("Linked booking failed");
    expect(await fixture.save({ ...sourceBooking, idempotencyKey: randomUUID() })).toEqual({
      ok: false,
      code: "request_already_booked",
    });
    const removed = await db.from("requests").delete().eq("id", requestId);
    expect(removed.error).toBeNull();
    const retained = await db
      .from("appointments")
      .select("source_request_id,patient_id")
      .eq("id", created.id)
      .single();
    expect(retained.data).toEqual({ source_request_id: null, patient_id: fixture.patientIds[0] });
    const downgraded = await db
      .from("staff_profiles")
      .update({ role: "staff" })
      .eq("user_id", fixture.staff.userId);
    expect(downgraded.error).toBeNull();
    expect(
      await saveScheduling(db, fixture.staff.userId, {
        action: "configure",
        idempotencyKey: randomUUID(),
        command: { kind: "save_location", name: "TEST Forbidden" },
      }),
    ).toEqual({ ok: false, code: "forbidden" });
    expect(await fixture.save(fixture.booking("12:00"))).toMatchObject({ ok: true });
    const deactivated = await db
      .from("staff_profiles")
      .update({ active: false })
      .eq("user_id", fixture.staff.userId);
    expect(deactivated.error).toBeNull();
    expect(await fixture.save(sourceBooking)).toEqual({ ok: false, code: "unauthorized" });
    const read = await db.rpc("portal_read_appointment", {
      p_actor_id: fixture.staff.userId,
      p_id: created.id,
    });
    expect(read.data).toEqual({ ok: false, code: "unauthorized" });
  } finally {
    await browser.auth.signOut();
    await db.from("requests").delete().eq("id", requestId);
    await fixture.dispose();
  }
});

test("a booking racing an availability edit cannot create an appointment outside the winning schedule", async () => {
  const db = serviceDb();
  const fixture = await createSchedulingFixture(db, "schedule-config-race");
  try {
    const [booking, configuration] = await Promise.all([
      fixture.save(fixture.booking()),
      fixture.save({
        action: "configure",
        idempotencyKey: randomUUID(),
        command: {
          kind: "save_provider",
          id: fixture.providerIds[0],
          expectedVersion: 1,
          name: "TEST Closing Provider",
          hours: [],
          exceptions: [],
        },
      }),
    ]);
    expect(Number(booking.ok) + Number(configuration.ok)).toBe(1);
    if (booking.ok) expect(configuration).toEqual({ ok: false, code: "schedule_in_use" });
    else expect(booking).toEqual({ ok: false, code: "time_unavailable" });
    const appointments = await db
      .from("appointments")
      .select("id")
      .eq("provider_id", fixture.providerIds[0]);
    expect(appointments.error).toBeNull();
    expect(appointments.data).toHaveLength(booking.ok ? 1 : 0);
  } finally {
    await fixture.dispose();
  }
});

test("appointment outcomes follow their allowed path and calendar pagination never truncates matching records", async () => {
  const db = serviceDb();
  const fixture = await createSchedulingFixture(db, "schedule-outcomes");
  try {
    const created = await fixture.save(fixture.booking());
    if (!created.ok) throw new Error("Booking setup failed");
    for (const kind of ["check_in", "complete", "no_show"] as const) {
      expect(
        await fixture.save({
          action: "command",
          idempotencyKey: randomUUID(),
          command: { kind, id: created.id, expectedVersion: 1 },
        }),
      ).toEqual({ ok: false, code: "illegal_transition" });
    }
    // Establish a past fictional appointment without depending on the runner's time of day.
    const start = new Date(Math.floor((Date.now() - 86_400_000) / 60_000) * 60_000).toISOString();
    const end = new Date(Date.parse(start) + 30 * 60_000).toISOString();
    const patch = {
      starts_at: start,
      ends_at: end,
      reserved_from: new Date(Date.parse(start) - 5 * 60_000).toISOString(),
      reserved_until: new Date(Date.parse(end) + 5 * 60_000).toISOString(),
    };
    const moved = await db.from("appointments").update(patch).eq("id", created.id);
    expect(moved.error).toBeNull();
    expect(
      await fixture.save({
        action: "command",
        idempotencyKey: randomUUID(),
        command: { kind: "no_show", id: created.id, expectedVersion: 1 },
      }),
    ).toMatchObject({ ok: true, version: 2 });
    expect(
      await fixture.save({
        action: "command",
        idempotencyKey: randomUUID(),
        command: {
          kind: "cancel",
          id: created.id,
          expectedVersion: 2,
          reason: "TEST invalid after no show",
        },
      }),
    ).toEqual({ ok: false, code: "illegal_transition" });
    expect(
      await fixture.save({
        action: "command",
        idempotencyKey: randomUUID(),
        command: { kind: "undo", id: created.id, expectedVersion: 2 },
      }),
    ).toMatchObject({ ok: true, version: 3 });
    const today = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/New_York",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
    const todayStart = resolveAppointmentStart({ date: today, time: "12:00" });
    if (todayStart === null) throw new Error("Invalid fixture day");
    const sameDay = await db
      .from("appointments")
      .update({
        starts_at: todayStart,
        ends_at: new Date(Date.parse(todayStart) + 30 * 60_000).toISOString(),
        reserved_from: new Date(Date.parse(todayStart) - 5 * 60_000).toISOString(),
        reserved_until: new Date(Date.parse(todayStart) + 35 * 60_000).toISOString(),
      })
      .eq("id", created.id);
    expect(sameDay.error).toBeNull();
    expect(
      await fixture.save({
        action: "command",
        idempotencyKey: randomUUID(),
        command: { kind: "check_in", id: created.id, expectedVersion: 3 },
      }),
    ).toMatchObject({ ok: true, version: 4 });
    expect(
      await fixture.save({
        action: "command",
        idempotencyKey: randomUUID(),
        command: { kind: "complete", id: created.id, expectedVersion: 4 },
      }),
    ).toMatchObject({ ok: true, version: 5 });
    const fixtureRows = Array.from({ length: 123 }, () => ({
      id: randomUUID(),
      patient_id: fixture.patientIds[1],
      provider_id: fixture.providerIds[1],
      location_id: fixture.locationIds[0],
      appointment_type_id: fixture.typeId,
      ...patch,
      duration_minutes: 30,
      buffer_before_minutes: 5,
      buffer_after_minutes: 5,
      status: "cancelled",
      reason: "TEST paginated history",
      created_by: fixture.staff.userId,
      updated_by: fixture.staff.userId,
    }));
    const inserted = await db.from("appointments").insert(fixtureRows);
    expect(inserted.error).toBeNull();
    const seen: string[] = [];
    let after: { startsAt: string; id: string } | null = null;
    do {
      const result = await db.rpc("portal_list_appointments", {
        p_actor_id: fixture.staff.userId,
        p_patient_id: fixture.patientIds[1],
        p_limit: 50,
        p_after_start: after?.startsAt ?? null,
        p_after_id: after?.id ?? null,
      });
      expect(result.error).toBeNull();
      const page = schedulingPageSchema.parse(result.data);
      expect(page.total).toBe(123);
      expect(page.items.length).toBeLessThanOrEqual(50);
      seen.push(...page.items.map(({ id }) => id));
      after = page.next;
    } while (after !== null && seen.length <= fixtureRows.length);
    expect(after).toBeNull();
    expect(seen.toSorted()).toEqual(fixtureRows.map(({ id }) => id).toSorted());
    const overlap = await db.rpc("portal_list_appointments", {
      p_actor_id: fixture.staff.userId,
      p_from: new Date(Date.parse(start) + 60_000).toISOString(),
      p_to: end,
      p_patient_id: fixture.patientIds[1],
    });
    expect(overlap.data).toMatchObject({ ok: true, total: 123 });
  } finally {
    await fixture.dispose();
  }
});
