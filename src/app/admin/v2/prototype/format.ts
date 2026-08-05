// Practice-local labels for the day-sheet prototype. The front desk reads
// time as "today", "Friday", "Aug 20" — never raw durations or UTC. All
// helpers are pure and client-safe; the practice calendar is
// America/New_York, matching src/lib/portal/business-time.ts.

import type { RequestSnapshot } from "@/lib/portal/appointment-request-machine";

const PRACTICE_TZ = "America/New_York";

const NY_DAY = new Intl.DateTimeFormat("en-CA", {
  dateStyle: "short",
  timeZone: PRACTICE_TZ,
});

const NY_TIME = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
  timeZone: PRACTICE_TZ,
});

const NY_RECEIVED = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
  timeZone: PRACTICE_TZ,
});

const DAY_WEEKDAY = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  timeZone: "UTC",
});

const DAY_WEEKDAY_SHORT = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  timeZone: "UTC",
});

const DAY_MONTH = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

const TODAY_HEAD = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
  timeZone: PRACTICE_TZ,
});

/** Practice-local calendar day, YYYY-MM-DD. */
export function practiceToday(now: Date = new Date()): string {
  return NY_DAY.format(now);
}

/** "Tuesday, August 4" for the sheet head. */
export function dayHeadLabel(now: Date = new Date()): string {
  return TODAY_HEAD.format(now);
}

function dayDate(day: string): Date {
  // Calendar days render at UTC noon so the weekday never slips a zone.
  return new Date(`${day}T12:00:00Z`);
}

function dayNumber(day: string): number {
  return Math.round(Date.parse(`${day}T12:00:00Z`) / 86_400_000);
}

/** Days from `today` to `day`; negative means past. */
export function dayOffset(day: string, today: string): number {
  return dayNumber(day) - dayNumber(today);
}

/** "today" | "tomorrow" | "yesterday" | "Thursday" | "Aug 20". */
export function dayLabel(day: string, today: string): string {
  const offset = dayOffset(day, today);
  if (offset === 0) return "today";
  if (offset === 1) return "tomorrow";
  if (offset === -1) return "yesterday";
  if (Math.abs(offset) <= 6) return DAY_WEEKDAY.format(dayDate(day));
  return DAY_MONTH.format(dayDate(day));
}

/** Compact gutter form: "Today" | "Tomorrow" | "Thu" | "Aug 20". */
export function dayGutterLabel(day: string, today: string): string {
  const offset = dayOffset(day, today);
  if (offset === 0) return "Today";
  if (offset === 1) return "Tomorrow";
  if (offset === -1) return "Yesterday";
  if (Math.abs(offset) <= 6) return DAY_WEEKDAY_SHORT.format(dayDate(day));
  return DAY_MONTH.format(dayDate(day));
}

/** "2:14 PM" practice-local. */
export function timeLabel(iso: string): string {
  return NY_TIME.format(new Date(iso));
}

/** "Mon, Aug 3, 2:14 PM" practice-local. */
export function receivedLabel(iso: string): string {
  return NY_RECEIVED.format(new Date(iso));
}

/** Practice-local calendar day of an instant. */
export function dayOf(iso: string): string {
  return NY_DAY.format(new Date(iso));
}

// ---------------------------------------------------------------------
// Attention grouping — the day sheet's working order. Position on the
// page is the attention system (PRODUCT.md: staff author attention);
// groups derive purely from machine state plus the practice calendar.
// ---------------------------------------------------------------------

export type AttentionGroup =
  | "due" // CONTACTED, call-again day arrived or passed
  | "new" // NEW, unworked
  | "silent" // CONTACTED with no call-again day — needs a decision
  | "review" // CLOSED awaiting legacy classification
  | "waiting" // CONTACTED, call-again day in the future
  | "resolved"; // BOOKED or classified CLOSED

export function attentionGroup(
  snapshot: RequestSnapshot,
  today: string,
): AttentionGroup {
  switch (snapshot.state) {
    case "NEW":
      return "new";
    case "CONTACTED":
      if (snapshot.callAgainDay === null) return "silent";
      return dayOffset(snapshot.callAgainDay, today) <= 0 ? "due" : "waiting";
    case "BOOKED":
      return "resolved";
    case "CLOSED":
      return snapshot.legacyReviewRequired ? "review" : "resolved";
  }
}

/** Groups that count as "needs attention now" for the nav signal. */
export const ATTENTION_NOW: readonly AttentionGroup[] = [
  "due",
  "new",
  "silent",
  "review",
];
