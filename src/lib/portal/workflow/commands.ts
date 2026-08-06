import "server-only";

import { createHmac } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { CommandOutcome } from "./contracts";
import { decide, type RequestSnapshot, type WorkflowCommand } from "./machine";

type ExecuteInput = {
  requestId: string; expectedVersion: number; idempotencyKey: string;
  command: WorkflowCommand; actorEmail: string; note?: string; transitionId?: string;
};

function secret(): string | Buffer {
  const value = process.env.WORKFLOW_COMMAND_HMAC_KEY?.trim();
  if (value) return value;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (serviceRoleKey) return createHmac("sha256", serviceRoleKey).update("wgi:workflow-command-key:v1").digest();
  throw new Error("Workflow command HMAC is unavailable");
}

function hmac(value: string): string { return createHmac("sha256", secret()).update("wgi:request-command:v1\0").update(value).digest("hex"); }

export async function executeRequestCommand(db: SupabaseClient, input: ExecuteInput, now = new Date()): Promise<CommandOutcome> {
  const note = input.note?.trim() || null;
  if (note !== null && (note.length > 2000 || note !== input.note)) return { ok: false, code: "invalid_command" };
  const canonical = JSON.stringify({ requestId: input.requestId, command: input.command, noteHmac: note ? hmac(note) : null });
  const fingerprint = hmac(canonical);
  const receipt = await db.from("request_command_receipts").select("fingerprint,result").eq("request_id", input.requestId).eq("idempotency_key", input.idempotencyKey).maybeSingle();
  if (receipt.error) return { ok: false, code: "unavailable" };
  if (receipt.data) return receipt.data.fingerprint === fingerprint ? receipt.data.result as CommandOutcome : { ok: false, code: "idempotency_conflict" };
  const { data: row, error } = await db.from("requests").select("status,version,follow_up_at,record_handoff_at,closed_at,closure_reason,legacy_review_required").eq("id", input.requestId).maybeSingle();
  if (error) return { ok: false, code: "unavailable" };
  if (!row) return { ok: false, code: "not_found" };
  const current: RequestSnapshot = { state: row.status, version: Number(row.version), callAgainAt: row.follow_up_at, bookingConfirmedAt: row.record_handoff_at, closedAt: row.closed_at, closureReason: row.closure_reason, legacyReviewRequired: row.legacy_review_required };
  if (current.version !== input.expectedVersion) return { ok: false, code: "stale_version", current: { state: current.state, version: current.version } };
  let command = input.command;
  if (command.kind === "undo_latest_transition") {
    const transition = await db.from("request_transitions").select("prior_snapshot").eq("id", input.transitionId ?? "").eq("request_id", input.requestId).maybeSingle();
    if (transition.error || !transition.data) return { ok: false, code: "undo_unavailable" };
    command = { kind: "undo_latest_transition", restore: transition.data.prior_snapshot };
  }
  const decision = decide(current, command, now);
  if (!decision.accepted) return { ok: false, code: decision.code };
  const decisionPayload = { command: command.kind, state: decision.next.state, callAgainAt: decision.next.callAgainAt, bookingConfirmedAt: decision.next.bookingConfirmedAt, closedAt: decision.next.closedAt, closureReason: decision.next.closureReason, legacyReviewRequired: decision.next.legacyReviewRequired, reasonCode: decision.facts[0]?.code ?? null, occurredAt: now.toISOString() };
  const result = await db.rpc("portal_execute_request_command", { p_actor_email: input.actorEmail, p_request_id: input.requestId, p_expected_version: input.expectedVersion, p_idempotency_key: input.idempotencyKey, p_fingerprint: fingerprint, p_decision: decisionPayload, p_note: note, p_transition_id: input.transitionId ?? null });
  return result.error ? { ok: false, code: "unavailable" } : result.data as CommandOutcome;
}
