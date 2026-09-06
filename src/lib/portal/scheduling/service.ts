import "server-only";

import { createHmac } from "node:crypto";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  appointmentAvailabilityOutcomeSchema,
  schedulingCommandOutcomeSchema,
  schedulingInputSchema,
} from "./contracts";
import type { SchedulingInput, SchedulingOutcome } from "./contracts";
import {
  appointmentListDatabaseSchema,
  appointmentReadDatabaseSchema,
  schedulingCatalogDatabaseSchema,
  schedulingConfigDatabaseSchema,
} from "./rows";
import { resolveAppointmentStart } from "./time";

export async function executeSchedulingOperation(
  db: SupabaseClient,
  actorId: string,
  input: Readonly<SchedulingInput>,
): Promise<SchedulingOutcome> {
  const parsed = schedulingInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "invalid_command" };
  const operation = parsed.data;
  if (operation.action === "configure" || operation.action === "command") {
    const configuredKey = process.env.WORKFLOW_COMMAND_HMAC_KEY?.trim();
    const key =
      configuredKey !== undefined && configuredKey !== ""
        ? configuredKey
        : process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
    if (key === undefined || key === "") return { ok: false, code: "unavailable" };
    // Hash the validated intent before resolving a date; retries keep their original meaning.
    const fingerprint = createHmac("sha256", key)
      .update("wgi:scheduling-command:v1\0")
      .update(JSON.stringify({ actorId, action: operation.action, command: operation.command }))
      .digest("hex");
    let command;
    if (operation.command.kind === "book" || operation.command.kind === "reschedule") {
      const { start, ...fields } = operation.command;
      const startsAt = resolveAppointmentStart(start);
      if (startsAt === null) return { ok: false, code: "invalid_local_time" };
      command = { ...fields, startsAt };
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
  }
  return { ok: false, code: "invalid_command" };
}
