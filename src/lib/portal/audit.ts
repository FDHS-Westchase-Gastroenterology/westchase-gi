import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { AuditAction } from "@/lib/portal/contracts";

type AuditEntry = {
  actorEmail: string;
  action: AuditAction;
  entity: string;
  entityId: string | null;
  detail?: Record<string, unknown>;
};

/**
 * Every staff-visible mutation writes exactly one audit row. Failures are
 * surfaced to the caller — a mutation whose audit write failed should be
 * treated as a failed mutation, not silently unaudited.
 */
export async function recordAudit(
  client: SupabaseClient,
  entry: AuditEntry,
): Promise<void> {
  const { error } = await client.from("audit_log").insert({
    actor_email: entry.actorEmail,
    action: entry.action,
    entity: entry.entity,
    entity_id: entry.entityId,
    detail: entry.detail ?? {},
  });

  if (error) {
    throw new Error(`Audit write failed: ${error.code}`);
  }
}
