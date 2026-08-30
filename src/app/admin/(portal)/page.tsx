import { randomUUID } from "node:crypto";

import { requireRole } from "@/lib/portal/auth";
import { arrivedOutsideOfficeHours, waitingSince } from "@/lib/portal/business-time";
import { availableQueueCount } from "@/lib/portal/request-query";
import { serviceClient } from "@/lib/portal/server";
import { staffGreeting } from "@/lib/portal/staff-language";

import { HomeWorkbench } from "./home-workbench";
import type { SheetGroup, SheetLine, SheetTailItem } from "./home-workbench";
import { PortalReleaseHomeAnnouncement } from "./portal-release-briefing";
import { PortalTour } from "./portal-tour";
import { PortalTourReturnFocus } from "./portal-tour-return-focus";
import type { PortalTourReturnState } from "./portal-tour-return-focus";
import { followUpShortLabel, LOCATION_LABELS, TIME_LABELS } from "./requests/format";
import { fetchAttentiveOpenRows, VIEW_DB_STATUSES } from "./requests/queue";
import type { AttentiveQueueRow } from "./requests/queue";

/* Home is the practice's call list. It answers one question — who has to be
   called, in what order — by reading the attention buckets the queue already
   derives, rather than counting statuses and describing them in a sentence. */

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

const NY_TIME_OF_DAY = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
  timeZone: PRACTICE_TZ,
});

const NY_MONTH_DAY = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  timeZone: PRACTICE_TZ,
});

const NY_DAY = new Intl.DateTimeFormat("en-CA", {
  dateStyle: "short",
  timeZone: PRACTICE_TZ,
});

const MORNING_START = 5 * 60 + 30;

/* A ceiling on what the page will render at once, so a post-vacation backlog
   cannot build a 500-row document. Past it, the tail links to Appointments.
   How many lines stand open before a group scrolls is the window's decision,
   made in CSS beside the sheet; the heading's count always states the real
   total. */
const RENDER_CEILING = 40;

function practiceDayNumber(date: Date): number {
  return Math.round(Date.parse(`${NY_DAY.format(date)}T00:00:00Z`) / 86_400_000);
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

function preferenceOf(row: Readonly<AttentiveQueueRow>): string {
  return `${LOCATION_LABELS[row.location]} · ${TIME_LABELS[row.preferred_time]}`;
}

/* One line of the sheet. `stamp` is the only amber on a row, and it marks the
   exception within a group — never the group's own meaning, which its heading
   already carries. */
function lineFor(row: Readonly<AttentiveQueueRow>, now: Date): SheetLine {
  const base = {
    id: row.id,
    name: row.name,
    phone: row.phone,
    version: row.version,
    preference: preferenceOf(row),
  };

  if (row.bucket === "follow_up" && row.follow_up_at !== null) {
    const due = new Date(row.follow_up_at);
    const overdue = practiceDayNumber(due) < practiceDayNumber(now);
    return {
      ...base,
      timing: overdue
        ? `Due ${NY_MONTH_DAY.format(due)}`
        : `Due ${followUpShortLabel(row.follow_up_at, now)}`,
      stamp: overdue ? "Overdue" : null,
    };
  }

  const waiting = waitingSince(row.created_at, now);
  return {
    ...base,
    timing:
      waiting === null
        ? `Arrived ${NY_TIME_OF_DAY.format(new Date(row.created_at))}`
        : `Since ${waiting}`,
    stamp: arrivedOutsideOfficeHours(row.created_at) ? "After hours" : null,
  };
}

function groupFor(
  key: SheetGroup["key"],
  heading: string,
  href: string,
  rows: readonly Readonly<AttentiveQueueRow>[],
  now: Date,
): SheetGroup {
  const rendered = rows.slice(0, RENDER_CEILING).map((row) => lineFor(row, now));
  return {
    key,
    heading,
    href,
    count: rows.length,
    lines: rendered,
    overflow: Math.max(0, rows.length - RENDER_CEILING),
  };
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

  /* A failed read is never an empty day. The sheet read settles independently
     of every count, so one unavailable number suppresses itself instead of
     blanking the work — and no read can present as a reassuring zero. */
  const [
    sheetRead,
    newCountRead,
    contactedCountRead,
    scheduledCountRead,
    closedCountRead,
    recipientsRead,
    legacyRead,
    outboxRead,
  ] = await Promise.allSettled([
    fetchAttentiveOpenRows(db, { now }),
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
      .from("requests")
      .select("id", { count: "exact", head: true })
      .eq("legacy_review_required", true),
    db
      .from("notification_outbox")
      .select("id", { count: "exact", head: true })
      .in("status", ["failed", "retry_pending", "exhausted"])
      .gte("updated_at", new Date(now.getTime() - 86_400_000).toISOString()),
  ]);

  const rows = sheetRead.status === "fulfilled" ? sheetRead.value : null;

  const groups: SheetGroup[] | null =
    rows === null
      ? null
      : [
          groupFor(
            "new",
            "New",
            "/admin/requests?status=new",
            rows.filter((row) => row.bucket === "new"),
            now,
          ),
          groupFor(
            "follow_up",
            "Call Again",
            "/admin/requests?status=contacted",
            rows.filter((row) => row.bucket === "follow_up"),
            now,
          ),
        ];

  /* Everything that is real but not today's calling work. Stated as counts
     because that is all these are; each opens the view that holds them. */
  const upcomingCount =
    rows === null ? null : rows.filter((row) => row.bucket === "upcoming").length;
  const scheduledCount = countOf(scheduledCountRead);
  const legacyCount = countOf(legacyRead);
  const tail: SheetTailItem[] = [
    ...(upcomingCount !== null && upcomingCount > 0
      ? [
          {
            key: "upcoming",
            href: "/admin/requests?status=contacted",
            label:
              upcomingCount === 1
                ? "1 call-again is set for a later day"
                : `${upcomingCount} call-agains are set for later days`,
          },
        ]
      : []),
    ...(scheduledCount !== null && scheduledCount > 0
      ? [
          {
            key: "scheduled",
            href: "/admin/requests?status=scheduled",
            label:
              scheduledCount === 1
                ? "1 request handed off to scheduling"
                : `${scheduledCount} requests handed off to scheduling`,
          },
        ]
      : []),
    ...(legacyCount !== null && legacyCount > 0
      ? [
          {
            key: "legacy",
            href: "/admin/requests?status=closed",
            label:
              legacyCount === 1
                ? "1 closed record needs review"
                : `${legacyCount} closed records need review`,
          },
        ]
      : []),
  ];

  /* Zero recipients is a real state worth flagging; a failed recipients read
     is not evidence of it, so the warning stays silent then. */
  const recipientCount = countOf(recipientsRead);
  const outboxTrouble = countOf(outboxRead);

  return (
    <HomeWorkbench
      greeting={staffGreeting(greetingFor(minutes), session.displayName)}
      date={NY_DATE.format(now)}
      groups={groups}
      tail={tail}
      addRequestKey={randomUUID()}
      statusCounts={{
        new: countOf(newCountRead),
        contacted: countOf(contactedCountRead),
        scheduled: scheduledCount,
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
