import { randomUUID } from "node:crypto";

import { expect, test } from "@playwright/test";

import { monthSummaryOutcomeSchema } from "../../src/lib/portal/scheduling/read-contracts";
import type { MonthSummaryDay } from "../../src/lib/portal/scheduling/read-contracts";
import { resolveAppointmentStart } from "../../src/lib/portal/scheduling/time";
import { serviceDb } from "../harness/env";
import { createSchedulingFixture, schedulingFixtureDate } from "../harness/scheduling";

function at(date: string, time: string) {
  const instant = resolveAppointmentStart({ date, time });
  if (instant === null) throw new Error(`Invalid fixture time ${date} ${time}`);
  return instant;
}

function nextDate(date: string) {
  return new Date(Date.parse(`${date}T12:00:00Z`) + 86_400_000).toISOString().slice(0, 10);
}

test("the month summary counts open, full, past, and closed practice days at one location", async () => {
  const db = serviceDb();
  const fixture = await createSchedulingFixture(db, "schedule-month");
  try {
    const save = fixture.save;
    const location = await save({
      action: "configure",
      idempotencyKey: randomUUID(),
      command: { kind: "save_location", name: "TEST schedule-month Third" },
    });
    if (!location.ok) throw new Error("Location fixture failed");
    const locationId = location.id;
    const openDay = schedulingFixtureDate(14);
    const fullDay = schedulingFixtureDate(15);
    const releasedDay = schedulingFixtureDate(16);
    const closedDay = schedulingFixtureDate(17);
    const seenDay = schedulingFixtureDate(-20);
    const lateDay = schedulingFixtureDate(-22);
    const quietDay = nextDate(lateDay);
    const closure = {
      locationId: null,
      kind: "unavailable",
      startsAt: at(closedDay, "00:00"),
      endsAt: at(nextDate(closedDay), "00:00"),
    } as const;
    // A 30-minute visit with 5-minute buffers reserves 40 minutes.
    // The hourly booking interval holds the provider for the hour.
    // So 08:55-09:35 and 08:55-10:20 each offer one opening (09:00).
    // Staff can still book 09:45 from the time picker.
    const hours = (closeMinute: number) =>
      Array.from({ length: 7 }, (_, weekday) => ({
        locationId,
        weekday,
        openMinute: 535,
        closeMinute,
        validFrom: "2026-01-01",
        validTo: null,
      }));
    const providers: string[] = [];
    for (const [name, closeMinute] of [
      ["TEST schedule-month Single", 575],
      ["TEST schedule-month Double", 620],
    ] as const) {
      const provider = await save({
        action: "configure",
        idempotencyKey: randomUUID(),
        command: {
          kind: "save_provider",
          name,
          hours: hours(closeMinute),
          exceptions: [closure],
        },
      });
      if (!provider.ok) throw new Error("Provider fixture failed");
      providers.push(provider.id);
    }
    const [single, double] = providers;
    const book = async (date: string, time: string, providerId: string, patientIndex = 0) =>
      save({
        action: "command",
        idempotencyKey: randomUUID(),
        command: {
          kind: "book",
          patientId: fixture.patientIds[patientIndex],
          providerId,
          locationId,
          appointmentTypeId: fixture.typeId,
          expectedTypeVersion: 1,
          start: { date, time },
        },
      });
    for (const [providerId, time, patient] of [
      [single, "09:00", 0],
      [double, "09:00", 1],
      [double, "09:45", 0],
    ] as const)
      expect(await book(fullDay, time, providerId, patient)).toMatchObject({ ok: true });
    const released = await book(releasedDay, "09:00", single);
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
    // Past visits cannot be booked through the command, so they are written as history.
    const history = [
      [seenDay, "09:00", single, 0, "completed"],
      [seenDay, "09:00", double, 1, "checked_in"],
      [seenDay, "09:45", double, 0, "no_show"],
      [lateDay, "23:45", double, 0, "completed"],
    ] as const;
    const inserted = await db.from("appointments").insert(
      history.map(([date, time, providerId, patientIndex, status]) => {
        const startsAt = at(date, time);
        const start = Date.parse(startsAt);
        const iso = (offset: number) => new Date(start + offset * 60_000).toISOString();
        return {
          patient_id: fixture.patientIds[patientIndex],
          provider_id: providerId,
          location_id: locationId,
          appointment_type_id: fixture.typeId,
          starts_at: startsAt,
          ends_at: iso(30),
          duration_minutes: 30,
          buffer_before_minutes: 5,
          buffer_after_minutes: 5,
          reserved_from: iso(-5),
          reserved_until: iso(35),
          status,
          created_by: fixture.staff.userId,
          updated_by: fixture.staff.userId,
        };
      }),
    );
    expect(inserted.error).toBeNull();

    const months = new Map<string, Map<string, MonthSummaryDay>>();
    async function day(date: string) {
      const month = date.slice(0, 7);
      if (!months.has(month)) {
        const result = await db.rpc("portal_schedule_month_summary", {
          p_actor_id: fixture.staff.userId,
          p_month: `${month}-01`,
          p_location_id: locationId,
          p_appointment_type_id: fixture.typeId,
        });
        expect(result.error).toBeNull();
        const summary = monthSummaryOutcomeSchema.parse(result.data);
        if (!summary.ok) throw new Error(`Month summary failed: ${summary.code}`);
        months.set(month, new Map(summary.days.map((row) => [row.date, row])));
      }
      return months.get(month)?.get(date);
    }

    expect(await day(openDay)).toMatchObject({
      status: "open",
      open: 2,
      booked: 0,
      capacity: 2,
      bookedShare: 0,
    });
    const open = await day(openDay);
    if (open?.status !== "open") throw new Error("Open day missing");
    // Providers in their Settings order, which starts as the order they were added.
    expect(open.providers.map((provider) => [provider.name, provider.open])).toEqual([
      ["TEST schedule-month Single", 1],
      ["TEST schedule-month Double", 1],
    ]);
    expect(open.providers[1].firstOpen.map((start) => new Date(start).toISOString())).toEqual([
      at(openDay, "09:00"),
    ]);
    expect(await day(fullDay)).toMatchObject({
      status: "full",
      open: 0,
      booked: 3,
      capacity: 3,
      // 120 reserved of 125 working minutes: the five minutes left cannot hold another visit.
      bookedShare: 0.96,
    });
    expect(await day(releasedDay)).toMatchObject({ status: "open", open: 2, booked: 0 });
    expect(await day(closedDay)).toEqual({
      date: closedDay,
      status: "closed",
      open: null,
      bookedShare: null,
      seen: null,
    });
    expect(await day(seenDay)).toEqual({
      date: seenDay,
      status: "past",
      open: null,
      bookedShare: null,
      seen: 2,
    });
    // 23:45 in New York is the next UTC day; the visit belongs to the practice date it began.
    expect(await day(lateDay)).toMatchObject({ status: "past", seen: 1 });
    expect(await day(quietDay)).toMatchObject({ status: "past", seen: 0 });

    const stranger = await db.rpc("portal_schedule_month_summary", {
      p_actor_id: randomUUID(),
      p_month: `${openDay.slice(0, 7)}-01`,
      p_location_id: locationId,
      p_appointment_type_id: fixture.typeId,
    });
    expect(stranger.data).toEqual({ ok: false, code: "unauthorized" });
  } finally {
    await fixture.dispose();
  }
});
