import type { RequestLocation, RequestStatus, RequestTime } from "@/lib/portal/contracts";
import type { ClosureReason, ContactOutcome, RequestState } from "@/lib/portal/workflow/contracts";
import { locales } from "@/lib/site";
import type { Locale } from "@/lib/site";

export const STATUS_LABELS = {
  new: "New",
  contacted: "Contacted",
  scheduled: "Scheduled",
  closed: "Closed",
} as const satisfies Record<RequestStatus, string>;

// DEC-04: the durable `booked` state always renders as **Scheduled** on
// Staff surfaces. This is the one place that translation happens for
// Presentation; nothing translates the label back into a stored state.
export function presentationStatus(state: RequestState): RequestStatus {
  return state === "booked" ? "scheduled" : state;
}

export const STATE_LABELS = {
  new: "New",
  contacted: "Contacted",
  booked: "Scheduled",
  closed: "Closed",
} as const satisfies Record<RequestState, string>;

/** Contact-attempt outcomes in front-desk past tense (Request history). */
export const CONTACT_OUTCOME_LABELS = {
  reached_follow_up: "Reached the patient — follow-up needed",
  voicemail: "Left a voicemail",
  no_answer: "No answer",
} as const satisfies Record<ContactOutcome, string>;

/** Typed unbooked closure reasons in front-desk language. */
export const CLOSURE_REASON_LABELS = {
  not_actionable: "duplicate or not actionable",
  wont_schedule: "patient won't schedule",
} as const satisfies Record<ClosureReason, string>;

/* Phone numbers are stored as submitted, so presentation belongs here rather
   than in each surface. Every staff surface reads a number the same way and
   dials it the same way. */
export function formatPhoneForDisplay(value: string): string {
  const trimmed = value.trim();
  const digits = trimmed.replace(/\D/gu, "");
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11 && digits.startsWith("1")) {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  return trimmed;
}

/* A dialable href. Most dialers tolerate punctuation, but a phone on a staff
   surface exists to be tapped once and connect. */
export function telHref(phone: string): string {
  const digits = phone.replace(/\D/gu, "");
  if (digits.length === 10) return `tel:+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `tel:+${digits}`;
  return `tel:${digits}`;
}

// Practice-local time: front desk staff read these in Tampa.
const dateTime = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
  timeZone: "America/New_York",
});

const dateTimeWithYear = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
  timeZone: "America/New_York",
});

export function formatReceived(iso: string, withYear = false): string {
  const date = new Date(iso);
  return (withYear ? dateTimeWithYear : dateTime).format(date);
}

export const LOCATION_LABELS = {
  any: "Either office",
  tampa: "Tampa",
  lutz: "Lutz",
} as const satisfies Record<RequestLocation, string>;

export const TIME_LABELS = {
  any: "Any time",
  morning: "Morning",
  afternoon: "Afternoon",
} as const satisfies Record<RequestTime, string>;

export const LOCALE_LABELS = {
  en: "English",
  es: "Spanish",
  vi: "Vietnamese",
  ko: "Korean",
  ar: "Arabic",
} as const satisfies Record<Locale, string>;

export function localeLabel(locale: string): string {
  const known = locales.find((value) => value === locale);
  return known === undefined ? locale : LOCALE_LABELS[known];
}

// Call-outcome vocabulary in front-desk language. Past-tense lines for
// Request activity, keyed by the RPC outcome ids.
export const OUTCOME_HISTORY_LABELS = {
  booked: "Appointment booked",
  reached_follow_up: "Reached the patient — follow-up needed",
  voicemail: "Left a voicemail",
  no_answer: "No answer",
  wont_schedule: "Patient won't schedule",
  not_actionable: "Duplicate or not actionable",
  scheduled_transferred: "Finished — appointment booked",
} as const;

// A callback date in the front desk's practice-local phrasing:
// "Friday, August 1 morning" (9:00 ET) / "Friday, August 1 afternoon" (1:00 ET).
const followUpDay = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
  timeZone: "America/New_York",
});

const followUpHour = new Intl.DateTimeFormat("en-US", {
  hour: "2-digit",
  hourCycle: "h23",
  timeZone: "America/New_York",
});

export function followUpWhenLabel(iso: string): string {
  const date = new Date(iso);
  const hour = Number(followUpHour.format(date));
  const part = hour < 12 ? "morning" : "afternoon";
  return `${followUpDay.format(date)} ${part}`;
}

// Compact practice-local label for queue hints: "this morning",
// "tomorrow morning", "Friday morning", or "August 8".
const shortWeekday = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  timeZone: "America/New_York",
});

const shortMonthDay = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  timeZone: "America/New_York",
});

const nyDay = new Intl.DateTimeFormat("en-CA", {
  dateStyle: "short",
  timeZone: "America/New_York",
});

function nyDayNumber(date: Date): number {
  return Math.round(Date.parse(`${nyDay.format(date)}T00:00:00Z`) / 86_400_000);
}

export function followUpShortLabel(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  const hour = Number(followUpHour.format(date));
  const part = hour < 12 ? "morning" : "afternoon";
  const dayDiff = nyDayNumber(date) - nyDayNumber(now);
  if (dayDiff <= 0) return `this ${part}`;
  if (dayDiff === 1) return `tomorrow ${part}`;
  if (dayDiff <= 6) return `${shortWeekday.format(date)} ${part}`;
  return shortMonthDay.format(date);
}
