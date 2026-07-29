import type {
  RequestLocation,
  RequestStatus,
  RequestTime,
} from "@/lib/portal/contracts";

export const STATUS_LABELS: Record<RequestStatus, string> = {
  new: "New",
  contacted: "Contacted",
  scheduled: "Scheduled",
  closed: "Closed",
};

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

export const LOCATION_LABELS: Record<RequestLocation, string> = {
  any: "Either office",
  tampa: "Tampa",
  lutz: "Lutz",
};

export const TIME_LABELS: Record<RequestTime, string> = {
  any: "Any time",
  morning: "Morning",
  afternoon: "Afternoon",
};

export const LOCALE_LABELS: Record<string, string> = {
  en: "English",
  es: "Spanish",
  vi: "Vietnamese",
  ko: "Korean",
  ar: "Arabic",
};

// Call-outcome vocabulary in front-desk language. Past-tense lines for the
// work-history record, keyed by the RPC outcome ids.
export const OUTCOME_HISTORY_LABELS: Record<string, string> = {
  reached_follow_up: "Reached the patient — follow-up needed",
  voicemail: "Left a voicemail",
  no_answer: "No answer",
  wont_schedule: "Patient won't schedule",
  not_actionable: "Duplicate or not actionable",
  scheduled_transferred: "Finished — appointment booked",
};

// A follow-up day in the front desk's practice-local phrasing:
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
