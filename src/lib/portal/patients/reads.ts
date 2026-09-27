import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { patientReadInputSchema, patientSearchInputSchema } from "./contracts";
import type {
  PatientReadInput,
  PatientReadOutcome,
  PatientSearchInput,
  PatientSearchOutcome,
} from "./contracts";
import { patientReadDatabaseSchema, patientSearchDatabaseSchema } from "./rows";

export async function searchPatients(
  db: SupabaseClient,
  actorId: string,
  input: Readonly<PatientSearchInput>,
): Promise<PatientSearchOutcome> {
  const parsed = patientSearchInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "invalid_command" };
  const { query, archived, limit, after } = parsed.data;
  const result = await db
    .rpc("portal_search_patients", {
      p_actor_id: actorId,
      p_query: query,
      p_archived: archived,
      p_limit: limit,
      p_after_name: after?.name ?? null,
      p_after_id: after?.id ?? null,
    })
    .abortSignal(AbortSignal.timeout(10_000));
  if (result.error !== null) return { ok: false, code: "unavailable" };
  const outcome = patientSearchDatabaseSchema.safeParse(result.data);
  return outcome.success ? outcome.data : { ok: false, code: "unavailable" };
}

export async function readPatient(
  db: SupabaseClient,
  actorId: string,
  input: Readonly<PatientReadInput>,
): Promise<PatientReadOutcome> {
  const parsed = patientReadInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "invalid_command" };
  const result = await db
    .rpc("portal_read_patient", {
      p_actor_id: actorId,
      p_patient_id: parsed.data.patientId,
      p_history_before: parsed.data.historyBefore,
      p_links_after: parsed.data.linksAfter,
    })
    .abortSignal(AbortSignal.timeout(10_000));
  if (result.error !== null) return { ok: false, code: "unavailable" };
  const outcome = patientReadDatabaseSchema.safeParse(result.data);
  return outcome.success ? outcome.data : { ok: false, code: "unavailable" };
}
