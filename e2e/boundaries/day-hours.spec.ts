import { expect, test } from "@playwright/test";

import { serviceDb } from "../harness/env";
import {
  createSchedulingFixture,
  readDayHours,
  saveSettings,
  schedulingFixtureDate,
  setProviderWeek,
  setDayHours,
  undoDayHours,
} from "../harness/scheduling";
import { createStaffFixture } from "../harness/session";

/* The Day view's Hours sheet (issue #353): one provider's hours for one day, or for that weekday
   from the day on, and the toast's undo. The database applies the admin gate, the version check,
   the office-hours bound and the stranded-booking scan. */

const DAY = schedulingFixtureDate();
const WEEKDAY = new Date(`${DAY}T12:00:00Z`).getUTCDay();

function laterDay(days: number) {
  const date = new Date(`${DAY}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

async function dayFixture(prefix: string) {
  const db = serviceDb();
  const fixture = await createSchedulingFixture(db, prefix);
  const actor = fixture.staff.userId;
  const [office] = fixture.locationIds;
  const [firstId, secondId] = fixture.providerIds;
  const week = (weekdays: readonly number[]) =>
    weekdays.map((weekday) => ({
      locationId: office,
      weekday,
      openMinute: 480,
      closeMinute: 1020,
    }));
  const everyDay = [0, 1, 2, 3, 4, 5, 6];
  try {
    // First works the fixture's weekday at one office; Second is off that weekday.
    expect(await setProviderWeek(db, actor, firstId, week(everyDay))).toMatchObject({ ok: true });
    expect(
      await setProviderWeek(
        db,
        actor,
        secondId,
        week(everyDay.filter((weekday) => weekday !== WEEKDAY)),
      ),
    ).toMatchObject({ ok: true });
    // The office keeps 8 to 6 every day, so a window can reach past the week but not the office.
    expect(
      await saveSettings(db, actor, {
        kind: "save_location_details",
        id: office,
        expectedVersion: 1,
        name: `TEST ${prefix} First`,
        street: "1 Test Way",
        city: "Tampa",
        region: "FL",
        postal: "33626",
        mapsQuery: "1 Test Way Tampa FL 33626",
        hours: everyDay.map((weekday) => ({ weekday, openMinute: 480, closeMinute: 1080 })),
        keepBooked: false,
        dryRun: false,
      }),
    ).toMatchObject({ ok: true, entity: "location" });
  } catch (error) {
    await fixture.dispose();
    throw error;
  }
  async function windowsOf(providerId: string, date = DAY) {
    const read = await readDayHours(db, actor, date);
    if (!read.ok) throw new Error(`Day hours read failed: ${read.code}`);
    const provider = read.providers.find((entry) => entry.id === providerId);
    if (provider === undefined) throw new Error("Provider missing from the day");
    return provider;
  }
  return { db, fixture, actor, office, firstId, secondId, windowsOf };
}

test("a day's hours shorten, extend, add and remove, and never strand a booking", async () => {
  const { db, fixture, actor, office, firstId, secondId, windowsOf } =
    await dayFixture("day-hours");
  try {
    const at = (openMinute: number, closeMinute: number) => ({
      locationId: office,
      openMinute,
      closeMinute,
    });
    const command = (
      providerId: string,
      expectedVersion: number,
      windows: readonly Readonly<ReturnType<typeof at>>[],
      dryRun = false,
    ) =>
      ({
        providerId,
        date: DAY,
        scope: "date",
        windows,
        expectedVersion,
        dryRun,
      }) as const;

    const before = await windowsOf(firstId);
    expect(before).toMatchObject({ version: 2, windows: [at(480, 1020)], weekly: [at(480, 1020)] });
    const off = await windowsOf(secondId);
    expect(off).toMatchObject({ windows: [], weekly: [] });
    expect(off.usualWeekdays).not.toContain(WEEKDAY);

    // A 3:30 visit holds 3:25 to 4:05 with its buffers.
    const booked = await fixture.save(fixture.booking("15:30"));
    if (!booked.ok) throw new Error(`Booking failed: ${booked.code}`);

    // Ending at 4 would strand the visit: refused with the visit named, dry run or not.
    for (const dryRun of [true, false]) {
      const stranded = await setDayHours(db, actor, command(firstId, 2, [at(480, 960)], dryRun));
      expect(stranded).toMatchObject({
        ok: false,
        code: "schedule_in_use",
        conflicts: [{ id: booked.id }],
      });
    }
    expect(await windowsOf(firstId)).toMatchObject({ version: 2, windows: [at(480, 1020)] });

    // A dry run answers what the change would do and writes nothing.
    const preview = await setDayHours(db, actor, command(firstId, 2, [at(480, 975)], true));
    expect(preview).toMatchObject({ ok: true, dryRun: true, version: 2 });
    expect(preview).not.toHaveProperty("changeId");
    expect(await windowsOf(firstId)).toMatchObject({ version: 2, windows: [at(480, 1020)] });

    // Shorten to 4:15, which still holds the visit; the next week keeps its usual hours.
    const shortened = await setDayHours(db, actor, command(firstId, 2, [at(480, 975)]));
    expect(shortened).toMatchObject({ ok: true, dryRun: false, version: 3 });
    expect(await windowsOf(firstId)).toMatchObject({ version: 3, windows: [at(480, 975)] });
    expect(await windowsOf(firstId, laterDay(7))).toMatchObject({ windows: [at(480, 1020)] });

    // Extend past the week, as far as the office's hours and no further.
    expect(await setDayHours(db, actor, command(firstId, 3, [at(480, 1080)]))).toMatchObject({
      ok: true,
      version: 4,
    });
    expect(await windowsOf(firstId)).toMatchObject({ windows: [at(480, 1080)] });
    expect(await setDayHours(db, actor, command(firstId, 4, [at(450, 1080)]))).toEqual({
      ok: false,
      code: "outside_office_hours",
    });
    // A second editor still holding an earlier version is told the current one.
    expect(await setDayHours(db, actor, command(firstId, 3, [at(480, 1020)]))).toEqual({
      ok: false,
      code: "stale_version",
      currentVersion: 4,
    });

    // Add someone who is off that day, then remove them again.
    const added = await setDayHours(db, actor, command(secondId, 2, [at(600, 720)]));
    expect(added).toMatchObject({ ok: true, version: 3 });
    expect(await windowsOf(secondId)).toMatchObject({ windows: [at(600, 720)] });
    const removed = await setDayHours(db, actor, command(secondId, 3, []));
    expect(removed).toMatchObject({ ok: true, version: 4 });
    expect(await windowsOf(secondId)).toMatchObject({ windows: [] });
    if (!added.ok || !removed.ok || added.changeId === undefined || removed.changeId === undefined)
      throw new Error("Expected change ids");

    // Undo puts the removed hours back; an undo the provider has moved past is refused.
    expect(
      await undoDayHours(db, actor, { changeId: removed.changeId, expectedVersion: 4 }),
    ).toMatchObject({ ok: true, entity: "provider", version: 5 });
    expect(await windowsOf(secondId)).toMatchObject({ version: 5, windows: [at(600, 720)] });
    expect(await undoDayHours(db, actor, { changeId: added.changeId, expectedVersion: 3 })).toEqual(
      { ok: false, code: "stale_version", currentVersion: 5 },
    );
    expect(
      await undoDayHours(db, actor, { changeId: removed.changeId, expectedVersion: 4 }),
    ).toEqual({ ok: false, code: "stale_version", currentVersion: 5 });
    expect(await windowsOf(secondId)).toMatchObject({ windows: [at(600, 720)] });
  } finally {
    await fixture.dispose();
  }
});

test("every weekday from a day on leaves the weeks before it as they were", async () => {
  const { db, fixture, actor, office, firstId, windowsOf } = await dayFixture("day-hours-weekly");
  const staff = await createStaffFixture(db, {
    prefix: "day-hours-staff",
    displayName: "TEST Day Hours Staff",
  });
  try {
    const from = laterDay(7);
    const windows = [{ locationId: office, openMinute: 540, closeMinute: 960 }];
    const command = {
      providerId: firstId,
      date: from,
      scope: "weekday_from",
      windows,
      expectedVersion: 2,
      dryRun: false,
    } as const;

    // Staff are refused by every endpoint, before anything is read or written.
    expect(await readDayHours(db, staff.userId, DAY)).toEqual({ ok: false, code: "forbidden" });
    expect(await setDayHours(db, staff.userId, command)).toEqual({ ok: false, code: "forbidden" });

    const changed = await setDayHours(db, actor, command);
    expect(changed).toMatchObject({ ok: true, version: 3 });
    if (!changed.ok || changed.changeId === undefined) throw new Error("Expected a change id");
    expect(
      await undoDayHours(db, staff.userId, { changeId: changed.changeId, expectedVersion: 3 }),
    ).toEqual({ ok: false, code: "forbidden" });

    const usual = [{ locationId: office, openMinute: 480, closeMinute: 1020 }];
    expect(await windowsOf(firstId, DAY)).toMatchObject({ windows: usual, weekly: usual });
    for (const date of [from, laterDay(14), laterDay(70)])
      expect(await windowsOf(firstId, date)).toMatchObject({ windows, weekly: windows });
    // Other weekdays are untouched.
    expect(await windowsOf(firstId, laterDay(8))).toMatchObject({ windows: usual });

    // Undo returns the whole week to how it was.
    expect(
      await undoDayHours(db, actor, { changeId: changed.changeId, expectedVersion: 3 }),
    ).toMatchObject({ ok: true, version: 4 });
    expect(await windowsOf(firstId, laterDay(14))).toMatchObject({ windows: usual });
  } finally {
    await staff.dispose();
    await fixture.dispose();
  }
});
