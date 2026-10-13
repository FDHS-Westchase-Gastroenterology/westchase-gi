/* The Technical record's rows: the stored audit rows as read, and for each GitHub change a row
   began, how it ended. Server-side; the page passes in its service client. */

import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { asJsonObject, asJsonString, jsonSchema } from "@/lib/json";
import type { Json } from "@/lib/json";
import { AUDIT_ACTIONS } from "@/lib/portal/contracts";

import type { AuditEntry } from "./audit-sentences";

const auditEntrySchema = z.object({
  id: z.string(),
  actor_email: z.string(),
  action: z.string(),
  entity: z.string(),
  entity_id: z.string().nullable(),
  detail: jsonSchema,
  at: z.string(),
}) satisfies z.ZodType<AuditEntry>;

interface ExternalAuditSummary {
  target: string;
  outcome: string;
}

type ExternalOutcome = "succeeded" | "failed";

/** A settled outcome from an audit detail; anything else is still unconfirmed. */
function settledOutcome(detail: Json): ExternalOutcome | null {
  const outcome = asJsonString(asJsonObject(detail)?.outcome);
  return outcome === "succeeded" || outcome === "failed" ? outcome : null;
}

/**
 * The GitHub change a row began, with how it ended: its `audit.external_outcome` row when
 * one exists, else an outcome written into the row itself before the log was append-only.
 */
export function externalAuditSummary(
  entry: Readonly<AuditEntry>,
  outcomes: ReadonlyMap<string, ExternalOutcome>,
): ExternalAuditSummary | null {
  const target = asJsonString(asJsonObject(entry.detail)?.target_login);
  if (target === null) return null;
  const outcome = outcomes.get(entry.id) ?? settledOutcome(entry.detail) ?? "unconfirmed";
  return { target, outcome };
}

const externalOutcomeRowSchema = z.object({ entity_id: z.string(), detail: jsonSchema });

/** The outcome rows for these external-change rows, keyed by the row each one settles. */
export async function readExternalOutcomes(
  db: SupabaseClient,
  entries: readonly Readonly<AuditEntry>[],
): Promise<Map<string, ExternalOutcome>> {
  const ids = entries
    .filter((entry) => asJsonString(asJsonObject(entry.detail)?.target_login) !== null)
    .map((entry) => entry.id);
  const outcomes = new Map<string, ExternalOutcome>();
  if (ids.length === 0) return outcomes;
  const { data, error } = await db
    .from("audit_log")
    .select("entity_id, detail")
    .eq("action", AUDIT_ACTIONS.AUDIT_EXTERNAL_OUTCOME)
    .eq("entity", "audit_log")
    .in("entity_id", ids)
    .order("at", { ascending: true })
    .order("id", { ascending: true });
  if (error !== null) {
    throw new Error(`Audit read failed: ${error.code}`);
  }
  const parsed = z.array(externalOutcomeRowSchema).safeParse(data);
  if (!parsed.success) {
    throw new Error("Audit read failed: invalid");
  }
  for (const row of parsed.data) {
    const outcome = settledOutcome(row.detail);
    if (outcome !== null) outcomes.set(row.entity_id, outcome);
  }
  return outcomes;
}

export function parseAuditEntries(rows: Json): AuditEntry[] {
  const parsed = z.array(auditEntrySchema).safeParse(rows);
  if (!parsed.success) {
    throw new Error("Audit read failed: invalid");
  }
  return parsed.data;
}
