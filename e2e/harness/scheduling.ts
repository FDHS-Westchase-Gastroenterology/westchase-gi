import { createHmac, randomUUID } from "node:crypto";

import { expect, test } from "@playwright/test";
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  schedulingCommandOutcomeSchema,
  schedulingInputSchema,
} from "../../src/lib/portal/scheduling/contracts";
import type { SchedulingInput } from "../../src/lib/portal/scheduling/contracts";
import {
  dayHoursCommandInputSchema,
  dayHoursCommandOutcomeSchema,
  dayHoursOutcomeSchema,
  dayHoursUndoInputSchema,
  dayHoursUndoOutcomeSchema,
} from "../../src/lib/portal/scheduling/day-hours-contracts";
import type { DayHoursCommand } from "../../src/lib/portal/scheduling/day-hours-contracts";
import {
  schedulingSettingsCommandInputSchema,
  schedulingSettingsOutcomeSchema,
  settingsCommandOutcomeSchema,
} from "../../src/lib/portal/scheduling/settings-contracts";
import type { SettingsCommand } from "../../src/lib/portal/scheduling/settings-contracts";
import { resolveAppointmentStart } from "../../src/lib/portal/scheduling/time";
import { removedRows } from "./cleanup";
import type { RemovedRows } from "./cleanup";
import { removePatients, savePatient } from "./patients";
import { createStaffFixture, removeStaffAccount } from "./session";

type SchedulingWrite = Extract<SchedulingInput, { action: "configure" | "command" }>;

export async function saveScheduling(
  db: SupabaseClient,
  actorId: string,
  input: Readonly<SchedulingWrite>,
) {
  const parsed = schedulingInputSchema.parse(input);
  if (parsed.action !== "configure" && parsed.action !== "command")
    throw new Error("Expected a scheduling command");
  let command;
  if (parsed.command.kind === "book" || parsed.command.kind === "reschedule") {
    const { start, ...fields } = parsed.command;
    const startsAt = resolveAppointmentStart(start);
    if (startsAt === null) throw new Error("Invalid fixture time");
    command = { ...fields, startsAt };
  } else if (parsed.command.kind === "cancel") {
    const { callAgainOn, ...fields } = parsed.command;
    command = {
      ...fields,
      callAgainAt:
        callAgainOn === null ? null : resolveAppointmentStart({ date: callAgainOn, time: "08:00" }),
    };
  } else command = parsed.command;
  const result = await db.rpc(
    parsed.action === "configure"
      ? "portal_save_scheduling_config"
      : "portal_execute_appointment_command",
    {
      p_actor_id: actorId,
      p_idempotency_key: parsed.idempotencyKey,
      p_fingerprint: createHmac("sha256", "TEST scheduling acceptance fixture")
        .update(JSON.stringify({ actorId, action: parsed.action, command: parsed.command }))
        .digest("hex"),
      p_command: command,
    },
  );
  expect(result.error).toBeNull();
  return schedulingCommandOutcomeSchema.parse(result.data);
}

/** One Settings command, as the Settings window's server action sends it. */
export async function saveSettings(
  db: SupabaseClient,
  actorId: string,
  command: Readonly<SettingsCommand>,
) {
  const parsed = schedulingSettingsCommandInputSchema.parse({
    idempotencyKey: randomUUID(),
    command,
  });
  const result = await db.rpc(
    parsed.command.kind === "set_booking_interval"
      ? "portal_set_booking_interval"
      : "portal_save_scheduling_settings",
    {
      p_actor_id: actorId,
      p_idempotency_key: parsed.idempotencyKey,
      p_fingerprint: createHmac("sha256", "TEST scheduling acceptance fixture")
        .update(JSON.stringify({ actorId, action: "settings_command", command: parsed.command }))
        .digest("hex"),
      p_command: parsed.command,
    },
  );
  expect(result.error).toBeNull();
  return settingsCommandOutcomeSchema.parse(result.data);
}

/** Puts the practice's booking interval back, whatever its version; specs that change it restore it. */
export async function restoreBookingInterval(db: SupabaseClient, actorId: string, minutes = 60) {
  const settings = await readSettings(db, actorId);
  if (!settings.ok) throw new Error("Settings read failed");
  if (settings.practice.bookingIntervalMinutes === minutes) return;
  const outcome = await saveSettings(db, actorId, {
    kind: "set_booking_interval",
    id: settings.practice.id,
    expectedVersion: settings.practice.version,
    minutes,
  });
  expect(outcome.ok).toBe(true);
}

/** The Settings window's read. */
export async function readSettings(db: SupabaseClient, actorId: string) {
  const result = await db.rpc("portal_scheduling_settings", { p_actor_id: actorId });
  expect(result.error).toBeNull();
  return schedulingSettingsOutcomeSchema.parse(result.data);
}

/** Sets the appointment types a provider sees, at the types version they have now. */
export async function setProviderTypes(
  db: SupabaseClient,
  actorId: string,
  providerId: string,
  typeIds: readonly string[],
) {
  const read = await readSettings(db, actorId);
  if (!read.ok) throw new Error("Settings read failed");
  const provider = read.providers.find((entry) => entry.id === providerId);
  if (provider === undefined) throw new Error("No such provider in the Settings read");
  return saveSettings(db, actorId, {
    kind: "set_provider_types",
    id: providerId,
    expectedVersion: provider.typesVersion,
    typeIds,
  });
}

type WeekHours = Extract<SettingsCommand, { kind: "set_provider_weekly_hours" }>["hours"];

/** Sets a provider's whole week from today (or `startsOn`), at the hours version it has now. */
export async function setProviderWeek(
  db: SupabaseClient,
  actorId: string,
  providerId: string,
  hours: WeekHours,
  options: Readonly<{ startsOn?: string; keepBooked?: boolean; dryRun?: boolean }> = {},
) {
  const read = await readSettings(db, actorId);
  if (!read.ok) throw new Error("Settings read failed");
  const provider = read.providers.find((entry) => entry.id === providerId);
  if (provider === undefined) throw new Error("No such provider in the Settings read");
  return saveSettings(db, actorId, {
    kind: "set_provider_weekly_hours",
    id: providerId,
    expectedVersion: provider.hoursVersion,
    startsOn: options.startsOn ?? read.today,
    hours,
    keepBooked: options.keepBooked ?? false,
    dryRun: options.dryRun ?? false,
  });
}

interface DayHoursIntent {
  readonly actorId: string;
  readonly action: "day_hours_command" | "day_hours_undo";
  readonly command: Readonly<object>;
}

function fixtureFingerprint(intent: DayHoursIntent) {
  return createHmac("sha256", "TEST scheduling acceptance fixture")
    .update(JSON.stringify(intent))
    .digest("hex");
}

/** The Hours sheet's read of one practice day. */
export async function readDayHours(db: SupabaseClient, actorId: string, date: string) {
  const result = await db.rpc("portal_day_hours", { p_actor_id: actorId, p_date: date });
  expect(result.error).toBeNull();
  return dayHoursOutcomeSchema.parse(result.data);
}

/** One Hours sheet command, as the sheet's server action sends it. */
export async function setDayHours(
  db: SupabaseClient,
  actorId: string,
  command: Readonly<DayHoursCommand>,
) {
  const parsed = dayHoursCommandInputSchema.parse({ idempotencyKey: randomUUID(), command });
  const result = await db.rpc("portal_set_provider_day_hours", {
    p_actor_id: actorId,
    p_idempotency_key: parsed.idempotencyKey,
    p_fingerprint: fixtureFingerprint({
      actorId,
      action: "day_hours_command",
      command: parsed.command,
    }),
    p_command: parsed.command,
  });
  expect(result.error).toBeNull();
  return dayHoursCommandOutcomeSchema.parse(result.data);
}

/** The Hours sheet's undo, as the toast sends it. */
export async function undoDayHours(
  db: SupabaseClient,
  actorId: string,
  change: Readonly<{ changeId: string; expectedVersion: number }>,
) {
  const parsed = dayHoursUndoInputSchema.parse({ idempotencyKey: randomUUID(), ...change });
  const command = { changeId: parsed.changeId, expectedVersion: parsed.expectedVersion };
  const result = await db.rpc("portal_undo_provider_day_hours", {
    p_actor_id: actorId,
    p_idempotency_key: parsed.idempotencyKey,
    p_fingerprint: fixtureFingerprint({ actorId, action: "day_hours_undo", command }),
    p_command: command,
  });
  expect(result.error).toBeNull();
  return dayHoursUndoOutcomeSchema.parse(result.data);
}

export function schedulingFixtureDate(days = 14) {
  return new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
}

/**
 * Removes everything a scheduling fixture's admin created, children before
 * parents: appointments, then providers (their hours go with them), visit
 * types and offices, then patients, the admin's audit rows, and the admin.
 * The fixture's own dispose and global setup's stale-fixture sweep both call
 * it. Every step deletes by owner, so a rerun after an interruption finishes
 * what is left.
 */
export async function removeSchedulingFixture(
  db: SupabaseClient,
  userId: string,
  email: string,
  patientIds: readonly string[],
): Promise<readonly RemovedRows[]> {
  const removed = [
    removedRows(
      "appointments",
      await db.from("appointments").delete({ count: "exact" }).eq("created_by", userId),
    ),
  ];
  for (const table of ["scheduling_providers", "appointment_types", "scheduling_locations"]) {
    removed.push(
      removedRows(table, await db.from(table).delete({ count: "exact" }).eq("created_by", userId)),
    );
  }
  removed.push(...(await removePatients(db, patientIds)));
  removed.push(
    removedRows(
      "audit_log:actor",
      await db.from("audit_log").delete({ count: "exact" }).eq("actor_email", email),
    ),
  );
  removed.push(...(await removeStaffAccount(db, userId)));
  return removed;
}

/* Cleanup this worker's tests registered and have not finished running, in
   the order it was registered. A cleanup leaves only by running to the end. */
const pendingCleanUp = new Set<() => Promise<void>>();

/**
 * Registers cleanup that has to happen even when the test times out, and
 * returns it for the test's own `finally`. Once it has run to the end, the
 * afterEach skips it.
 */
export function registerCleanUp(cleanUp: () => Promise<void>): () => Promise<void> {
  async function run() {
    await cleanUp();
    pendingCleanUp.delete(run);
  }
  pendingCleanUp.add(run);
  return run;
}

/**
 * Runs, after each test in the calling spec file, every cleanup the test
 * registered and did not finish: its scheduling fixtures, a practice setting
 * it held, rows it made outside a fixture. A test that times out is abandoned
 * mid-body, so its `finally` never runs; Playwright still runs afterEach hooks
 * then, on their own timeout. The latest registration runs first, so a setting
 * goes back while the fixture admin who changed it still exists. Call it once
 * at the top level of every spec file that makes scheduling fixtures. Every
 * cleanup runs even when an earlier one fails, and a failure fails the test
 * rather than leaving rows behind unnoticed.
 */
export function disposeSchedulingFixturesAfterEach(): void {
  test.afterEach(async () => {
    const failures: unknown[] = [];
    for (const run of [...pendingCleanUp].reverse()) {
      try {
        await run();
      } catch (error) {
        failures.push(error);
      }
    }
    if (failures.length === 0) return;
    /* The report prints the message, not the errors inside it. */
    const reasons = failures.map((failure) =>
      failure instanceof Error ? failure.message : String(failure),
    );
    throw new AggregateError(failures, `Cleanup after the test failed:\n${reasons.join("\n")}`);
  });
}

/**
 * Records the practice's booking interval as the test found it and registers
 * putting it back, so a test that times out cannot hand a changed interval to
 * the tests after it: the interval is one practice-wide setting that every
 * openings read uses. Hold it after making the fixture whose admin `actorId`
 * is, and before changing the interval. The returned function puts it back at
 * once, for the test's `finally`.
 */
export async function holdBookingInterval(db: SupabaseClient, actorId: string) {
  const settings = await readSettings(db, actorId);
  if (!settings.ok) throw new Error("Settings read failed");
  const found = settings.practice.bookingIntervalMinutes;
  return registerCleanUp(async () => {
    await restoreBookingInterval(db, actorId, found);
  });
}

export async function createSchedulingFixture(db: SupabaseClient, prefix: string) {
  const staff = await createStaffFixture(db, {
    prefix,
    displayName: "TEST Scheduling Admin",
    role: "admin",
  });
  const patientIds: string[] = [];
  const providerIds: string[] = [];
  const locationIds: string[] = [];
  const typeIds: string[] = [];
  const dispose = registerCleanUp(async () => {
    await removeSchedulingFixture(db, staff.userId, staff.email, patientIds);
  });
  async function save(input: Readonly<SchedulingWrite>) {
    return saveScheduling(db, staff.userId, input);
  }
  try {
    for (const label of ["First", "Second"]) {
      const patient = await savePatient(db, staff.userId, {
        kind: "create",
        patient: { name: `TEST ${prefix} ${label}` },
      });
      if (!patient.ok) throw new Error("Scheduling patient fixture failed");
      patientIds.push(patient.patientId);
      const location = await save({
        action: "configure",
        idempotencyKey: randomUUID(),
        command: { kind: "save_location", name: `TEST ${prefix} ${label}` },
      });
      if (!location.ok) throw new Error("Scheduling location fixture failed");
      locationIds.push(location.id);
    }
    const type = await save({
      action: "configure",
      idempotencyKey: randomUUID(),
      command: {
        kind: "save_appointment_type",
        name: `TEST ${prefix} Visit`,
        durationMinutes: 30,
        bufferBeforeMinutes: 5,
        bufferAfterMinutes: 5,
      },
    });
    if (!type.ok) throw new Error("Scheduling type fixture failed");
    const typeId = type.id;
    typeIds.push(typeId);
    const hours = locationIds.flatMap((locationId) =>
      Array.from({ length: 7 }, (_, weekday) => ({
        locationId,
        weekday,
        openMinute: 480,
        closeMinute: 1080,
        validFrom: "2026-01-01",
        validTo: null,
      })),
    );
    for (const label of ["First", "Second"]) {
      const provider = await save({
        action: "configure",
        idempotencyKey: randomUUID(),
        command: {
          kind: "save_provider",
          name: `TEST ${prefix} ${label}`,
          hours,
          exceptions: [],
        },
      });
      if (!provider.ok) throw new Error("Scheduling provider fixture failed");
      providerIds.push(provider.id);
    }
    function booking(time = "10:00", patientIndex = 0, providerIndex = 0, locationIndex = 0) {
      return {
        action: "command",
        idempotencyKey: randomUUID(),
        command: {
          kind: "book",
          patientId: patientIds[patientIndex],
          providerId: providerIds[providerIndex],
          locationId: locationIds[locationIndex],
          appointmentTypeId: typeId,
          expectedTypeVersion: 1,
          start: { date: schedulingFixtureDate(), time },
        },
      } as const;
    }
    return { staff, patientIds, providerIds, locationIds, typeId, hours, save, booking, dispose };
  } catch (error) {
    await dispose();
    throw error;
  }
}
