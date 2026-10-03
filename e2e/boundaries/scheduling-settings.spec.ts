import { randomUUID } from "node:crypto";

import { expect, test } from "@playwright/test";

import { dayScheduleOutcomeSchema } from "../../src/lib/portal/scheduling/grid-contracts";
import { monthSummaryOutcomeSchema } from "../../src/lib/portal/scheduling/read-contracts";
import { settingsCommandSchema } from "../../src/lib/portal/scheduling/settings-contracts";
import { serviceDb } from "../harness/env";
import {
  createSchedulingFixture,
  readSettings,
  saveSettings,
  schedulingFixtureDate,
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
      hours: [{ ...window, openMinute: 485 }],
    },
    // Two windows on one weekday overlap.
    {
      kind: "set_provider_weekly_hours",
      id,
      expectedVersion: 1,
      hours: [window, { ...window, openMinute: 900, closeMinute: 1080 }],
    },
    // An all-day range carries no minutes; a partial day is one date.
    {
      kind: "add_time_off",
      id,
      expectedVersion: 1,
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
      expectedVersion: 1,
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
        active: true,
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

test("a provider's profile, types and weekly hours change one at a time", async () => {
  const db = serviceDb();
  const fixture = await createSchedulingFixture(db, "settings-provider");
  try {
    const actor = fixture.staff.userId;
    const [providerId, secondId] = fixture.providerIds;
    const [first] = fixture.locationIds;

    const profile = await saveSettings(db, actor, {
      kind: "set_provider_profile",
      id: providerId,
      expectedVersion: 1,
      name: "TEST settings-provider First",
      credentials: "MD · Gastroenterology",
      bookable: true,
      active: true,
    });
    expect(profile).toMatchObject({ ok: true, entity: "provider", id: providerId, version: 2 });
    // A second editor still holding version 1 is told the current version.
    expect(
      await saveSettings(db, actor, {
        kind: "set_provider_profile",
        id: providerId,
        expectedVersion: 1,
        name: "TEST settings-provider First",
        credentials: null,
        bookable: true,
        active: true,
      }),
    ).toEqual({ ok: false, code: "stale_version", currentVersion: 2 });

    // A provider who does not take appointments cannot be booked, and their history stays.
    expect(
      await saveSettings(db, actor, {
        kind: "set_provider_profile",
        id: secondId,
        expectedVersion: 1,
        name: "TEST settings-provider Second",
        credentials: null,
        bookable: false,
        active: true,
      }),
    ).toMatchObject({ ok: true, version: 2 });
    expect(await fixture.save(fixture.booking("10:00", 0, 1))).toMatchObject({
      ok: false,
      code: "provider_not_bookable",
    });

    // A provider who does not see the type is refused on book and on reschedule.
    const booked = await fixture.save(fixture.booking("10:00", 0, 0));
    if (!booked.ok) throw new Error(`Booking failed: ${booked.code}`);
    expect(
      await saveSettings(db, actor, {
        kind: "set_provider_types",
        id: providerId,
        expectedVersion: 2,
        typeIds: [],
      }),
    ).toMatchObject({ ok: true, version: 3 });
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
    const restored = await saveSettings(db, actor, {
      kind: "set_provider_types",
      id: providerId,
      expectedVersion: 3,
      typeIds: [fixture.typeId],
    });
    expect(restored).toMatchObject({ ok: true, version: 4 });

    /* Office hours bound a provider's week: the office cannot close around booked hours, and
       the week cannot reach past the office. */
    const details = {
      kind: "save_location_details",
      id: first,
      expectedVersion: 1,
      name: "TEST settings-provider First",
      street: "1 Test Way",
      city: "Tampa",
      region: "FL",
      postal: "33626",
      mapsQuery: "1 Test Way Tampa FL 33626",
    } as const;
    expect(
      await saveSettings(db, actor, {
        ...details,
        hours: [1, 2, 3, 4, 5].map((weekday) => ({ weekday, openMinute: 540, closeMinute: 1020 })),
      }),
    ).toMatchObject({ ok: false, code: "outside_office_hours" });
    expect(
      await saveSettings(db, actor, {
        ...details,
        hours: [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({
          weekday,
          openMinute: 480,
          closeMinute: 1080,
        })),
      }),
    ).toMatchObject({ ok: true, entity: "location", version: 2 });
    // Four other days plus the booked one, so the week either keeps the booking or strands it.
    const bookedDay = new Date(`${schedulingFixtureDate()}T12:00:00Z`).getUTCDay();
    const otherDays = [0, 1, 2, 3, 4, 5, 6].filter((weekday) => weekday !== bookedDay).slice(0, 4);
    const workDays = [bookedDay, ...otherDays].toSorted((a, b) => a - b);
    const week = (openMinute: number, weekdays: readonly number[] = workDays) =>
      weekdays.map((weekday) => ({ locationId: first, weekday, openMinute, closeMinute: 1020 }));
    expect(
      await saveSettings(db, actor, {
        kind: "set_provider_weekly_hours",
        id: providerId,
        expectedVersion: 4,
        hours: week(450),
      }),
    ).toMatchObject({ ok: false, code: "outside_office_hours" });
    expect(
      await saveSettings(db, actor, {
        kind: "set_provider_weekly_hours",
        id: providerId,
        expectedVersion: 4,
        hours: week(540, otherDays),
      }),
    ).toMatchObject({ ok: false, code: "schedule_in_use" });
    expect(
      await saveSettings(db, actor, {
        kind: "set_provider_weekly_hours",
        id: providerId,
        expectedVersion: 4,
        hours: week(540),
      }),
    ).toMatchObject({ ok: true, version: 5 });

    const read = await readSettings(db, actor);
    if (!read.ok) throw new Error(`Settings read failed: ${read.code}`);
    const provider = read.providers.find((entry) => entry.id === providerId);
    expect(provider).toMatchObject({
      credentials: "MD · Gastroenterology",
      bookable: true,
      typeIds: [fixture.typeId],
      version: 5,
    });
    // The new week starts today; the old rows end yesterday and leave the read.
    expect(
      provider?.hours.map((row) => [row.weekday, row.openMinute, row.closeMinute, row.validTo]),
    ).toEqual(workDays.map((weekday) => [weekday, 540, 1020, null]));
    expect(read.locations.find((entry) => entry.id === first)).toMatchObject({
      street: "1 Test Way",
      postal: "33626",
      version: 2,
    });

    // A new provider is added after every other and sees every active type.
    const added = await saveSettings(db, actor, {
      kind: "add_provider",
      name: "TEST settings-provider Added",
      credentials: "PA-C",
      hours: week(540),
    });
    if (!added.ok) throw new Error(`Add provider failed: ${added.code}`);
    const after = await readSettings(db, actor);
    if (!after.ok) throw new Error(`Settings read failed: ${after.code}`);
    expect(after.providers.at(-1)).toMatchObject({ id: added.id, credentials: "PA-C" });
    expect(after.providers.find((entry) => entry.id === added.id)?.typeIds).toContain(
      fixture.typeId,
    );
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
      expectedVersion: 1,
      startsOn: date,
      endsOn: date,
      allDay: true,
      startMinute: null,
      endMinute: null,
      reason: "conference",
    } as const;

    const preview = await saveSettings(db, actor, { ...timeOff, dryRun: true });
    expect(preview).toMatchObject({ ok: true, dryRun: true, version: 1 });
    if (!preview.ok) throw new Error("Dry run failed");
    expect(preview.conflicts).toEqual([
      expect.objectContaining({
        id: booked.id,
        date,
        appointmentType: "TEST settings-time-off Visit",
        patientName: "TEST settings-time-off First",
      }),
    ]);
    const unchanged = await readSettings(db, actor);
    if (!unchanged.ok) throw new Error("Settings read failed");
    expect(unchanged.providers.find((entry) => entry.id === providerId)?.timeOff).toEqual([]);

    const added = await saveSettings(db, actor, { ...timeOff, dryRun: false });
    expect(added).toMatchObject({ ok: true, version: 2 });
    if (!added.ok) throw new Error("Time off failed");
    expect(added.conflicts?.map((conflict) => conflict.id)).toEqual([booked.id]);
    const appointment = await db.from("appointments").select("status").eq("id", booked.id).single();
    expect(appointment.data).toEqual({ status: "scheduled" });

    const read = await readSettings(db, actor);
    if (!read.ok) throw new Error("Settings read failed");
    const ranges = read.providers.find((entry) => entry.id === providerId)?.timeOff ?? [];
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
        expectedVersion: 2,
        timeOffId: range.id,
      }),
    ).toMatchObject({ ok: true, version: 3 });
  } finally {
    await fixture.dispose();
  }
});

test("a closed day empties the office for everyone and warns about its bookings", async () => {
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
      expectedVersion: 1,
      closedOn: date,
      note: "TEST holiday",
    } as const;

    const preview = await saveSettings(db, actor, { ...closure, dryRun: true });
    if (!preview.ok) throw new Error("Dry run failed");
    expect(preview.conflicts).toEqual([
      expect.objectContaining({ id: booked.id, providerName: "TEST settings-closed First" }),
    ]);
    const closed = await saveSettings(db, actor, { ...closure, dryRun: false });
    expect(closed).toMatchObject({ ok: true, entity: "location", version: 2 });
    expect(
      await saveSettings(db, actor, { ...closure, expectedVersion: 2, dryRun: false }),
    ).toEqual({ ok: false, code: "already_closed" });
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

    const read = await readSettings(db, actor);
    if (!read.ok) throw new Error("Settings read failed");
    const entry = read.locations.find((location) => location.id === first)?.closures[0];
    expect(entry).toMatchObject({ closedOn: date, note: "TEST holiday" });
    if (entry === undefined) throw new Error("No closure");
    expect(
      await saveSettings(db, actor, {
        kind: "remove_location_closure",
        id: first,
        expectedVersion: 2,
        closureId: entry.id,
      }),
    ).toMatchObject({ ok: true, version: 3 });
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
