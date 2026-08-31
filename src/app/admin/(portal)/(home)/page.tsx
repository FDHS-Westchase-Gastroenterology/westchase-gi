import { randomUUID } from "node:crypto";

import { PortalReleaseHomeAnnouncement } from "@/app/admin/(portal)/portal-release-briefing";
import { PortalTour } from "@/app/admin/(portal)/portal-tour";
import { PortalTourReturnFocus } from "@/app/admin/(portal)/portal-tour-return-focus";
import type { PortalTourReturnState } from "@/app/admin/(portal)/portal-tour-return-focus";
import {
  formatPhoneForDisplay,
  formatReceived,
  LOCATION_LABELS,
  telHref,
  TIME_LABELS,
} from "@/app/admin/(portal)/requests/format";
import {
  fetchAttentiveOpenRows,
  fetchClosedRows,
  VIEW_DB_STATUSES,
} from "@/app/admin/(portal)/requests/queue";
import type { QueueRow, WorkedQueueRow } from "@/app/admin/(portal)/requests/queue";
import { requireRole } from "@/lib/portal/auth";
import { arrivedOutsideOfficeHours } from "@/lib/portal/business-time";
import { availableQueueCount } from "@/lib/portal/request-query";
import { serviceClient } from "@/lib/portal/server";
import { displayNameOrEmail, fetchStaffNameMap } from "@/lib/portal/staff-identity";
import { staffGreeting } from "@/lib/portal/staff-language";

import type { HomeLine } from "./home-line";
import { HomeWorkbench } from "./home-workbench";

/* Home is the practice's call list, reshaped per the redesign brief: the
   header it always had, then a filter bar and one flat, attention-ordered
   list. The server assembles every display string against a single clock so
   SSR and hydration agree; the client only filters what is already here. */

const PRACTICE_TZ = "America/New_York";

const NY_CLOCK = new Intl.DateTimeFormat("en-US", {
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: PRACTICE_TZ,
});

const NY_DATE = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
  timeZone: PRACTICE_TZ,
});

const NY_MONTH_DAY = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: PRACTICE_TZ,
});

const NY_DAY = new Intl.DateTimeFormat("en-CA", {
  dateStyle: "short",
  timeZone: PRACTICE_TZ,
});

const MORNING_START = 5 * 60 + 30;

/* The closed tail rides along so `status: Closed` is a real slice, windowed
   because home is a working surface, not the archive. */
const CLOSED_WINDOW = 60;

const MINUTE_MS = 60_000;
const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;

function practiceDayNumber(date: Date): number {
  return Math.round(Date.parse(`${NY_DAY.format(date)}T00:00:00Z`) / DAY_MS);
}

// Practice-local clock: the front desk reads this in Tampa.
function greetingFor(minutes: number): string {
  if (minutes >= MORNING_START && minutes < 12 * 60) return "Good morning";
  if (minutes >= 12 * 60 && minutes < 17 * 60) return "Good afternoon";
  return "Good evening";
}

function parseTourReturnState(
  value: string | readonly string[] | undefined,
): PortalTourReturnState | null {
  return value === "finished" || value === "not-now" || value === "restarted" ? value : null;
}

/* A settled count read, or null when it failed. A rejected promise and a
   PostgREST error both mean unavailable — never zero. */
function countOf(
  read: Readonly<PromiseSettledResult<Readonly<{ count: number | null; error: unknown }>>>,
): number | null {
  if (read.status !== "fulfilled") return null;
  return availableQueueCount(read.value.count, read.value.error !== null);
}

/** "37m" under an hour, "5h" under a day, then "12d" — the reference's rhythm. */
function rel(ms: number, nowMs: number): string {
  const delta = Math.max(0, nowMs - ms);
  if (delta < HOUR_MS) return `${Math.max(1, Math.round(delta / MINUTE_MS))}m`;
  if (delta < DAY_MS) return `${Math.round(delta / HOUR_MS)}h`;
  return `${Math.round(delta / DAY_MS)}d`;
}

function initialsOf(name: string): string {
  const tokens = name.split(/[\s._@-]+/u).filter((token) => token !== "");
  if (tokens.length === 0) return "—";
  const first = tokens[0]?.charAt(0) ?? "";
  const second = tokens.length > 1 ? (tokens[1]?.charAt(0) ?? "") : "";
  return `${first}${second}`.toUpperCase();
}

function lineFor(
  row: Readonly<WorkedQueueRow>,
  now: Date,
  nameMap: ReadonlyMap<string, string>,
): HomeLine {
  const nowMs = now.getTime();
  const createdMs = Date.parse(row.created_at);
  let timing: string;
  let stamp: HomeLine["stamp"] = null;

  switch (row.bucket) {
    case "new": {
      timing = `waiting ${rel(createdMs, nowMs)}`;
      if (arrivedOutsideOfficeHours(row.created_at)) stamp = "After hours";
      break;
    }
    case "follow_up": {
      const due = new Date(row.follow_up_at ?? row.created_at);
      const overdue = practiceDayNumber(due) < practiceDayNumber(now);
      timing = overdue ? `due ${NY_MONTH_DAY.format(due)}` : "due today";
      if (overdue) stamp = "Overdue";
      break;
    }
    case "upcoming": {
      timing = `back ${NY_MONTH_DAY.format(new Date(row.follow_up_at ?? row.created_at))}`;
      break;
    }
    case "stale": {
      timing = `quiet ${rel(Date.parse(row.lastActivityAt ?? row.created_at), nowMs)}`;
      break;
    }
    case "scheduled": {
      timing = "handed off";
      break;
    }
    case "closed": {
      timing = "closed";
      break;
    }
  }

  const actorName =
    row.lastActivityBy === null ? null : displayNameOrEmail(nameMap, row.lastActivityBy);

  return {
    id: row.id,
    version: row.version,
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
    receivedRel: rel(createdMs, nowMs),
    receivedFull: formatReceived(row.created_at),
    actorName,
    actorInitials: actorName === null ? null : initialsOf(actorName),
    lastActivityRel:
      row.lastActivityAt === null ? null : rel(Date.parse(row.lastActivityAt), nowMs),
    followUpSet: row.follow_up_at !== null,
    detailHref: `/admin/requests/${row.id}`,
  };
}

function closedAsWorked(row: Readonly<QueueRow>): WorkedQueueRow {
  return { ...row, bucket: "closed", lastActivityAt: null, lastActivityBy: null };
}

export default async function AdminHomePage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{ tour?: string | string[] }>;
}>) {
  const session = await requireRole("staff");
  const tourReturnState = parseTourReturnState((await searchParams).tour);
  const now = new Date();
  const [hour, minute] = NY_CLOCK.format(now).split(":").map(Number);
  const minutes = hour * 60 + minute;

  const db = serviceClient();

  /* A failed read is never an empty day. The open-set read settles
     independently of every count, so one unavailable number suppresses
     itself instead of blanking the work. */
  const [
    openRead,
    closedRead,
    staffRead,
    newCountRead,
    contactedCountRead,
    scheduledCountRead,
    closedCountRead,
    recipientsRead,
    outboxRead,
  ] = await Promise.allSettled([
    fetchAttentiveOpenRows(db, { now }),
    fetchClosedRows(db, { from: 0, limit: CLOSED_WINDOW }),
    fetchStaffNameMap(db),
    db.from("requests").select("id", { count: "exact", head: true }).eq("status", "new"),
    db
      .from("requests")
      .select("id", { count: "exact", head: true })
      .in("status", [...VIEW_DB_STATUSES.contacted]),
    db
      .from("requests")
      .select("id", { count: "exact", head: true })
      .in("status", [...VIEW_DB_STATUSES.scheduled]),
    db
      .from("requests")
      .select("id", { count: "exact", head: true })
      .in("status", [...VIEW_DB_STATUSES.closed]),
    db
      .from("notification_recipients")
      .select("id", { count: "exact", head: true })
      .eq("active", true),
    db
      .from("notification_outbox")
      .select("id", { count: "exact", head: true })
      .in("status", ["failed", "retry_pending", "exhausted"])
      .gte("updated_at", new Date(now.getTime() - DAY_MS).toISOString()),
  ]);

  const nameMap: ReadonlyMap<string, string> =
    staffRead.status === "fulfilled" ? staffRead.value : new Map<string, string>();

  /* Open rows are the page; the closed window rides behind them. A failed
     closed read narrows the list rather than blanking it. */
  const closedRows = closedRead.status === "fulfilled" ? closedRead.value : [];
  const lines: HomeLine[] | null =
    openRead.status === "fulfilled"
      ? [
          ...openRead.value.map((row) => lineFor(row, now, nameMap)),
          ...closedRows.map((row) => lineFor(closedAsWorked(row), now, nameMap)),
        ]
      : null;

  /* Zero recipients is a real state worth flagging; a failed recipients read
     is not evidence of it, so the warning stays silent then. */
  const recipientCount = countOf(recipientsRead);
  const outboxTrouble = countOf(outboxRead);

  return (
    <HomeWorkbench
      greeting={staffGreeting(greetingFor(minutes), session.displayName)}
      date={NY_DATE.format(now)}
      lines={lines}
      nowMs={now.getTime()}
      closedCapped={closedRows.length === CLOSED_WINDOW}
      addRequestKey={randomUUID()}
      statusCounts={{
        new: countOf(newCountRead),
        contacted: countOf(contactedCountRead),
        scheduled: countOf(scheduledCountRead),
        closed: countOf(closedCountRead),
      }}
      noActiveRecipients={recipientCount === 0}
      deliveryFailureCount={outboxTrouble !== null && outboxTrouble > 0 ? outboxTrouble : null}
      announcements={
        <>
          {session.portalTourDismissedAt === null ? <PortalTour /> : null}
          {tourReturnState === null ? null : <PortalTourReturnFocus state={tourReturnState} />}
          <PortalReleaseHomeAnnouncement />
        </>
      }
    />
  );
}
