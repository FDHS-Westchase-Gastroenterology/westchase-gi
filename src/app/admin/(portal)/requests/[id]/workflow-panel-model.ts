import { isValidCustomCallAgainDay } from "@/app/admin/(portal)/requests/appointment-input";
import { followUpWhenLabel, stateLabel } from "@/app/admin/(portal)/requests/format";
import type { FollowUpChoice } from "@/lib/portal/business-time";
import type {
  ClosureReason,
  CommandRejection,
  ContactOutcome,
  LegalActions,
  RequestState,
  RequestWorkSurface,
} from "@/lib/portal/workflow/contracts";

/* The request work panel's model: what staff can choose, what the panel
   remembers between renders, and the words it says back. Pure, so the
   reducer and the copy are unit-tested without React.

   The panel asks one question — "What happened?" — answered with the
   real-world outcomes staff just lived through. Every rendered choice derives
   from the legal-action policy the server re-decides with (spec §7), so the
   interface can never offer a move the domain would refuse; staff record
   facts, and the state machine decides where the request goes. */

/** The durable facts the panel acts on; every command carries this version. */
export type RequestTruth = Readonly<
  Pick<RequestWorkSurface, "state" | "version" | "legacyReviewRequired" | "callAgainAt" | "undo">
>;

// ---------------------------------------------------------------------------
// Choice vocabulary: each radio row IS a semantic command, in the same
// Front-desk words the retired composer taught staff. Serialized ids keep
// Radio semantics native (arrow keys, form semantics) without extra state.
// ---------------------------------------------------------------------------

export type ActionChoice =
  | { readonly kind: "attempt"; readonly outcome: ContactOutcome }
  | { readonly kind: "booked" }
  | { readonly kind: "close"; readonly reason: ClosureReason };

export type ChoiceId = `attempt:${ContactOutcome}` | "booked" | `close:${ClosureReason}`;

export function choiceId(choice: Readonly<ActionChoice>): ChoiceId {
  if (choice.kind === "attempt") return `attempt:${choice.outcome}`;
  if (choice.kind === "close") return `close:${choice.reason}`;
  return "booked";
}

export interface ChoiceRow {
  readonly choice: ActionChoice;
  readonly label: string;
  readonly helper?: string;
}

const ATTEMPT_ROWS: ChoiceRow[] = [
  {
    choice: { kind: "attempt", outcome: "reached_follow_up" },
    label: "Reached the patient — follow-up needed",
    helper: "Talked it through; call again to finish.",
  },
  {
    choice: { kind: "attempt", outcome: "voicemail" },
    label: "Left a voicemail — call again",
  },
  {
    choice: { kind: "attempt", outcome: "no_answer" },
    label: "No answer — call again",
  },
];

const BOOKED_ROW: ChoiceRow = {
  choice: { kind: "booked" },
  label: "Appointment booked",
  helper: "Booked in the practice scheduling system — this request becomes Scheduled.",
};

const CLOSE_ROWS = {
  wont_schedule: {
    choice: { kind: "close", reason: "wont_schedule" },
    label: "Patient won't schedule",
    helper: "Done — no appointment. Leaves the active queue.",
  },
  not_actionable: {
    choice: { kind: "close", reason: "not_actionable" },
    label: "Duplicate or not actionable",
    helper: "Done — no appointment. Leaves the active queue.",
  },
} as const satisfies Record<ClosureReason, ChoiceRow>;

/** The outcome rows a request in its current state may record, in panel order. */
export function choiceRowsFor(
  legal: Readonly<
    Pick<LegalActions, "recordContactAttempt" | "confirmBookingHandoff" | "closeReasons">
  >,
): ChoiceRow[] {
  return [
    ...(legal.recordContactAttempt ? ATTEMPT_ROWS : []),
    ...(legal.confirmBookingHandoff ? [BOOKED_ROW] : []),
    ...legal.closeReasons.map((reason) => CLOSE_ROWS[reason]),
  ];
}

// ---------------------------------------------------------------------------
// Call-again choice: the four chips staff pick a return time from.
// ---------------------------------------------------------------------------

export type FollowUpKind = FollowUpChoice["kind"];

export const FOLLOW_UP_KINDS: readonly { kind: FollowUpKind; label: string }[] = [
  { kind: "this_afternoon", label: "This afternoon" },
  { kind: "tomorrow_morning", label: "Tomorrow morning" },
  { kind: "friday", label: "Friday" },
  { kind: "day", label: "Pick a day…" },
];

/** The call-again a chip and an optional custom day describe, or undefined while incomplete. */
export function followUpChoice(
  followUpKind: FollowUpKind | null,
  followUpDay: string,
): FollowUpChoice | undefined {
  if (followUpKind === null) return undefined;
  if (followUpKind === "day") {
    return isValidCustomCallAgainDay(followUpDay) ? { kind: "day", date: followUpDay } : undefined;
  }
  return { kind: followUpKind };
}

// ---------------------------------------------------------------------------
// Copy. Success names the staff-facing result (Scheduled, never Booked);
// Failure names what is and is not known to have been saved (spec §7:
// Never report false success; `unavailable` may or may not have written).
// ---------------------------------------------------------------------------

/** What staff set out to do; the success sentence and the next-step link derive from it. */
export type PanelIntent =
  | ActionChoice
  | { readonly kind: "reopen" }
  | { readonly kind: "set_call_again" }
  | { readonly kind: "classify" }
  | { readonly kind: "undo" };

/** Which control started the in-flight command, so only that button wears the working verb. */
export type InFlight = Exclude<PanelIntent["kind"], "attempt" | "booked" | "close"> | "save";

export function successCopy(
  intent: Readonly<PanelIntent>,
  outcome: Readonly<{ state: RequestState; callAgainAt: string | null }>,
): string {
  const hasCallAgain = outcome.callAgainAt !== null && outcome.callAgainAt !== "";
  const callAgain = () => followUpWhenLabel(outcome.callAgainAt ?? "");
  switch (intent.kind) {
    case "attempt":
      return hasCallAgain
        ? `Saved — marked Contacted. It will resurface ${callAgain()}.`
        : "Saved — marked Contacted.";
    case "booked":
      return "Saved — marked Scheduled. It stays on the Scheduled view if you need it.";
    case "close":
      return "Saved — the request is closed.";
    case "reopen":
      return hasCallAgain
        ? `Reopened — back to Contacted. Call again ${callAgain()}.`
        : "Reopened — back to Contacted for more work.";
    case "set_call_again":
      return hasCallAgain ? `Saved — call again ${callAgain()}.` : "Saved.";
    case "classify":
      return outcome.state === "booked"
        ? "Record finished — marked Scheduled."
        : "Record finished — the request stays closed.";
    case "undo":
      return `Undone — this request is ${stateLabel(outcome.state)} again.`;
  }
  return "Saved.";
}

/** Rejections the panel reports with a fixed sentence; the other two carry the request's new truth. */
export type PanelFailureCode = Exclude<CommandRejection, "stale_version" | "illegal_transition">;

const FAILURE_COPY = {
  invalid_command:
    "Something about that didn't check out. Nothing was recorded — review and try again.",
  not_found:
    "This request no longer exists — it may have been removed. Open Appointments to see the current list.",
  idempotency_conflict:
    "That save was already recorded differently. The page has been brought up to date — check Request history.",
  undo_unavailable:
    "Undo is no longer available — its 15-minute window closed or the request moved on. Nothing changed.",
  unauthorized:
    "Your session can't make this change. Sign in again, then check Request history before repeating anything.",
  unavailable:
    "Something went wrong saving that. Nothing may have been recorded — check Request history before repeating anything.",
} as const satisfies Record<PanelFailureCode, string>;

function isPanelFailureCode(value: string): value is PanelFailureCode {
  return Object.hasOwn(FAILURE_COPY, value);
}

/* Typed as a string on purpose: a tab left open across a deploy can receive
   a rejection this build does not know, and the safe sentence for anything
   unknown is the one that says nothing may have been recorded. */
export function failureCopy(code: string): string {
  return isPanelFailureCode(code) ? FAILURE_COPY[code] : FAILURE_COPY.unavailable;
}

export function staleVersionCopy(current: Readonly<{ state: RequestState }> | undefined): string {
  return `Someone else worked this request just now — it is currently ${
    current ? stateLabel(current.state) : "changed"
  }. Nothing was saved, and this page has been brought up to date.`;
}

export const ILLEGAL_TRANSITION_COPY =
  "That action is no longer available for this request — it changed since this page loaded. This page has been brought up to date.";

// ---------------------------------------------------------------------------
// Panel state: the staff member's in-progress choice and the last result.
// ---------------------------------------------------------------------------

export type Feedback =
  | { readonly tone: "success"; readonly text: string; readonly closedOrBooked: boolean }
  | { readonly tone: "error"; readonly text: string };

export interface PanelState {
  readonly selected: ChoiceId | null;
  readonly followUpKind: FollowUpKind | null;
  readonly followUpDay: string;
  /** The appointment a booking is recording: practice-local day and wall time. */
  readonly appointmentDay: string;
  readonly appointmentTime: string;
  /** Legacy review: has staff said whether an appointment was booked? */
  readonly reviewResolution: "booked" | ClosureReason | null;
  readonly feedback: Feedback | null;
}

export type PanelAction =
  | { readonly type: "select"; readonly id: ChoiceId }
  | { readonly type: "select_follow_up"; readonly kind: FollowUpKind }
  | { readonly type: "set_day"; readonly day: string }
  | { readonly type: "set_appointment_day"; readonly day: string }
  | { readonly type: "set_appointment_time"; readonly time: string }
  | { readonly type: "select_review"; readonly resolution: "booked" | ClosureReason }
  | { readonly type: "succeeded"; readonly text: string; readonly closedOrBooked: boolean }
  | { readonly type: "failed"; readonly text: string };

export const INITIAL_PANEL: PanelState = {
  selected: null,
  followUpKind: null,
  followUpDay: "",
  appointmentDay: "",
  appointmentTime: "",
  reviewResolution: null,
  feedback: null,
};

export function panelReducer(
  state: Readonly<PanelState>,
  action: Readonly<PanelAction>,
): PanelState {
  switch (action.type) {
    case "select":
      /* Moving between contact attempts keeps the chosen return time; moving
         to a booking or a closure has no return time to keep. */
      if (action.id.startsWith("attempt:")) {
        return { ...state, selected: action.id, feedback: null };
      }
      return {
        ...state,
        selected: action.id,
        feedback: null,
        followUpKind: null,
        followUpDay: "",
      };
    case "select_follow_up":
      return { ...state, followUpKind: action.kind, feedback: null };
    case "set_day":
      return { ...state, followUpDay: action.day, feedback: null };
    case "set_appointment_day":
      return { ...state, appointmentDay: action.day, feedback: null };
    case "set_appointment_time":
      return { ...state, appointmentTime: action.time, feedback: null };
    case "select_review":
      return { ...state, reviewResolution: action.resolution, feedback: null };
    case "succeeded":
      return {
        ...INITIAL_PANEL,
        feedback: { tone: "success", text: action.text, closedOrBooked: action.closedOrBooked },
      };
    case "failed":
      return { ...state, feedback: { tone: "error", text: action.text } };
  }
  return state;
}
