import "server-only";

import { createHmac } from "node:crypto";

import type { SupabaseClient } from "@supabase/supabase-js";

import { patientCommandInputSchema, patientCommandOutcomeSchema } from "./contracts";
import type { PatientCommandInput, PatientCommandOutcome } from "./contracts";

export async function executePatientCommand(
  db: SupabaseClient,
  actorId: string,
  input: Readonly<PatientCommandInput>,
): Promise<PatientCommandOutcome> {
  const parsed = patientCommandInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "invalid_command" };
  const configuredKey = process.env.WORKFLOW_COMMAND_HMAC_KEY?.trim();
  const key =
    configuredKey !== undefined && configuredKey !== ""
      ? configuredKey
      : process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (key === undefined || key === "") return { ok: false, code: "unavailable" };
  // Identifying fields stay inside a keyed digest, never in receipt or audit metadata.
  const fingerprint = createHmac("sha256", key)
    .update("wgi:patient-command:v1\0")
    .update(JSON.stringify({ actorId, command: parsed.data.command }))
    .digest("hex");
  const result = await db
    .rpc("portal_execute_patient_command", {
      p_actor_id: actorId,
      p_idempotency_key: parsed.data.idempotencyKey,
      p_fingerprint: fingerprint,
      p_command: parsed.data.command,
    })
    .abortSignal(AbortSignal.timeout(10_000));
  if (result.error !== null) return { ok: false, code: "unavailable" };
  const outcome = patientCommandOutcomeSchema.safeParse(result.data);
  return outcome.success ? outcome.data : { ok: false, code: "unavailable" };
}
