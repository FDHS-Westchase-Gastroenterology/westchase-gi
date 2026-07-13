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
