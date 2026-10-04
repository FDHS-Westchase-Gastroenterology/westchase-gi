import "server-only";

import {
  formatPhoneForDisplay,
  formatReceived,
  LOCATION_LABELS,
  telHref,
  TIME_LABELS,
} from "@/app/admin/(portal)/requests/format";
import type { WorkedQueueRow } from "@/app/admin/(portal)/requests/queue";
import { displayNameOrEmail } from "@/lib/portal/staff-identity";

import type { HomeLine } from "./home-line";

/* One request as a Home line: every display string assembled against a
   single clock on the server, so SSR and hydration agree. Home builds its
   list with it, and the schedule builds the one line the full-record sheet
   opens with from an appointment's request. */

const PRACTICE_TZ = "America/New_York";

const NY_MONTH_DAY = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: PRACTICE_TZ,
});
const NY_WEEKDAY_MONTH_DAY = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
  timeZone: PRACTICE_TZ,
});

const NY_DAY = new Intl.DateTimeFormat("en-CA", {
  dateStyle: "short",
  timeZone: PRACTICE_TZ,
});

const MINUTE_MS = 60_000;
const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;

function practiceDayNumber(date: Date): number {
  return Math.round(Date.parse(`${NY_DAY.format(date)}T00:00:00Z`) / DAY_MS);
}

/** "37m" under an hour, "5h" under a day, then "12d" — the reference's rhythm. */
function rel(ms: number, nowMs: number): string {
  /* Spelled out, as the approved frame reads them: "19 min ago", "2 hr ago",
     "3 days ago" (Figma Ypf9ohpRcGWF5C9T9bSvWW, node 88:1176). */
  const delta = Math.max(0, nowMs - ms);
  if (delta < HOUR_MS) return `${Math.max(1, Math.round(delta / MINUTE_MS))} min ago`;
  if (delta < DAY_MS) return `${Math.round(delta / HOUR_MS)} hr ago`;
  const days = Math.round(delta / DAY_MS);
  return days === 1 ? "1 day ago" : `${days} days ago`;
}

function initialsOf(name: string): string {
  const tokens = name.split(/[\s._@-]+/u).filter((token) => token !== "");
  if (tokens.length === 0) return "—";
  const first = tokens[0]?.charAt(0) ?? "";
  const second = tokens.length > 1 ? (tokens[1]?.charAt(0) ?? "") : "";
  return `${first}${second}`.toUpperCase();
}

export function lineFor(
  row: Readonly<WorkedQueueRow>,
  now: Date,
  nameMap: ReadonlyMap<string, string>,
): HomeLine {
  const nowMs = now.getTime();
  const createdMs = Date.parse(row.created_at);
  let timing: string;
  let stamp: HomeLine["stamp"] = null;
  let followUp: HomeLine["followUp"] = null;

  switch (row.bucket) {
    case "new": {
      timing = `Received ${rel(createdMs, nowMs)}`;
      break;
    }
    case "follow_up": {
      const due = new Date(row.follow_up_at ?? row.created_at);
      const overdue = practiceDayNumber(due) < practiceDayNumber(now);
      timing = overdue ? `Overdue since ${NY_MONTH_DAY.format(due)}` : "Due today";
      if (overdue) stamp = "Overdue";
      followUp = overdue ? "overdue" : "due_today";
      break;
    }
    case "upcoming": {
      /* A dateless Call again row that was just worked rests here until the
         next business morning. It still has no day to come back on, so it
         reads and filters as Needs a date rather than borrowing its
         received date as a callback. */
      if (row.follow_up_at === null) {
        timing = `Last activity ${rel(Date.parse(row.lastActivityAt ?? row.created_at), nowMs)}`;
        followUp = "needs_date";
      } else {
        timing = `Back ${NY_WEEKDAY_MONTH_DAY.format(new Date(row.follow_up_at))}`;
        followUp = "upcoming";
      }
      break;
    }
    case "stale": {
      timing = `Last activity ${rel(Date.parse(row.lastActivityAt ?? row.created_at), nowMs)}`;
      followUp = "needs_date";
      break;
    }
    case "scheduled": {
      timing = "Handed off";
      break;
    }
    case "closed": {
      timing = "Closed";
      break;
    }
  }

  const actorName =
    row.lastActivityBy === null ? null : displayNameOrEmail(nameMap, row.lastActivityBy);

  return {
    id: row.id,
    version: row.version,
    patientId: row.patientId,
    name: row.name,
    phoneDisplay: formatPhoneForDisplay(row.phone),
    phoneDigits: row.phone.replaceAll(/\D/gu, ""),
    tel: telHref(row.phone),
    status: row.status,
    bucket: row.bucket,
    location: row.location,
    createdAtMs: createdMs,
    pref: `${LOCATION_LABELS[row.location]} · ${TIME_LABELS[row.preferred_time]}`,
    timing,
    stamp,
    followUp,
    receivedRel: rel(createdMs, nowMs),
    receivedFull: formatReceived(row.created_at),
    actorName,
    actorInitials: actorName === null ? null : initialsOf(actorName),
    lastActivityRel:
      row.lastActivityAt === null ? null : rel(Date.parse(row.lastActivityAt), nowMs),
    followUpSet: row.follow_up_at !== null,
  };
}
