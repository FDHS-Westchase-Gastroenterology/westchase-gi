// Front-desk sentences for queue rows: what happened last, and what the
// sheet wants next. Derived from machine state plus history evidence —
// the copy never contradicts the ledger.

import type { RequestState } from "@/lib/portal/appointment-request-machine";
import { dayLabel, dayOf, dayOffset, timeLabel } from "./format";
import {
  CLOSURE_LABELS,
  LOCALE_FORM_LABELS,
  OUTCOME_LABELS,
  type HistoryEntry,
  type PrototypeRequest,
} from "./types";

/** Count of contact attempts that still stand (struck ones corrected). */
export function attemptCount(request: PrototypeRequest): number {
  return request.entries.filter(
    (entry) => entry.body.t === "attempt" && !entry.struck,
  ).length;
}

/** The latest standing lifecycle action, if any. */
export function lastAction(request: PrototypeRequest): HistoryEntry | null {
  for (let i = request.entries.length - 1; i >= 0; i -= 1) {
    const entry = request.entries[i];
    if (entry.struck) continue;
    const kind = entry.body.t;
    if (
      kind === "attempt" ||
      kind === "booked" ||
      kind === "closed" ||
      kind === "reopened" ||
      kind === "classified"
    ) {
      return entry;
    }
  }
  return null;
}

/** "Left a voicemail yesterday" — the last attempt in past tense. */
export function lastAttemptLine(
  request: PrototypeRequest,
  today: string,
): string | null {
  const action = lastAction(request);
  if (!action || action.body.t !== "attempt") return null;
  return `${OUTCOME_LABELS[action.body.outcome]} ${dayLabel(dayOf(action.at), today)}`;
}

/** The due phrase for a call-again day at or before today. */
export function duePhrase(callAgainDay: string, today: string): string {
  const offset = dayOffset(callAgainDay, today);
  if (offset === 0) return "call again today";
  return `was due ${dayLabel(callAgainDay, today)}`;
}

/** "Came in this morning, 8:47 AM" / "Waiting since Friday". */
export function newRequestLine(
  request: PrototypeRequest,
  today: string,
): { text: string; overdue: boolean } {
  const receivedDay = dayOf(request.receivedAt);
  const offset = dayOffset(receivedDay, today);
  if (offset === 0) {
    return {
      text: `Came in today, ${timeLabel(request.receivedAt)}`,
      overdue: false,
    };
  }
  return {
    text: `Waiting since ${dayLabel(receivedDay, today)}`,
    overdue: offset <= -1,
  };
}

/** Resolution line for a booked or closed request. */
export function resolutionLine(
  request: PrototypeRequest,
  today: string,
): string {
  const { snapshot } = request;
  if (snapshot.state === "BOOKED" && snapshot.bookingHandoffAt) {
    return `Booked ${dayLabel(dayOf(snapshot.bookingHandoffAt), today)}`;
  }
  if (snapshot.state === "CLOSED" && snapshot.legacyReviewRequired) {
    return "Closed before outcomes were recorded";
  }
  if (snapshot.state === "CLOSED" && snapshot.closedAt) {
    const reason =
      snapshot.closureReason === "wont_schedule"
        ? "patient won't schedule"
        : "duplicate or not actionable";
    return `Closed ${dayLabel(dayOf(snapshot.closedAt), today)} — ${reason}`;
  }
  return "";
}

/** Staff-facing names for machine states, sentence position. */
export const STATE_LABELS: Record<RequestState, string> = {
  NEW: "new",
  CONTACTED: "in progress",
  BOOKED: "scheduled",
  CLOSED: "closed",
};

/** One ledger sentence per history entry. Notes render as themselves. */
export function entryLine(entry: HistoryEntry, today: string): string {
  const body = entry.body;
  switch (body.t) {
    case "received":
      return `Request sent through ${LOCALE_FORM_LABELS[body.via] ?? "the website form"}`;
    case "attempt":
      return `${OUTCOME_LABELS[body.outcome]}${
        body.callAgainDay
          ? ` — call again ${dayLabel(body.callAgainDay, today)}`
          : " — no call-again day set"
      }`;
    case "booked":
      return "Marked scheduled — the appointment is booked in the scheduling system";
    case "closed":
      return `Closed — ${CLOSURE_LABELS[body.reason].toLowerCase()}`;
    case "reopened":
      return `Reopened — was ${STATE_LABELS[body.from]}`;
    case "classified":
      return body.result === "booked"
        ? "Recorded how it ended — the appointment was booked"
        : `Recorded how it ended — ${CLOSURE_LABELS[body.result].toLowerCase()}`;
    case "undo":
      return `Undid the last save — back to ${STATE_LABELS[body.restored]}`;
    case "note":
      return body.text;
    case "migrated":
      return "Carried over from the previous system";
    case "notification":
      return body.failed > 0
        ? `Staff notified by email — ${body.failed} ${body.failed === 1 ? "email" : "emails"} failed`
        : "Staff notified by email";
  }
}
