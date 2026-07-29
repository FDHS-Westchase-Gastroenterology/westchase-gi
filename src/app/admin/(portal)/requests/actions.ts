"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/portal/auth";
import {
  resolveFollowUpAt,
  type FollowUpChoice,
} from "@/lib/portal/business-time";
import { serviceClient } from "@/lib/portal/server";

function revalidateRequestViews(requestId: string) {
  revalidatePath("/admin"); // home overview counts
  revalidatePath("/admin/requests");
  revalidatePath(`/admin/requests/${requestId}`);
}

export async function addRequestNote(
  requestId: string,
  formData: FormData,
): Promise<void> {
  const session = await requireRole("staff");

  const rawNote = formData.get("note");
  if (typeof rawNote !== "string") {
    throw new Error("Notes must be 1-2000 characters");
  }

  const note = rawNote.trim();
  if (note.length === 0 || note.length > 2000) {
    throw new Error("Notes must be 1-2000 characters");
  }

  if (typeof requestId !== "string" || requestId.trim().length === 0) {
    throw new Error("Request not found");
  }

  const { error } = await serviceClient().rpc("portal_add_request_note", {
    p_actor_email: session.email,
    p_request_id: requestId,
    p_note: note,
    p_note_length: note.length,
  });
  if (error) {
    if (error.code === "P0002" || error.code === "22P02") {
      throw new Error("Request not found");
    }
    throw new Error(`Note write failed: ${error.code}`);
  }

  revalidateRequestViews(requestId);
}

// ---- Call-outcome composer (P1) -----------------------------------------

export type CallOutcomeId =
  | "booked"
  | "reached_follow_up"
  | "voicemail"
  | "no_answer"
  | "wont_schedule"
  | "not_actionable"
  | "scheduled_transferred";

export type CallOutcomeInput = {
  requestId: string;
  outcome: CallOutcomeId;
  note?: string;
  followUp?: FollowUpChoice;
};

export type CallOutcomeResult =
  | {
      ok: true;
      status: "new" | "contacted" | "scheduled" | "closed";
      followUpAt: string | null;
    }
  | {
      ok: false;
      code:
        | "invalid"
        | "not_found"
        | "follow_up_required"
        | "note_failed"
        | "unavailable";
    };

const CALL_OUTCOME_IDS: readonly CallOutcomeId[] = [
  "booked",
  "reached_follow_up",
  "voicemail",
  "no_answer",
  "wont_schedule",
  "not_actionable",
  "scheduled_transferred",
];

const FORBIDS_FOLLOW_UP = new Set<CallOutcomeId>([
  "booked",
  "wont_schedule",
  "not_actionable",
  "scheduled_transferred",
]);

const REQUIRES_FOLLOW_UP = new Set<CallOutcomeId>(["voicemail", "no_answer"]);

const OUTCOME_STATUS: Record<
  CallOutcomeId,
  "contacted" | "scheduled" | "closed"
> = {
  booked: "scheduled",
  reached_follow_up: "contacted",
  voicemail: "contacted",
  no_answer: "contacted",
  wont_schedule: "closed",
  not_actionable: "closed",
  scheduled_transferred: "closed",
};

function isCallOutcomeId(value: unknown): value is CallOutcomeId {
  return (
    typeof value === "string" &&
    (CALL_OUTCOME_IDS as readonly string[]).includes(value)
  );
}

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
  if (typeof input.note === "string") {
    const trimmed = input.note.trim();
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
  if (FORBIDS_FOLLOW_UP.has(outcome)) {
    if (followUp !== undefined) {
      return { ok: false, code: "invalid" };
    }
  } else if (REQUIRES_FOLLOW_UP.has(outcome)) {
    if (followUp === undefined) {
      return { ok: false, code: "follow_up_required" };
    }
  }

  let followUpAt: string | null = null;
  if (followUp !== undefined) {
    followUpAt = resolveFollowUpAt(followUp);
    if (followUpAt === null) {
      return { ok: false, code: "invalid" };
    }
  }

  const requestId = input.requestId;
  if (typeof requestId !== "string" || requestId.length === 0) {
    return { ok: false, code: "invalid" };
  }

  const db = serviceClient();

  if (outcome === "booked") {
    // Booked is outside portal_log_call_outcome's six-outcome vocabulary and
    // new schema is not permitted this cycle, so it routes through the two
    // existing RPCs. Status first: portal_update_request_status is a no-op when
    // unchanged, so a client retry only re-saves the note.
    const { error: statusError } = await db.rpc("portal_update_request_status", {
      p_actor_email: session.email,
      p_request_id: requestId,
      p_next_status: "scheduled",
    });
    if (statusError) {
      return mapCallOutcomeRpcError(statusError.code);
    }

    if (note !== null) {
      const { error: noteError } = await db.rpc("portal_add_request_note", {
        p_actor_email: session.email,
        p_request_id: requestId,
        p_note: note,
        p_note_length: note.length,
      });
      if (noteError) {
        return { ok: false, code: "note_failed" };
      }
    }

    revalidateRequestViews(requestId);
    return { ok: true, status: "scheduled", followUpAt: null };
  }

  const { error } = await db.rpc("portal_log_call_outcome", {
    p_actor_email: session.email,
    p_request_id: requestId,
    p_outcome: outcome,
    p_note: note,
    p_follow_up_at: followUpAt,
  });
  if (error) {
    return mapCallOutcomeRpcError(error.code);
  }

  revalidateRequestViews(requestId);
  return {
    ok: true,
    status: OUTCOME_STATUS[outcome],
    followUpAt,
  };
}
