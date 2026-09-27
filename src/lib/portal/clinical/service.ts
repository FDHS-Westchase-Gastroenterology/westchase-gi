import "server-only";

import { createHmac } from "node:crypto";

import type { SupabaseClient } from "@supabase/supabase-js";

import { clinicalCommandOutcomeSchema, clinicalInputSchema } from "./contracts";
import type { ClinicalInput, ClinicalOutcome } from "./contracts";
import {
  clinicalListDatabaseSchema,
  clinicalReadDatabaseSchema,
  clinicalSignersDatabaseSchema,
} from "./rows";

export async function executeClinicalOperation(
  db: SupabaseClient,
  actorId: string,
  input: Readonly<ClinicalInput>,
): Promise<ClinicalOutcome> {
  const parsed = clinicalInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "invalid_command" };
  const operation = parsed.data;
  switch (operation.action) {
    case "command": {
      const configuredKey = process.env.WORKFLOW_COMMAND_HMAC_KEY?.trim();
      const key =
        configuredKey !== undefined && configuredKey !== ""
          ? configuredKey
          : process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
      if (key === undefined || key === "") return { ok: false, code: "unavailable" };
      const fingerprint = createHmac("sha256", key)
        .update("wgi:clinical-command:v1\0")
        .update(JSON.stringify({ actorId, command: operation.command }))
        .digest("hex");
      const result = await db
        .rpc("portal_execute_clinical_command", {
          p_actor_id: actorId,
          p_idempotency_key: operation.idempotencyKey,
          p_fingerprint: fingerprint,
          p_command: operation.command,
        })
        .abortSignal(AbortSignal.timeout(10_000));
      if (result.error !== null) return { ok: false, code: "unavailable" };
      const outcome = clinicalCommandOutcomeSchema.safeParse(result.data);
      return outcome.success ? outcome.data : { ok: false, code: "unavailable" };
    }
    case "list": {
      const result = await db
        .rpc("portal_list_patient_clinical_records", {
          p_actor_id: actorId,
          p_patient_id: operation.patientId,
          p_query: operation.query,
          p_status: operation.status,
          p_record_kind: operation.kind,
          p_limit: operation.limit,
          p_after_created_at: operation.after?.createdAt ?? null,
          p_after_id: operation.after?.id ?? null,
        })
        .abortSignal(AbortSignal.timeout(10_000));
      if (result.error !== null) return { ok: false, code: "unavailable" };
      const outcome = clinicalListDatabaseSchema.safeParse(result.data);
      return outcome.success ? outcome.data : { ok: false, code: "unavailable" };
    }
    case "read": {
      const result = await db
        .rpc("portal_read_clinical_record", {
          p_actor_id: actorId,
          p_record_id: operation.recordId,
          p_before_version: operation.beforeVersion,
        })
        .abortSignal(AbortSignal.timeout(10_000));
      if (result.error !== null) return { ok: false, code: "unavailable" };
      const outcome = clinicalReadDatabaseSchema.safeParse(result.data);
      return outcome.success ? outcome.data : { ok: false, code: "unavailable" };
    }
    case "signers": {
      const result = await db
        .rpc("portal_list_clinical_signers", {
          p_actor_id: actorId,
          p_after_user_id: operation.afterUserId,
          p_limit: operation.limit,
        })
        .abortSignal(AbortSignal.timeout(10_000));
      if (result.error !== null) return { ok: false, code: "unavailable" };
      const outcome = clinicalSignersDatabaseSchema.safeParse(result.data);
      return outcome.success ? outcome.data : { ok: false, code: "unavailable" };
    }
  }
  return { ok: false, code: "invalid_command" };
}
