"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/portal/auth";
import { resolveFollowUpAt } from "@/lib/portal/business-time";
import type { FollowUpChoice } from "@/lib/portal/business-time";
import { CALL_OUTCOME_POLICY, allowsCallAgainDay, isCallOutcomeId, requiresCallAgainDay } from "@/lib/portal/call-outcomes";
import type { CallOutcomeId } from "@/lib/portal/call-outcomes";
import { serviceClient } from "@/lib/portal/server";

function revalidateRequestViews(requestId: string) {
  revalidatePath("/admin"); // Home overview counts
  revalidatePath("/admin/requests");
  revalidatePath(`/admin/requests/${requestId}`);
}

export type AddRequestNoteState =
  | { status: "idle" }
  | { status: "success"; message: string }
  | { status: "error"; message: string };

const NOTE_WRITE_ERROR =
  "We couldn’t confirm this note was saved. Your note is still here. Check the notes before trying again.";

export async function addRequestNote(
  _state: AddRequestNoteState,
  formData: FormData,
): Promise<AddRequestNoteState> {
  const session = await requireRole("staff");

  const requestId = formData.get("requestId");
  const rawNote = formData.get("note");
  if (rawNote instanceof File || rawNote === null) {
    return { status: "error", message: NOTE_WRITE_ERROR };
  }

  const note = rawNote.trim();
  if (note.length === 0 || note.length > 2000) {
    return { status: "error", message: NOTE_WRITE_ERROR };
  }

  if (
    requestId instanceof File ||
    requestId === null ||
    requestId.trim().length === 0
  ) {
    return { status: "error", message: NOTE_WRITE_ERROR };
  }

  const { error } = await serviceClient().rpc("portal_add_request_note", {
    p_actor_email: session.email,
    p_request_id: requestId,
    p_note: note,
    p_note_length: note.length,
  });
  if (error) {
    return { status: "error", message: NOTE_WRITE_ERROR };
  }

  revalidateRequestViews(requestId);
  return { status: "success", message: "Note added." };
}

// ---- Call-outcome composer (P1) -----------------------------------------
// The outcome vocabulary, call-again-day rules, and implied statuses live in
// @/lib/portal/call-outcomes; this action only validates against that policy.

export interface CallOutcomeInput {
  requestId: string;
  outcome: CallOutcomeId;
  note?: string;
  followUp?: FollowUpChoice;
}

export type CallOutcomeResult =
  | {
      ok: true;
      status: "new" | "contacted" | "scheduled" | "closed";
      followUpAt: string | null;
      eventId: string;
    }
  | {
      ok: false;
      code:
        | "invalid"
        | "not_found"
        | "follow_up_required"
        | "unavailable";
    };

const uuidSchema = z.uuid();
const undoCallOutcomeInputSchema = z.object({
  requestId: uuidSchema,
  eventId: uuidSchema,
});
const requestStatusSchema = z.enum(["new", "contacted", "scheduled", "closed"]);
const undoCallOutcomeResultSchema = z.object({
  status: requestStatusSchema,
});

function mapCallOutcomeRpcError(code: string | undefined): CallOutcomeResult {
  if (code === "P0002" || code === "22P02") {
    return { ok: false, code: "not_found" };
  }
  if (code === "22023") {
    return { ok: false, code: "invalid" };
  }
  return { ok: false, code: "unavailable" };
}

export async function logCallOutcome(
  input: CallOutcomeInput,
): Promise<CallOutcomeResult> {
  const session = await requireRole("staff", { unauthenticated: "throw" });

  if (!isCallOutcomeId(input.outcome)) {
    return { ok: false, code: "invalid" };
  }
  const outcome = input.outcome;

  let note: string | null = null;
  const parsedNote = z.string().safeParse(input.note);
  if (parsedNote.success) {
    const trimmed = parsedNote.data.trim();
    if (trimmed.length > 0) {
      if (trimmed.length > 2000) {
        return { ok: false, code: "invalid" };
      }
      note = trimmed;
    }
  } else if (input.note !== undefined) {
    return { ok: false, code: "invalid" };
  }

  const followUp = input.followUp;
  if (!allowsCallAgainDay(outcome)) {
    if (followUp !== undefined) {
      return { ok: false, code: "invalid" };
    }
  } else if (requiresCallAgainDay(outcome) && followUp === undefined) {
    return { ok: false, code: "follow_up_required" };
  }

  let followUpAt: string | null = null;
  if (followUp !== undefined) {
    followUpAt = resolveFollowUpAt(followUp);
    if (followUpAt === null) {
      return { ok: false, code: "invalid" };
    }
  }

  const requestIdResult = uuidSchema.safeParse(input.requestId);
  if (!requestIdResult.success) {
    return { ok: false, code: "invalid" };
  }
  const requestId = requestIdResult.data;

  const db = serviceClient();
  const { data, error } = await db.rpc("portal_log_call_outcome", {
    p_actor_email: session.email,
    p_request_id: requestId,
    p_outcome: outcome,
    p_note: note,
    p_follow_up_at: followUpAt,
  });
  if (error) {
    return mapCallOutcomeRpcError(error.code);
  }

  const eventId = uuidSchema.safeParse(data);
  if (!eventId.success) {
    return { ok: false, code: "unavailable" };
  }

  revalidateRequestViews(requestId);
  return {
    ok: true,
    status: CALL_OUTCOME_POLICY[outcome].impliedStatus,
    followUpAt,
    eventId: eventId.data,
  };
}

export async function undoCallOutcome(input: {
  requestId: string;
  eventId: string;
}): Promise<
  | { ok: true; status: "new" | "contacted" | "scheduled" | "closed" }
  | {
      ok: false;
      code: "invalid" | "not_found" | "stale" | "unavailable";
    }
> {
  const session = await requireRole("staff", { unauthenticated: "throw" });

  const parsedInput = undoCallOutcomeInputSchema.safeParse(input);
  if (!parsedInput.success) {
    return { ok: false, code: "invalid" };
  }

  const { requestId, eventId } = parsedInput.data;
  const { data, error } = await serviceClient().rpc(
    "portal_undo_call_outcome",
    {
      p_actor_email: session.email,
      p_request_id: requestId,
      p_event_id: eventId,
    },
  );

  if (error) {
    if (error.code === "P0002" || error.code === "22P02") {
      return { ok: false, code: "not_found" };
    }
    if (error.code === "22023") {
      return { ok: false, code: "invalid" };
    }
    if (error.code === "55000") {
      return { ok: false, code: "stale" };
    }
    return { ok: false, code: "unavailable" };
  }

  const result = undoCallOutcomeResultSchema.safeParse(data);
  if (!result.success) {
    return { ok: false, code: "unavailable" };
  }

  revalidateRequestViews(requestId);
  return { ok: true, status: result.data.status };
}
