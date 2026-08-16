// Call-outcome policy - A call outcome is the staff-recorded result of one phone
// Interaction with a patient; each outcome carries exactly two rules: whether
// A call-again day is required, allowed, or forbidden, and which request
// Status saving the outcome implies. Both sides of the seam consume this
// Module — the call-outcome composer derives the choices it offers staff from
// It, and the server action validates against it — so the composer can never
// Offer a combination the server rejects.
//
// This module is pure and importable from client and server code alike. The
// Outcome ids are the wire format of the `portal_log_call_outcome` RPC; the
// Database validates them independently, so adding an outcome here also needs
// Its migration.
//
// Within each implied status, declaration order is the order staff see the
// Choices in the composer.

import { z } from "zod";
import type { RequestStatus } from "./contracts";

/** Whether an outcome requires, allows, or forbids a call-again day. */
export type CallAgainDayRule = "required" | "allowed" | "forbidden";

/** A status a saved call outcome can move the request to (never "new"). */
export type CallOutcomeStatus = Exclude<RequestStatus, "new">;

export interface CallOutcomePolicy {
  callAgainDay: CallAgainDayRule;
  impliedStatus: CallOutcomeStatus;
}

export const CALL_OUTCOME_POLICY = {
  // Contacted — the patient was reached or needs another call.
  reached_follow_up: { callAgainDay: "allowed", impliedStatus: "contacted" },
  voicemail: { callAgainDay: "required", impliedStatus: "contacted" },
  no_answer: { callAgainDay: "required", impliedStatus: "contacted" },
  // Scheduled — the appointment is booked and stays visible to staff.
  booked: { callAgainDay: "forbidden", impliedStatus: "scheduled" },
  // Closed — no more work remains on the request.
  scheduled_transferred: { callAgainDay: "forbidden", impliedStatus: "closed" },
  wont_schedule: { callAgainDay: "forbidden", impliedStatus: "closed" },
  not_actionable: { callAgainDay: "forbidden", impliedStatus: "closed" },
} as const satisfies Record<string, CallOutcomePolicy>;

export type CallOutcomeId = keyof typeof CALL_OUTCOME_POLICY;

export const CALL_OUTCOME_IDS = [
  "reached_follow_up",
  "voicemail",
  "no_answer",
  "booked",
  "scheduled_transferred",
  "wont_schedule",
  "not_actionable",
] as const satisfies readonly CallOutcomeId[];

const CALL_OUTCOME_ID_SCHEMA = z.enum(CALL_OUTCOME_IDS);

export function isCallOutcomeId(
  value: string | number | boolean | null | undefined | readonly string[],
): value is CallOutcomeId {
  return CALL_OUTCOME_ID_SCHEMA.safeParse(value).success;
}

export function requiresCallAgainDay(outcome: CallOutcomeId): boolean {
  return CALL_OUTCOME_POLICY[outcome].callAgainDay === "required";
}

export function allowsCallAgainDay(outcome: CallOutcomeId): boolean {
  return CALL_OUTCOME_POLICY[outcome].callAgainDay !== "forbidden";
}

/** The outcomes implying a status, in staff-facing declaration order. */
export function outcomesImplying(
  status: CallOutcomeStatus,
): readonly CallOutcomeId[] {
  return CALL_OUTCOME_IDS.filter(
    (id) => CALL_OUTCOME_POLICY[id].impliedStatus === status,
  );
}
