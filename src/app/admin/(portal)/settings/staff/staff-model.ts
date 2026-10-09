import type { StaffRole } from "@/lib/portal/contracts";
import { PRACTICE_TIME_ZONE } from "@/lib/portal/scheduling/time";

/* Staff access (issue #355, Figma St4): the words a row and the invite
   sheet use. Dates read in the practice's time zone, against the `now` the
   server rendered with, so the server and the browser print the same. */

/** The role's name on the page; `staff` is the front desk. Manager waits for #342. */
export const ROLE_NAMES = {
  staff: "Front desk",
  admin: "Admin",
} as const satisfies Record<StaffRole, string>;

/** What the role can do, under the invite sheet's role control. */
export const ROLE_REACH = {
  staff:
    "Works requests and the schedule, and books, moves and cancels appointments. Sees Settings but can't change them.",
  admin:
    "Everything the front desk does, and changes Settings: providers, hours, staff access and notifications.",
} as const satisfies Record<StaffRole, string>;

const DAY_KEY = new Intl.DateTimeFormat("en-CA", {
  timeZone: PRACTICE_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const TIME = new Intl.DateTimeFormat("en-US", {
  timeZone: PRACTICE_TIME_ZONE,
  hour: "numeric",
  minute: "2-digit",
});
const SHORT_DATE = new Intl.DateTimeFormat("en-US", {
  timeZone: PRACTICE_TIME_ZONE,
  month: "short",
  day: "numeric",
});
const SHORT_DATE_YEAR = new Intl.DateTimeFormat("en-US", {
  timeZone: PRACTICE_TIME_ZONE,
  month: "short",
  day: "numeric",
  year: "numeric",
});

function dayKey(instant: Readonly<Date>): string {
  return DAY_KEY.format(instant);
}

function shortDate(instant: Readonly<Date>, now: Readonly<Date>): string {
  return dayKey(instant).slice(0, 4) === dayKey(now).slice(0, 4)
    ? SHORT_DATE.format(instant)
    : SHORT_DATE_YEAR.format(instant);
}

/** "Today, 8:02 AM", "Yesterday", or "Sep 24". */
export function signedInLabel(iso: string, nowIso: string): string {
  const at = new Date(iso);
  const now = new Date(nowIso);
  if (dayKey(at) === dayKey(now)) return `Today, ${TIME.format(at)}`;
  const yesterday = new Date(now);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  if (dayKey(at) === dayKey(yesterday)) return "Yesterday";
  return shortDate(at, now);
}

/** "Invited Sep 24". */
export function invitedLabel(iso: string, nowIso: string): string {
  return `Invited ${shortDate(new Date(iso), new Date(nowIso))}`;
}
