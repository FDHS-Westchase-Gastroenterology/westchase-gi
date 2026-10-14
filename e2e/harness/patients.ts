import { createHmac, randomUUID } from "node:crypto";

import { expect } from "@playwright/test";
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  patientCommandInputSchema,
  patientCommandOutcomeSchema,
} from "../../src/lib/portal/patients/contracts";
import type { PatientCommandInput } from "../../src/lib/portal/patients/contracts";
import { deleteAuditRows } from "./audit-fixtures";
import { removedRows } from "./cleanup";
import type { RemovedRows } from "./cleanup";

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

/** Removes patients and the rows that point at them, reporting how many rows each table lost. */
export async function removePatients(
  db: SupabaseClient,
  patientIds: readonly string[],
): Promise<readonly RemovedRows[]> {
  if (patientIds.length === 0) return [];
  const links = removedRows(
    "patient_request_links",
    await db.from("patient_request_links").delete({ count: "exact" }).in("patient_id", patientIds),
  );
  const patients = removedRows(
    "patients",
    await db.from("patients").delete({ count: "exact" }).in("id", patientIds),
  );
  const audits: RemovedRows = {
    table: "audit_log:patients",
    count: await deleteAuditRows({ entity: "patients", entityIds: patientIds }),
  };
  return [links, patients, audits];
}
