import Link from "next/link";
import type { SVGProps } from "react";
import type { StaffRole } from "@/lib/portal/contracts";
import { requireRole } from "@/lib/portal/auth";
import { serviceClient } from "@/lib/portal/server";
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
  adminOnly?: boolean;
};

const TASKS: Task[] = [
  {
    href: "/admin/review-flyers",
    label: "Print review flyers",
    description: "Print-ready bilingual QR flyers for the front desk.",
    icon: Printer,
    adminOnly: true,
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

function visibleTasks(role: StaffRole): Task[] {
  return TASKS.filter((task) => !task.adminOnly || role === "admin");
}

function headlineFor(newCount: number): React.ReactNode {
  if (newCount === 0) return "No new appointment requests are waiting.";
  return (
    <>
      <strong className="font-black text-[var(--color-amber-deep)]">
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
  const { data: newestRows, count: newCount } = await db
    .from("requests")
    .select("id, name, created_at", { count: "exact" })
    .eq("status", "new")
    .order("created_at", { ascending: false })
    .limit(3);
  const newest = (newestRows ?? []) as Array<{
    id: string;
    name: string;
    created_at: string;
  }>;

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

      <div className="mt-7 grid items-start gap-6 lg:grid-cols-[1.55fr_1fr]">
        <section
          aria-labelledby="queue-overview-heading"
          data-testid="queue-overview"
          className="card-lined p-6 sm:p-8"
        >
          <h2
            id="queue-overview-heading"
            className="text-[1.02rem] font-black text-[var(--color-ink)]"
          >
            Appointment requests
          </h2>
          <p
            data-testid="queue-overview-headline"
            className="mt-3 max-w-[26ch] text-[1.4rem] font-bold leading-snug text-[var(--color-ink)]"
          >
            {headlineFor(newCount ?? 0)}
          </p>

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

          <div className="mt-6">
            <Link href="/admin/requests" className="btn btn-amber">
              Open appointment requests
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </section>

        <section
          aria-labelledby="tasks-heading"
          className="card-lined p-4 sm:p-5"
        >
          <h2
            id="tasks-heading"
            className="pt-1 text-[1.02rem] font-black text-[var(--color-ink)]"
          >
            Around the portal
          </h2>
          <ul className="mt-2.5">
            {visibleTasks(session.role).map((task) => {
              const slug = task.label.toLowerCase().replace(/[^a-z]+/g, "-");
              return (
                <li key={task.href}>
                  <Link
                    href={task.href}
                    className="group -mx-3 flex items-center gap-[0.95rem] rounded-[var(--radius)] px-3 py-[0.9rem] transition-colors duration-[180ms] ease-out hover:bg-[var(--color-mint)] active:bg-[var(--color-mint-2)]"
                    aria-labelledby={`task-${slug}-label`}
                    aria-describedby={`task-${slug}-desc`}
                  >
                    <span className="grid h-10 w-10 flex-none place-items-center rounded-full bg-[var(--color-mint-2)] text-[var(--color-teal-ink)]">
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
                      className="h-4.5 w-4.5 flex-none text-[var(--color-muted)] transition-transform duration-200 [transition-timing-function:var(--ease-out-quint)] group-hover:translate-x-[3px]"
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
