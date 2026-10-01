import { randomUUID } from "node:crypto";

import { PortalReleaseHomeAnnouncement } from "@/app/admin/(portal)/portal-release-briefing";
import { PortalTour } from "@/app/admin/(portal)/portal-tour";
import { PortalTourReturnFocus } from "@/app/admin/(portal)/portal-tour-return-focus";
import type { PortalTourReturnState } from "@/app/admin/(portal)/portal-tour-return-focus";
import { fetchAttentiveOpenRows, fetchClosedRows } from "@/app/admin/(portal)/requests/queue";
import type { QueueRow, WorkedQueueRow } from "@/app/admin/(portal)/requests/queue";
import { requireRole } from "@/lib/portal/auth";
import { availableQueueCount } from "@/lib/portal/request-query";
import { serviceClient } from "@/lib/portal/server";
import { fetchStaffNameMap } from "@/lib/portal/staff-identity";
import { staffGreeting } from "@/lib/portal/staff-language";

import type { HomeLine } from "./home-line";
import { lineFor } from "./home-line-for";
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

const MORNING_START = 5 * 60 + 30;

/* The closed tail rides along so `status: Closed` is a real slice, windowed
   because home is a working surface, not the archive. */
const CLOSED_WINDOW = 60;

const DAY_MS = 86_400_000;

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
     independently of the counts, so one unavailable number suppresses
     itself instead of blanking the work. */
  const [openRead, closedRead, staffRead, recipientsRead, outboxRead] = await Promise.allSettled([
    fetchAttentiveOpenRows(db, { actorId: session.id, now }),
    fetchClosedRows(db, { from: 0, limit: CLOSED_WINDOW }),
    fetchStaffNameMap(db),
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
      printedBy={session.displayName === "" ? session.email : session.displayName}
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
