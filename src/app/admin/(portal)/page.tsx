import { z } from "zod";

import { requireRole } from "@/lib/portal/auth";
import { waitingSince } from "@/lib/portal/business-time";
import { availableQueueCount } from "@/lib/portal/request-query";
import { serviceClient } from "@/lib/portal/server";
import { staffGreeting } from "@/lib/portal/staff-language";
import { fetchAttentionSummary } from "@/lib/portal/workflow/reads";

import { HomeWorkbench } from "./home-workbench";
import { PortalReleaseHomeAnnouncement } from "./portal-release-briefing";
import { PortalTour } from "./portal-tour";
import { PortalTourReturnFocus } from "./portal-tour-return-focus";
import type { PortalTourReturnState } from "./portal-tour-return-focus";
import { VIEW_DB_STATUSES } from "./requests/queue";

// The portal's front door. Staff land on their day, not on software:
// A greeting, the one thing that may need attention (new appointment
// Requests), and the rest of the portal phrased as plain-language
// Tasks. Occasional tasks live here instead of holding permanent tabs.

const NY_TIME = new Intl.DateTimeFormat("en-US", {
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: "America/New_York",
});

const MORNING_START = 5 * 60 + 30;
const AFTER_HOURS_START = 19 * 60;

const NY_DATE = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
  timeZone: "America/New_York",
});

const newestPreviewSchema = z.object({
  id: z.string(),
  name: z.string(),
  created_at: z.string(),
});
const oldestPreviewSchema = z.object({
  id: z.string(),
  created_at: z.string(),
});

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

export default async function AdminHomePage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{ tour?: string | string[] }>;
}>) {
  const session = await requireRole("staff");
  const tourReturnState = parseTourReturnState((await searchParams).tour);
  const now = new Date();
  const [hour, minute] = NY_TIME.format(now).split(":").map(Number);
  const minutes = hour * 60 + minute;

  const db = serviceClient();
  // A failed read must never present as an empty queue: "No new requests"
  // And "the count could not load" are different truths, and conflating
  // Them recreates the silent-queue failure this portal exists to end.
  const [
    { data: newestRows, count: newCount, error: queueReadError },
    { data: oldestRows },
    { count: recipientCount, error: recipientsReadError },
    attention,
    contactedCountResult,
    scheduledCountResult,
    closedCountResult,
  ] = await Promise.all([
    db
      .from("requests")
      .select("id, name, created_at", { count: "exact" })
      .eq("status", "new")
      .order("created_at", { ascending: false })
      .limit(5),
    db
      .from("requests")
      .select("id, created_at")
      .eq("status", "new")
      .order("created_at", { ascending: true })
      .limit(1),
    db
      .from("notification_recipients")
      .select("id", { count: "exact", head: true })
      .eq("active", true),
    // The workflow attention summary: due call-agains, silent contacted
    // Requests, and closed records awaiting legacy review. Each count is
    // Independently honest — a failed read is null, never zero.
    fetchAttentionSummary(db, now),
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
  ]);
  const newestParsed = z.array(newestPreviewSchema).safeParse(newestRows ?? []);
  if (!newestParsed.success) {
    throw new Error("Queue preview read failed: invalid");
  }
  const newest = newestParsed.data;
  const availableNewCount = availableQueueCount(newCount, queueReadError !== null);
  const oldestParsed = z.array(oldestPreviewSchema).safeParse(oldestRows ?? []);
  if (!oldestParsed.success) {
    throw new Error("Queue preview read failed: invalid");
  }
  const oldest = oldestParsed.data;
  const oldestPreview = oldest.at(0);
  const oldestWaiting =
    availableNewCount !== null && availableNewCount !== 0 && oldestPreview !== undefined
      ? waitingSince(oldestPreview.created_at, now)
      : null;
  // Zero recipients is a real, legal state worth flagging; a failed
  // Recipients read is not evidence of it, so the warning stays silent then.
  const noActiveRecipients = !recipientsReadError && recipientCount === 0;
  // Delivery health is the other silent failure mode: the provider can start
  // Failing while every request still lands in the queue. Same discipline —
  // A failed outbox read is not evidence of an outage, so it stays silent.
  const deliveryFailureCount =
    attention.outboxTrouble !== null && attention.outboxTrouble > 0
      ? attention.outboxTrouble
      : null;

  // The rest of the day's attention, beyond brand-new requests: call-agains
  // Whose day arrived, contacted requests with no call-again set, and
  // Closed records still awaiting legacy review. Rendered only when real
  // (count > 0); an unavailable count gets an honest caveat, never a zero.
  const attentionPaths = [
    {
      key: "due",
      count: attention.dueCallAgainCount,
      href: "/admin/requests?status=contacted",
      label: (n: number) => (n === 1 ? "1 call-again is due" : `${n} call-agains are due`),
    },
    {
      key: "silent",
      count: attention.silentContactedCount,
      href: "/admin/requests?status=contacted",
      label: (n: number) =>
        n === 1
          ? "1 contacted request has no call-again day"
          : `${n} contacted requests have no call-again day`,
    },
    {
      key: "legacy",
      count: attention.legacyReviewCount,
      href: "/admin/requests?status=closed",
      label: (n: number) =>
        n === 1 ? "1 closed record needs review" : `${n} closed records need review`,
    },
  ] as const;
  const visibleAttention = attentionPaths.flatMap((item) =>
    item.count !== null && item.count > 0
      ? [
          {
            key: item.key,
            href: item.href,
            label: item.label(item.count),
          },
        ]
      : [],
  );
  const attentionUnavailable = attentionPaths.some((item) => item.count === null);

  return (
    <HomeWorkbench
      greeting={staffGreeting(greetingFor(minutes), session.displayName)}
      date={NY_DATE.format(now)}
      afterHours={minutes >= AFTER_HOURS_START || minutes < MORNING_START}
      newCount={availableNewCount}
      oldestWaiting={oldestWaiting}
      newest={newest}
      statusCounts={{
        new: availableNewCount,
        contacted: availableQueueCount(
          contactedCountResult.count,
          contactedCountResult.error !== null,
        ),
        scheduled: availableQueueCount(
          scheduledCountResult.count,
          scheduledCountResult.error !== null,
        ),
        closed: availableQueueCount(closedCountResult.count, closedCountResult.error !== null),
      }}
      attention={visibleAttention}
      attentionUnavailable={attentionUnavailable}
      noActiveRecipients={noActiveRecipients}
      deliveryFailureCount={deliveryFailureCount}
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
