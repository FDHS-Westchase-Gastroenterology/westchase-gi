import { createHmac, randomUUID } from "node:crypto";

import { expect } from "@playwright/test";
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  patientCommandInputSchema,
  patientCommandOutcomeSchema,
} from "../../src/lib/portal/patients/contracts";
import type { PatientCommandInput } from "../../src/lib/portal/patients/contracts";

export async function savePatient(
  db: SupabaseClient,
  actorId: string,
  command: Readonly<PatientCommandInput["command"]>,
  idempotencyKey = randomUUID(),
) {
  const normalized = patientCommandInputSchema.parse({ command, idempotencyKey });
  const result = await db.rpc("portal_execute_patient_command", {
    p_actor_id: actorId,
    p_idempotency_key: idempotencyKey,
    p_fingerprint: createHmac("sha256", "TEST patient acceptance fixture")
      .update(JSON.stringify({ actorId, command: normalized.command }))
      .digest("hex"),
    p_command: normalized.command,
  });
  expect(result.error).toBeNull();
  return patientCommandOutcomeSchema.parse(result.data);
}

export async function removePatients(db: SupabaseClient, patientIds: readonly string[]) {
  if (patientIds.length === 0) return;
  const links = await db.from("patient_request_links").delete().in("patient_id", patientIds);
  expect(links.error).toBeNull();
  const patients = await db.from("patients").delete().in("id", patientIds);
  expect(patients.error).toBeNull();
  const audits = await db
    .from("audit_log")
    .delete()
    .eq("entity", "patients")
    .in("entity_id", patientIds);
  expect(audits.error).toBeNull();
}
