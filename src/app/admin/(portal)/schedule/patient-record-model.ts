import { originLabel } from "@/app/admin/(portal)/requests/record-sections";
import { shortName } from "@/app/admin/(portal)/settings/settings-model";
import type { PatientVisit } from "@/lib/portal/patients/contracts";
import type { FullRecord } from "@/lib/portal/request-record/contracts";

import { cardDay, practiceDate, practiceTime, timeRange } from "./week-calendar";
import { statusBadge } from "./week-card-model";
import type { StatusBadge } from "./week-card-model";

/* What the Schedule's patient record (issue #356) says: its visits in
   two groups, each visit's one line and the word on its right, the line
   under the name that says where the patient stands, and how they came
   to the practice. Pure, so the sheet and its specs read the same words. */

const MONTH_DAY = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "America/New_York",
});

export interface VisitGroups {
  /** Today and later, soonest first. */
  readonly upcoming: readonly PatientVisit[];
  /** Before today, latest first. */
  readonly earlier: readonly PatientVisit[];
}

/** The visits split at the start of the practice's today. */
export function visitGroups(
  visits: readonly PatientVisit[],
  now: Readonly<Date> = new Date(),
): VisitGroups {
  const today = practiceDate(now);
  const upcoming: PatientVisit[] = [];
  const earlier: PatientVisit[] = [];
  for (const visit of visits) {
    if (practiceDate(new Date(visit.startsAt)) >= today) upcoming.push(visit);
    else earlier.push(visit);
  }
  upcoming.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  earlier.sort((a, b) => b.startsAt.localeCompare(a.startsAt));
  return { upcoming, earlier };
}

/** True when the visit is on the practice's today. */
export function isToday(visit: Readonly<PatientVisit>, now: Readonly<Date> = new Date()): boolean {
  return practiceDate(new Date(visit.startsAt)) === practiceDate(now);
}

/** The visit's practice date, the day the schedule moves to. */
export function visitDate(visit: Readonly<PatientVisit>): string {
  return practiceDate(new Date(visit.startsAt));
}

/** "Today · 11:00 AM – 12:00 PM", "Tue, Oct 20 · 9:00 – 10:00 AM". */
export function visitWhen(visit: Readonly<PatientVisit>, now: Readonly<Date> = new Date()): string {
  const day = isToday(visit, now) ? "Today" : cardDay(visit.startsAt);
  return `${day} · ${timeRange(visit.startsAt, visit.endsAt)}`;
}

/** "Dr. Amir Awad · Tampa · Follow-up". */
export function visitWith(visit: Readonly<PatientVisit>): string {
  return `${visit.providerName} · ${visit.locationName} · ${visit.appointmentTypeName}`;
}

const VISIT_WORD = {
  scheduled: "Booked",
  checked_in: "Checked in",
  completed: "Done",
  no_show: "No-show",
  cancelled: "Cancelled",
} as const satisfies Record<PatientVisit["status"], string>;

/** The word on a visit's right; today's visit offers its place on the schedule instead. */
export function visitWord(
  visit: Readonly<PatientVisit>,
  now: Readonly<Date> = new Date(),
): string | null {
  return isToday(visit, now) ? null : VISIT_WORD[visit.status];
}

/** Where the patient stands, under the name. */
export type PatientStanding =
  | { readonly kind: "visit"; readonly badge: StatusBadge; readonly text: string }
  | { readonly kind: "request" }
  | { readonly kind: "quiet"; readonly text: string };

/** "11:00 AM with Dr. Awad · Tampa". */
function atWith(visit: Readonly<PatientVisit>): string {
  return `${practiceTime(visit.startsAt)} with ${shortName(visit.providerName)} · ${visit.locationName}`;
}

/**
 * Today's visit with its badge; else the next one; else the open request
 * the patient came in with; else when they were last seen.
 */
export function patientStanding(
  groups: Readonly<VisitGroups>,
  openRequest: boolean,
  now: Readonly<Date> = new Date(),
): PatientStanding {
  const next = groups.upcoming.at(0);
  if (next !== undefined && isToday(next, now))
    return { kind: "visit", badge: statusBadge(next.status), text: `Today, ${atWith(next)}` };
  if (next !== undefined)
    return {
      kind: "visit",
      badge: statusBadge(next.status),
      text: `${cardDay(next.startsAt)}, ${atWith(next)}`,
    };
  if (openRequest) return { kind: "request" };
  const last = groups.earlier.at(0);
  return {
    kind: "quiet",
    text: last === undefined ? "No visits yet" : `Last visit · ${cardDay(last.startsAt)}`,
  };
}

/** "Not booked yet. Prefers either office, any time." — the request
    record's appointments, from the line's "Either office · Any time". */
export function notBookedText(pref: string): string {
  const [place = "", time = ""] = pref.split(" · ");
  const office = place === "Either office" ? "either office" : place;
  return `Not booked yet. Prefers ${office}, ${time.toLowerCase()}.`;
}

/** "Website request · Aug 10 · booked the same day". */
// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- the request record carries workflow history entries whose types cannot be made readonly
export function cameToUs(record: FullRecord): string {
  const origin = originLabel(record);
  const parts = [
    origin === "Website form" ? "Website request" : origin === "Not recorded" ? "Request" : origin,
    MONTH_DAY.format(new Date(record.createdAt)),
  ];
  if (record.bookingConfirmedAt !== null) {
    const sameDay =
      practiceDate(new Date(record.bookingConfirmedAt)) ===
      practiceDate(new Date(record.createdAt));
    parts.push(
      sameDay
        ? "booked the same day"
        : `booked ${MONTH_DAY.format(new Date(record.bookingConfirmedAt))}`,
    );
  }
  return parts.join(" · ");
}

const PRACTICE_DATE = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "America/New_York",
});

const CALENDAR_DATE = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

/** "Sep 3, 2026": when the patient joined the portal. */
export function sinceLabel(iso: string): string {
  return PRACTICE_DATE.format(new Date(iso));
}

/** "May 4, 1961" from a stored calendar date (a date, not an instant). */
export function dateLabel(date: string): string {
  return CALENDAR_DATE.format(new Date(`${date}T12:00:00Z`));
}

/** A stored date of birth, or that there is none. */
export function birthLabel(date: string | null): string {
  return date === null ? "Not recorded" : dateLabel(date);
}
