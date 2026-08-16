import "server-only";

import { randomUUID } from "node:crypto";

import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

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

function isPreProvenanceSchema(error: Readonly<{ code?: string } | null>): boolean {
  return error?.code === "PGRST204";
}

/**
 * Every staff-visible mutation writes exactly one audit row. Failures are
 * surfaced to the caller — a mutation whose audit write failed should be
 * treated as a failed mutation, not silently unaudited.
 */
export async function recordAudit(
  client: SupabaseClient,
  entry: Readonly<AuditEntry>,
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

  if (error !== null) {
    throw new Error(`Audit write failed: ${error.code}`);
  }
}

export async function beginExternalAudit(
  client: SupabaseClient,
  entry: Readonly<AuditEntry>,
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
  let result = await client.from("audit_log").insert(auditRow).select("id").single();

  if (isPreProvenanceSchema(result.error)) {
    result = await client.from("audit_log").insert(legacyAuditRow).select("id").single();
  }

  const parsed = z.object({ id: z.string() }).safeParse(result.data);
  if (result.error !== null || !parsed.success) {
    throw new Error(
      `External audit start failed: ${result.error !== null ? result.error.code : "missing_row"}`,
    );
  }
  return { id: parsed.data.id, detail };
}

export async function finishExternalAudit(
  client: SupabaseClient,
  audit: Readonly<ExternalAudit>,
  outcome: "succeeded" | "failed" | "unconfirmed",
  detail: JsonObject = {},
): Promise<void> {
  const result = await client
    .from("audit_log")
    .update({ detail: { ...audit.detail, ...detail, outcome } })
    .eq("id", audit.id)
    .select("id")
    .single();

  if (result.error !== null) {
    throw new Error(`External audit finish failed: ${result.error.code}`);
  }
}
