import Link from "next/link";
import type { SVGProps } from "react";
import { requireRole } from "@/lib/portal/auth";
import {
  arrivedOutsideOfficeHours,
  waitingSince,
} from "@/lib/portal/business-time";
import { availableQueueCount } from "@/lib/portal/request-query";
import { serviceClient } from "@/lib/portal/server";
import { fetchAttentionSummary } from "@/lib/portal/workflow/reads";
import {
  ArrowRight,
  ChevronRight,
  Clock,
  FileText,
  Globe,
  Mail,
  Printer,
  Users,
} from "@/components/icons";
import { formatReceived } from "./requests/format";
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

type Task = {
  href: string;
  label: string;
  description: string;
  icon: (props: SVGProps<SVGSVGElement>) => React.ReactNode;
};

const TASKS: Task[] = [
  {
    href: "/admin/review-flyers",
    label: "Print review flyers",
    description: "Print-ready bilingual QR flyers for the front desk.",
    icon: Printer,
  },
  {
    href: "/admin/settings#notifications",
    label: "Manage notification emails",
    description: "Choose who gets an email when a new request arrives.",
    icon: Mail,
  },
  {
    href: "/admin/settings#staff",
    label: "Manage staff access",
    description: "Who can sign in to this portal, and their roles.",
    icon: Users,
  },
  {
    href: "/admin/settings/software",
    label: "Website",
    description: "Where the clinic's site lives, and its connection status.",
    icon: Globe,
  },
  {
    href: "/admin/help#website-changes",
    label: "Request a website change",
    description: "How updates to the public website get made.",
    icon: FileText,
  },
];

function headlineFor(newCount: number): React.ReactNode {
  if (newCount === 0) return "No new appointment requests are waiting.";
  return (
    <>
      <strong className="font-black text-[var(--portal-attention-ink)]">
        {newCount}
      </strong>{" "}
      new appointment {newCount === 1 ? "request is" : "requests are"} waiting.
    </>
  );
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
  const visibleAttention = attentionPaths.filter(
    (item) => item.count !== null && item.count > 0,
  );
  const attentionUnavailable = attentionPaths.some(
    (item) => item.count === null,
  );

  return (
    <section aria-labelledby="home-heading">
      <h1 id="home-heading" data-testid="home-greeting" className="portal-title">
        {greetingFor(minutes)}, {firstName}.
      </h1>
      <div className="mt-1.5 flex flex-wrap items-center gap-2.5 text-[0.95rem] text-[var(--color-muted)]">
        <p>{NY_DATE.format(now)}</p>
        {minutes >= AFTER_HOURS_START || minutes < MORNING_START ? (
          <span
            data-testid="after-hours"
            className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-navy)] px-2.5 py-1 text-[0.78rem] font-extrabold text-white"
          >
            <Clock className="h-3.5 w-3.5" />
            After hours
          </span>
        ) : null}
      </div>

      {session.portalTourDismissedAt === null ? <PortalTour /> : null}
      <PortalReleaseHomeAnnouncement />

      <div className="mt-8 grid items-start gap-8 lg:grid-cols-[minmax(0,1.7fr)_minmax(18rem,0.8fr)]">
        <section
          aria-labelledby="queue-overview-heading"
          data-testid="queue-overview"
          className="portal-panel portal-panel--primary p-6 sm:p-8"
        >
          <h2
            id="queue-overview-heading"
            className="text-[1.02rem] font-black text-[var(--color-ink)]"
          >
            Appointments
          </h2>
          {availableNewCount === null ? (
            <div data-testid="queue-overview-unavailable">
              <p
                data-testid="queue-overview-headline"
                className="mt-3 max-w-[26ch] text-[1.4rem] font-bold leading-snug text-[var(--color-ink)]"
              >
                The request count is unavailable right now.
              </p>
              <p className="mt-3 rounded-[var(--radius-sm)] bg-[var(--color-amber-soft)] px-4 py-3 text-[0.92rem] leading-relaxed text-[var(--color-ink)]">
                This does not mean the queue is empty — this page could not
                check it. Refresh in a moment, or open the queue below to
                see every request.
              </p>
            </div>
          ) : (
            <>
              <p
                data-testid="queue-overview-headline"
                className="mt-3 max-w-[26ch] text-[1.4rem] font-bold leading-snug text-[var(--color-ink)]"
              >
                {headlineFor(availableNewCount)}
              </p>

              {oldestWaiting ? (
                <p
                  data-testid="queue-overview-oldest"
                  className="mt-2 text-[0.92rem] text-[var(--color-body)]"
                >
                  {availableNewCount === 1
                    ? "It has been waiting since "
                    : "The oldest has been waiting since "}
                  <strong className="font-bold text-[var(--portal-attention-ink)]">
                    {oldestWaiting}
                  </strong>
                  .
                </p>
              ) : null}

              {newest.length > 0 ? (
                <ul
                  data-testid="queue-overview-preview"
                  className="mt-5 divide-y divide-[var(--color-line)] border-t border-[var(--color-line)]"
                >
                  {newest.map((request) => (
                    <li key={request.id}>
                      <Link
                        href={`/admin/requests/${request.id}`}
                        className="group flex min-h-11 items-center justify-between gap-4 py-3"
                      >
                        <span className="truncate font-bold text-[var(--color-ink)] underline-offset-2 group-hover:underline group-hover:decoration-[var(--color-teal-ink)]">
                          {request.name}
                        </span>
                        <span className="flex-none text-[0.88rem] text-[var(--color-muted)]">
                          {formatReceived(request.created_at)}
                          {arrivedOutsideOfficeHours(request.created_at)
                            ? " · after hours"
                            : ""}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-[0.92rem] text-[var(--color-muted)]">
                  New website submissions appear here the moment they arrive.
                </p>
              )}

              {visibleAttention.length > 0 ? (
                <ul
                  data-testid="attention-summary"
                  className="mt-5 space-y-1.5 border-t border-[var(--color-line)] pt-4"
                >
                  {visibleAttention.map((item) => (
                    <li key={item.key}>
                      <Link
                        href={item.href}
                        className="group inline-flex min-h-11 items-center gap-2 text-[0.95rem] font-bold text-[var(--color-ink)]"
                      >
                        <span className="h-1.5 w-1.5 flex-none rounded-full bg-[var(--color-amber)]" />
                        <span className="underline-offset-2 group-hover:underline group-hover:decoration-[var(--color-teal-ink)]">
                          {item.label(item.count as number)}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : null}
              {attentionUnavailable ? (
                <p
                  data-testid="attention-summary-unavailable"
                  className="mt-4 text-[0.9rem] text-[var(--color-muted)]"
                >
                  Some attention counts could not load just now — open
                  Appointments to see everything.
                </p>
              ) : null}
            </>
          )}

          {noActiveRecipients ? (
            <p
              data-testid="no-recipients-warning"
              className="mt-5 rounded-[var(--radius-sm)] bg-[var(--color-amber-soft)] px-4 py-3 text-[0.92rem] leading-relaxed text-[var(--color-ink)]"
            >
              No one is getting notification emails right now. New requests still
              land here, but no email goes out when one arrives.{" "}
              <Link
                href="/admin/settings#notifications"
                className="font-bold underline underline-offset-2"
              >
                Manage notification emails
              </Link>
            </p>
          ) : null}

          {deliveryFailureCount ? (
            <p
              data-testid="delivery-failure-warning"
              className="mt-5 rounded-[var(--radius-sm)] bg-[var(--color-amber-soft)] px-4 py-3 text-[0.92rem] leading-relaxed text-[var(--color-ink)]"
            >
              {deliveryFailureCount === 1
                ? "A notification email had trouble sending in the last 24 hours."
                : `${deliveryFailureCount} notification emails had trouble sending in the last 24 hours.`}{" "}
              Requests still land here — the queue is always the system of
              record — but notification emails may not be reaching anyone.{" "}
              <Link
                href="/admin/help#something-wrong"
                className="font-bold underline underline-offset-2"
              >
                See what to check
              </Link>
            </p>
          ) : null}

          <div className="mt-6">
            <Link href="/admin/requests" className="btn btn-navy">
              Open Appointments
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </section>

        <section
          aria-labelledby="tasks-heading"
          className="min-w-0"
        >
          <h2
            id="tasks-heading"
            className="pt-1 text-[1.02rem] font-black text-[var(--color-ink)]"
          >
            Around the portal
          </h2>
          <ul className="portal-utility-list mt-3">
            {TASKS.map((task) => {
              const slug = task.label.toLowerCase().replace(/[^a-z]+/g, "-");
              return (
                <li key={task.href}>
                  <Link
                    href={task.href}
                    className="group flex min-h-16 items-center gap-[0.95rem] px-1 py-3.5 transition-colors duration-150 hover:bg-[var(--color-mint)] active:bg-[var(--color-mint-2)] sm:px-2"
                    aria-labelledby={`task-${slug}-label`}
                    aria-describedby={`task-${slug}-desc`}
                  >
                    <span className="grid h-9 w-9 flex-none place-items-center rounded-[var(--radius-sm)] bg-[var(--color-mint-2)] text-[var(--color-teal-ink)]">
                      <task.icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span
                        id={`task-${slug}-label`}
                        className="block text-[0.95rem] font-bold leading-snug text-[var(--color-ink)]"
                      >
                        {task.label}
                      </span>
                      <span
                        id={`task-${slug}-desc`}
                        className="mt-0.5 block text-[0.85rem] leading-snug text-[var(--color-muted)]"
                      >
                        {task.description}
                      </span>
                    </span>
                    <ChevronRight
                      className="h-4.5 w-4.5 flex-none text-[var(--color-muted)] transition-colors duration-150 group-hover:text-[var(--color-teal-ink)]"
                      aria-hidden="true"
                    />
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </section>
  );
}
