import { randomUUID } from "node:crypto";

import { expect, test } from "@playwright/test";
import { z } from "zod";

import { schedulingInputSchema } from "../../src/lib/portal/scheduling/contracts";
import { dayScheduleOutcomeSchema } from "../../src/lib/portal/scheduling/grid-contracts";
import { monthSummaryOutcomeSchema } from "../../src/lib/portal/scheduling/read-contracts";
import { resolveAppointmentStart } from "../../src/lib/portal/scheduling/time";
import { serviceDb } from "../harness/env";
import { createSchedulingFixture, schedulingFixtureDate } from "../harness/scheduling";

/** The RPC's raw day, typed only as far as the contract checks below reach into it. */
const rawDaySchema = z.looseObject({
  providers: z.array(
    z.looseObject({
      id: z.string(),
      working: z.array(z.looseObject({})),
      appointments: z.array(z.looseObject({})),
    }),
  ),
});

function at(date: string, time: string) {
  const instant = resolveAppointmentStart({ date, time });
  if (instant === null) throw new Error(`Invalid fixture time ${date} ${time}`);
  return instant;
}

function shift(date: string, days: number) {
  return new Date(Date.parse(`${date}T12:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
}

function weekdayOf(date: string) {
  return new Date(`${date}T12:00:00Z`).getUTCDay();
}

function iso(instant: string) {
  return new Date(instant).toISOString();
}

test("the day command takes one practice date and an optional appointment type", () => {
  // The service answers invalid_command for each of these, before any database call.
  for (const input of [
    { date: "2026-09-31" },
    { date: "1999-12-31" },
    { date: "2200-01-01" },
    { date: "2026-09-16", providerIds: [randomUUID()] },
    { date: "2026-09-16", appointmentTypeId: "x" },
  ])
    expect(schedulingInputSchema.safeParse({ action: "day_schedule", ...input }).success).toBe(
      false,
    );
  const typeId = randomUUID();
  expect(schedulingInputSchema.parse({ action: "day_schedule", date: "2026-09-16" })).toEqual({
    action: "day_schedule",
    date: "2026-09-16",
    appointmentTypeId: null,
  });
  expect(
    schedulingInputSchema.parse({
      action: "day_schedule",
      date: "2026-09-16",
      appointmentTypeId: typeId,
    }),
  ).toMatchObject({ appointmentTypeId: typeId });
});

test("the day read gives every working provider a column and names who is off", async () => {
  const db = serviceDb();
  const fixture = await createSchedulingFixture(db, "schedule-day");
  try {
    const save = fixture.save;
    const [first, second] = fixture.locationIds;
    const date = schedulingFixtureDate(14);
    const weekday = weekdayOf(date);
    // A 30-minute visit with 5-minute buffers reserves 40 minutes.
    // The hourly booking interval starts openings on the hour.
    // So 08:55-10:20 offers one opening (09:00) and 11:55-13:20 one more (12:00).
    // A 10:00 or 13:00 start would run past the close.
    const row = (locationId: string, day: number, openMinute: number, closeMinute: number) => ({
      locationId,
      weekday: day,
      openMinute,
      closeMinute,
      validFrom: "2026-01-01",
      validTo: null,
    });
    const providers: Record<string, string> = {};
    for (const [label, hours, exceptions] of [
      // Two offices in one day: the morning at the first, the afternoon at the second.
      ["Split", [row(first, weekday, 535, 620), row(second, weekday, 715, 800)], []],
      // Hours on another weekday only: off this date.
      ["Off", [row(first, (weekday + 1) % 7, 535, 800)], []],
      // Time off mid-day splits one stretch of hours in two.
      [
        "Gap",
        [row(first, weekday, 535, 800)],
        [
          {
            locationId: null,
            kind: "unavailable",
            startsAt: at(date, "10:20"),
            endsAt: at(date, "11:55"),
          },
        ],
      ],
      // No weekly hours; an available exception adds the afternoon at the second office.
      [
        "Extra",
        [],
        [
          {
            locationId: second,
            kind: "available",
            startsAt: at(date, "11:55"),
            endsAt: at(date, "13:20"),
          },
        ],
      ],
    ] as const) {
      const provider = await save({
        action: "configure",
        idempotencyKey: randomUUID(),
        command: { kind: "save_provider", name: `TEST schedule-day ${label}`, hours, exceptions },
      });
      if (!provider.ok) throw new Error(`Provider fixture ${label} failed`);
      providers[label] = provider.id;
    }
    const booked = await save({
      action: "command",
      idempotencyKey: randomUUID(),
      command: {
        kind: "book",
        patientId: fixture.patientIds[0],
        providerId: providers.Split,
        locationId: first,
        appointmentTypeId: fixture.typeId,
        expectedTypeVersion: 1,
        start: { date, time: "09:00" },
      },
    });
    if (!booked.ok) throw new Error("Booking fixture failed");

    async function raw(on: string, actor?: string, typeId: string = fixture.typeId) {
      const result = await db.rpc("portal_schedule_day", {
        p_actor_id: actor ?? fixture.staff.userId,
        p_date: on,
        p_appointment_type_id: typeId,
      });
      expect(result.error).toBeNull();
      const data: unknown = result.data;
      return data;
    }
    async function day(on: string, actor?: string, typeId: string = fixture.typeId) {
      return dayScheduleOutcomeSchema.parse(await raw(on, actor, typeId));
    }
    // The Preview database is shared, so only this test's providers are compared.
    const ours = new Set([...Object.values(providers), ...fixture.providerIds]);

    const read = await day(date);
    if (!read.ok) throw new Error(`Day read failed: ${read.code}`);
    expect(read).toMatchObject({
      date,
      timeZone: "America/New_York",
      referenceType: { id: fixture.typeId, durationMinutes: 30, version: 1 },
    });
    const columns = read.providers.filter((provider) => ours.has(provider.id));
    const byId = new Map(columns.map((provider) => [provider.id, provider]));
    /* Columns in the providers' Settings order, which starts as the order they were added; the
       fixture's own providers work every day. */
    expect(columns.map((provider) => provider.id)).toEqual([
      ...fixture.providerIds,
      providers.Split,
      providers.Gap,
      providers.Extra,
    ]);
    expect(byId.has(providers.Off)).toBe(false);
    expect(read.off.filter((provider) => ours.has(provider.id))).toEqual([
      { id: providers.Off, name: "TEST schedule-day Off" },
    ]);

    const split = byId.get(providers.Split);
    expect(
      split?.working.map((range) => [iso(range.from), iso(range.until), range.locationId]),
    ).toEqual([
      [at(date, "08:55"), at(date, "10:20"), first],
      [at(date, "11:55"), at(date, "13:20"), second],
    ]);
    expect(split?.working.map((range) => range.locationName)).toEqual([
      "TEST schedule-day First",
      "TEST schedule-day Second",
    ]);
    expect(split?.appointments).toEqual([
      expect.objectContaining({
        id: booked.id,
        version: booked.version,
        status: "scheduled",
        appointmentType: "TEST schedule-day Visit",
        patientName: "TEST schedule-day First",
        patientListName: "First",
      }),
    ]);
    expect(split?.open.map((slot) => [iso(slot.startsAt), slot.locationId])).toEqual([
      [at(date, "12:00"), second],
    ]);
    expect(split).toMatchObject({ openCount: 1, seen: null });

    const gap = byId.get(providers.Gap);
    expect(gap?.working.map((range) => [iso(range.from), iso(range.until)])).toEqual([
      [at(date, "08:55"), at(date, "10:20")],
      [at(date, "11:55"), at(date, "13:20")],
    ]);
    expect(gap?.open.map((slot) => iso(slot.startsAt))).toEqual(
      ["09:00", "12:00"].map((time) => at(date, time)),
    );

    const extra = byId.get(providers.Extra);
    expect(extra?.working.map((range) => range.locationId)).toEqual([second]);
    expect(extra?.open.map((slot) => iso(slot.startsAt))).toEqual(
      ["12:00"].map((time) => at(date, time)),
    );

    // Every column's open count is the month summary's for the same provider and date.
    const summary = await db.rpc("portal_schedule_month_summary", {
      p_actor_id: fixture.staff.userId,
      p_month: `${date.slice(0, 7)}-01`,
      p_location_id: null,
      p_appointment_type_id: fixture.typeId,
    });
    expect(summary.error).toBeNull();
    const month = monthSummaryOutcomeSchema.parse(summary.data);
    if (!month.ok) throw new Error(`Month summary failed: ${month.code}`);
    const monthDay = month.days.find((entry) => entry.date === date);
    if (monthDay === undefined || !("providers" in monthDay))
      throw new Error("The month summary has no open day for the date");
    const monthOpen = new Map(monthDay.providers.map((provider) => [provider.id, provider.open]));
    for (const column of columns) {
      expect(column.open).toHaveLength(column.openCount ?? -1);
      expect(monthOpen.get(column.id) ?? 0).toBe(column.openCount);
    }

    // A past date counts who was seen and shows every status but cancelled.
    const past = shift(date, -28);
    const history = [
      ["09:00", first, "checked_in"],
      ["09:45", first, "completed"],
      ["12:00", second, "no_show"],
      ["12:45", second, "cancelled"],
    ] as const;
    const inserted = await db.from("appointments").insert(
      history.map(([time, locationId, status]) => {
        const startsAt = at(past, time);
        const start = Date.parse(startsAt);
        const offset = (minutes: number) => new Date(start + minutes * 60_000).toISOString();
        return {
          patient_id: fixture.patientIds[1],
          provider_id: providers.Split,
          location_id: locationId,
          appointment_type_id: fixture.typeId,
          starts_at: startsAt,
          ends_at: offset(30),
          duration_minutes: 30,
          buffer_before_minutes: 5,
          buffer_after_minutes: 5,
          reserved_from: offset(-5),
          reserved_until: offset(35),
          status,
          created_by: fixture.staff.userId,
          updated_by: fixture.staff.userId,
        };
      }),
    );
    expect(inserted.error).toBeNull();
    const earlier = await day(past);
    if (!earlier.ok) throw new Error(`Past day failed: ${earlier.code}`);
    const pastSplit = earlier.providers.find((provider) => provider.id === providers.Split);
    expect(pastSplit?.appointments.map((visit) => visit.status)).toEqual([
      "checked_in",
      "completed",
      "no_show",
    ]);
    expect(pastSplit).toMatchObject({ seen: 2, openCount: null, open: [] });

    /* The service answers unavailable when the read breaks its contract: a cancelled visit,
       a visit without its version, or a working window without its office. */
    const rawPast = rawDaySchema.parse(await raw(past));
    const rawSplit = rawPast.providers.find((provider) => provider.id === providers.Split);
    if (rawSplit === undefined) throw new Error("The raw past read has no Split column");
    const [visit] = rawSplit.appointments;
    const [window] = rawSplit.working;
    const { version: _version, ...unversioned } = visit;
    const { locationName: _locationName, ...unnamed } = window;
    expect(dayScheduleOutcomeSchema.safeParse(rawPast).success).toBe(true);
    for (const broken of [
      { ...rawSplit, appointments: [{ ...visit, status: "cancelled" }] },
      { ...rawSplit, appointments: [unversioned] },
      { ...rawSplit, working: [unnamed] },
    ])
      expect(dayScheduleOutcomeSchema.safeParse({ ...rawPast, providers: [broken] }).success).toBe(
        false,
      );

    // A date before anyone's hours: no columns, and every active provider is off.
    const empty = await day("2000-01-03");
    if (!empty.ok) throw new Error(`Empty day failed: ${empty.code}`);
    expect(empty.providers.filter((provider) => ours.has(provider.id))).toEqual([]);
    expect(new Set(empty.off.filter((provider) => ours.has(provider.id)).map((p) => p.id))).toEqual(
      ours,
    );
    expect(empty.activeProviderCount).toBeGreaterThanOrEqual(ours.size);

    expect(await day("1999-12-31")).toEqual({ ok: false, code: "invalid_command" });
    expect(await day(date, undefined, randomUUID())).toEqual({
      ok: false,
      code: "type_unavailable",
    });
    expect(await day(date, randomUUID())).toEqual({ ok: false, code: "unauthorized" });
  } finally {
    await fixture.dispose();
  }
});
