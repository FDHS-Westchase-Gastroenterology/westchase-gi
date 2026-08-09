import { requireRole } from "@/lib/portal/auth";
import {
  waitingSince,
} from "@/lib/portal/business-time";
import { availableQueueCount } from "@/lib/portal/request-query";
import { serviceClient } from "@/lib/portal/server";
import { fetchAttentionSummary } from "@/lib/portal/workflow/reads";
import { HomeWorkbench } from "./home-workbench";
import { PortalTour } from "./portal-tour";
import { PortalReleaseHomeAnnouncement } from "./portal-release-briefing";

// The portal's front door. Staff land on their day, not on software:
// a greeting, the one thing that may need attention (new appointment
// requests), and the rest of the portal phrased as plain-language
// tasks. Occasional tasks live here instead of holding permanent tabs.

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

// Practice-local clock: the front desk reads this in Tampa.
function greetingFor(minutes: number): string {
  if (minutes >= MORNING_START && minutes < 12 * 60) return "Good morning";
  if (minutes >= 12 * 60 && minutes < 17 * 60) return "Good afternoon";
  return "Good evening";
}

export default async function AdminHomePage() {
  const session = await requireRole("staff");
  const firstName = session.displayName.trim().split(/\s+/)[0];
  const now = new Date();
  const [hour, minute] = NY_TIME.format(now).split(":").map(Number);
  const minutes = hour * 60 + minute;

  const db = serviceClient();
  // A failed read must never present as an empty queue: "No new requests"
  // and "the count could not load" are different truths, and conflating
  // them recreates the silent-queue failure this portal exists to end.
  const [
    { data: newestRows, count: newCount, error: queueReadError },
    { data: oldestRows },
    { count: recipientCount, error: recipientsReadError },
    attention,
  ] = await Promise.all([
    db
      .from("requests")
      .select("id, name, created_at", { count: "exact" })
      .eq("status", "new")
      .order("created_at", { ascending: false })
      .limit(3),
    db
      .from("requests")
      .select("created_at")
      .eq("status", "new")
      .order("created_at", { ascending: true })
      .limit(1),
    db
      .from("notification_recipients")
      .select("id", { count: "exact", head: true })
      .eq("active", true),
    // The workflow attention summary: due call-agains, silent contacted
    // requests, and closed records awaiting legacy review. Each count is
    // independently honest — a failed read is null, never zero.
    fetchAttentionSummary(db, now),
  ]);
  const newest = (newestRows ?? []) as Array<{
    id: string;
    name: string;
    created_at: string;
  }>;
  const availableNewCount = availableQueueCount(newCount, queueReadError);
  const oldest = (oldestRows ?? []) as Array<{ created_at: string }>;
  const oldestWaiting =
    availableNewCount && oldest[0] ? waitingSince(oldest[0].created_at, now) : null;
  // Zero recipients is a real, legal state worth flagging; a failed
  // recipients read is not evidence of it, so the warning stays silent then.
  const noActiveRecipients = !recipientsReadError && recipientCount === 0;
  // Delivery health is the other silent failure mode: the provider can start
  // failing while every request still lands in the queue. Same discipline —
  // a failed outbox read is not evidence of an outage, so it stays silent.
  const deliveryFailureCount =
    attention.outboxTrouble !== null && attention.outboxTrouble > 0
      ? attention.outboxTrouble
      : null;

  // The rest of the day's attention, beyond brand-new requests: call-agains
  // whose day arrived, contacted requests with no call-again set, and
  // closed records still awaiting legacy review. Rendered only when real
  // (count > 0); an unavailable count gets an honest caveat, never a zero.
  const attentionPaths = [
    {
      key: "due",
      count: attention.dueCallAgainCount,
      href: "/admin/requests?status=contacted",
      label: (n: number) =>
        n === 1 ? "1 call-again is due" : `${n} call-agains are due`,
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
        n === 1
          ? "1 closed record needs review"
          : `${n} closed records need review`,
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
  const attentionUnavailable = attentionPaths.some(
    (item) => item.count === null,
  );

  return (
    <HomeWorkbench
      greeting={greetingFor(minutes)}
      firstName={firstName}
      date={NY_DATE.format(now)}
      afterHours={minutes >= AFTER_HOURS_START || minutes < MORNING_START}
      newCount={availableNewCount}
      oldestWaiting={oldestWaiting}
      newest={newest}
      attention={visibleAttention}
      attentionUnavailable={attentionUnavailable}
      noActiveRecipients={noActiveRecipients}
      deliveryFailureCount={deliveryFailureCount}
      announcements={
        <>
          {session.portalTourDismissedAt === null ? <PortalTour /> : null}
          <PortalReleaseHomeAnnouncement />
        </>
      }
    />
  );
}
