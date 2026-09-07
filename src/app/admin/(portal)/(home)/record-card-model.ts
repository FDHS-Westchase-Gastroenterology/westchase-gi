import { followUpShortLabel } from "@/app/admin/(portal)/requests/format";
import type { AppointmentChoice } from "@/app/admin/(portal)/requests/workflow-actions";
import type { FollowUpChoice } from "@/lib/portal/business-time";
import { legalActionsFor } from "@/lib/portal/workflow/contracts";
import type {
  ManualClosureReason as ClosureReason,
  CommandRejection,
  ContactOutcome,
  RequestState,
  RequestStatus,
} from "@/lib/portal/workflow/contracts";

/* The record card's decision model: the calendar is the surface, the
   answers sit beside it, the follow-up sits beneath it, Save commits. A
   staff member picks what happened; a contact answer presumes a call-again
   and offers No call where the workflow has a home for it; a booking asks
   for the day and its time. The calendar never presumes a day: it opens
   blank and shows only what staff click, in either order, and nothing is
   recorded until Save — the same commit model as the Received range
   editor. The card's markup calls these functions; nothing here
   touches React, so the rules are checked by a plain unit test. Day
   strings are practice-local YYYY-MM-DD and times are HH:MM, the
   vocabulary of every picker on the portal. */

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

/** The closure an answer and its follow-up record, or null when the
   request stays open: Close request always closes; Contacted with No call
   closes as won't schedule, which is what the patient said. */
export function closureFor(answer: CardAnswer, followUp: FollowUp | null): ClosureReason | null {
  if (answer === "not_actionable") return "not_actionable";
  if (answer === "contacted" && followUp === "none") return "wont_schedule";
  return null;
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

/** The follow-ups a contact answer offers: Call again or No call, on every
   line. No call after Contacted closes the request as won't schedule;
   No call after No answer records the attempt with no call-again. The
   card asks the whole question; the server decides what it accepts. */
export function followUpsFor(answer: CardAnswer | null): readonly FollowUp[] {
  return answer !== null && contactOutcomeFor(answer) !== null ? FOLLOW_UPS : [];
}

/** The sentence a line with no rows shows instead of the question. */
export function cardNoteFor(status: RequestStatus): string | null {
  if (status === "scheduled") return "Scheduled. Reopen it from the full record if plans change.";
  if (status === "closed") return "Closed. Reopen it from the full record to work it again.";
  return null;
}

/* ---- The draft ---- */

export interface CardDraft {
  readonly answer: CardAnswer | null;
  readonly followUp: FollowUp | null;
  /** The day staff clicked, or "" while the calendar is still blank. */
  readonly day: string;
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
      /* A picked day survives a change of answer while the new answer can
         still reach it; a day past a call-again's horizon clears, and the
         calendar goes blank until staff pick again. No answer ever supplies
         a day of its own. A contact answer presumes Call again, the
         practice's usual meaning; No call is one press away. */
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
      return draft;
  }
}

/* ---- Wall-clock times: the practice day, in quarter hours ---- */

export const TIME_MIN = "08:00";
export const TIME_MAX = "16:30";
export const TIME_STEP_SECONDS = 900;

const HM = /^\d{2}:\d{2}$/;

/** A time the practice day contains; zero-padded HH:MM compares as text. */
export function timeWithinDay(time: string): boolean {
  return HM.test(time) && time >= TIME_MIN && time <= TIME_MAX;
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

/* ---- The command a complete draft means, and the ways a save can fail ---- */

export type CardCommand =
  | {
      readonly kind: "attempt";
      readonly outcome: ContactOutcome;
      /** Null is No call: the attempt is recorded and nobody calls back. */
      readonly callAgain: Readonly<FollowUpChoice> | null;
    }
  | { readonly kind: "close"; readonly reason: ClosureReason }
  | { readonly kind: "book"; readonly appointment: Readonly<AppointmentChoice> };

/** The server action a saveable draft calls, or null while the draft is incomplete. */
export function commandFor(draft: Readonly<CardDraft>, today: string): CardCommand | null {
  if (draft.answer === null || !canSave(draft, today)) return null;
  const reason = closureFor(draft.answer, draft.followUp);
  if (reason !== null) return { kind: "close", reason };
  const outcome = contactOutcomeFor(draft.answer);
  if (outcome !== null)
    return {
      kind: "attempt",
      outcome,
      callAgain: draft.followUp === "none" ? null : followUpFor(draft.day, today),
    };
  return {
    kind: "book",
    appointment: {
      date: draft.day,
      hour: Number(draft.time.slice(0, 2)),
      minute: Number(draft.time.slice(3, 5)),
    },
  };
}

/* ---- The saved line ---- */

/** The feedback line after a save, in the queue's words. */
export function savedMessage(
  command: Readonly<CardCommand>,
  name: string,
  callAgainAt: string | null,
  now: Date = new Date(),
): string {
  if (command.kind === "book") return `${name} is Scheduled.`;
  if (command.kind === "close") return `${name} is Closed.`;
  const label = command.outcome === "no_answer" ? ANSWER_LABELS.no_answer : ANSWER_LABELS.contacted;
  return callAgainAt === null
    ? `${label} recorded for ${name}.`
    : `${label} recorded for ${name} — back ${followUpShortLabel(callAgainAt, now)}.`;
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
