import { randomUUID } from "node:crypto";

import { expect, test } from "@playwright/test";
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  activityActor,
  phraseActivityRow,
} from "../../src/app/admin/(portal)/audit/activity-model";
import {
  APPOINTMENT_ACTIONS,
  ACTIVITY_CATEGORIES,
  activityPageSchema,
} from "../../src/lib/portal/activity-contracts";
import type {
  ActivityCursor,
  ActivityFilters,
  ActivityRow,
} from "../../src/lib/portal/activity-contracts";
import type { SchedulingInput } from "../../src/lib/portal/scheduling/contracts";
import { expectDenied } from "../harness/assert";
import { publishableDb, runId, serviceDb } from "../harness/env";
import { createSchedulingFixture, schedulingFixtureDate } from "../harness/scheduling";
import { attemptSignIn, createStaffFixture, signIn } from "../harness/session";

/* Issue #357: the Activity log's read, at the database. Three histories (the audit log, the
   scheduling changes and the patient revisions) merge into one newest-first stream that pages
   by (occurredAt, id) across days. Each row carries the category its chip filters on and, for an
   appointment, the action its chip filters on; an undo carries the action it undid. Front desk
   sees appointments, requests, the schedule and only their own sign-ins; an admin sees all of
   it. The shared Preview database holds other activity, so every read is scoped to this run's
   word, which starts every fixture name and address. */

type AppointmentCommand = Extract<SchedulingInput, { action: "command" }>["command"];

/** A word only this run's fixtures carry: the run id with its digits spelled as letters. */
const word = `act${runId.replaceAll(/\d/gu, (digit) => "ghijklmnop"[Number(digit)])}`;

async function readActivity(
  db: SupabaseClient,
  actorId: string,
  filters: Readonly<ActivityFilters> = {},
  cursor: Readonly<ActivityCursor> = null,
  limit = 100,
) {
  const result = await db.rpc("portal_read_activity", {
    p_actor_id: actorId,
    p_categories: filters.categories ?? null,
    p_appointment_actions: filters.appointmentActions ?? null,
    p_provider_id: filters.providerId ?? null,
    p_from: filters.from ?? null,
    p_to: filters.to ?? null,
    p_query: filters.query ?? null,
    p_before_at: cursor?.occurredAt ?? null,
    p_before_id: cursor?.id ?? null,
    p_limit: limit,
  });
  expect(result.error).toBeNull();
  return activityPageSchema.parse(result.data);
}

async function rowsOf(
  db: SupabaseClient,
  actorId: string,
  filters: Readonly<ActivityFilters> = {},
): Promise<ActivityRow[]> {
  const page = await readActivity(db, actorId, filters);
  if (!page.ok) throw new Error(`Activity read failed: ${page.code}`);
  expect(page.nextCursor).toBeNull();
  return page.rows;
}

const ids = (rows: readonly ActivityRow[]) => rows.map((row) => row.id);

/** The practice-local calendar date of an instant. */
const dayOf = (instant: string | number) =>
  new Date(instant).toLocaleDateString("en-CA", { timeZone: "America/New_York" });

/** The practice-local calendar date `days` before today. */
const practiceDate = (days: number) => dayOf(Date.now() - days * 86_400_000);

/** Mid-day on that date in New York whether daylight time is on or off. */
const middayOf = (date: string, minute = 0) =>
  new Date(Date.parse(`${date}T16:00:00Z`) + minute * 60_000).toISOString();

test("the log merges audit, scheduling and patient history newest first, pages across days, and filters by chip, provider, date and search", async () => {
  test.setTimeout(180_000);
  const db = serviceDb();
  const fixture = await createSchedulingFixture(db, word);
  const actor = fixture.staff.userId;
  const [p0, p1] = fixture.providerIds;
  try {
    /* Appointments: four booked, one moved to the other provider, one cancelled and the
       cancellation undone, one checked in and completed, one marked a no-show. */
    const date = schedulingFixtureDate();
    const booked: string[] = [];
    for (const [time, index] of [
      ["10:00", 0],
      ["11:00", 1],
      ["15:00", 0],
      ["16:00", 1],
    ] as const) {
      const outcome = await fixture.save(fixture.booking(time, index, index, index));
      if (!outcome.ok) throw new Error(`Booking at ${time} failed`);
      booked.push(outcome.id);
    }
    const [moved, cancelled, seen, missed] = booked;
    const command = async (body: Readonly<AppointmentCommand>) =>
      fixture.save({ action: "command", idempotencyKey: randomUUID(), command: body });
    expect(
      await command({
        kind: "reschedule",
        id: moved,
        expectedVersion: 1,
        providerId: p1,
        locationId: fixture.locationIds[0],
        start: { date, time: "14:00" },
      }),
    ).toMatchObject({ ok: true });
    expect(
      await command({ kind: "cancel", id: cancelled, expectedVersion: 1, reason: "TEST mistake" }),
    ).toMatchObject({ ok: true });
    expect(await command({ kind: "undo", id: cancelled, expectedVersion: 2 })).toMatchObject({
      ok: true,
    });
    /* Check-in needs a visit today and a no-show one already started; booking refuses the
       past, so these two are moved to twenty minutes ago, or to the first minute of today
       just after midnight, before their commands. */
    let startMs = Math.floor((Date.now() - 20 * 60_000) / 60_000) * 60_000;
    while (dayOf(startMs) !== practiceDate(0)) startMs += 60_000;
    const started = new Date(startMs);
    for (const id of [seen, missed]) {
      const update = await db
        .from("appointments")
        .update({
          starts_at: started.toISOString(),
          ends_at: new Date(started.getTime() + 30 * 60_000).toISOString(),
          reserved_from: new Date(started.getTime() - 5 * 60_000).toISOString(),
          reserved_until: new Date(started.getTime() + 35 * 60_000).toISOString(),
        })
        .eq("id", id);
      expect(update.error).toBeNull();
    }
    expect(await command({ kind: "check_in", id: seen, expectedVersion: 1 })).toMatchObject({
      ok: true,
    });
    expect(await command({ kind: "complete", id: seen, expectedVersion: 2 })).toMatchObject({
      ok: true,
    });
    expect(await command({ kind: "no_show", id: missed, expectedVersion: 1 })).toMatchObject({
      ok: true,
    });

    /* Earlier days: request notes, a sign-in and a print packet in the audit log (two notes
       share an instant, so the id breaks the tie), a schedule change and a patient revision. */
    const [d1, d2, d3] = [practiceDate(1), practiceDate(2), practiceDate(3)];
    const audit = (action: string, entity: string, at: string, detail = {}) => ({
      id: randomUUID(),
      actor_email: fixture.staff.email,
      action,
      entity,
      entity_id: entity === "staff" ? actor : randomUUID(),
      source: "staff",
      detail,
      at,
    });
    const audits = [
      audit("request.note", "requests", middayOf(d1, 5), { length: 12 }),
      audit("request.note", "requests", middayOf(d3, 5), { length: 30 }),
      audit("request.note", "requests", middayOf(d3, 5), { length: 31 }),
      audit("auth.sign_in", "staff", middayOf(d1)),
      audit("requests.print_new", "requests", middayOf(d2), {
        row_count: 0,
        status_filter: "new",
        request_ids: [],
      }),
      // A mirror of an appointment command: the scheduling row is the one the log shows.
      audit("appointment.book", "appointments", middayOf(d2, 1)),
    ];
    expect((await db.from("audit_log").insert(audits)).error).toBeNull();
    const schedule = await db.from("scheduling_changes").insert({
      entity: "provider",
      entity_id: p1,
      provider_id: p1,
      version: 1000,
      command: "save_provider",
      before_record: null,
      after_record: {},
      actor_id: actor,
      actor_email: fixture.staff.email,
      occurred_at: middayOf(d2, 3),
    });
    expect(schedule.error).toBeNull();
    const revision = await db.from("patient_revisions").insert({
      patient_id: fixture.patientIds[1],
      version: 1000,
      command: "update",
      before_record: {},
      after_record: {},
      actor_id: actor,
      actor_email: fixture.staff.email,
      occurred_at: middayOf(d3, 9),
    });
    expect(revision.error).toBeNull();

    // The whole stream: 24 rows from three sources, newest first, ties broken by id.
    const all = await rowsOf(db, actor, { query: word });
    const count = (category: string) => all.filter((row) => row.category === category).length;
    expect({
      total: all.length,
      appointments: count("appointments"),
      requests: count("requests"),
      schedule: count("schedule"),
      sign_ins: count("sign_ins"),
      settings: count("settings"),
    }).toEqual({ total: 24, appointments: 10, requests: 6, schedule: 6, sign_ins: 1, settings: 1 });
    expect(new Set(all.map((row) => row.source))).toEqual(
      new Set(["audit", "scheduling", "patient"]),
    );
    for (let i = 1; i < all.length; i++) {
      const [a, b] = [all[i - 1], all[i]];
      const order = Date.parse(a.occurredAt) - Date.parse(b.occurredAt) || (a.id > b.id ? 1 : -1);
      expect(order, `${a.action} before ${b.action}`).toBeGreaterThan(0);
    }
    expect(all.some((row) => row.action === "appointment.book")).toBe(false);
    for (const row of all) {
      expect(phraseActivityRow(row, new Date()).technical, row.action).toBe(false);
      expect(activityActor(row)).toBe("TEST Scheduling Admin");
    }

    // Paging four at a time walks the same stream across four days and stops.
    const pages: ActivityRow[][] = [];
    let cursor: ActivityCursor = null;
    for (;;) {
      const page = await readActivity(db, actor, { query: word }, cursor, 4);
      if (!page.ok) throw new Error(page.code);
      expect(page.counts === null).toBe(cursor !== null);
      pages.push(page.rows);
      if (page.nextCursor === null) break;
      expect(page.nextCursor).toEqual({ occurredAt: page.rows[3].occurredAt, id: page.rows[3].id });
      cursor = page.nextCursor;
    }
    expect(pages.map((page) => page.length)).toEqual([4, 4, 4, 4, 4, 4]);
    expect(pages.flat().map((row) => row.id)).toEqual(ids(all));
    expect(new Set(all.map((row) => dayOf(row.occurredAt))).size).toBe(4);
    // Today's seventeen rows end inside the fifth page, so the last cursor is on an earlier day.
    expect(pages.slice(0, -1).map((page) => dayOf(page[3].occurredAt))).toEqual([
      ...Array.from({ length: 4 }, () => practiceDate(0)),
      practiceDate(2),
    ]);

    // Every category chip.
    for (const category of ACTIVITY_CATEGORIES) {
      const page = await readActivity(db, actor, { categories: [category], query: word });
      if (!page.ok) throw new Error(page.code);
      expect(ids(page.rows), category).toEqual(ids(all.filter((row) => row.category === category)));
      expect(page.counts?.hidden, category).toBeGreaterThan(0);
    }
    expect(
      ids(await rowsOf(db, actor, { categories: ["sign_ins", "settings"], query: word })),
    ).toEqual(ids(all.filter((row) => ["sign_ins", "settings"].includes(row.category))));

    // Every appointment chip; an undo counts as the action it undid.
    const actionCounts = Object.fromEntries(
      await Promise.all(
        APPOINTMENT_ACTIONS.map(async (action) => {
          const rows = await rowsOf(db, actor, {
            categories: ["appointments"],
            appointmentActions: [action],
            query: word,
          });
          expect(ids(rows), action).toEqual(
            ids(all.filter((row) => row.appointmentAction === action)),
          );
          return [action, rows.length] as const;
        }),
      ),
    );
    expect(actionCounts).toEqual({
      booked: 4,
      moved: 1,
      cancelled: 2,
      checked_in: 1,
      no_show: 1,
      completed: 1,
    });
    // Without a category, an action narrows only the appointments.
    expect(ids(await rowsOf(db, actor, { appointmentActions: ["moved"], query: word }))).toEqual(
      ids(
        all.filter((row) => row.category !== "appointments" || row.appointmentAction === "moved"),
      ),
    );

    const move = all.find((row) => row.appointmentAction === "moved");
    expect(move).toMatchObject({
      source: "scheduling",
      action: "reschedule",
      via: null,
      appointmentId: moved,
      patientId: fixture.patientIds[0],
      patientName: `TEST ${word} First`,
      providerId: p1,
      providerName: `TEST ${word} Second`,
      priorProviderId: p0,
      priorProviderName: `TEST ${word} First`,
    });
    expect(Date.parse(move?.priorAppointmentStart ?? "")).toBeLessThan(
      Date.parse(move?.appointmentStart ?? ""),
    );
    const undo = all.find((row) => row.action === "undo");
    expect(undo).toMatchObject({
      appointmentAction: "cancelled",
      via: "undo",
      appointmentId: cancelled,
    });
    if (undo === undefined || move === undefined) throw new Error("Missing appointment rows");
    expect(phraseActivityRow(undo, new Date()).sentence).toMatch(
      new RegExp(`^undid cancelling TEST ${word} Second's .+ appointment$`, "u"),
    );
    expect(phraseActivityRow(move, new Date()).sentence).toMatch(
      new RegExp(`^moved TEST ${word} First to .+ at .+ with TEST ${word} Second$`, "u"),
    );
    expect(all.find((row) => row.category === "sign_ins")).toMatchObject({
      action: "auth.sign_in",
      entity: "staff",
      entityId: actor,
    });

    // A provider: everything about them, including a visit moved away from them.
    for (const provider of [p0, p1]) {
      expect(ids(await rowsOf(db, actor, { providerId: provider })), provider).toEqual(
        ids(all.filter((row) => row.providerId === provider || row.priorProviderId === provider)),
      );
    }
    expect(ids(await rowsOf(db, actor, { providerId: p0 }))).toContain(move.id);

    // Dates are inclusive practice-local days.
    const onDays = (from: string, to: string) =>
      ids(all.filter((row) => dayOf(row.occurredAt) >= from && dayOf(row.occurredAt) <= to));
    expect(ids(await rowsOf(db, actor, { from: d2, to: d2, query: word }))).toEqual(onDays(d2, d2));
    expect(onDays(d2, d2)).toHaveLength(2);
    expect(ids(await rowsOf(db, actor, { from: d3, to: d1, query: word }))).toEqual(onDays(d3, d1));
    expect(onDays(d3, d1)).toHaveLength(7);
    const today = practiceDate(0);
    expect(ids(await rowsOf(db, actor, { from: today, query: word }))).toEqual(
      onDays(today, today),
    );
    expect(ids(await rowsOf(db, actor, { to: d1, query: word }))).toEqual(onDays(d3, d1));

    /* Search: every word must start a word of the row's actor, patient, provider, location,
       type or action. */
    expect(ids(await rowsOf(db, actor, { query: `${word} rescheduled` }))).toEqual([move.id]);
    expect(ids(await rowsOf(db, actor, { query: `NO-SHOW ${word}` }))).toEqual(
      ids(all.filter((row) => row.appointmentAction === "no_show")),
    );
    const second = [fixture.patientIds[1], p1, fixture.locationIds[1]];
    expect(ids(await rowsOf(db, actor, { query: `secon ${word}` }))).toEqual(
      ids(
        all.filter((row) =>
          [row.patientId, row.providerId, row.priorProviderId, row.locationId].some((id) =>
            second.includes(id ?? ""),
          ),
        ),
      ),
    );
    expect(await rowsOf(db, actor, { query: `${word} econd` })).toEqual([]);
    expect(await readActivity(db, actor, { query: "a b c d e f g h i" })).toEqual({
      ok: false,
      code: "invalid_command",
    });
    expect(await readActivity(db, actor, { query: "x".repeat(201) })).toEqual({
      ok: false,
      code: "invalid_command",
    });
    expect(await readActivity(db, actor, { from: d1, to: d2 })).toEqual({
      ok: false,
      code: "invalid_command",
    });
    const half = await db.rpc("portal_read_activity", {
      p_actor_id: actor,
      p_before_at: new Date().toISOString(),
    });
    expect(half.data).toEqual({ ok: false, code: "invalid_command" });
  } finally {
    await fixture.dispose();
  }
});

test("front desk sees appointments, requests, the schedule and only their own sign-ins; an admin sees everyone's", async () => {
  const db = serviceDb();
  const fixture = await createSchedulingFixture(db, `${word}-admin`);
  const desk = await createStaffFixture(db, {
    prefix: `${word}-desk`,
    displayName: "TEST Front Desk",
    role: "staff",
  });
  try {
    const booked = await fixture.save(fixture.booking("10:00"));
    expect(booked).toMatchObject({ ok: true });
    const at = new Date(Date.now() - 60_000).toISOString();
    const row = (email: string, action: string, entity: string, entityId: string | null) => ({
      actor_email: email,
      action,
      entity,
      entity_id: entityId,
      source: "staff",
      detail: {},
      at,
    });
    expect(
      (
        await db
          .from("audit_log")
          .insert([
            row(desk.email, "auth.sign_in", "staff", desk.userId),
            row(fixture.staff.email, "auth.sign_in", "staff", fixture.staff.userId),
            row(fixture.staff.email, "staff.role", "staff_profiles", null),
            row(fixture.staff.email, "requests.export", "requests", null),
          ])
      ).error,
    ).toBeNull();

    const deskRows = await rowsOf(db, desk.userId, { query: word });
    expect(new Set(deskRows.map((r) => r.category))).toEqual(
      new Set(["appointments", "requests", "schedule", "sign_ins"]),
    );
    expect(deskRows.filter((r) => r.category === "sign_ins").map((r) => r.actorEmail)).toEqual([
      desk.email,
    ]);
    expect(await rowsOf(db, desk.userId, { categories: ["settings"], query: word })).toEqual([]);

    const adminRows = await rowsOf(db, fixture.staff.userId, { query: word });
    expect(
      adminRows
        .filter((r) => r.category === "sign_ins")
        .map((r) => r.actorEmail)
        .toSorted(),
    ).toEqual([desk.email, fixture.staff.email].toSorted());
    expect(
      adminRows
        .filter((r) => r.category === "settings")
        .map((r) => r.action)
        .toSorted(),
    ).toEqual(["requests.export", "staff.role"]);
    // Front desk's view is the admin's without the settings and the other person's sign-in.
    expect(ids(deskRows)).toEqual(
      ids(
        adminRows.filter(
          (r) =>
            r.category !== "settings" &&
            !(r.category === "sign_ins" && r.actorEmail !== desk.email),
        ),
      ),
    );

    expect(await readActivity(db, randomUUID())).toEqual({ ok: false, code: "unauthorized" });
    const off = await db
      .from("staff_profiles")
      .update({ active: false })
      .eq("user_id", desk.userId);
    expect(off.error).toBeNull();
    expect(await readActivity(db, desk.userId)).toEqual({ ok: false, code: "unauthorized" });
  } finally {
    await db.from("audit_log").delete().eq("actor_email", desk.email);
    await desk.dispose();
    await fixture.dispose();
  }
});

test("a successful sign-in writes the log's sign-in row and a refused one writes nothing", async ({
  page,
}) => {
  const db = serviceDb();
  const staff = await createStaffFixture(db, {
    prefix: `${word}-signin`,
    displayName: "TEST Signing In",
    role: "staff",
  });
  const signIns = async () => {
    const result = await db
      .from("audit_log")
      .select("action, entity, entity_id, source, detail")
      .eq("actor_email", staff.email)
      .eq("action", "auth.sign_in");
    expect(result.error).toBeNull();
    return result.data ?? [];
  };
  try {
    await attemptSignIn(page, { email: staff.email, password: `${staff.password}x` });
    await expect(page.locator("#login-error")).toBeVisible();
    expect(await signIns()).toEqual([]);

    await signIn(page, staff);
    await expect.poll(signIns).toEqual([
      {
        action: "auth.sign_in",
        entity: "staff",
        entity_id: staff.userId,
        source: "staff",
        detail: {},
      },
    ]);
    const rows = await rowsOf(db, staff.userId, { categories: ["sign_ins"], query: word });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      source: "audit",
      category: "sign_ins",
      actorEmail: staff.email,
      actorName: "TEST Signing In",
      via: null,
    });
    expect(`${activityActor(rows[0])} ${phraseActivityRow(rows[0], new Date()).sentence}`).toBe(
      "TEST Signing In signed in",
    );
  } finally {
    await db.from("audit_log").delete().eq("actor_email", staff.email);
    await staff.dispose();
  }
});

test("browser roles cannot read the log or the audit log behind it", async () => {
  const db = serviceDb();
  const browser = publishableDb();
  const staff = await createStaffFixture(db, {
    prefix: `${word}-browser`,
    displayName: "TEST Browser",
    role: "admin",
  });
  try {
    const args = { p_actor_id: staff.userId, p_query: word };
    const rowsArgs = {
      p_viewer_email: staff.email,
      p_admin: true,
      p_categories: null,
      p_appointment_actions: null,
      p_provider_id: null,
      p_from: "-infinity",
      p_until: "infinity",
      p_hits: null,
      p_full: null,
      p_before_at: "infinity",
      p_before_id: "ffffffff-ffff-ffff-ffff-ffffffffffff",
      p_limit: 5,
    };
    for (const signedIn of [false, true]) {
      if (signedIn) expect((await browser.auth.signInWithPassword(staff)).error).toBeNull();
      expectDenied(await browser.rpc("portal_read_activity", args));
      expectDenied(await browser.rpc("portal_activity_rows", rowsArgs));
      expectDenied(await browser.from("audit_log").select("id").limit(1));
      expectDenied(await browser.from("scheduling_changes").select("id").limit(1));
      expectDenied(await browser.from("patient_revisions").select("id").limit(1));
    }
  } finally {
    await browser.auth.signOut();
    await db.from("audit_log").delete().eq("actor_email", staff.email);
    await staff.dispose();
  }
});
