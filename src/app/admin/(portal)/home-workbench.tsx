import Link from "next/link";
import type { ReactNode } from "react";

import { ChevronRight } from "@/components/icons";
import { buttonVariants } from "@/components/ui/button-variants";
import type { RequestStatus } from "@/lib/portal/contracts";
import { cn } from "@/lib/utils";

import { AddAppointmentDialog } from "./add-appointment-dialog";
import { PortalFeedbackMessage, PortalFeedbackProvider } from "./portal-feedback";
import { PrintChooser } from "./requests/print-chooser";
import type { SheetLine } from "./sheet-line";
import { SheetLineRow } from "./sheet-line";

/* THESIS: Home lists the calls and takes them. It refuses the
   greeting-plus-metric-cards page this category always ships: counts demote to
   column headers, patient lines become the figure, and the line itself is where
   an outcome gets recorded rather than a link to a page that records it.

   OWN-WORLD: White paper, navy printed ink, hairline rules, tracked small
   caps. One sans, three weights. Amber only as a stamp on a line, teal only
   as the tracked line, mint the only large tint. No card washes, no icon rail.

   STORY: Staff read the date, see who must be called today in priority order,
   dial from the line, and record what happened without leaving the page.

   FIRST VIEWPORT: the day at 28px with the greeting as small print above it,
   Print appointments in navy opposite, a rule, then New / Call Again as
   ruled lines of name, dialable phone, and timing.

   FORM: the practice's own call list, and what the print mode already outputs,
   so screen and paper are one thing. */

export type { SheetLine };

/* A group taller than the window scrolls behind a half-cut line instead of
   growing a Show-all control: the cut row is the affordance and the
   heading's count is the truth. Five lines or fewer stand fully open. */
const WINDOW_LINES = 5;

export interface SheetGroup {
  key: "new" | "follow_up";
  heading: string;
  /** Where the whole group is read. */
  href: string;
  /** The group's true size, always shown beside its heading. */
  count: number;
  /** Every line up to the render ceiling. The window, not the data, caps view. */
  lines: SheetLine[];
  /** Rows past the render ceiling, read in Appointments instead. */
  overflow: number;
}

export interface SheetTailItem {
  key: string;
  href: string;
  label: string;
}

const ELSEWHERE = [
  { href: "/admin/review-flyers", label: "Review flyers" },
  { href: "/admin/settings#notifications", label: "Notification recipients" },
  { href: "/admin/settings#staff", label: "Staff access" },
  { href: "/admin/settings/software", label: "Website status" },
  { href: "/admin/help#website-changes", label: "Request a website change" },
];

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React props carry framework member types that cannot be made readonly
function SheetGroupSection({ group }: Readonly<{ group: SheetGroup }>) {
  const headingId = `sheet-group-${group.key}`;
  const windowed = group.lines.length > WINDOW_LINES;
  return (
    <section aria-labelledby={headingId} data-group={group.key} className="portal-sheet-group">
      <header>
        <h2 id={headingId}>{group.heading}</h2>
        <span data-testid={`sheet-count-${group.key}`} className="portal-sheet-count">
          {group.count}
        </span>
      </header>
      <div className="portal-sheet-frame" data-window={windowed ? "true" : undefined}>
        <ul data-testid={`sheet-lines-${group.key}`} className="portal-sheet-lines">
          {group.lines.map((line) => (
            <SheetLineRow key={line.id} line={line} />
          ))}
        </ul>
      </div>
      {group.overflow > 0 ? (
        <Link href={group.href} className="portal-sheet-overflow">
          {group.overflow === 1
            ? "1 more in Appointments"
            : `${group.overflow} more in Appointments`}
        </Link>
      ) : null}
    </section>
  );
}

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React props carry framework member types that cannot be made readonly
export function HomeWorkbench({
  greeting,
  date,
  groups,
  tail,
  statusCounts,
  noActiveRecipients,
  deliveryFailureCount,
  announcements,
  addRequestKey,
}: Readonly<{
  greeting: string;
  date: string;
  /** Server-generated, so adding from the line cannot duplicate a request. */
  addRequestKey: string;
  /** Null when the sheet read failed — never an empty day. */
  groups: SheetGroup[] | null;
  tail: SheetTailItem[];
  statusCounts: Readonly<Partial<Record<RequestStatus, number | null>>>;
  noActiveRecipients: boolean;
  deliveryFailureCount: number | null;
  announcements?: ReactNode;
}>) {
  const working = groups === null ? [] : groups.filter((group) => group.count > 0);

  const content = (
    <section aria-labelledby="home-heading" className="portal-sheet">
      <header className="portal-sheet-head">
        <div>
          <h1
            id="home-heading"
            data-testid="home-greeting"
            tabIndex={-1}
            className="portal-sheet-title"
          >
            <span className="portal-sheet-greeting">{greeting}</span>{" "}
            <span className="portal-sheet-day">{date}</span>
          </h1>
        </div>
        <div className="portal-sheet-commands print-hide">
          <PrintChooser
            statusCounts={statusCounts}
            triggerClassName={cn(buttonVariants(), "portal-sheet-print")}
            triggerLabel="Print appointments"
          />
          <AddAppointmentDialog
            idempotencyKey={addRequestKey}
            triggerClassName={cn(buttonVariants({ variant: "outline" }), "portal-sheet-add")}
          />
        </div>
      </header>

      {announcements}

      <PortalFeedbackMessage source="requests-output" testId="home-output-feedback" />

      {groups === null ? (
        <div data-testid="queue-overview-unavailable" className="portal-sheet-notice">
          <h2>Today&rsquo;s calls could not load.</h2>
          <p>
            This is not an empty day. Open Appointments to read the live queue, then print from a
            current view.
          </p>
          <Link
            href="/admin/requests"
            data-slot="button"
            className={cn(buttonVariants(), "portal-sheet-notice-action")}
          >
            Open Appointments
          </Link>
        </div>
      ) : working.length === 0 ? (
        <div data-testid="sheet-empty" className="portal-sheet-notice portal-sheet-notice--clear">
          <h2>No calls waiting.</h2>
          <p>
            A website request lands here the moment a patient submits the form, and a contacted
            request comes back on the day staff set for it. Nothing needs a call right now.
          </p>
          <Link
            href="/admin/requests"
            data-slot="button"
            className={cn(buttonVariants({ variant: "outline" }), "portal-sheet-notice-action")}
          >
            Open Appointments
          </Link>
        </div>
      ) : (
        working.map((group) => <SheetGroupSection key={group.key} group={group} />)
      )}

      {tail.length > 0 ? (
        <details className="portal-sheet-tail">
          <summary>Not today</summary>
          <ul>
            {tail.map((item) => (
              <li key={item.key}>
                <Link href={item.href}>
                  {item.label}
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      {noActiveRecipients ? (
        <p data-testid="no-recipients-warning" className="portal-sheet-alert">
          <strong>Notification emails are paused.</strong> Requests still land here, but no email
          goes out when one arrives.{" "}
          <Link href="/admin/settings#notifications">Manage recipients</Link>
        </p>
      ) : null}

      {deliveryFailureCount !== null ? (
        <p data-testid="delivery-failure-warning" className="portal-sheet-alert">
          <strong>
            {deliveryFailureCount === 1
              ? "A notification email had trouble sending in the last 24 hours."
              : `${deliveryFailureCount} notification emails had trouble sending in the last 24 hours.`}
          </strong>{" "}
          The queue remains the system of record.{" "}
          <Link href="/admin/help#something-wrong">See what to check</Link>
        </p>
      ) : null}

      <nav aria-label="Other staff jobs" className="portal-sheet-elsewhere print-hide">
        {ELSEWHERE.map((item) => (
          <Link key={item.href} href={item.href}>
            {item.label}
          </Link>
        ))}
      </nav>
    </section>
  );

  return <PortalFeedbackProvider>{content}</PortalFeedbackProvider>;
}
