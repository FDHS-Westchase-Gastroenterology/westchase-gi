import { randomUUID } from "node:crypto";

import { expect, test } from "@playwright/test";

import type { RequestLocation } from "../../src/lib/portal/contracts";
import { monthAvailabilityOutcomeSchema } from "../../src/lib/portal/scheduling/read-contracts";
import type { MonthAvailability } from "../../src/lib/portal/scheduling/read-contracts";
import { resolveAppointmentStart } from "../../src/lib/portal/scheduling/time";
import { serviceDb } from "../harness/env";
import { createSchedulingFixture } from "../harness/scheduling";

function at(date: string, time: string) {
  const instant = resolveAppointmentStart({ date, time });
  if (instant === null) throw new Error(`Invalid fixture time ${date} ${time}`);
  return instant;
}

function nextDate(date: string) {
  return new Date(Date.parse(`${date}T12:00:00Z`) + 86_400_000).toISOString().slice(0, 10);
}

/** A practice month wholly in the future, so every date in it is bookable. */
function futureMonth() {
  const now = new Date();
  const month = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 2, 1));
  return month.toISOString().slice(0, 7);
}

test("month availability lists open starts per provider and office, with a reason for every closed day", async () => {
  const db = serviceDb();
  const fixture = await createSchedulingFixture(db, "card-month");
  try {
    const save = fixture.save;
    const [tampa, lutz] = fixture.locationIds;
    for (const [id, office] of [
      [tampa, "tampa"],
      [lutz, "lutz"],
    ] as const)
      expect(
        (await db.from("scheduling_locations").update({ request_location: office }).eq("id", id))
          .error,
      ).toBeNull();

    const month = futureMonth();
    const date = (day: number) => `${month}-${String(day).padStart(2, "0")}`;
    const lastDay = new Date(
      Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0),
    ).getUTCDate();
    const openDay = date(5);
    const fullDay = date(6);
    const releasedDay = date(7);
    const timeOffDay = date(8);
    // Day 11 shares a weekday with 4, 18 and 25: never the first or the last of a month.
    const noHoursDay = date(11);
    const noHoursWeekday = new Date(`${noHoursDay}T12:00:00Z`).getUTCDay();
    // A 30-minute visit with 5-minute buffers reserves 40 minutes on a 15-minute grid:
    // 08:55-09:35 holds one visit (09:00); 08:55-10:20 holds two (09:00 and 09:45).
    const hours = (locationId: string, closeMinute: number) =>
      Array.from({ length: 7 }, (_, weekday) => weekday)
        .filter((weekday) => weekday !== noHoursWeekday)
        .map((weekday) => ({
          locationId,
          weekday,
          openMinute: 535,
          closeMinute,
          validFrom: "2026-01-01",
          validTo: null,
        }));
    const provider = async (name: string, locationId: string, closeMinute: number) => {
      const saved = await save({
        action: "configure",
        idempotencyKey: randomUUID(),
        command: {
          kind: "save_provider",
          name,
          hours: hours(locationId, closeMinute),
          exceptions: [
            {
              locationId: null,
              kind: "unavailable",
              startsAt: at(timeOffDay, "00:00"),
              endsAt: at(nextDate(timeOffDay), "00:00"),
            },
          ],
        },
      });
      if (!saved.ok) throw new Error("Provider fixture failed");
      return saved.id;
    };
    const single = await provider("TEST card-month Single", tampa, 575);
    const double = await provider("TEST card-month Double", lutz, 620);
    const book = async (day: string, providerId: string, locationId: string) =>
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
          start: { date: day, time: "09:00" },
        },
      });
    expect(await book(fullDay, single, tampa)).toMatchObject({ ok: true });
    const released = await book(releasedDay, single, tampa);
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

    const read = async (location: RequestLocation, patientId: string | null = null) => {
      const result = await db.rpc("portal_schedule_month_availability", {
        p_actor_id: fixture.staff.userId,
        p_month: `${month}-01`,
        p_appointment_type_id: fixture.typeId,
        p_request_location: location,
        p_patient_id: patientId,
      });
      expect(result.error).toBeNull();
      const outcome = monthAvailabilityOutcomeSchema.parse(result.data);
      if (!outcome.ok) throw new Error(`Month availability failed: ${outcome.code}`);
      return outcome;
    };
    // Shared Preview data may hold other providers; every assertion reads the fixture's own.
    const entries = (outcome: MonthAvailability, day: string, providerId: string) =>
      (outcome.days.find((row) => row.date === day)?.providers ?? [])
        .filter((entry) => entry.providerId === providerId)
        .map(({ locationId, open, booked, capacity, reason }) => ({
          locationId,
          open: open.map((start) => start.time),
          booked,
          capacity,
          reason,
        }));

    const atTampa = await read("tampa");
    expect(atTampa.month).toBe(month);
    expect(atTampa.days).toHaveLength(lastDay);
    expect(atTampa.days[0]).toMatchObject({ date: date(1), past: false });
    expect(atTampa.days.at(-1)).toMatchObject({ date: date(lastDay), past: false });
    expect(atTampa.locations.map((location) => location.id)).toContain(tampa);
    expect(atTampa.locations.map((location) => location.id)).not.toContain(lutz);
    expect(atTampa.providers.map((row) => row.id)).toContain(single);
    expect(atTampa.providers.map((row) => row.id)).not.toContain(double);
    const openAt = (open: readonly string[], booked = 0) => [
      { locationId: tampa, open, booked, capacity: booked + open.length, reason: null },
    ];
    expect(entries(atTampa, openDay, single)).toEqual(openAt(["09:00"]));
    expect(entries(atTampa, date(1), single)).toEqual(openAt(["09:00"]));
    expect(entries(atTampa, date(lastDay), single)).toEqual(openAt(["09:00"]));
    expect(entries(atTampa, releasedDay, single)).toEqual(openAt(["09:00"]));
    expect(entries(atTampa, fullDay, single)).toEqual([
      { locationId: tampa, open: [], booked: 1, capacity: 1, reason: "booked_out" },
    ]);
    expect(entries(atTampa, timeOffDay, single)).toEqual([
      { locationId: tampa, open: [], booked: 0, capacity: 0, reason: "time_off" },
    ]);
    expect(entries(atTampa, noHoursDay, single)).toEqual([
      { locationId: null, open: [], booked: 0, capacity: 0, reason: "no_hours" },
    ]);
    const tampaOpenDay = atTampa.days.find((row) => row.date === openDay);
    expect(tampaOpenDay?.open).toBe(
      tampaOpenDay?.providers.reduce((sum, entry) => sum + entry.open.length, 0),
    );

    const atLutz = await read("lutz");
    expect(atLutz.providers.map((row) => row.id)).toContain(double);
    expect(atLutz.providers.map((row) => row.id)).not.toContain(single);
    expect(entries(atLutz, openDay, double)).toEqual([
      { locationId: lutz, open: ["09:00", "09:45"], booked: 0, capacity: 2, reason: null },
    ]);

    const anywhere = await read("any");
    expect(anywhere.locations.map((location) => location.id)).toEqual(
      expect.arrayContaining([tampa, lutz]),
    );
    expect(entries(anywhere, openDay, single)).toEqual(openAt(["09:00"]));
    expect(entries(anywhere, openDay, double)).toEqual([
      { locationId: lutz, open: ["09:00", "09:45"], booked: 0, capacity: 2, reason: null },
    ]);

    // The patient's own visit on the full day blocks the overlapping start at the other office.
    const forPatient = await read("any", fixture.patientIds[0]);
    expect(entries(forPatient, fullDay, double)).toEqual([
      { locationId: lutz, open: ["09:45"], booked: 0, capacity: 1, reason: null },
    ]);

    const now = new Date();
    const current = await db.rpc("portal_schedule_month_availability", {
      p_actor_id: fixture.staff.userId,
      p_month: `${now.toISOString().slice(0, 7)}-01`,
      p_appointment_type_id: fixture.typeId,
      p_request_location: "tampa",
      p_patient_id: null,
    });
    const currentMonth = monthAvailabilityOutcomeSchema.parse(current.data);
    if (!currentMonth.ok) throw new Error("Current month read failed");
    for (const row of currentMonth.days.filter((day) => day.date < currentMonth.today))
      expect(row).toMatchObject({ past: true, open: 0, providers: [] });

    for (const [args, code] of [
      [{ p_actor_id: randomUUID() }, "unauthorized"],
      [{ p_month: `${month}-02` }, "invalid_command"],
      [{ p_request_location: "brandon" }, "invalid_command"],
      [{ p_appointment_type_id: randomUUID() }, "type_unavailable"],
      [{ p_patient_id: randomUUID() }, "patient_not_found"],
    ] as const) {
      const result = await db.rpc("portal_schedule_month_availability", {
        p_actor_id: fixture.staff.userId,
        p_month: `${month}-01`,
        p_appointment_type_id: fixture.typeId,
        p_request_location: "tampa",
        p_patient_id: null,
        ...args,
      });
      expect(result.data).toEqual({ ok: false, code });
    }
  } finally {
    await fixture.dispose();
  }
});
