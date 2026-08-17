import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { asJsonObject, asJsonString, jsonSchema } from "@/lib/json";

import type { HistoryEntry, RequestWorkSurface } from "./contracts";
import { UNDO_WINDOW_MINUTES, normalizeRequestState, parseWorkflowCommandKind } from "./contracts";

const versionSchema = z.union([z.number(), z.string()]);

const requestWorkRowSchema = z.object({
  id: z.string(),
  status: z.string(),
  version: versionSchema,
  follow_up_at: z.string().nullable(),
  record_handoff_at: z.string().nullable(),
  closed_at: z.string().nullable(),
  closure_reason: z.string().nullable(),
  legacy_review_required: z.boolean(),
  created_at: z.string(),
});

const transitionRowSchema = z.object({
  id: z.string(),
  from_state: z.string(),
  to_state: z.string(),
  command: z.string(),
  actor_email: z.string(),
  occurred_at: z.string(),
  reason_code: z.string().nullable().optional(),
  compensates_transition_id: z.string().nullable().optional(),
  provenance: z.string(),
});

const eventRowSchema = z.object({
  id: z.string(),
  type: z.string(),
  recipient: z.string().nullable().optional(),
  status: z.string(),
  meta: jsonSchema,
  created_at: z.string(),
});

const countReadSchema = z.object({
  error: z.unknown().nullable().optional(),
  count: z.number().nullable().optional(),
});

function presentId(id: string | null | undefined): id is string {
  return id !== null && id !== undefined && id !== "";
}

function countFrom(read: Readonly<PromiseSettledResult<unknown>>): number | null {
  if (read.status !== "fulfilled") return null;
  const parsed = countReadSchema.safeParse(read.value);
  if (!parsed.success) return null;
  if (parsed.data.error !== null && parsed.data.error !== undefined) return null;
  return parsed.data.count === undefined ? null : parsed.data.count;
}

export async function fetchRequestWorkSurface(
  db: SupabaseClient,
  requestId: string,
): Promise<RequestWorkSurface | null> {
  const [request, transitions, events] = await Promise.all([
    db
      .from("requests")
      .select(
        "id,status,version,follow_up_at,record_handoff_at,closed_at,closure_reason,legacy_review_required,created_at",
      )
      .eq("id", requestId)
      .maybeSingle(),
    db
      .from("request_transitions")
      .select("*")
      .eq("request_id", requestId)
      .order("occurred_at", { ascending: false }),
    db
      .from("request_events")
      .select("*")
      .eq("request_id", requestId)
      .order("created_at", { ascending: false }),
  ]);
  if (request.error || transitions.error || events.error)
    throw new Error("Request work surface read failed");
  if (request.data === null) return null;
  const requestRow = requestWorkRowSchema.safeParse(request.data);
  if (!requestRow.success) throw new Error("Invalid request state");
  const state = normalizeRequestState(requestRow.data.status);
  if (state === null) throw new Error("Invalid request state");

  const rawTransitions = z.array(z.unknown()).safeParse(transitions.data);
  const transitionRows: z.infer<typeof transitionRowSchema>[] = [];
  for (const raw of rawTransitions.success ? rawTransitions.data : []) {
    const parsed = transitionRowSchema.safeParse(raw);
    if (parsed.success) transitionRows.push(parsed.data);
  }

  const compensated = new Set<string>();
  for (const row of transitionRows) {
    if (presentId(row.compensates_transition_id)) compensated.add(row.compensates_transition_id);
  }
  const rawEvents = z.array(z.unknown()).safeParse(events.data);
  const eventRows: z.infer<typeof eventRowSchema>[] = [];
  for (const raw of rawEvents.success ? rawEvents.data : []) {
    const parsed = eventRowSchema.safeParse(raw);
    if (parsed.success) eventRows.push(parsed.data);
  }
  const creationEvent = eventRows.find((event) => event.type === "created");
  const creationMeta = creationEvent === undefined ? null : asJsonObject(creationEvent.meta);
  const creationOrigin =
    creationMeta !== null && asJsonString(creationMeta.origin) === "staff" ? "staff" : "website";
  const history: HistoryEntry[] = [
    { kind: "created", origin: creationOrigin, at: requestRow.data.created_at },
  ];
  for (const row of transitionRows) {
    const from = normalizeRequestState(row.from_state);
    const to = normalizeRequestState(row.to_state);
    if (from === null || to === null) continue;
    if (row.command === "undo_latest_transition")
      history.push({
        kind: "undo",
        id: row.id,
        restoredState: to,
        actor: row.actor_email,
        at: row.occurred_at,
      });
    else if (row.command === "classify_legacy_closure")
      history.push({
        kind: "legacy_classified",
        id: row.id,
        to,
        actor: row.actor_email,
        at: row.occurred_at,
      });
    else {
      const command = parseWorkflowCommandKind(row.command);
      if (command === null) continue;
      history.push({
        kind: "transition",
        id: row.id,
        command,
        from,
        to,
        closureReason:
          row.reason_code === "not_actionable" || row.reason_code === "wont_schedule"
            ? row.reason_code
            : null,
        undone: compensated.has(row.id),
        actor: row.actor_email,
        at: row.occurred_at,
      });
    }
  }
  for (const event of eventRows) {
    const record = asJsonObject(event.meta);
    if (event.type === "note")
      history.push({
        kind: "note",
        id: event.id,
        text: record === null ? "" : (asJsonString(record.text) ?? ""),
        actor:
          record === null
            ? "Unknown staff"
            : (asJsonString(record.author_email) ?? "Unknown staff"),
        at: event.created_at,
      });
    else if (event.type === "contact_attempt" || event.type === "call_outcome") {
      const outcome = record === null ? null : asJsonString(record.outcome);
      if (outcome === "reached_follow_up" || outcome === "voicemail" || outcome === "no_answer")
        history.push({
          kind: "contact_attempt",
          id: event.id,
          outcome,
          callAgainAt: record === null ? null : asJsonString(record.follow_up_at),
          actor:
            record === null
              ? "Unknown staff"
              : (asJsonString(record.author_email) ?? "Unknown staff"),
          at: event.created_at,
        });
    } else if (event.type === "notification")
      history.push({
        kind: "delivery",
        id: event.id,
        recipient: event.recipient ?? "",
        accepted: event.status === "accepted",
        at: event.created_at,
      });
  }
  history.sort((a, b) => b.at.localeCompare(a.at));
  const latest = transitionRows.at(0);
  const expires =
    latest === undefined
      ? null
      : new Date(new Date(latest.occurred_at).getTime() + UNDO_WINDOW_MINUTES * 60000);
  const latestCommand = latest === undefined ? null : parseWorkflowCommandKind(latest.command);
  const closureReason =
    requestRow.data.closure_reason === "not_actionable" ||
    requestRow.data.closure_reason === "wont_schedule"
      ? requestRow.data.closure_reason
      : null;
  return {
    id: requestId,
    state,
    version: Number(requestRow.data.version),
    legacyReviewRequired: requestRow.data.legacy_review_required,
    callAgainAt: requestRow.data.follow_up_at,
    bookingConfirmedAt: requestRow.data.record_handoff_at,
    closedAt: requestRow.data.closed_at,
    closureReason,
    undo:
      latest !== undefined &&
      latestCommand !== null &&
      latest.provenance === "staff" &&
      latestCommand !== "undo_latest_transition" &&
      latestCommand !== "classify_legacy_closure" &&
      expires !== null &&
      expires >= new Date()
        ? {
            transitionId: latest.id,
            command: latestCommand,
            occurredAt: latest.occurred_at,
            expiresAt: expires.toISOString(),
          }
        : null,
    history,
  };
}

export async function fetchAttentionSummary(db: SupabaseClient, now: Date) {
  const since = new Date(now.getTime() - 86400000).toISOString();
  const reads = await Promise.allSettled([
    db.from("requests").select("id", { count: "exact", head: true }).eq("status", "new"),
    db
      .from("requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "contacted")
      .lte("follow_up_at", now.toISOString()),
    db
      .from("requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "contacted")
      .is("follow_up_at", null),
    db
      .from("requests")
      .select("id", { count: "exact", head: true })
      .eq("legacy_review_required", true),
    db
      .from("notification_outbox")
      .select("id", { count: "exact", head: true })
      .in("status", ["failed", "retry_pending", "exhausted"])
      .gte("updated_at", since),
  ]);
  return {
    newCount: countFrom(reads[0]),
    dueCallAgainCount: countFrom(reads[1]),
    silentContactedCount: countFrom(reads[2]),
    legacyReviewCount: countFrom(reads[3]),
    outboxTrouble: countFrom(reads[4]),
  };
}
