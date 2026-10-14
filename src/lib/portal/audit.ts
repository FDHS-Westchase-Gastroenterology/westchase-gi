import "server-only";

import { randomUUID } from "node:crypto";

import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import type { JsonObject } from "@/lib/json";
import { AUDIT_ACTIONS } from "@/lib/portal/contracts";
import type { AuditAction } from "@/lib/portal/contracts";

interface AuditWrite {
  actorEmail: string;
  action: AuditAction;
  entity: string;
  entityId: string | null;
  detail?: JsonObject;
}

/** The row an outside change began under, and what its outcome row repeats. */
export interface ExternalAudit {
  id: string;
  actorEmail: string;
  correlationId: string;
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
  entry: Readonly<AuditWrite>,
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

/**
 * Records an outside change (a GitHub call) before it is made, as `pending`. The log is
 * append-only, so this row never changes: `finishExternalAudit` records the outcome in a row
 * of its own that points back here.
 */
export async function beginExternalAudit(
  client: SupabaseClient,
  entry: Readonly<AuditWrite>,
): Promise<ExternalAudit> {
  const correlationId = randomUUID();
  const legacyAuditRow = {
    actor_email: entry.actorEmail,
    action: entry.action,
    entity: entry.entity,
    entity_id: entry.entityId,
    detail: { ...entry.detail, outcome: "pending" },
  };
  const auditRow = {
    ...legacyAuditRow,
    source: "staff",
    correlation_id: correlationId,
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
  return { id: parsed.data.id, actorEmail: entry.actorEmail, correlationId };
}

/**
 * Records how an outside change ended, as an `audit.external_outcome` row whose entity is the
 * row the change began under. It shares that row's actor and correlation id.
 */
export async function finishExternalAudit(
  client: SupabaseClient,
  audit: Readonly<ExternalAudit>,
  outcome: "succeeded" | "failed" | "unconfirmed",
  detail: JsonObject = {},
): Promise<void> {
  const legacyAuditRow = {
    actor_email: audit.actorEmail,
    action: AUDIT_ACTIONS.AUDIT_EXTERNAL_OUTCOME,
    entity: "audit_log",
    entity_id: audit.id,
    detail: { ...detail, outcome },
  };
  const auditRow = {
    ...legacyAuditRow,
    source: "staff",
    correlation_id: audit.correlationId,
  };
  let { error } = await client.from("audit_log").insert(auditRow);

  if (isPreProvenanceSchema(error)) {
    ({ error } = await client.from("audit_log").insert(legacyAuditRow));
  }

  if (error !== null) {
    throw new Error(`External audit finish failed: ${error.code}`);
  }
}
