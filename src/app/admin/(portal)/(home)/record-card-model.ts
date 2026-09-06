import { followUpShortLabel } from "@/app/admin/(portal)/requests/format";
import type { AppointmentChoice } from "@/app/admin/(portal)/requests/workflow-actions";
import type { FollowUpChoice } from "@/lib/portal/business-time";
import { legalActionsFor } from "@/lib/portal/workflow/contracts";
import type {
  ClosureReason,
  CommandRejection,
  ContactOutcome,
  RequestState,
  RequestStatus,
} from "@/lib/portal/workflow/contracts";

/* The record card's decision model: one question, one calendar, one Save.
   A staff member picks what happened; the answer prefills the day the
   practice usually means (no answer → tomorrow, contacted → the coming
   Friday), the calendar keeps that day adjustable, and nothing is recorded
   until Save — the same commit model as the Received range editor. The
   card's markup calls these functions; nothing here touches React, so the
   rules are checked by a plain unit test. Day strings are practice-local
   YYYY-MM-DD, the vocabulary of every picker on the portal. */

export const CARD_ANSWERS = [
  "no_answer",
  "contacted",
  "booked",
  "wont_schedule",
  "not_actionable",
] as const;
export type CardAnswer = (typeof CARD_ANSWERS)[number];

export const ANSWER_ROWS = {
  no_answer: { label: "No answer", hint: "call again tomorrow" },
  contacted: { label: "Contacted", hint: "call again Friday" },
  booked: { label: "Appointment scheduled", hint: "pick day & time" },
  wont_schedule: { label: "Won't schedule", hint: "do not call again" },
  not_actionable: { label: "Not actionable", hint: "closes the request" },
} as const satisfies Record<CardAnswer, { label: string; hint: string }>;

const CONTACT_OUTCOME = {
  no_answer: "no_answer",
  contacted: "reached_follow_up",
  booked: null,
  wont_schedule: null,
  not_actionable: null,
} as const satisfies Record<CardAnswer, ContactOutcome | null>;

const CLOSURE = {
  no_answer: null,
  contacted: null,
  booked: null,
  wont_schedule: "wont_schedule",
  not_actionable: "not_actionable",
} as const satisfies Record<CardAnswer, ClosureReason | null>;

/** The contact attempt an answer records, or null when it records something else. */
export function contactOutcomeFor(answer: CardAnswer): ContactOutcome | null {
  return CONTACT_OUTCOME[answer];
}

/** The closure an answer records, or null when the request stays open. */
export function closureReasonFor(answer: CardAnswer): ClosureReason | null {
  return CLOSURE[answer];
}

function stateOf(status: RequestStatus): RequestState {
  return status === "scheduled" ? "booked" : status;
}

/** The rows a line's status makes legal, in the card's fixed order. The
   server re-checks the same policy; a hidden row is never the authorization. */
export function cardRowsFor(status: RequestStatus): readonly CardAnswer[] {
  const legal = legalActionsFor(stateOf(status));
  return CARD_ANSWERS.filter((answer) => {
    const reason = closureReasonFor(answer);
    if (reason !== null) return legal.closeReasons.includes(reason);
    if (answer === "booked") return legal.confirmBookingHandoff;
    return legal.recordContactAttempt;
  });
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
  readonly day: string;
  readonly time: string;
  /** Once staff pick a day by hand, no later answer overwrites it. */
  readonly dayTouched: boolean;
}

export const INITIAL_DRAFT: CardDraft = { answer: null, day: "", time: "", dayTouched: false };

export type CardEvent =
  | { readonly type: "answer"; readonly answer: CardAnswer; readonly today: string }
  | { readonly type: "day"; readonly day: string }
  | { readonly type: "time"; readonly time: string };

export function needsDay(answer: CardAnswer | null): boolean {
  return answer === "no_answer" || answer === "contacted" || answer === "booked";
}

export function needsTime(answer: CardAnswer | null): boolean {
  return answer === "booked";
}

/** How far out the calendar reaches: a call-again 90 days, an appointment 400. */
export function dayHorizon(answer: CardAnswer | null): number {
  return answer === "booked" ? 400 : 90;
}

const DAY_MS = 86_400_000;

function dayNumber(day: string): number {
  return Math.round(Date.parse(`${day}T00:00:00Z`) / DAY_MS);
}

export function addDays(day: string, count: number): string {
  return new Date((dayNumber(day) + count) * DAY_MS).toISOString().slice(0, 10);
}

/** The coming Friday: never today, so a Friday call rolls to next week. */
export function comingFriday(today: string): string {
  const weekday = new Date(`${today}T00:00:00Z`).getUTCDay();
  const delta = (5 - weekday + 7) % 7;
  return addDays(today, delta === 0 ? 7 : delta);
}

/** The day an answer usually means, or the draft's day when the answer has no presumption. */
export function prefillDay(answer: CardAnswer, today: string, current: string): string {
  if (answer === "no_answer") return addDays(today, 1);
  if (answer === "contacted") return comingFriday(today);
  return current;
}

export function cardReducer(draft: Readonly<CardDraft>, event: Readonly<CardEvent>): CardDraft {
  switch (event.type) {
    case "answer":
      return {
        ...draft,
        answer: event.answer,
        day: draft.dayTouched ? draft.day : prefillDay(event.answer, event.today, draft.day),
      };
    case "day":
      return { ...draft, day: event.day, dayTouched: true };
    case "time":
      return { ...draft, time: event.time };
    default:
      return draft;
  }
}

const YMD = /^\d{4}-\d{2}-\d{2}$/;

function withinHorizon(day: string, today: string, horizon: number): boolean {
  if (!YMD.test(day) || !Number.isFinite(dayNumber(day))) return false;
  return day >= today && day <= addDays(today, horizon);
}

/** Save is enabled only for a complete, in-bounds decision. */
export function canSave(draft: Readonly<CardDraft>, today: string): boolean {
  if (draft.answer === null) return false;
  if (!needsDay(draft.answer)) return true;
  if (!withinHorizon(draft.day, today, dayHorizon(draft.answer))) return false;
  return !needsTime(draft.answer) || TIME_OPTIONS.some((option) => option.value === draft.time);
}

/** The call-again the chosen day means: today is this afternoon, any other day its morning. */
export function followUpFor(day: string, today: string): FollowUpChoice {
  return day === today ? { kind: "this_afternoon" } : { kind: "day", date: day };
}

/* ---- Wall-clock times: half hours across the practice day ---- */

export const TIME_OPTIONS: readonly { value: string; label: string }[] = Array.from(
  { length: 18 },
  (_, index) => {
    const hour = 8 + Math.floor(index / 2);
    const minute = index % 2 === 0 ? 0 : 30;
    const meridiem = hour < 12 ? "AM" : "PM";
    const clockHour = hour % 12 === 0 ? 12 : hour % 12;
    return {
      value: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
      label: `${clockHour}:${String(minute).padStart(2, "0")} ${meridiem}`,
    };
  },
);

/* ---- Readouts ---- */

const WEEKDAY = new Intl.DateTimeFormat("en-US", { weekday: "long", timeZone: "UTC" });
const MONTH_DAY = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

/** "today", "tomorrow", a weekday inside the week, else "Sep 11" — the
   queue's own relative vocabulary (format.ts followUpShortLabel). */
export function dayLabel(day: string, today: string): string {
  const diff = dayNumber(day) - dayNumber(today);
  if (diff === 0) return "today";
  if (diff === 1) return "tomorrow";
  const date = new Date(`${day}T00:00:00Z`);
  if (diff > 1 && diff <= 6) return WEEKDAY.format(date);
  return MONTH_DAY.format(date);
}

/** The row's trailing hint: the presumption while unselected, the live draft once chosen. */
export function rowHint(answer: CardAnswer, draft: Readonly<CardDraft>, today: string): string {
  if (draft.answer !== answer) return ANSWER_ROWS[answer].hint;
  if (!needsDay(answer)) return ANSWER_ROWS[answer].hint;
  if (draft.day === "") return answer === "booked" ? "pick a day" : "pick a day to call";
  const when = dayLabel(draft.day, today);
  if (!needsTime(answer)) return `call again ${when}`;
  const time = TIME_OPTIONS.find((option) => option.value === draft.time);
  return time === undefined ? `${when} · pick a time` : `${when} · ${time.label}`;
}

/** The feedback line after a save, in the queue's words. */
export function savedMessage(
  answer: CardAnswer,
  name: string,
  callAgainAt: string | null,
  now: Date = new Date(),
): string {
  if (answer === "booked") return `${name} is Scheduled.`;
  if (closureReasonFor(answer) !== null) return `${name} is Closed.`;
  const label = ANSWER_ROWS[answer].label;
  return callAgainAt === null
    ? `${label} recorded for ${name}.`
    : `${label} recorded for ${name} — back ${followUpShortLabel(callAgainAt, now)}.`;
}

/* ---- The command a complete draft means, and the ways a save can fail ---- */

export type CardCommand =
  | {
      readonly kind: "attempt";
      readonly outcome: ContactOutcome;
      readonly callAgain: Readonly<FollowUpChoice>;
    }
  | { readonly kind: "close"; readonly reason: ClosureReason }
  | { readonly kind: "book"; readonly appointment: Readonly<AppointmentChoice> };

/** The server action a saveable draft calls, or null while the draft is incomplete. */
export function commandFor(draft: Readonly<CardDraft>, today: string): CardCommand | null {
  if (draft.answer === null || !canSave(draft, today)) return null;
  const outcome = contactOutcomeFor(draft.answer);
  if (outcome !== null)
    return { kind: "attempt", outcome, callAgain: followUpFor(draft.day, today) };
  const reason = closureReasonFor(draft.answer);
  if (reason !== null) return { kind: "close", reason };
  return {
    kind: "book",
    appointment: {
      date: draft.day,
      hour: Number(draft.time.slice(0, 2)),
      minute: Number(draft.time.slice(3, 5)),
    },
  };
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
