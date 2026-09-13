import { createHmac, randomUUID } from "node:crypto";

import { expect } from "@playwright/test";
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  billingCommandOutcomeSchema,
  billingCommandSchema,
} from "../../src/lib/portal/billing/contracts";
import type { BillingInput } from "../../src/lib/portal/billing/contracts";
import { billingReadDatabaseSchema } from "../../src/lib/portal/billing/rows";

type BillingCommand = Extract<BillingInput, { action: "command" }>["command"];

export async function saveBilling(
  db: SupabaseClient,
  actorId: string,
  input: Readonly<BillingCommand>,
  key = randomUUID(),
) {
  const command = billingCommandSchema.parse(input);
  const result = await db.rpc("portal_execute_billing_command", {
    p_actor_id: actorId,
    p_idempotency_key: key,
    p_fingerprint: createHmac("sha256", "TEST billing acceptance fixture")
      .update(JSON.stringify({ actorId, command }))
      .digest("hex"),
    p_command: command,
  });
  expect(result.error).toBeNull();
  return billingCommandOutcomeSchema.parse(result.data);
}

export async function readBilling(
  db: SupabaseClient,
  actorId: string,
  patientId: string,
  beforeVersion: number | null = null,
) {
  const result = await db.rpc("portal_read_patient_billing", {
    p_actor_id: actorId,
    p_patient_id: patientId,
    p_before_version: beforeVersion,
  });
  expect(result.error).toBeNull();
  return billingReadDatabaseSchema.parse(result.data);
}

export async function removeBilling(db: SupabaseClient, patientIds: readonly string[]) {
  const result = await db.from("patient_billing_accounts").delete().in("patient_id", patientIds);
  expect(result.error).toBeNull();
}
