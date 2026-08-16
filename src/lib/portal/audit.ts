import "server-only";

import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { JsonObject } from "@/lib/json";
import type { AuditAction } from "@/lib/portal/contracts";

interface AuditEntry {
  actorEmail: string;
  action: AuditAction;
  entity: string;
  entityId: string | null;
  detail?: JsonObject;
}

export interface ExternalAudit {
  id: string;
  detail: JsonObject;
}

function isPreProvenanceSchema(error: { code?: string } | null): boolean {
  return error?.code === "PGRST204";
}

/**
 * Every staff-visible mutation writes exactly one audit row. Failures are
 * surfaced to the caller — a mutation whose audit write failed should be
 * treated as a failed mutation, not silently unaudited.
 */
export async function recordAudit(
  client: SupabaseClient,
  entry: AuditEntry,
): Promise<void> {
  const legacyAuditRow = {
    actor_email: entry.actorEmail,
    action: entry.action,
    entity: entry.entity,
    entity_id: entry.entityId,
    detail: entry.detail ?? {},
  };
  const auditRow = {
    ...legacyAuditRow,
    source: "staff",
    correlation_id: randomUUID(),
  };
  let { error } = await client.from("audit_log").insert(auditRow);

  if (isPreProvenanceSchema(error)) {
    ({ error } = await client.from("audit_log").insert(legacyAuditRow));
  }

  if (error) {
    throw new Error(`Audit write failed: ${error.code}`);
  }
}

export async function beginExternalAudit(
  client: SupabaseClient,
  entry: AuditEntry,
): Promise<ExternalAudit> {
  const detail = { ...entry.detail, outcome: "pending" };
  const legacyAuditRow = {
    actor_email: entry.actorEmail,
    action: entry.action,
    entity: entry.entity,
    entity_id: entry.entityId,
    detail,
  };
  const auditRow = {
    ...legacyAuditRow,
    source: "staff",
    correlation_id: randomUUID(),
  };
  let { data, error } = await client
    .from("audit_log")
    .insert(auditRow)
    .select("id")
    .single();

  if (isPreProvenanceSchema(error)) {
    ({ data, error } = await client
      .from("audit_log")
      .insert(legacyAuditRow)
      .select("id")
      .single());
  }

  if (error || !data) {
    throw new Error(`External audit start failed: ${error?.code ?? "missing_row"}`);
  }
  return { id: data.id, detail };
}

export async function finishExternalAudit(
  client: SupabaseClient,
  audit: ExternalAudit,
  outcome: "succeeded" | "failed" | "unconfirmed",
  detail: JsonObject = {},
): Promise<void> {
  const { data, error } = await client
    .from("audit_log")
    .update({ detail: { ...audit.detail, ...detail, outcome } })
    .eq("id", audit.id)
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(`External audit finish failed: ${error?.code ?? "missing_row"}`);
  }
}
