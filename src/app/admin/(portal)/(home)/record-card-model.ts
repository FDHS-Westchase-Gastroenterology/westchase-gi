import { followUpShortLabel } from "@/app/admin/(portal)/requests/format";
import type { AppointmentChoice } from "@/app/admin/(portal)/requests/workflow-actions";
import type { FollowUpChoice } from "@/lib/portal/business-time";
import type { ContactCompletionResult } from "@/lib/portal/workflow/contact-completion";
import { legalActionsFor } from "@/lib/portal/workflow/contracts";
import type {
  ManualClosureReason as ClosureReason,
  CommandRejection,
  ContactOutcome,
  RequestState,
  RequestStatus,
} from "@/lib/portal/workflow/contracts";

export const CARD_ANSWERS = ["no_answer", "contacted", "booked", "not_actionable"] as const;
export type CardAnswer = (typeof CARD_ANSWERS)[number];

/** The answers in the queue's words, and nothing more: the calendar and
   the follow-up row say the rest. */
export const ANSWER_LABELS = {
  no_answer: "No answer",
  contacted: "Contacted",
  booked: "Appointment scheduled",
  not_actionable: "Close request",
} as const satisfies Record<CardAnswer, string>;

/** The second question a contact answer asks: whether the practice calls
   back. Two words each, on the calendar's lower edge. */
export const FOLLOW_UPS = ["call", "none"] as const;
export type FollowUp = (typeof FOLLOW_UPS)[number];

export const FOLLOW_UP_LABELS = {
  call: "Call again",
  none: "No call",
} as const satisfies Record<FollowUp, string>;

const CONTACT_OUTCOME = {
  no_answer: "no_answer",
  contacted: "reached_follow_up",
  booked: null,
  not_actionable: null,
} as const satisfies Record<CardAnswer, ContactOutcome | null>;

/** The contact attempt an answer records, or null when it records something else. */
export function contactOutcomeFor(answer: CardAnswer): ContactOutcome | null {
  return CONTACT_OUTCOME[answer];
}

/** Ordinary closure is a separate staff choice from completing contact. */
export function closureFor(answer: CardAnswer): ClosureReason | null {
  return answer === "not_actionable" ? "not_actionable" : null;
}

function stateOf(status: RequestStatus): RequestState {
  return status === "scheduled" ? "booked" : status;
}

/** The rows a line's status makes legal, in the card's fixed order. The
   server re-checks the same policy; a hidden row is never the authorization. */
export function cardRowsFor(status: RequestStatus): readonly CardAnswer[] {
  const legal = legalActionsFor(stateOf(status));
  return CARD_ANSWERS.filter((answer) => {
    if (answer === "not_actionable") return legal.closeReasons.includes("not_actionable");
    if (answer === "booked") return legal.confirmBookingHandoff;
    return legal.recordContactAttempt;
  });
}

/** No call records the contact result and closes with no further contact.
   Call again records an attempt with an explicit callback. */
export function followUpsFor(answer: CardAnswer | null): readonly FollowUp[] {
  return answer !== null && contactOutcomeFor(answer) !== null ? FOLLOW_UPS : [];
}

/** The sentence a line with no rows shows instead of the question. */
export function cardNoteFor(status: RequestStatus): string | null {
  if (status === "scheduled") return "Scheduled. Reopen it from the full record if plans change.";
  if (status === "closed") return "Closed. Reopen it from the full record to work it again.";
  return null;
}

export interface CardDraft {
  readonly answer: CardAnswer | null;
  readonly followUp: FollowUp | null;
  /** Practice-local YYYY-MM-DD, or "" until staff pick a day. */
  readonly day: string;
  /** HH:MM, or "" until Done commits the picker draft. */
  readonly time: string;
}

export const INITIAL_DRAFT: CardDraft = {
  answer: null,
  followUp: null,
  day: "",
  time: "",
};

export type CardEvent =
  | { readonly type: "answer"; readonly answer: CardAnswer; readonly today: string }
  | { readonly type: "followUp"; readonly followUp: FollowUp }
  | { readonly type: "day"; readonly day: string }
  | { readonly type: "time"; readonly time: string };

/** Whether the calendar is live: a booking always, a contact only while
   the practice means to call again. */
export function needsDay(answer: CardAnswer | null, followUp: FollowUp | null): boolean {
  if (answer === "booked") return true;
  return answer !== null && contactOutcomeFor(answer) !== null && followUp === "call";
}

export function needsTime(answer: CardAnswer | null): boolean {
  return answer === "booked";
}

/** How far out the calendar reaches: a call-again 90 days, an appointment
   400 — and the full 400 while no answer is chosen, so a day picked first
   is never refused before the answer says what it is for. */
export function dayHorizon(answer: CardAnswer | null): number {
  return answer === "no_answer" || answer === "contacted" ? 90 : 400;
}

const DAY_MS = 86_400_000;

function dayNumber(day: string): number {
  return Math.round(Date.parse(`${day}T00:00:00Z`) / DAY_MS);
}

export function addDays(day: string, count: number): string {
  return new Date((dayNumber(day) + count) * DAY_MS).toISOString().slice(0, 10);
}

const YMD = /^\d{4}-\d{2}-\d{2}$/;

function withinHorizon(day: string, today: string, horizon: number): boolean {
  if (!YMD.test(day) || !Number.isFinite(dayNumber(day))) return false;
  return day >= today && day <= addDays(today, horizon);
}

export function cardReducer(draft: Readonly<CardDraft>, event: Readonly<CardEvent>): CardDraft {
  switch (event.type) {
    case "answer": {
      const keep = withinHorizon(draft.day, event.today, dayHorizon(event.answer));
      return {
        ...draft,
        answer: event.answer,
        followUp: contactOutcomeFor(event.answer) === null ? null : "call",
        day: keep ? draft.day : "",
      };
    }
    case "followUp":
      return { ...draft, followUp: event.followUp };
    case "day":
      return { ...draft, day: event.day };
    case "time":
      return { ...draft, time: event.time };
    default:
      throw new Error("Unknown card event");
  }
}

const HM = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

export function timeWithinDay(time: string): boolean {
  return HM.test(time);
}

// Every minute is selectable, including arrivals outside normal office hours.
export const TIME_HOURS: readonly string[] = [
  "12",
  ...Array.from({ length: 11 }, (_, index) => String(index + 1)),
];
export const TIME_MINUTES: readonly string[] = Array.from({ length: 60 }, (_, index) =>
  String(index).padStart(2, "0"),
);
export const MERIDIEMS = ["AM", "PM"] as const;

export interface TimeParts {
  readonly hour: string;
  readonly minute: string;
  readonly meridiem: string;
}

export function timeParts(time: string): TimeParts {
  if (!timeWithinDay(time)) throw new RangeError("Expected a time in HH:MM format");
  const hour = Number(time.slice(0, 2));
  return {
    hour: String(hour % 12 === 0 ? 12 : hour % 12),
    minute: time.slice(3, 5),
    meridiem: hour < 12 ? "AM" : "PM",
  };
}

export function clockLabel(time: string): string {
  const { hour, minute, meridiem } = timeParts(time);
  return `${hour}:${minute} ${meridiem}`;
}

export function joinTime(parts: Readonly<TimeParts>): string {
  if (
    !TIME_HOURS.includes(parts.hour) ||
    !TIME_MINUTES.includes(parts.minute) ||
    (parts.meridiem !== "AM" && parts.meridiem !== "PM")
  ) {
    throw new RangeError("Expected an hour, minute, and AM or PM");
  }
  const hour = (Number(parts.hour) % 12) + (parts.meridiem === "PM" ? 12 : 0);
  return `${String(hour).padStart(2, "0")}:${parts.minute}`;
}

/** Save is enabled only for a complete, in-bounds decision. */
export function canSave(draft: Readonly<CardDraft>, today: string): boolean {
  if (draft.answer === null) return false;
  if (contactOutcomeFor(draft.answer) !== null && draft.followUp === null) return false;
  if (!needsDay(draft.answer, draft.followUp)) return true;
  if (!withinHorizon(draft.day, today, dayHorizon(draft.answer))) return false;
  return !needsTime(draft.answer) || timeWithinDay(draft.time);
}

/** The call-again the chosen day means: today is this afternoon, any other day its morning. */
export function followUpFor(day: string, today: string): FollowUpChoice {
  return day === today ? { kind: "this_afternoon" } : { kind: "day", date: day };
}

export type CardCommand =
  | {
      readonly kind: "attempt";
      readonly outcome: ContactOutcome;
      readonly callAgain: Readonly<FollowUpChoice>;
    }
  | { readonly kind: "complete_contact"; readonly outcome: ContactCompletionResult }
  | { readonly kind: "close"; readonly reason: ClosureReason }
  | { readonly kind: "book"; readonly appointment: Readonly<AppointmentChoice> };

/** The server action a saveable draft calls, or null while the draft is incomplete. */
export function commandFor(draft: Readonly<CardDraft>, today: string): CardCommand | null {
  if (draft.answer === null || !canSave(draft, today)) return null;
  const reason = closureFor(draft.answer);
  if (reason !== null) return { kind: "close", reason };
  const outcome = contactOutcomeFor(draft.answer);
  if (outcome !== null) {
    if (draft.followUp === "none") {
      return {
        kind: "complete_contact",
        outcome: draft.answer === "no_answer" ? "no_answer" : "reached",
      };
    }
    return {
      kind: "attempt",
      outcome,
      callAgain: followUpFor(draft.day, today),
    };
  }
  return {
    kind: "book",
    appointment: {
      date: draft.day,
      hour: Number(draft.time.slice(0, 2)),
      minute: Number(draft.time.slice(3, 5)),
    },
  };
}

/* The acknowledgement, split for the toast (src/components/ui/toast.tsx).

   The banner this replaces put outcome and patient in one sentence, and the
   two contact outcomes then opened with the same eleven characters — "No
   answer recorded for …" — so a call-again and a closed request were
   indistinguishable at a glance, which is the bug that started this work.
   The split fixes it structurally: the title is what changed, and it is the
   only place the two outcomes are ever compared; the description is who it
   changed for, and nothing else. Hierarchy does the disambiguating, so the
   copy never has to. */
export interface CardToast {
  /** What changed. Read first, and the only line that distinguishes outcomes. */
  readonly title: string;
  /** Who it changed for. The patient's name alone, never more. */
  readonly description: string;
  /** So the capture script redacts the name here as it does in the row. */
  readonly data: { readonly redact: "patient-name" };
}

/* Every card toast names the same person in the same place, so the hook is
   written once rather than repeated in each builder below. */
const NAMES_A_PATIENT = { redact: "patient-name" } as const;

/** The line while the save is in flight: the verb, in the present. */
export function savingToast(command: Readonly<CardCommand>, name: string): CardToast {
  const title =
    command.kind === "book"
      ? "Scheduling…"
      : command.kind === "close"
        ? "Closing the request…"
        : command.kind === "complete_contact"
          ? "Recording and closing…"
          : "Recording the call…";
  return { title, description: name, data: NAMES_A_PATIENT };
}

/** The line once it lands, in the queue's words. */
export function savedToast(
  command: Readonly<CardCommand>,
  name: string,
  callAgainAt: string | null,
  now: Date = new Date(),
): CardToast {
  return { title: savedTitle(command, callAgainAt, now), description: name, data: NAMES_A_PATIENT };
}

function savedTitle(command: Readonly<CardCommand>, callAgainAt: string | null, now: Date): string {
  if (command.kind === "book") return "Appointment scheduled";
  if (command.kind === "close") return "Request closed";
  const label = command.outcome === "no_answer" ? ANSWER_LABELS.no_answer : ANSWER_LABELS.contacted;
  if (command.kind === "complete_contact") return `${label} recorded — request closed`;
  return callAgainAt === null
    ? `${label} recorded — call again set`
    : `${label} recorded — call again ${followUpShortLabel(callAgainAt, now)}`;
}

/* A refusal in the same two lines as a success, so the toast never changes
   shape mid-flight: the title names the state the save is in, the card's own
   alert carries the sentence that says what to do about it. */
export function failedToast(failure: Readonly<CardFailure>, name: string): CardToast {
  const title = failure.uncertain
    ? "Could not confirm the save"
    : failure.refresh
      ? "Someone else worked this request"
      : "Not saved";
  return { title, description: name, data: NAMES_A_PATIENT };
}

export interface CardFailure {
  readonly message: string;
  /** The portal could not confirm the outcome: keep the idempotency key and offer Try again. */
  readonly uncertain: boolean;
  /** Someone else moved the request: nothing saved, the line refreshes. */
  readonly refresh: boolean;
}
export function failureFor(code: CommandRejection): CardFailure {
  if (code === "unavailable") {
    return {
      message:
        "The portal could not confirm whether that saved. Check Request history before repeating it; Try again will safely check the same attempt.",
      uncertain: true,
      refresh: false,
    };
  }
  if (code === "stale_version" || code === "illegal_transition") {
    return {
      message:
        "Someone else worked this request just now. Nothing was saved; the line is updating.",
      uncertain: false,
      refresh: true,
    };
  }
  return {
    message: "That did not save. Nothing was recorded, so it is safe to try again.",
    uncertain: false,
    refresh: false,
  };
}
