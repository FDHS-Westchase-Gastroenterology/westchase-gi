import { randomUUID } from "node:crypto";

import { expect, test } from "@playwright/test";

import {
  rememberWeekProviderOutcomeSchema,
  weekProviderOutcomeSchema,
  weekScheduleOutcomeSchema,
} from "../../src/lib/portal/scheduling/grid-contracts";
import { monthSummaryOutcomeSchema } from "../../src/lib/portal/scheduling/read-contracts";
import { resolveAppointmentStart } from "../../src/lib/portal/scheduling/time";
import { publishableDb, serviceDb } from "../harness/env";
import { createSchedulingFixture, schedulingFixtureDate } from "../harness/scheduling";
import { createStaffFixture } from "../harness/session";

function at(date: string, time: string) {
  const instant = resolveAppointmentStart({ date, time });
  if (instant === null) throw new Error(`Invalid fixture time ${date} ${time}`);
  return instant;
}

function shift(date: string, days: number) {
  return new Date(Date.parse(`${date}T12:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
}

function sundayOf(date: string) {
  return shift(date, -new Date(`${date}T12:00:00Z`).getUTCDay());
}

// The first Sunday at least two weeks out whose Saturday falls in the next month.
function boundaryWeek() {
  let sunday = sundayOf(schedulingFixtureDate(14));
  if (sunday < schedulingFixtureDate(14)) sunday = shift(sunday, 7);
  while (sunday.slice(0, 7) === shift(sunday, 6).slice(0, 7)) sunday = shift(sunday, 7);
  return sunday;
}

test("the week read lays out one to three providers' days in lane order", async () => {
  const db = serviceDb();
  const fixture = await createSchedulingFixture(db, "schedule-week");
  try {
    const save = fixture.save;
    const location = await save({
      action: "configure",
      idempotencyKey: randomUUID(),
      command: { kind: "save_location", name: "TEST schedule-week Third" },
    });
    if (!location.ok) throw new Error("Location fixture failed");
    const locationId = location.id;
    const weekStart = boundaryWeek();
    const tuesday = shift(weekStart, 2);
    // A 30-minute visit with 5-minute buffers reserves 40 minutes.
    // The hourly booking interval holds the provider for the hour.
    // So 08:55-09:35 and 08:55-10:20 each offer one opening (09:00), 11:55-13:20 one (12:00).
    // A 10:00 start would run past 10:20.
    const row = (weekday: number, openMinute: number, closeMinute: number) => ({
      locationId,
      weekday,
      openMinute,
      closeMinute,
      validFrom: "2026-01-01",
      validTo: null,
    });
    const everyDay = Array.from({ length: 7 }, (_, weekday) => row(weekday, 535, 575));
    const providers: string[] = [];
    for (const [name, hours, exceptions] of [
      [
        "TEST schedule-week Lunch",
        Array.from({ length: 6 }, (_, weekday) => [
          row(weekday, 535, 620),
          row(weekday, 715, 800),
        ]).flat(),
        [],
      ],
      ["TEST schedule-week Single", everyDay, []],
      [
        "TEST schedule-week Away",
        everyDay,
        [
          {
            locationId: null,
            kind: "unavailable",
            startsAt: at(tuesday, "00:00"),
            endsAt: at(shift(tuesday, 1), "00:00"),
          },
        ],
      ],
    ] as const) {
      const provider = await save({
        action: "configure",
        idempotencyKey: randomUUID(),
        command: { kind: "save_provider", name, hours, exceptions },
      });
      if (!provider.ok) throw new Error("Provider fixture failed");
      providers.push(provider.id);
    }
    const [lunch, single, away] = providers;
    const book = async (date: string, time: string, providerId: string) =>
      save({
        action: "command",
        idempotencyKey: randomUUID(),
        command: {
          kind: "book",
          patientId: fixture.patientIds[0],
          providerId,
          locationId,
          appointmentTypeId: fixture.typeId,
          expectedTypeVersion: 1,
          start: { date, time },
        },
      });
    const monday = shift(weekStart, 1);
    const wednesday = shift(weekStart, 3);
    expect(await book(monday, "09:00", lunch)).toMatchObject({ ok: true });
    const released = await book(wednesday, "09:00", single);
    if (!released.ok) throw new Error("Release booking failed");
    expect(
      await save({
        action: "command",
        idempotencyKey: randomUUID(),
        command: {
          kind: "cancel",
          id: released.id,
          expectedVersion: released.version,
          reason: "TEST released",
        },
      }),
    ).toMatchObject({ ok: true });

    async function week(providerIds: readonly string[], start = weekStart, actor?: string) {
      const result = await db.rpc("portal_schedule_week", {
        p_actor_id: actor ?? fixture.staff.userId,
        p_week_start: start,
        p_provider_ids: providerIds,
        p_location_id: locationId,
        p_appointment_type_id: fixture.typeId,
      });
      expect(result.error).toBeNull();
      return weekScheduleOutcomeSchema.parse(result.data);
    }

    const one = await week([lunch]);
    if (!one.ok) throw new Error(`Week read failed: ${one.code}`);
    expect(one).toMatchObject({
      weekStart,
      timeZone: "America/New_York",
      referenceType: { id: fixture.typeId, durationMinutes: 30, version: 1 },
    });
    const [lunchWeek] = one.providers;
    expect(lunchWeek.days.map((day) => day.date)).toEqual(
      Array.from({ length: 7 }, (_, index) => shift(weekStart, index)),
    );
    const [sunday, mondayRow] = lunchWeek.days;
    // Two hour rows on one day are two working ranges: the lunch gap stays closed.
    expect(sunday.working.map((range) => [range.from, range.until].map(iso))).toEqual([
      [at(weekStart, "08:55"), at(weekStart, "10:20")],
      [at(weekStart, "11:55"), at(weekStart, "13:20")],
    ]);
    expect(sunday.open.map((slot) => iso(slot.startsAt))).toEqual(
      ["09:00", "12:00"].map((time) => at(weekStart, time)),
    );
    expect(sunday).toMatchObject({ openCount: 2, seen: null, appointments: [] });
    // The 09:00 booking takes the morning's one opening.
    expect(mondayRow.openCount).toBe(1);
    expect(mondayRow.appointments).toEqual([
      expect.objectContaining({
        startsAt: expect.any(String),
        status: "scheduled",
        appointmentType: "TEST schedule-week Visit",
        patientName: "TEST schedule-week First",
        patientListName: "First",
      }),
    ]);
    expect(iso(mondayRow.appointments[0].startsAt)).toBe(at(monday, "09:00"));
    // Saturday has no hours for this provider: an off day with nothing open.
    expect(lunchWeek.days[6]).toMatchObject({
      working: [],
      open: [],
      appointments: [],
      openCount: 0,
    });

    const three = await week([away, lunch, single]);
    if (!three.ok) throw new Error(`Compare read failed: ${three.code}`);
    expect(three.providers.map((provider) => provider.id)).toEqual([away, lunch, single]);
    const awayTuesday = three.providers[0].days[2];
    expect(awayTuesday).toMatchObject({ date: tuesday, working: [], open: [], openCount: 0 });
    // The cancelled visit is gone and its time is open again.
    const singleWednesday = three.providers[2].days[3];
    expect(singleWednesday).toMatchObject({ appointments: [], openCount: 1 });

    // Each day's open count across the lanes is the month summary's open count for that day.
    // The week crosses a month boundary, so both months are read.
    const months = new Map<string, Map<string, number | null>>();
    for (const month of new Set(three.providers[0].days.map((day) => day.date.slice(0, 7)))) {
      const result = await db.rpc("portal_schedule_month_summary", {
        p_actor_id: fixture.staff.userId,
        p_month: `${month}-01`,
        p_location_id: locationId,
        p_appointment_type_id: fixture.typeId,
      });
      expect(result.error).toBeNull();
      const summary = monthSummaryOutcomeSchema.parse(result.data);
      if (!summary.ok) throw new Error(`Month summary failed: ${summary.code}`);
      months.set(month, new Map(summary.days.map((day) => [day.date, day.open])));
    }
    expect(months.size).toBe(2);
    for (let index = 0; index < 7; index += 1) {
      const date = shift(weekStart, index);
      const total = three.providers.reduce(
        (sum, provider) => sum + (provider.days[index].openCount ?? 0),
        0,
      );
      for (const provider of three.providers)
        expect(provider.days[index].open).toHaveLength(provider.days[index].openCount ?? 0);
      expect(months.get(date.slice(0, 7))?.get(date) ?? 0).toBe(total);
    }

    // Past weeks count who was seen and show every status but cancelled.
    const pastStart = sundayOf(schedulingFixtureDate(-20));
    const history = [
      [pastStart, "09:00", "completed"],
      [shift(pastStart, 1), "09:00", "checked_in"],
      [shift(pastStart, 1), "09:45", "no_show"],
      [shift(pastStart, 2), "09:00", "cancelled"],
    ] as const;
    const inserted = await db.from("appointments").insert(
      history.map(([date, time, status]) => {
        const startsAt = at(date, time);
        const start = Date.parse(startsAt);
        const offset = (minutes: number) => new Date(start + minutes * 60_000).toISOString();
        return {
          patient_id: fixture.patientIds[1],
          provider_id: single,
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
    const past = await week([single], pastStart);
    if (!past.ok) throw new Error(`Past week failed: ${past.code}`);
    const pastDays = past.providers[0].days;
    expect(pastDays.slice(0, 3).map((day) => [day.seen, day.openCount])).toEqual([
      [1, null],
      [1, null],
      [0, null],
    ]);
    expect(pastDays[1].appointments.map((visit) => visit.status)).toEqual([
      "checked_in",
      "no_show",
    ]);
    expect(pastDays[2].appointments).toEqual([]);

    const rejected = async (start: string, providerIds: readonly string[]) =>
      weekScheduleOutcomeSchema.parse(
        (
          await db.rpc("portal_schedule_week", {
            p_actor_id: fixture.staff.userId,
            p_week_start: start,
            p_provider_ids: providerIds,
            p_location_id: locationId,
          })
        ).data,
      );
    expect(await rejected(weekStart, [lunch, single, away, fixture.providerIds[0]])).toEqual({
      ok: false,
      code: "invalid_command",
    });
    expect(await rejected(monday, [lunch])).toEqual({ ok: false, code: "invalid_command" });
    expect(await rejected(weekStart, [lunch, lunch])).toEqual({
      ok: false,
      code: "invalid_command",
    });
    expect(await rejected(weekStart, [randomUUID()])).toEqual({
      ok: false,
      code: "provider_unavailable",
    });
    expect(await week([lunch], weekStart, randomUUID())).toEqual({
      ok: false,
      code: "unauthorized",
    });
  } finally {
    await fixture.dispose();
  }
});

test("each staff member's remembered week provider is their own", async () => {
  const db = serviceDb();
  const fixture = await createSchedulingFixture(db, "schedule-week-pref");
  const other = await createStaffFixture(db, {
    prefix: "schedule-week-pref-other",
    displayName: "TEST Week Preference Other",
    role: "staff",
  });
  try {
    const [first, second] = fixture.providerIds;
    const read = async (actorId: string) => {
      const result = await db.rpc("portal_schedule_week_provider", { p_actor_id: actorId });
      expect(result.error).toBeNull();
      return weekProviderOutcomeSchema.parse(result.data);
    };
    const remember = async (actorId: string, providerId: string) => {
      const result = await db.rpc("portal_remember_week_provider", {
        p_actor_id: actorId,
        p_provider_id: providerId,
      });
      expect(result.error).toBeNull();
      return rememberWeekProviderOutcomeSchema.parse(result.data);
    };

    expect(await read(fixture.staff.userId)).toMatchObject({
      ok: true,
      providerId: expect.any(String),
      remembered: false,
    });
    expect(await remember(fixture.staff.userId, first)).toEqual({ ok: true, providerId: first });
    expect(await read(fixture.staff.userId)).toEqual({
      ok: true,
      providerId: first,
      remembered: true,
    });
    expect(await read(other.userId)).toMatchObject({ ok: true, remembered: false });
    expect(await remember(other.userId, second)).toEqual({ ok: true, providerId: second });
    expect(await remember(fixture.staff.userId, first)).toEqual({ ok: true, providerId: first });
    expect(await read(fixture.staff.userId)).toMatchObject({ providerId: first });
    expect(await read(other.userId)).toMatchObject({ providerId: second, remembered: true });
    expect(await remember(other.userId, randomUUID())).toEqual({
      ok: false,
      code: "provider_unavailable",
    });
    expect(await remember(randomUUID(), first)).toEqual({ ok: false, code: "unauthorized" });

    // The browser's roles reach neither the table nor the functions, signed in or not.
    const browser = publishableDb();
    const anonymous = await browser.from("staff_schedule_preferences").select("*");
    expect(anonymous.error?.code).toBe("42501");
    const signedIn = await browser.auth.signInWithPassword({
      email: other.email,
      password: other.password,
    });
    expect(signedIn.error).toBeNull();
    const rows = await browser.from("staff_schedule_preferences").select("*");
    expect(rows.error?.code).toBe("42501");
    const write = await browser
      .from("staff_schedule_preferences")
      .upsert({ staff_user_id: other.userId, week_provider_id: first });
    expect(write.error?.code).toBe("42501");
    const rpc = await browser.rpc("portal_remember_week_provider", {
      p_actor_id: other.userId,
      p_provider_id: first,
    });
    expect(rpc.error).not.toBeNull();
    await browser.auth.signOut();
    expect(await read(other.userId)).toMatchObject({ providerId: second });
  } finally {
    await other.dispose();
    await fixture.dispose();
  }
});

function iso(instant: string) {
  return new Date(instant).toISOString();
}
