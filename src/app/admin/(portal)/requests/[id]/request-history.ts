import {
  CLOSURE_REASON_LABELS,
  CONTACT_OUTCOME_LABELS,
  followUpWhenLabel,
  stateLabel,
} from "@/app/admin/(portal)/requests/format";
import type { HistoryEntry } from "@/lib/portal/workflow/contracts";

// Request history keeps each evidence kind distinct (spec §6): contact
// Attempts, lifecycle transitions, Undo evidence, the legacy-review
// Classification, and relevant delivery outcomes. Notes keep their own
// Staff surface above the panel; the technical audit stays on the
// Activity log page. A RecordContactAttempt save renders once — as its
// Contact attempt — so its self-transition row is presentation-skipped.
export interface HistoryLine {
  id: string;
  text: string;
  actor: string | null;
  at: string;
  undone: boolean;
  quiet: boolean;
  attention: boolean;
}

export function historyLine(entry: Readonly<HistoryEntry>): HistoryLine | null {
  switch (entry.kind) {
    case "created":
      return {
        id: "created",
        text:
          entry.origin === "staff"
            ? "Appointment request added by staff"
            : "Appointment request received from the website",
        actor: null,
        at: entry.at,
        quiet: true,
        undone: false,
        attention: false,
      };
    case "contact_attempt":
      return {
        id: entry.id,
        text: `${CONTACT_OUTCOME_LABELS[entry.outcome]}${
          entry.callAgainAt !== null && entry.callAgainAt !== ""
            ? ` — call again ${followUpWhenLabel(entry.callAgainAt)}`
            : " — no call-again day was set"
        }`,
        actor: entry.actor,
        at: entry.at,
        quiet: false,
        undone: false,
        attention: false,
      };
    case "note":
      // Notes render in their own surface above the work panel.
      return null;
    case "transition":
      if (entry.command === "record_contact_attempt") return null;
      return {
        id: entry.id,
        text:
          entry.command === "confirm_booking_handoff"
            ? "Marked Scheduled — appointment booked"
            : entry.command === "close_request"
              ? `Closed — ${entry.closureReason !== null ? CLOSURE_REASON_LABELS[entry.closureReason] : "no appointment booked"}`
              : entry.command === "reopen_request"
                ? `Reopened — returned to Contacted${
                    entry.callAgainAt !== null && entry.callAgainAt !== ""
                      ? ` — call again ${followUpWhenLabel(entry.callAgainAt)}`
                      : " — no call-again day was set"
                  }`
                : entry.command === "set_call_again"
                  ? entry.callAgainAt !== null && entry.callAgainAt !== ""
                    ? `Call-again day set — ${followUpWhenLabel(entry.callAgainAt)}`
                    : "Call-again day correction recorded"
                  : `Marked ${stateLabel(entry.to)}`,
        actor: entry.actor,
        at: entry.at,
        undone: entry.undone,
        quiet: false,
        attention: false,
      };
    case "undo":
      return {
        id: entry.id,
        text: `Undo — restored to ${stateLabel(entry.restoredState)}`,
        actor: entry.actor,
        at: entry.at,
        quiet: false,
        undone: false,
        attention: false,
      };
    case "legacy_classified":
      return {
        id: entry.id,
        text:
          entry.to === "booked"
            ? "Record reviewed — an appointment was booked (Scheduled)"
            : "Record reviewed — closed without an appointment",
        actor: entry.actor,
        at: entry.at,
        quiet: false,
        undone: false,
        attention: false,
      };
    case "delivery":
      return {
        id: entry.id,
        text: `Notification email ${
          entry.accepted ? "accepted for delivery" : "failed"
        } — ${entry.recipient !== "" ? entry.recipient : "recipient unavailable"}`,
        actor: null,
        at: entry.at,
        quiet: entry.accepted,
        attention: !entry.accepted,
        undone: false,
      };
  }
  return null;
}
