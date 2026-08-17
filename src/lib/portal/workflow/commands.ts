import "server-only";

import { createHmac } from "node:crypto";

import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import type { CommandOutcome } from "./contracts";
import {
  COMMAND_REJECTIONS,
  WORKFLOW_COMMAND_KINDS,
  normalizeRequestState,
  parseClosureReason,
} from "./contracts";
import { decide } from "./machine";
import type { RequestSnapshot, WorkflowCommand } from "./machine";

interface ExecuteInput {
  readonly requestId: string;
  readonly expectedVersion: number;
  readonly idempotencyKey: string;
  readonly command: WorkflowCommand;
  readonly actorEmail: string;
  readonly note?: string;
  readonly transitionId?: string;
}

const versionSchema = z.union([z.number(), z.string()]);

const receiptRowSchema = z.object({
  fingerprint: z.string(),
  result: z.unknown(),
});

const requestCommandRowSchema = z.object({
  status: z.string(),
  version: versionSchema,
  follow_up_at: z.string().nullable(),
  record_handoff_at: z.string().nullable(),
  closed_at: z.string().nullable(),
  closure_reason: z.string().nullable(),
  legacy_review_required: z.boolean(),
});

const restoreSnapshotSchema = z.object({
  state: z.string(),
  callAgainAt: z.string().nullable(),
  bookingConfirmedAt: z.string().nullable(),
  closedAt: z.string().nullable(),
  closureReason: z.string().nullable(),
  legacyReviewRequired: z.boolean(),
});

const undoWindowSchema = z.object({
  transitionId: z.string(),
  command: z.enum(WORKFLOW_COMMAND_KINDS),
  occurredAt: z.string(),
  expiresAt: z.string(),
});

const commandSuccessSchema = z.object({
  ok: z.literal(true),
  state: z.string(),
  version: versionSchema,
  callAgainAt: z.string().nullable(),
  undo: undoWindowSchema.nullable(),
});

const commandFailureSchema = z.object({
  ok: z.literal(false),
  code: z.enum(COMMAND_REJECTIONS),
  current: z
    .object({
      state: z.string(),
      version: versionSchema,
    })
    .optional(),
});

type CommandSuccessRow = z.infer<typeof commandSuccessSchema>;
type CommandFailureRow = z.infer<typeof commandFailureSchema>;
type RestoreSnapshotRow = z.infer<typeof restoreSnapshotSchema>;
type RequestCommandRow = z.infer<typeof requestCommandRowSchema>;

function finiteNumber(value: number | string): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function commandOutcomeFromRow(
  row: Readonly<CommandSuccessRow> | Readonly<CommandFailureRow>,
): CommandOutcome | null {
  if (row.ok) {
    const state = normalizeRequestState(row.state);
    const version = finiteNumber(row.version);
    if (state === null || version === null) return null;
    return {
      ok: true,
      state,
      version,
      callAgainAt: row.callAgainAt,
      undo: row.undo,
    };
  }
  const current = row.current;
  if (current === undefined) return { ok: false, code: row.code };
  const state = normalizeRequestState(current.state);
  const version = finiteNumber(current.version);
  if (state === null || version === null) return null;
  return { ok: false, code: row.code, current: { state, version } };
}

function requestSnapshotFromRow(row: Readonly<RequestCommandRow>): RequestSnapshot | null {
  const state = normalizeRequestState(row.status);
  const version = finiteNumber(row.version);
  if (state === null || version === null) return null;
  const closureReason = row.closure_reason === null ? null : parseClosureReason(row.closure_reason);
  if (row.closure_reason !== null && closureReason === null) return null;
  return {
    state,
    version,
    callAgainAt: row.follow_up_at,
    bookingConfirmedAt: row.record_handoff_at,
    closedAt: row.closed_at,
    closureReason,
    legacyReviewRequired: row.legacy_review_required,
  };
}

function restoreSnapshotFromRow(
  row: Readonly<RestoreSnapshotRow>,
): Omit<RequestSnapshot, "version"> | null {
  const state = normalizeRequestState(row.state);
  if (state === null) return null;
  const closureReason = row.closureReason === null ? null : parseClosureReason(row.closureReason);
  if (row.closureReason !== null && closureReason === null) return null;
  return {
    state,
    callAgainAt: row.callAgainAt,
    bookingConfirmedAt: row.bookingConfirmedAt,
    closedAt: row.closedAt,
    closureReason,
    legacyReviewRequired: row.legacyReviewRequired,
  };
}

function secret(): string | Buffer {
  const value = process.env.WORKFLOW_COMMAND_HMAC_KEY?.trim();
  if (value !== undefined && value !== "") return value;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (serviceRoleKey !== undefined && serviceRoleKey !== "")
    return createHmac("sha256", serviceRoleKey).update("wgi:workflow-command-key:v1").digest();
  throw new Error("Workflow command HMAC is unavailable");
}

function hmac(value: string): string {
  return createHmac("sha256", secret())
    .update("wgi:request-command:v1\0")
    .update(value)
    .digest("hex");
}

export async function executeRequestCommand(
  db: SupabaseClient,
  input: Readonly<ExecuteInput>,
  now = new Date(),
): Promise<CommandOutcome> {
  const trimmed = input.note?.trim();
  const note = trimmed !== undefined && trimmed !== "" ? trimmed : null;
  if (note !== null && (note.length > 2000 || note !== input.note))
    return { ok: false, code: "invalid_command" };
  const canonical = JSON.stringify({
    requestId: input.requestId,
    command: input.command,
    noteHmac: note !== null && note !== "" ? hmac(note) : null,
  });
  const fingerprint = hmac(canonical);
  const receipt = await db
    .from("request_command_receipts")
    .select("fingerprint,result")
    .eq("request_id", input.requestId)
    .eq("idempotency_key", input.idempotencyKey)
    .maybeSingle();
  if (receipt.error) return { ok: false, code: "unavailable" };
  if (receipt.data !== null) {
    const parsedReceipt = receiptRowSchema.safeParse(receipt.data);
    if (!parsedReceipt.success) return { ok: false, code: "unavailable" };
    if (parsedReceipt.data.fingerprint !== fingerprint)
      return { ok: false, code: "idempotency_conflict" };
    const replayed = z
      .union([commandSuccessSchema, commandFailureSchema])
      .safeParse(parsedReceipt.data.result);
    return replayed.success
      ? (commandOutcomeFromRow(replayed.data) ?? { ok: false, code: "unavailable" })
      : { ok: false, code: "unavailable" };
  }
  const { data: row, error } = await db
    .from("requests")
    .select(
      "status,version,follow_up_at,record_handoff_at,closed_at,closure_reason,legacy_review_required",
    )
    .eq("id", input.requestId)
    .maybeSingle();
  if (error) return { ok: false, code: "unavailable" };
  if (row === null) return { ok: false, code: "not_found" };
  const parsedRow = requestCommandRowSchema.safeParse(row);
  const current = parsedRow.success ? requestSnapshotFromRow(parsedRow.data) : null;
  if (current === null) return { ok: false, code: "unavailable" };
  if (current.version !== input.expectedVersion)
    return {
      ok: false,
      code: "stale_version",
      current: { state: current.state, version: current.version },
    };
  let command = input.command;
  if (command.kind === "undo_latest_transition") {
    const transition = await db
      .from("request_transitions")
      .select("prior_snapshot")
      .eq("id", input.transitionId ?? "")
      .eq("request_id", input.requestId)
      .maybeSingle();
    const transitionRow = z.object({ prior_snapshot: z.unknown() }).safeParse(transition.data);
    if (transition.error || !transitionRow.success) return { ok: false, code: "undo_unavailable" };
    const parsedRestore = restoreSnapshotSchema.safeParse(transitionRow.data.prior_snapshot);
    const restore = parsedRestore.success ? restoreSnapshotFromRow(parsedRestore.data) : null;
    if (restore === null) return { ok: false, code: "undo_unavailable" };
    command = { kind: "undo_latest_transition", restore };
  }
  const decision = decide(current, command, now);
  if (!decision.accepted) return { ok: false, code: decision.code };
  const decisionPayload = {
    command: command.kind,
    state: decision.next.state,
    callAgainAt: decision.next.callAgainAt,
    bookingConfirmedAt: decision.next.bookingConfirmedAt,
    closedAt: decision.next.closedAt,
    closureReason: decision.next.closureReason,
    legacyReviewRequired: decision.next.legacyReviewRequired,
    reasonCode: decision.facts[0]?.code ?? null,
    occurredAt: now.toISOString(),
  };
  const result = await db.rpc("portal_execute_request_command", {
    p_actor_email: input.actorEmail,
    p_request_id: input.requestId,
    p_expected_version: input.expectedVersion,
    p_idempotency_key: input.idempotencyKey,
    p_fingerprint: fingerprint,
    p_decision: decisionPayload,
    p_note: note,
    p_transition_id: input.transitionId ?? null,
  });
  if (result.error) return { ok: false, code: "unavailable" };
  const executed = z.union([commandSuccessSchema, commandFailureSchema]).safeParse(result.data);
  return executed.success
    ? (commandOutcomeFromRow(executed.data) ?? { ok: false, code: "unavailable" })
    : { ok: false, code: "unavailable" };
}
