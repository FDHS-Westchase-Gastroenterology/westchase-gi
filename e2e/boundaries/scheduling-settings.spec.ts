import { createHmac, randomUUID } from "node:crypto";

import { expect, test } from "@playwright/test";

import { dayScheduleOutcomeSchema } from "../../src/lib/portal/scheduling/grid-contracts";
import { monthSummaryOutcomeSchema } from "../../src/lib/portal/scheduling/read-contracts";
import {
  settingsCommandOutcomeSchema,
  settingsCommandSchema,
} from "../../src/lib/portal/scheduling/settings-contracts";
import { serviceDb } from "../harness/env";
import {
  createSchedulingFixture,
  readSettings,
  restoreBookingInterval,
  saveSettings,
  schedulingFixtureDate,
  setProviderWeek,
} from "../harness/scheduling";
import { createStaffFixture } from "../harness/session";

/* The Settings window's Schedule group (issue #352): its read, and the granular commands that
   change providers, appointment types and locations one fact at a time. */

test("settings commands keep to the 15-minute grid and one place at a time", () => {
  const id = randomUUID();
  const locationId = randomUUID();
  const window = { locationId, weekday: 1, openMinute: 480, closeMinute: 1020 };
  for (const command of [
    // Off the 15-minute grid.
    {
      kind: "set_provider_weekly_hours",
      id,
      expectedVersion: 1,
      startsOn: "2026-11-02",
      hours: [{ ...window, openMinute: 485 }],
      keepBooked: false,
      dryRun: false,
    },
    // Two windows on one weekday overlap.
    {
      kind: "set_provider_weekly_hours",
      id,
      expectedVersion: 1,
      startsOn: "2026-11-02",
      hours: [window, { ...window, openMinute: 900, closeMinute: 1080 }],
      keepBooked: false,
      dryRun: false,
    },
    // An all-day range carries no minutes; a partial day is one date.
    {
      kind: "add_time_off",
      id,
      startsOn: "2026-11-02",
      endsOn: "2026-11-02",
      allDay: true,
      startMinute: 540,
      endMinute: 600,
      reason: "personal",
      dryRun: true,
    },
    {
      kind: "add_time_off",
      id,
      startsOn: "2026-11-02",
      endsOn: "2026-11-03",
      allDay: false,
      startMinute: 540,
      endMinute: 600,
      reason: "personal",
      dryRun: true,
    },
    // A new provider has no id; an existing type carries both id and version.
    { kind: "add_provider", id, name: "Dr. Test", credentials: null, hours: [] },
    {
      kind: "save_appointment_type",
      id,
      expectedVersion: null,
      name: "Visit",
      durationMinutes: 30,
      bufferBeforeMinutes: 0,
      bufferAfterMinutes: 0,
      icon: "stethoscope",
      description: null,
      providerIds: [],
    },
    // Telehealth is not a type, and video is not one of the icons.
    {
      kind: "save_appointment_type",
      id: null,
      expectedVersion: null,
      name: "Visit",
      durationMinutes: 30,
      bufferBeforeMinutes: 0,
      bufferAfterMinutes: 0,
      icon: "video",
      description: null,
      providerIds: [],
    },
    // Office hours name each weekday once.
    {
      kind: "save_location_details",
      id,
      expectedVersion: 1,
      name: "Office",
      street: "1 Main St",
      city: "Tampa",
      region: "FL",
      postal: "33626",
      mapsQuery: "1 Main St Tampa FL",
      hours: [
        { weekday: 1, openMinute: 480, closeMinute: 1020 },
        { weekday: 1, openMinute: 480, closeMinute: 600 },
      ],
      keepBooked: false,
      dryRun: false,
    },
    // A run of closed days ends on or after it starts.
    {
      kind: "add_location_closure",
      id,
      closedOn: "2026-11-27",
      closedThrough: "2026-11-26",
      note: null,
      dryRun: false,
    },
  ])
    expect(settingsCommandSchema.safeParse(command).success).toBe(false);
});

test("the settings read shows staff the schedule and gives only admins edit rights", async () => {
  const db = serviceDb();
  const fixture = await createSchedulingFixture(db, "settings-read");
  const staff = await createStaffFixture(db, {
    prefix: "settings-read-staff",
    displayName: "TEST Settings Staff",
  });
  try {
    const admin = await readSettings(db, fixture.staff.userId);
    if (!admin.ok) throw new Error(`Settings read failed: ${admin.code}`);
    expect(admin).toMatchObject({ canEdit: true, timeZone: "America/New_York" });
    const providers = admin.providers.filter((provider) =>
      fixture.providerIds.includes(provider.id),
    );
    expect(providers.map((provider) => provider.id)).toEqual(fixture.providerIds);
    expect(providers[0]).toMatchObject({ bookable: true, credentials: null, version: 1 });
    expect(providers[0]?.typeIds).toContain(fixture.typeId);
    const type = admin.types.find((entry) => entry.id === fixture.typeId);
    expect(type).toMatchObject({ durationMinutes: 30, active: true, used: false });
    expect(type?.providerIds).toEqual(expect.arrayContaining(fixture.providerIds));
    expect(
      admin.locations.filter((location) => fixture.locationIds.includes(location.id)),
    ).toHaveLength(2);

    const read = await readSettings(db, staff.userId);
    expect(read).toMatchObject({ ok: true, canEdit: false });

    // Every command refuses the staff role, before it reads the entity.
    const [provider] = providers;
    expect(
      await saveSettings(db, staff.userId, {
        kind: "set_provider_profile",
        id: provider.id,
        expectedVersion: provider.version,
        name: provider.name,
        credentials: "MD",
        bookable: true,
      }),
    ).toEqual({ ok: false, code: "forbidden" });
    expect(
      await saveSettings(db, staff.userId, {
        kind: "add_provider",
        name: "TEST settings-read Refused",
        credentials: null,
        hours: [],
      }),
    ).toEqual({ ok: false, code: "forbidden" });
  } finally {
    await staff.dispose();
    await fixture.dispose();
  }
});

test("the booking interval spaces each provider's openings, and only admins change it", async () => {
  const db = serviceDb();
  const fixture = await createSchedulingFixture(db, "settings-interval");
  const staff = await createStaffFixture(db, {
    prefix: "settings-interval-staff",
    displayName: "TEST Interval Staff",
  });
  const actor = fixture.staff.userId;
  const date = schedulingFixtureDate();
  // One provider's openings on the fixture day, as the Day view reads them.
  async function opens() {
    const day = dayScheduleOutcomeSchema.parse(
      (
        await db.rpc("portal_schedule_day", {
          p_actor_id: actor,
          p_date: date,
          p_appointment_type_id: fixture.typeId,
        })
      ).data,
    );
    if (!day.ok) throw new Error("Day read failed");
    const column = day.providers.find((entry) => entry.id === fixture.providerIds[0]);
    return (column?.open ?? []).map((slot) => Date.parse(slot.startsAt));
  }
  function gaps(starts: readonly number[]) {
    return starts.slice(1).map((start, index) => (start - starts[index]) / 60_000);
  }
  const clock = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "numeric",
    minute: "numeric",
    hourCycle: "h23",
  });
  // Whether every start sits on a mark of the practice clock, counted from midnight.
  function onMarks(starts: readonly number[], every: number) {
    return starts.every((start) => {
      const parts = clock.formatToParts(start);
      const hour = Number(parts.find((part) => part.type === "hour")?.value);
      const minute = Number(parts.find((part) => part.type === "minute")?.value);
      return (hour * 60 + minute) % every === 0;
    });
  }
  try {
    await restoreBookingInterval(db, actor);
    // Any whole quarter hour from 15 minutes to 8 hours; nothing between the quarters.
    const accepts = (minutes: number) =>
      settingsCommandSchema.safeParse({
        kind: "set_booking_interval",
        id: randomUUID(),
        expectedVersion: 1,
        minutes,
      }).success;
    expect([15, 45, 90, 480].map(accepts)).toEqual([true, true, true, true]);
    expect([0, 10, 50, 495, 22.5].map(accepts)).toEqual([false, false, false, false, false]);

    const read = await readSettings(db, actor);
    if (!read.ok) throw new Error("Settings read failed");
    expect(read.practice.bookingIntervalMinutes).toBe(60);
    const staffRead = await readSettings(db, staff.userId);
    expect(staffRead).toMatchObject({ ok: true, canEdit: false, practice: read.practice });
    const command = {
      kind: "set_booking_interval",
      id: read.practice.id,
      expectedVersion: read.practice.version,
      minutes: 15,
    } as const;
    expect(await saveSettings(db, staff.userId, command)).toEqual({
      ok: false,
      code: "forbidden",
    });

    // The default: one opening an hour, a 40-minute visit keeping the rest of the hour free.
    const hourly = await opens();
    expect(hourly.length).toBeGreaterThan(0);
    expect(gaps(hourly).every((gap) => gap >= 60)).toBe(true);
    // Openings start on the hour, whatever was booked before them.
    expect(onMarks(hourly, 60)).toBe(true);

    // The RPC refuses an interval the contract does not offer, and replays a repeated key.
    const fingerprint = createHmac("sha256", "TEST scheduling acceptance fixture")
      .update(JSON.stringify({ actorId: actor, action: "settings_command", command }))
      .digest("hex");
    expect(
      (
        await db.rpc("portal_set_booking_interval", {
          p_actor_id: actor,
          p_idempotency_key: randomUUID(),
          p_fingerprint: fingerprint,
          p_command: { ...command, minutes: 50 },
        })
      ).data,
    ).toEqual({ ok: false, code: "invalid_command" });
    expect(
      (
        await db.rpc("portal_set_booking_interval", {
          p_actor_id: actor,
          p_idempotency_key: randomUUID(),
          p_fingerprint: fingerprint,
          p_command: { ...command, minutes: 495 },
        })
      ).data,
    ).toEqual({ ok: false, code: "invalid_command" });
    const key = randomUUID();
    const call = async () =>
      settingsCommandOutcomeSchema.parse(
        (
          await db.rpc("portal_set_booking_interval", {
            p_actor_id: actor,
            p_idempotency_key: key,
            p_fingerprint: fingerprint,
            p_command: command,
          })
        ).data,
      );
    const first = await call();
    expect(first).toMatchObject({
      ok: true,
      entity: "practice",
      version: read.practice.version + 1,
    });
    expect(await call()).toEqual(first);
    expect(await saveSettings(db, actor, command)).toMatchObject({
      ok: false,
      code: "stale_version",
      currentVersion: read.practice.version + 1,
    });

    // A finer grid offers more openings, each still a whole visit apart.
    const quarterly = await opens();
    expect(quarterly.length).toBeGreaterThan(hourly.length);
    expect(gaps(quarterly).some((gap) => gap < 60)).toBe(true);
    expect(onMarks(quarterly, 15)).toBe(true);

    const changes = await db
      .from("scheduling_changes")
      .select("command, before_record, after_record")
      .eq("entity", "practice")
      .eq("version", read.practice.version + 1);
    expect(changes.data).toEqual([
      expect.objectContaining({
        command: "set_booking_interval",
        before_record: expect.objectContaining({ bookingIntervalMinutes: 60 }),
        after_record: expect.objectContaining({ bookingIntervalMinutes: 15 }),
      }),
    ]);
  } finally {
    await restoreBookingInterval(db, actor);
    await staff.dispose();
    await fixture.dispose();
  }
});

function shift(date: string, days: number) {
  return new Date(Date.parse(`${date}T12:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
}

/** One provider, office or the new-time list, as the Settings read has them now. */
async function current(db: ReturnType<typeof serviceDb>, actor: string) {
  const read = await readSettings(db, actor);
  if (!read.ok) throw new Error(`Settings read failed: ${read.code}`);
  return {
    read,
    provider: (id: string) => {
      const found = read.providers.find((entry) => entry.id === id);
      if (found === undefined) throw new Error("No such provider");
      return found;
    },
    location: (id: string) => {
      const found = read.locations.find((entry) => entry.id === id);
      if (found === undefined) throw new Error("No such office");
      return found;
    },
    waiting: (appointmentId: string) =>
      read.needsNewTime.find((entry) => entry.id === appointmentId)?.reason ?? null,
  };
}

test("a provider's profile, types and hours each keep their own version", async () => {
  const db = serviceDb();
  const fixture = await createSchedulingFixture(db, "settings-provider");
  try {
    const actor = fixture.staff.userId;
    const [providerId, secondId] = fixture.providerIds;
    const [first] = fixture.locationIds;
    const start = await current(db, actor);
    const before = start.provider(providerId);
    expect(before).toMatchObject({ profileVersion: 1, bookable: true });

    const profile = await saveSettings(db, actor, {
      kind: "set_provider_profile",
      id: providerId,
      expectedVersion: before.profileVersion,
      name: "TEST settings-provider First",
      credentials: "MD · Gastroenterology",
      bookable: true,
    });
    expect(profile).toMatchObject({ ok: true, entity: "provider", id: providerId, version: 2 });
    // A second editor still holding the old profile is told the current one.
    expect(
      await saveSettings(db, actor, {
        kind: "set_provider_profile",
        id: providerId,
        expectedVersion: before.profileVersion,
        name: "TEST settings-provider First",
        credentials: null,
        bookable: true,
      }),
    ).toEqual({ ok: false, code: "stale_version", currentVersion: 2 });
    // The profile change leaves the hours version where it was.
    expect((await current(db, actor)).provider(providerId).hoursVersion).toBe(before.hoursVersion);

    // A provider who does not take appointments cannot be booked, and their history stays.
    expect(
      await saveSettings(db, actor, {
        kind: "set_provider_profile",
        id: secondId,
        expectedVersion: start.provider(secondId).profileVersion,
        name: "TEST settings-provider Second",
        credentials: null,
        bookable: false,
      }),
    ).toMatchObject({ ok: true });
    expect(await fixture.save(fixture.booking("10:00", 0, 1))).toMatchObject({
      ok: false,
      code: "provider_not_bookable",
    });

    // A provider who does not see the type is refused on book and on reschedule.
    const booked = await fixture.save(fixture.booking("10:00", 0, 0));
    if (!booked.ok) throw new Error(`Booking failed: ${booked.code}`);
    const cleared = await saveSettings(db, actor, {
      kind: "set_provider_types",
      id: providerId,
      expectedVersion: before.typesVersion,
      typeIds: [],
    });
    expect(cleared).toMatchObject({ ok: true });
    if (!cleared.ok) throw new Error("Types change failed");
    expect(await fixture.save(fixture.booking("13:00", 1, 0))).toMatchObject({
      ok: false,
      code: "provider_not_eligible",
    });
    expect(
      await fixture.save({
        action: "command",
        idempotencyKey: randomUUID(),
        command: {
          kind: "reschedule",
          id: booked.id,
          expectedVersion: booked.version,
          providerId,
          locationId: first,
          start: { date: schedulingFixtureDate(), time: "14:00" },
        },
      }),
    ).toMatchObject({ ok: false, code: "provider_not_eligible" });
    expect(
      await saveSettings(db, actor, {
        kind: "set_provider_types",
        id: providerId,
        expectedVersion: cleared.version,
        typeIds: [fixture.typeId],
      }),
    ).toMatchObject({ ok: true });

    // Four other days plus the booked one, so the week either keeps the booking or strands it.
    const bookedDay = new Date(`${schedulingFixtureDate()}T12:00:00Z`).getUTCDay();
    const otherDays = [0, 1, 2, 3, 4, 5, 6].filter((weekday) => weekday !== bookedDay).slice(0, 4);
    const workDays = [bookedDay, ...otherDays].toSorted((a, b) => a - b);
    const week = (openMinute: number, weekdays: readonly number[] = workDays) =>
      weekdays.map((weekday) => ({ locationId: first, weekday, openMinute, closeMinute: 1020 }));
    // The fixture's office has no hours of its own, so give it 8 to 6 every day.
    expect(
      await saveSettings(db, actor, {
        kind: "save_location_details",
        id: first,
        expectedVersion: start.location(first).detailsVersion,
        name: "TEST settings-provider First",
        street: "1 Test Way",
        city: "Tampa",
        region: "FL",
        postal: "33626",
        mapsQuery: "1 Test Way Tampa FL 33626",
        hours: [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({
          weekday,
          openMinute: 480,
          closeMinute: 1080,
        })),
        keepBooked: false,
        dryRun: false,
      }),
    ).toMatchObject({ ok: true, entity: "location", version: 2 });
    expect(await setProviderWeek(db, actor, providerId, week(450))).toMatchObject({
      ok: false,
      code: "outside_office_hours",
    });

    // A week that leaves the booking out names it, and saves only when asked to keep it.
    const stranding = await setProviderWeek(db, actor, providerId, week(540, otherDays));
    expect(stranding).toMatchObject({ ok: false, code: "schedule_in_use" });
    expect(stranding.ok ? [] : stranding.conflicts?.map((conflict) => conflict.id)).toEqual([
      booked.id,
    ]);
    expect((await current(db, actor)).waiting(booked.id)).toBeNull();
    expect(
      await setProviderWeek(db, actor, providerId, week(540, otherDays), { keepBooked: true }),
    ).toMatchObject({ ok: true, conflicts: [expect.objectContaining({ id: booked.id })] });
    expect((await current(db, actor)).waiting(booked.id)).toBe("outside_hours");
    // Putting the day back covers the booking again.
    expect(await setProviderWeek(db, actor, providerId, week(540))).toMatchObject({ ok: true });
    let now = await current(db, actor);
    expect(now.waiting(booked.id)).toBeNull();
    expect(
      now.provider(providerId).hours.map((row) => [row.weekday, row.openMinute, row.closeMinute]),
    ).toEqual(workDays.map((weekday) => [weekday, 540, 1020]));

    // A week from a later day plans a change; this week stays, and cancelling joins them again.
    const later = schedulingFixtureDate(30);
    expect(
      await setProviderWeek(db, actor, providerId, week(600), { startsOn: later }),
    ).toMatchObject({ ok: true });
    now = await current(db, actor);
    const hours = now.provider(providerId).hours;
    expect(hours.filter((row) => row.validFrom === later).map((row) => row.openMinute)).toEqual(
      workDays.map(() => 600),
    );
    expect(hours.filter((row) => row.validTo !== null).every((row) => row.openMinute === 540)).toBe(
      true,
    );
    expect(
      await setProviderWeek(db, actor, providerId, week(540), { startsOn: later }),
    ).toMatchObject({ ok: true });
    now = await current(db, actor);
    expect(now.provider(providerId).hours.every((row) => row.validTo === null)).toBe(true);
    expect(now.provider(providerId)).toMatchObject({
      credentials: "MD · Gastroenterology",
      bookable: true,
      typeIds: [fixture.typeId],
    });

    // Office hours lead: a shorter day moves the provider's hours to match from today.
    const office = now.location(first);
    const shorter = {
      kind: "save_location_details",
      id: first,
      expectedVersion: office.detailsVersion,
      name: "TEST settings-provider First",
      street: "1 Test Way",
      city: "Tampa",
      region: "FL",
      postal: "33626",
      mapsQuery: "1 Test Way Tampa FL 33626",
      hours: [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({
        weekday,
        openMinute: 600,
        closeMinute: 960,
      })),
      keepBooked: false,
    } as const;
    const preview = await saveSettings(db, actor, { ...shorter, dryRun: true });
    // Both fixture providers work here; the second's 8-to-6 days followed the office's edges.
    expect(preview).toMatchObject({
      ok: true,
      dryRun: true,
      adjusted: expect.arrayContaining([
        expect.objectContaining({ providerId, weekdays: workDays }),
        expect.objectContaining({ providerId: secondId, weekdays: [0, 1, 2, 3, 4, 5, 6] }),
      ]),
      conflicts: [expect.objectContaining({ id: booked.id })],
    });
    expect(await saveSettings(db, actor, { ...shorter, dryRun: false })).toMatchObject({
      ok: false,
      code: "schedule_in_use",
    });
    expect(
      await saveSettings(db, actor, { ...shorter, keepBooked: true, dryRun: false }),
    ).toMatchObject({ ok: true, entity: "location" });
    now = await current(db, actor);
    expect(
      now
        .provider(providerId)
        .hours.flatMap((row) => (row.validTo === null ? [[row.openMinute, row.closeMinute]] : [])),
    ).toEqual(workDays.map(() => [600, 960]));
    expect(now.waiting(booked.id)).toBe("outside_hours");

    // A day on office hours takes the office's times whatever was sent, and follows the office.
    const officeDay = (followsOffice: boolean) =>
      workDays.map((weekday) => ({
        locationId: first,
        weekday,
        openMinute: 660,
        closeMinute: 720,
        followsOffice,
      }));
    expect(
      await setProviderWeek(db, actor, providerId, officeDay(true), { keepBooked: true }),
    ).toMatchObject({ ok: true });
    now = await current(db, actor);
    expect(
      now
        .provider(providerId)
        .hours.filter((row) => row.validTo === null)
        .map((row) => [row.openMinute, row.closeMinute, row.followsOffice]),
    ).toEqual(workDays.map(() => [600, 960, true]));
    expect(
      await saveSettings(db, actor, {
        ...shorter,
        expectedVersion: now.location(first).detailsVersion,
        hours: [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({
          weekday,
          openMinute: 540,
          closeMinute: 1020,
        })),
        keepBooked: true,
        dryRun: false,
      }),
    ).toMatchObject({ ok: true });
    now = await current(db, actor);
    expect(
      now
        .provider(providerId)
        .hours.flatMap((row) => (row.validTo === null ? [[row.openMinute, row.closeMinute]] : [])),
    ).toEqual(workDays.map(() => [540, 1020]));
    // An office-hours day is the only block that day.
    expect(
      settingsCommandSchema.safeParse({
        kind: "set_provider_weekly_hours",
        id: providerId,
        expectedVersion: 1,
        startsOn: "2026-11-02",
        hours: [
          ...officeDay(true).slice(0, 1),
          { ...officeDay(false)[0], openMinute: 1000, closeMinute: 1020 },
        ],
        keepBooked: false,
        dryRun: false,
      }).success,
    ).toBe(false);

    // A new provider is added after every other and sees every active type.
    const added = await saveSettings(db, actor, {
      kind: "add_provider",
      name: "TEST settings-provider Added",
      credentials: "PA-C",
      hours: week(600).map((window) => ({ ...window, closeMinute: 960 })),
    });
    if (!added.ok) throw new Error(`Add provider failed: ${added.code}`);
    const after = await current(db, actor);
    expect(after.read.providers.at(-1)).toMatchObject({ id: added.id, credentials: "PA-C" });
    expect(after.provider(added.id).typeIds).toContain(fixture.typeId);
  } finally {
    await fixture.dispose();
  }
});

test("time off warns about the bookings it covers and never cancels them", async () => {
  const db = serviceDb();
  const fixture = await createSchedulingFixture(db, "settings-time-off");
  try {
    const actor = fixture.staff.userId;
    const [providerId] = fixture.providerIds;
    const date = schedulingFixtureDate();
    const booked = await fixture.save(fixture.booking("10:00"));
    if (!booked.ok) throw new Error(`Booking failed: ${booked.code}`);
    const timeOff = {
      kind: "add_time_off",
      id: providerId,
      startsOn: date,
      endsOn: date,
      allDay: true,
      startMinute: null,
      endMinute: null,
      reason: "conference",
    } as const;

    const preview = await saveSettings(db, actor, { ...timeOff, dryRun: true });
    expect(preview).toMatchObject({ ok: true, dryRun: true });
    if (!preview.ok) throw new Error("Dry run failed");
    expect(preview.conflicts).toEqual([
      expect.objectContaining({
        id: booked.id,
        date,
        appointmentType: "TEST settings-time-off Visit",
        patientName: "TEST settings-time-off First",
      }),
    ]);
    const unchanged = await current(db, actor);
    expect(unchanged.provider(providerId).timeOff).toEqual([]);

    const added = await saveSettings(db, actor, { ...timeOff, dryRun: false });
    expect(added).toMatchObject({ ok: true });
    if (!added.ok) throw new Error("Time off failed");
    expect(added.conflicts?.map((conflict) => conflict.id)).toEqual([booked.id]);
    const appointment = await db.from("appointments").select("status").eq("id", booked.id).single();
    expect(appointment.data).toEqual({ status: "scheduled" });

    const read = await current(db, actor);
    expect(read.waiting(booked.id)).toBe("time_off");
    const ranges = read.provider(providerId).timeOff;
    expect(ranges).toEqual([
      expect.objectContaining({ reason: "conference", allDay: true, locationId: null }),
    ]);
    // The day has no open time for that provider while the booking stays on it.
    const day = dayScheduleOutcomeSchema.parse(
      (
        await db.rpc("portal_schedule_day", {
          p_actor_id: actor,
          p_date: date,
          p_appointment_type_id: fixture.typeId,
        })
      ).data,
    );
    if (!day.ok) throw new Error("Day read failed");
    const column = day.providers.find((entry) => entry.id === providerId);
    expect(column?.open ?? []).toEqual([]);
    expect(column?.appointments.map((entry) => entry.id)).toEqual([booked.id]);

    const [range] = ranges;
    expect(
      await saveSettings(db, actor, {
        kind: "remove_time_off",
        id: providerId,
        timeOffId: range.id,
      }),
    ).toMatchObject({ ok: true });
    expect((await current(db, actor)).waiting(booked.id)).toBeNull();
  } finally {
    await fixture.dispose();
  }
});

test("closed days empty the office for everyone, warn about bookings, and reopen as a run", async () => {
  const db = serviceDb();
  const fixture = await createSchedulingFixture(db, "settings-closed");
  try {
    const actor = fixture.staff.userId;
    const [first, second] = fixture.locationIds;
    const date = schedulingFixtureDate();
    const booked = await fixture.save(fixture.booking("10:00"));
    if (!booked.ok) throw new Error(`Booking failed: ${booked.code}`);
    const closure = {
      kind: "add_location_closure",
      id: first,
      closedOn: date,
      closedThrough: shift(date, 2),
      note: "TEST holiday",
    } as const;

    const preview = await saveSettings(db, actor, { ...closure, dryRun: true });
    if (!preview.ok) throw new Error("Dry run failed");
    expect(preview.conflicts).toEqual([
      expect.objectContaining({ id: booked.id, providerName: "TEST settings-closed First" }),
    ]);
    expect(await saveSettings(db, actor, { ...closure, dryRun: false })).toMatchObject({
      ok: true,
      entity: "location",
    });
    expect(await saveSettings(db, actor, { ...closure, dryRun: false })).toEqual({
      ok: false,
      code: "already_closed",
    });
    expect(await fixture.save(fixture.booking("13:00", 1, 1, 0))).toMatchObject({
      ok: false,
      code: "location_closed",
    });

    // No open time at the closed office; the month agrees with the day.
    const day = dayScheduleOutcomeSchema.parse(
      (
        await db.rpc("portal_schedule_day", {
          p_actor_id: actor,
          p_date: date,
          p_appointment_type_id: fixture.typeId,
        })
      ).data,
    );
    if (!day.ok) throw new Error("Day read failed");
    const columns = day.providers.filter((entry) => fixture.providerIds.includes(entry.id));
    expect(columns).toHaveLength(2);
    for (const column of columns)
      expect(column.open.every((slot) => slot.locationId === second)).toBe(true);
    const summary = monthSummaryOutcomeSchema.parse(
      (
        await db.rpc("portal_schedule_month_summary", {
          p_actor_id: actor,
          p_month: `${date.slice(0, 7)}-01`,
          p_location_id: first,
          p_appointment_type_id: fixture.typeId,
        })
      ).data,
    );
    if (!summary.ok) throw new Error("Month summary failed");
    const monthDay = summary.days.find((entry) => entry.date === date);
    const ours =
      monthDay !== undefined && "providers" in monthDay
        ? monthDay.providers.filter((entry) => fixture.providerIds.includes(entry.id))
        : [];
    expect(ours.reduce((sum, entry) => sum + entry.open, 0)).toBe(0);

    const read = await current(db, actor);
    expect(read.waiting(booked.id)).toBe("office_closed");
    const closures = read.location(first).closures;
    expect(closures.map((entry) => [entry.closedOn, entry.note])).toEqual(
      [0, 1, 2].map((days) => [shift(date, days), "TEST holiday"]),
    );
    expect(
      await saveSettings(db, actor, {
        kind: "remove_location_closure",
        id: first,
        closureIds: closures.map((entry) => entry.id),
      }),
    ).toMatchObject({ ok: true });
    const reopened = await current(db, actor);
    expect(reopened.location(first).closures).toEqual([]);
    expect(reopened.waiting(booked.id)).toBeNull();
  } finally {
    await fixture.dispose();
  }
});

test("providers and offices retire once nothing is booked with them, and restore", async () => {
  const db = serviceDb();
  const fixture = await createSchedulingFixture(db, "settings-retire");
  try {
    const actor = fixture.staff.userId;
    const [providerId] = fixture.providerIds;
    const [, second] = fixture.locationIds;
    const booked = await fixture.save(fixture.booking("10:00", 0, 0, 1));
    if (!booked.ok) throw new Error(`Booking failed: ${booked.code}`);
    let now = await current(db, actor);
    const profile = now.provider(providerId).profileVersion;

    // Still booked: the refusal lists what is in the way.
    const refused = await saveSettings(db, actor, {
      kind: "retire_provider",
      id: providerId,
      expectedVersion: profile,
    });
    expect(refused).toMatchObject({
      ok: false,
      code: "schedule_in_use",
      conflicts: [expect.objectContaining({ id: booked.id })],
    });
    const office = await saveSettings(db, actor, {
      kind: "retire_location",
      id: second,
      expectedVersion: now.location(second).detailsVersion,
    });
    expect(office).toMatchObject({
      ok: false,
      code: "schedule_in_use",
      conflicts: [expect.objectContaining({ id: booked.id })],
    });

    // Cancelled, both can go; the provider keeps their hours for a restore.
    const cancelled = await fixture.save({
      action: "command",
      idempotencyKey: randomUUID(),
      command: {
        kind: "cancel",
        id: booked.id,
        expectedVersion: booked.version,
        reason: "Patient asked to cancel",
      },
    });
    expect(cancelled).toMatchObject({ ok: true });
    const hoursBefore = now.provider(providerId).hours.length;
    const retired = await saveSettings(db, actor, {
      kind: "retire_provider",
      id: providerId,
      expectedVersion: profile,
    });
    expect(retired).toMatchObject({ ok: true });
    now = await current(db, actor);
    expect(now.read.providers.some((entry) => entry.id === providerId)).toBe(false);
    const listed = now.read.retiredProviders.find((entry) => entry.id === providerId);
    expect(listed).toBeDefined();
    expect(
      await saveSettings(db, actor, {
        kind: "restore_provider",
        id: providerId,
        expectedVersion: listed?.profileVersion ?? 0,
      }),
    ).toMatchObject({ ok: true });
    expect((await current(db, actor)).provider(providerId).hours).toHaveLength(hoursBefore);

    // A retired office ends providers' hours there, and comes back without them.
    now = await current(db, actor);
    const gone = await saveSettings(db, actor, {
      kind: "retire_location",
      id: second,
      expectedVersion: now.location(second).detailsVersion,
    });
    expect(gone).toMatchObject({
      ok: true,
      adjusted: expect.arrayContaining([expect.objectContaining({ providerId })]),
    });
    now = await current(db, actor);
    expect(
      now
        .provider(providerId)
        .hours.some((row) => row.locationId === second && row.validTo === null),
    ).toBe(false);
    const away = now.read.retiredLocations.find((entry) => entry.id === second);
    expect(away).toBeDefined();
    expect(
      await saveSettings(db, actor, {
        kind: "restore_location",
        id: second,
        expectedVersion: away?.detailsVersion ?? 0,
      }),
    ).toMatchObject({ ok: true });
  } finally {
    await fixture.dispose();
  }
});

test("appointment types keep a booking order, turn off without losing bookings, and delete only unused", async () => {
  const db = serviceDb();
  const fixture = await createSchedulingFixture(db, "settings-types");
  try {
    const actor = fixture.staff.userId;
    const created = await saveSettings(db, actor, {
      kind: "save_appointment_type",
      id: null,
      expectedVersion: null,
      name: "TEST settings-types Consult",
      durationMinutes: 45,
      bufferBeforeMinutes: 0,
      bufferAfterMinutes: 0,
      icon: "clipboard-check",
      description: "First visit.",
      providerIds: fixture.providerIds,
    });
    if (!created.ok) throw new Error(`Type create failed: ${created.code}`);

    async function types() {
      const read = await readSettings(db, actor);
      if (!read.ok) throw new Error("Settings read failed");
      return read.types;
    }
    let all = await types();
    const count = all.length;
    expect(all.at(-1)).toMatchObject({
      id: created.id,
      icon: "clipboard-check",
      description: "First visit.",
      durationMinutes: 45,
    });
    expect(all.find((type) => type.id === created.id)?.providerIds.toSorted()).toEqual(
      fixture.providerIds.toSorted(),
    );

    // Move it first, and the catalog the booking card reads follows.
    expect(
      await saveSettings(db, actor, {
        kind: "reorder_appointment_types",
        id: created.id,
        expectedVersion: created.version,
        position: 1,
      }),
    ).toMatchObject({ ok: true, version: created.version + 1 });
    all = await types();
    expect(all[0]?.id).toBe(created.id);
    expect(all.map((type) => type.sortOrder)).toEqual(all.map((_, index) => index + 1));

    // Booked once, it turns off instead of deleting; the booking keeps it.
    const booked = await fixture.save({
      ...fixture.booking("10:00"),
      command: {
        ...fixture.booking("10:00").command,
        appointmentTypeId: created.id,
        expectedTypeVersion: created.version + 1,
      },
    });
    if (!booked.ok) throw new Error(`Booking failed: ${booked.code}`);
    expect(
      await saveSettings(db, actor, {
        kind: "delete_appointment_type",
        id: created.id,
        expectedVersion: created.version + 1,
      }),
    ).toEqual({ ok: false, code: "type_in_use" });
    expect(
      await saveSettings(db, actor, {
        kind: "set_appointment_type_active",
        id: created.id,
        expectedVersion: created.version + 1,
        active: false,
      }),
    ).toMatchObject({ ok: true, version: created.version + 2 });
    const catalog = await db.rpc("portal_scheduling_catalog", {
      p_actor_id: actor,
      p_entity: "appointment_type",
      p_query: "",
      p_active: true,
      p_limit: 100,
      p_after_name: null,
      p_after_id: null,
    });
    expect(JSON.stringify(catalog.data)).not.toContain(created.id);
    expect(await fixture.save(fixture.booking("13:00", 1))).toMatchObject({ ok: true });
    const kept = await db
      .from("appointments")
      .select("appointment_type_id, status")
      .eq("id", booked.id)
      .single();
    expect(kept.data).toEqual({ appointment_type_id: created.id, status: "scheduled" });
    // Undo turns it back on.
    expect(
      await saveSettings(db, actor, {
        kind: "set_appointment_type_active",
        id: created.id,
        expectedVersion: created.version + 2,
        active: true,
      }),
    ).toMatchObject({ ok: true, version: created.version + 3 });
    all = await types();
    expect(all.find((type) => type.id === created.id)).toMatchObject({ active: true, used: true });

    // Back to the end, so the shared database keeps its order, then a fresh type deletes.
    expect(
      await saveSettings(db, actor, {
        kind: "reorder_appointment_types",
        id: created.id,
        expectedVersion: created.version + 3,
        position: count,
      }),
    ).toMatchObject({ ok: true });
    const spare = await saveSettings(db, actor, {
      kind: "save_appointment_type",
      id: null,
      expectedVersion: null,
      name: "TEST settings-types Spare",
      durationMinutes: 15,
      bufferBeforeMinutes: 0,
      bufferAfterMinutes: 0,
      icon: "pill",
      description: null,
      providerIds: [],
    });
    if (!spare.ok) throw new Error("Spare type failed");
    expect(
      await saveSettings(db, actor, {
        kind: "delete_appointment_type",
        id: spare.id,
        expectedVersion: spare.version,
      }),
    ).toMatchObject({ ok: true });
    expect((await types()).some((type) => type.id === spare.id)).toBe(false);
  } finally {
    await fixture.dispose();
  }
});
