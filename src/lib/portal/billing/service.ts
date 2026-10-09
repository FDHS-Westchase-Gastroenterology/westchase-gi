import "server-only";

import { createHmac } from "node:crypto";

import type { SupabaseClient } from "@supabase/supabase-js";

import { billingCommandOutcomeSchema, billingInputSchema } from "./contracts";
import type { BillingInput, BillingOutcome } from "./contracts";
import { billingReadDatabaseSchema } from "./rows";

export async function executeBillingOperation(
  db: SupabaseClient,
  actorId: string,
  input: Readonly<BillingInput>,
): Promise<BillingOutcome> {
  const parsed = billingInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "invalid_command" };
  const operation = parsed.data;
  if (operation.action === "read") {
    const result = await db
      .rpc("portal_read_patient_billing", {
        p_actor_id: actorId,
        p_patient_id: operation.patientId,
        p_before_version: operation.beforeVersion,
      })
      .abortSignal(AbortSignal.timeout(10_000));
    if (result.error !== null) return { ok: false, code: "unavailable" };
    const outcome = billingReadDatabaseSchema.safeParse(result.data);
    return outcome.success ? outcome.data : { ok: false, code: "unavailable" };
  }
  const configuredKey = process.env.WORKFLOW_COMMAND_HMAC_KEY?.trim();
  const key =
    configuredKey !== undefined && configuredKey !== ""
      ? configuredKey
      : process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (key === undefined || key === "") return { ok: false, code: "unavailable" };
  const fingerprint = createHmac("sha256", key)
    .update("wgi:billing-command:v1\0")
    .update(JSON.stringify({ actorId, command: operation.command }))
    .digest("hex");
  const result = await db
    .rpc("portal_execute_billing_command", {
      p_actor_id: actorId,
      p_idempotency_key: operation.idempotencyKey,
      p_fingerprint: fingerprint,
      p_command: operation.command,
    })
    .abortSignal(AbortSignal.timeout(10_000));
  if (result.error !== null) return { ok: false, code: "unavailable" };
  const outcome = billingCommandOutcomeSchema.safeParse(result.data);
  return outcome.success ? outcome.data : { ok: false, code: "unavailable" };
}
