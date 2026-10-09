import { createHmac, randomUUID } from "node:crypto";

import { expect } from "@playwright/test";
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  clinicalCommandOutcomeSchema,
  clinicalInputSchema,
} from "../../src/lib/portal/clinical/contracts";
import type { ClinicalInput } from "../../src/lib/portal/clinical/contracts";
import {
  clinicalListDatabaseSchema,
  clinicalReadDatabaseSchema,
} from "../../src/lib/portal/clinical/rows";

type ClinicalCommand = Extract<ClinicalInput, { action: "command" }>["command"];
export async function saveClinical(
  db: SupabaseClient,
  actorId: string,
  command: Readonly<ClinicalCommand>,
  idempotencyKey = randomUUID(),
) {
  const parsed = clinicalInputSchema.parse({ action: "command", idempotencyKey, command });
  if (parsed.action !== "command") throw new Error("Expected a clinical command");
  const result = await db.rpc("portal_execute_clinical_command", {
    p_actor_id: actorId,
    p_idempotency_key: idempotencyKey,
    p_fingerprint: createHmac("sha256", "TEST clinical acceptance fixture")
      .update(JSON.stringify({ actorId, command: parsed.command }))
      .digest("hex"),
    p_command: parsed.command,
  });
  expect(result.error).toBeNull();
  return clinicalCommandOutcomeSchema.parse(result.data);
}
export async function readClinical(
  db: SupabaseClient,
  actorId: string,
  recordId: string,
  beforeVersion: number | null = null,
) {
  const result = await db.rpc("portal_read_clinical_record", {
    p_actor_id: actorId,
    p_record_id: recordId,
    p_before_version: beforeVersion,
  });
  expect(result.error).toBeNull();
  return clinicalReadDatabaseSchema.parse(result.data);
}
export async function listClinical(
  db: SupabaseClient,
  actorId: string,
  input: Readonly<Extract<ClinicalInput, { action: "list" }>>,
) {
  const parsed = clinicalInputSchema.parse(input);
  if (parsed.action !== "list") throw new Error("Expected a clinical list query");
  const result = await db.rpc("portal_list_patient_clinical_records", {
    p_actor_id: actorId,
    p_patient_id: parsed.patientId,
    p_query: parsed.query,
    p_status: parsed.status,
    p_record_kind: parsed.kind,
    p_limit: parsed.limit,
    p_after_created_at: parsed.after?.createdAt ?? null,
    p_after_id: parsed.after?.id ?? null,
  });
  expect(result.error).toBeNull();
  return clinicalListDatabaseSchema.parse(result.data);
}
export async function removeClinical(
  db: SupabaseClient,
  patientIds: readonly string[],
  signerIds: readonly string[] = [],
) {
  if (patientIds.length > 0)
    expect(
      (await db.from("patient_clinical_records").delete().in("patient_id", patientIds)).error,
    ).toBeNull();
  if (signerIds.length > 0)
    expect((await db.from("clinical_signers").delete().in("user_id", signerIds)).error).toBeNull();
}
