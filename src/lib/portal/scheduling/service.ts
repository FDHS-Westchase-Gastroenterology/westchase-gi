import "server-only";

import { createHmac } from "node:crypto";

import type { SupabaseClient } from "@supabase/supabase-js";

import { schedulingCommandOutcomeSchema, schedulingInputSchema } from "./contracts";
import type { SchedulingInput, SchedulingOutcome } from "./contracts";
import {
  dayHoursCommandInputSchema,
  dayHoursCommandOutcomeSchema,
  dayHoursOutcomeSchema,
  dayHoursUndoInputSchema,
  dayHoursUndoOutcomeSchema,
} from "./day-hours-contracts";
import type {
  DayHoursCommandInput,
  DayHoursCommandOutcome,
  DayHoursOutcome,
  DayHoursUndoInput,
  DayHoursUndoOutcome,
} from "./day-hours-contracts";
import {
  canPlaceOutcomeSchema,
  dayScheduleOutcomeSchema,
  rememberWeekProviderOutcomeSchema,
  weekProviderOutcomeSchema,
  weekScheduleOutcomeSchema,
} from "./grid-contracts";
import {
  appointmentAvailabilityOutcomeSchema,
  monthAvailabilityOutcomeSchema,
  monthSummaryOutcomeSchema,
} from "./read-contracts";
import {
  appointmentListDatabaseSchema,
  appointmentReadDatabaseSchema,
  schedulingCatalogDatabaseSchema,
  schedulingConfigDatabaseSchema,
} from "./rows";
import {
  schedulingSettingsCommandInputSchema,
  schedulingSettingsOutcomeSchema,
  settingsCommandOutcomeSchema,
} from "./settings-contracts";
import type {
  SchedulingSettingsCommandInput,
  SchedulingSettingsOutcome,
  SettingsCommandOutcome,
} from "./settings-contracts";
import { resolveAppointmentStart } from "./time";

// Signs a command's serialized intent; null when the server holds no signing key.
function commandFingerprint(intent: string) {
  const configuredKey = process.env.WORKFLOW_COMMAND_HMAC_KEY?.trim();
  const key =
    configuredKey !== undefined && configuredKey !== ""
      ? configuredKey
      : process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (key === undefined || key === "") return null;
  return createHmac("sha256", key)
    .update("wgi:scheduling-command:v1\0")
    .update(intent)
    .digest("hex");
}

export async function executeSchedulingOperation(
  db: SupabaseClient,
  actorId: string,
  input: Readonly<SchedulingInput>,
): Promise<SchedulingOutcome> {
  const parsed = schedulingInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "invalid_command" };
  const operation = parsed.data;
  if (operation.action === "configure" || operation.action === "command") {
    // Hash the validated intent before resolving a date; retries keep their original meaning.
    // Omitted coordination fields retain the fingerprint used before this contract existed.
    const intent = Object.fromEntries(
      Object.entries(operation.command).filter(
        ([field, value]) =>
          value !== null ||
          (field !== "requestVersion" && field !== "callAgainOn" && field !== "requestOutcome"),
      ),
    );
    const fingerprint = commandFingerprint(
      JSON.stringify({ actorId, action: operation.action, command: intent }),
    );
    if (fingerprint === null) return { ok: false, code: "unavailable" };
    let command;
    if (operation.command.kind === "book" || operation.command.kind === "reschedule") {
      const { start, ...fields } = operation.command;
      const startsAt = resolveAppointmentStart(start);
      if (startsAt === null) return { ok: false, code: "invalid_local_time" };
      command = { ...fields, startsAt };
    } else if (operation.command.kind === "cancel") {
      const { callAgainOn, ...fields } = operation.command;
      const callAgainAt =
        callAgainOn === null ? null : resolveAppointmentStart({ date: callAgainOn, time: "08:00" });
      if (callAgainOn !== null && callAgainAt === null)
        return { ok: false, code: "invalid_local_time" };
      command = { ...fields, callAgainAt };
    } else command = operation.command;
    const result = await db
      .rpc(
        operation.action === "configure"
          ? "portal_save_scheduling_config"
          : "portal_execute_appointment_command",
        {
          p_actor_id: actorId,
          p_idempotency_key: operation.idempotencyKey,
          p_fingerprint: fingerprint,
          p_command: command,
        },
      )
      .abortSignal(AbortSignal.timeout(10_000));
    if (result.error !== null) return { ok: false, code: "unavailable" };
    const outcome = schedulingCommandOutcomeSchema.safeParse(result.data);
    return outcome.success ? outcome.data : { ok: false, code: "unavailable" };
  }
  switch (operation.action) {
    case "availability": {
      const result = await db
        .rpc("portal_available_appointment_slots", {
          p_actor_id: actorId,
          p_provider_id: operation.providerId,
          p_location_id: operation.locationId,
          p_date: operation.date,
          p_appointment_type_id: operation.appointmentTypeId,
          p_patient_id: operation.patientId,
          p_appointment_id: operation.appointmentId,
          p_interval_minutes: operation.intervalMinutes,
        })
        .abortSignal(AbortSignal.timeout(10_000));
      if (result.error !== null) return { ok: false, code: "unavailable" };
      const outcome = appointmentAvailabilityOutcomeSchema.safeParse(result.data);
      return outcome.success ? outcome.data : { ok: false, code: "unavailable" };
    }
    case "catalog": {
      const result = await db
        .rpc("portal_scheduling_catalog", {
          p_actor_id: actorId,
          p_entity: operation.entity,
          p_query: operation.query,
          p_active: operation.active,
          p_limit: operation.limit,
          p_after_name: operation.after?.name ?? null,
          p_after_id: operation.after?.id ?? null,
        })
        .abortSignal(AbortSignal.timeout(10_000));
      if (result.error !== null) return { ok: false, code: "unavailable" };
      const outcome = schedulingCatalogDatabaseSchema.safeParse(result.data);
      return outcome.success ? outcome.data : { ok: false, code: "unavailable" };
    }
    case "read_config": {
      const result = await db
        .rpc("portal_read_scheduling_config", {
          p_actor_id: actorId,
          p_entity: operation.entity,
          p_id: operation.id,
          p_history_before: operation.historyBefore,
        })
        .abortSignal(AbortSignal.timeout(10_000));
      if (result.error !== null) return { ok: false, code: "unavailable" };
      const outcome = schedulingConfigDatabaseSchema.safeParse(result.data);
      return outcome.success ? outcome.data : { ok: false, code: "unavailable" };
    }
    case "appointments": {
      const result = await db
        .rpc("portal_list_appointments", {
          p_actor_id: actorId,
          p_from: operation.from,
          p_to: operation.to,
          p_patient_id: operation.patientId,
          p_provider_id: operation.providerId,
          p_location_id: operation.locationId,
          p_statuses: operation.statuses,
          p_limit: operation.limit,
          p_after_start: operation.after?.startsAt ?? null,
          p_after_id: operation.after?.id ?? null,
        })
        .abortSignal(AbortSignal.timeout(10_000));
      if (result.error !== null) return { ok: false, code: "unavailable" };
      const outcome = appointmentListDatabaseSchema.safeParse(result.data);
      return outcome.success ? outcome.data : { ok: false, code: "unavailable" };
    }
    case "read_appointment": {
      const result = await db
        .rpc("portal_read_appointment", {
          p_actor_id: actorId,
          p_id: operation.id,
          p_history_before: operation.historyBefore,
        })
        .abortSignal(AbortSignal.timeout(10_000));
      if (result.error !== null) return { ok: false, code: "unavailable" };
      const outcome = appointmentReadDatabaseSchema.safeParse(result.data);
      return outcome.success ? outcome.data : { ok: false, code: "unavailable" };
    }
    case "month_summary": {
      const result = await db
        .rpc("portal_schedule_month_summary", {
          p_actor_id: actorId,
          p_month: `${operation.month}-01`,
          p_location_id: operation.locationId,
          p_appointment_type_id: operation.appointmentTypeId,
        })
        .abortSignal(AbortSignal.timeout(10_000));
      if (result.error !== null) return { ok: false, code: "unavailable" };
      const outcome = monthSummaryOutcomeSchema.safeParse(result.data);
      return outcome.success ? outcome.data : { ok: false, code: "unavailable" };
    }
    case "month_availability": {
      const result = await db
        .rpc("portal_schedule_month_availability", {
          p_actor_id: actorId,
          p_month: `${operation.month}-01`,
          p_appointment_type_id: operation.appointmentTypeId,
          p_request_location: operation.location,
          p_patient_id: operation.patientId,
        })
        .abortSignal(AbortSignal.timeout(10_000));
      if (result.error !== null) return { ok: false, code: "unavailable" };
      const outcome = monthAvailabilityOutcomeSchema.safeParse(result.data);
      return outcome.success ? outcome.data : { ok: false, code: "unavailable" };
    }
    case "week_schedule": {
      const result = await db
        .rpc("portal_schedule_week", {
          p_actor_id: actorId,
          p_week_start: operation.weekStart,
          p_provider_ids: operation.providerIds,
          p_location_id: operation.locationId,
          p_appointment_type_id: operation.appointmentTypeId,
        })
        .abortSignal(AbortSignal.timeout(10_000));
      if (result.error !== null) return { ok: false, code: "unavailable" };
      const outcome = weekScheduleOutcomeSchema.safeParse(result.data);
      return outcome.success ? outcome.data : { ok: false, code: "unavailable" };
    }
    case "day_schedule": {
      const result = await db
        .rpc("portal_schedule_day", {
          p_actor_id: actorId,
          p_date: operation.date,
          p_appointment_type_id: operation.appointmentTypeId,
        })
        .abortSignal(AbortSignal.timeout(10_000));
      if (result.error !== null) return { ok: false, code: "unavailable" };
      const outcome = dayScheduleOutcomeSchema.safeParse(result.data);
      return outcome.success ? outcome.data : { ok: false, code: "unavailable" };
    }
    case "can_place": {
      const result = await db
        .rpc("portal_can_place_appointment", {
          p_actor_id: actorId,
          p_appointment_id: operation.appointmentId,
          p_provider_id: operation.providerId,
          p_location_id: operation.locationId,
          p_starts_at: operation.startsAt,
        })
        .abortSignal(AbortSignal.timeout(10_000));
      if (result.error !== null) return { ok: false, code: "unavailable" };
      const outcome = canPlaceOutcomeSchema.safeParse(result.data);
      return outcome.success ? outcome.data : { ok: false, code: "unavailable" };
    }
    case "week_provider": {
      const result = await db
        .rpc("portal_schedule_week_provider", { p_actor_id: actorId })
        .abortSignal(AbortSignal.timeout(10_000));
      if (result.error !== null) return { ok: false, code: "unavailable" };
      const outcome = weekProviderOutcomeSchema.safeParse(result.data);
      return outcome.success ? outcome.data : { ok: false, code: "unavailable" };
    }
    case "remember_week_provider": {
      const result = await db
        .rpc("portal_remember_week_provider", {
          p_actor_id: actorId,
          p_provider_id: operation.providerId,
        })
        .abortSignal(AbortSignal.timeout(10_000));
      if (result.error !== null) return { ok: false, code: "unavailable" };
      const outcome = rememberWeekProviderOutcomeSchema.safeParse(result.data);
      return outcome.success ? outcome.data : { ok: false, code: "unavailable" };
    }
  }
  return { ok: false, code: "invalid_command" };
}

/* The Settings window's read, for any active staff member. canEdit tells the window whether to
   show edit controls; the commands below enforce the admin gate themselves. */
export async function readSchedulingSettings(
  db: SupabaseClient,
  actorId: string,
): Promise<SchedulingSettingsOutcome> {
  const result = await db
    .rpc("portal_scheduling_settings", { p_actor_id: actorId })
    .abortSignal(AbortSignal.timeout(10_000));
  if (result.error !== null) return { ok: false, code: "unavailable" };
  const outcome = schedulingSettingsOutcomeSchema.safeParse(result.data);
  return outcome.success ? outcome.data : { ok: false, code: "unavailable" };
}

/* One granular Settings command. The database applies the admin gate, the version check and
   the conflict scan; this layer validates the shape and signs the intent. */
export async function executeSchedulingSettingsCommand(
  db: SupabaseClient,
  actorId: string,
  input: Readonly<SchedulingSettingsCommandInput>,
): Promise<SettingsCommandOutcome> {
  const parsed = schedulingSettingsCommandInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "invalid_command" };
  const { idempotencyKey, command } = parsed.data;
  const fingerprint = commandFingerprint(
    JSON.stringify({ actorId, action: "settings_command", command }),
  );
  if (fingerprint === null) return { ok: false, code: "unavailable" };
  const result = await db
    .rpc("portal_save_scheduling_settings", {
      p_actor_id: actorId,
      p_idempotency_key: idempotencyKey,
      p_fingerprint: fingerprint,
      p_command: command,
    })
    .abortSignal(AbortSignal.timeout(10_000));
  if (result.error !== null) return { ok: false, code: "unavailable" };
  const outcome = settingsCommandOutcomeSchema.safeParse(result.data);
  return outcome.success ? outcome.data : { ok: false, code: "unavailable" };
}

/* The Day view's Hours sheet (issue #353): every bookable provider's hours on one day. Admins
   only; the database refuses anyone else. */
export async function readDayHours(
  db: SupabaseClient,
  actorId: string,
  date: string,
): Promise<DayHoursOutcome> {
  const result = await db
    .rpc("portal_day_hours", { p_actor_id: actorId, p_date: date })
    .abortSignal(AbortSignal.timeout(10_000));
  if (result.error !== null) return { ok: false, code: "unavailable" };
  const outcome = dayHoursOutcomeSchema.safeParse(result.data);
  return outcome.success ? outcome.data : { ok: false, code: "unavailable" };
}

/* One provider's hours for a day, or for that weekday from the day on. A dry run answers what
   the change would do and writes nothing; the database applies the admin gate, the version
   check, the office-hours bound and the stranded-booking scan. */
export async function executeDayHoursCommand(
  db: SupabaseClient,
  actorId: string,
  input: Readonly<DayHoursCommandInput>,
): Promise<DayHoursCommandOutcome> {
  const parsed = dayHoursCommandInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "invalid_command" };
  const { idempotencyKey, command } = parsed.data;
  const fingerprint = commandFingerprint(
    JSON.stringify({ actorId, action: "day_hours_command", command }),
  );
  if (fingerprint === null) return { ok: false, code: "unavailable" };
  const result = await db
    .rpc("portal_set_provider_day_hours", {
      p_actor_id: actorId,
      p_idempotency_key: idempotencyKey,
      p_fingerprint: fingerprint,
      p_command: command,
    })
    .abortSignal(AbortSignal.timeout(10_000));
  if (result.error !== null) return { ok: false, code: "unavailable" };
  const outcome = dayHoursCommandOutcomeSchema.safeParse(result.data);
  return outcome.success ? outcome.data : { ok: false, code: "unavailable" };
}

/* Puts a provider's hours back as they were before one day-hours change, when nothing has
   changed them since. */
export async function undoDayHoursChange(
  db: SupabaseClient,
  actorId: string,
  input: Readonly<DayHoursUndoInput>,
): Promise<DayHoursUndoOutcome> {
  const parsed = dayHoursUndoInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "invalid_command" };
  const { idempotencyKey, changeId, expectedVersion } = parsed.data;
  const command = { changeId, expectedVersion };
  const fingerprint = commandFingerprint(
    JSON.stringify({ actorId, action: "day_hours_undo", command }),
  );
  if (fingerprint === null) return { ok: false, code: "unavailable" };
  const result = await db
    .rpc("portal_undo_provider_day_hours", {
      p_actor_id: actorId,
      p_idempotency_key: idempotencyKey,
      p_fingerprint: fingerprint,
      p_command: command,
    })
    .abortSignal(AbortSignal.timeout(10_000));
  if (result.error !== null) return { ok: false, code: "unavailable" };
  const outcome = dayHoursUndoOutcomeSchema.safeParse(result.data);
  return outcome.success ? outcome.data : { ok: false, code: "unavailable" };
}
