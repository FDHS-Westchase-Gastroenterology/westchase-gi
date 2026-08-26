import Link from "next/link";
import type { ReactNode } from "react";

import { ChevronRight, Phone } from "@/components/icons";
import type { RequestStatus } from "@/lib/portal/contracts";

import { AddAppointmentDialog } from "./add-appointment-dialog";
import { LineOutcome } from "./line-outcome";
import { PortalFeedbackMessage, PortalFeedbackProvider } from "./portal-feedback";
import { formatPhoneForDisplay, telHref } from "./requests/format";
import { PrintChooser } from "./requests/print-chooser";

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
   Print appointments in navy opposite, a rule, then Call first / Call again
   today as ruled lines of name, dialable phone, and timing.

   FORM: the practice's own call list, and what the print mode already outputs,
   so screen and paper are one thing. */

export interface SheetLine {
  id: string;
  name: string;
  phone: string;
  /** Optimistic-concurrency token, so the outcome can be recorded on the line. */
  version: number;
  /** "Tampa · Morning" — the patient's stated preference. */
  preference: string;
  /** The line's timing fact: waiting since, due, or silent since. */
  timing: string;
  /** The only amber on a row: the exception within its group, or null. */
  stamp: string | null;
}

export interface SheetGroup {
  key: "new" | "follow_up" | "stale";
  heading: string;
  caption: string;
  /** Where the whole group is read. */
  href: string;
  /** The group's true size, always shown beside its heading. */
  count: number;
  /** The lines that stand open. */
  lines: SheetLine[];
  /** Lines that expand in place beneath them. Never a clipped scroll box. */
  moreLines: SheetLine[];
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

/* Three affordances, three sets of pixels. The row used to be one link, which
   meant the phone number — the one datum the page exists to act on — could not
   be a `tel:` link at all, and a thumb aiming at it navigated instead of
   dialing. Splitting them also separates hover from focus for free: hover tints
   the row, focus rings whichever target the keyboard is actually on. */
function SheetLineRow({ line }: Readonly<{ line: Readonly<SheetLine> }>) {
  return (
    <li className="portal-sheet-row">
      <Link href={`/admin/requests/${line.id}`} className="portal-sheet-open">
        <span className="portal-sheet-who">
          <span className="portal-sheet-name">
            <strong data-ui-redact="patient-name">{line.name}</strong>
            <ChevronRight className="portal-sheet-disclosure h-4 w-4" aria-hidden="true" />
          </span>
          <small>{line.preference}</small>
        </span>
      </Link>
      <a
        href={telHref(line.phone)}
        className="portal-sheet-phone"
        data-ui-redact="patient-contact"
        aria-label={`Call ${line.name} at ${formatPhoneForDisplay(line.phone)}`}
      >
        <Phone className="portal-sheet-phone-icon h-3.5 w-3.5" aria-hidden="true" />
        {formatPhoneForDisplay(line.phone)}
      </a>
      <span className="portal-sheet-when">
        {line.stamp === null ? null : <span className="portal-stamp">{line.stamp}</span>}
        <span>{line.timing}</span>
      </span>
      <LineOutcome requestId={line.id} name={line.name} version={line.version} />
    </li>
  );
}

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React props carry framework member types that cannot be made readonly
function SheetGroupSection({ group }: Readonly<{ group: SheetGroup }>) {
  const headingId = `sheet-group-${group.key}`;
  return (
    <section aria-labelledby={headingId} data-group={group.key} className="portal-sheet-group">
      <header>
        <h2 id={headingId}>{group.heading}</h2>
        <span data-testid={`sheet-count-${group.key}`} className="portal-sheet-count">
          {group.count}
        </span>
      </header>
      <p className="portal-sheet-caption">{group.caption}</p>
      <ul data-testid={`sheet-lines-${group.key}`} className="portal-sheet-lines">
        {group.lines.map((line) => (
          <SheetLineRow key={line.id} line={line} />
        ))}
      </ul>
      {group.moreLines.length > 0 ? (
        <details data-testid={`sheet-more-${group.key}`} className="portal-sheet-more">
          <summary>
            <span className="portal-sheet-more-show">Show all {group.count}</span>
            <span className="portal-sheet-more-hide">Show only the first {group.lines.length}</span>
          </summary>
          <ul className="portal-sheet-lines portal-sheet-lines--more">
            {group.moreLines.map((line) => (
              <SheetLineRow key={line.id} line={line} />
            ))}
          </ul>
          {group.overflow > 0 ? (
            <Link href={group.href} className="portal-sheet-overflow">
              {group.overflow === 1
                ? "1 more in Appointments"
                : `${group.overflow} more in Appointments`}
            </Link>
          ) : null}
        </details>
      ) : null}
    </section>
  );
}

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React props carry framework member types that cannot be made readonly
export function HomeWorkbench({
  greeting,
  date,
  afterHours,
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
  afterHours: boolean;
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
          {afterHours ? (
            <p data-testid="after-hours" className="portal-sheet-hours">
              <span className="portal-stamp">After hours</span>
              The office is closed. Requests still arrive.
            </p>
          ) : null}
        </div>
        <div className="portal-sheet-commands print-hide">
          <PrintChooser
            statusCounts={statusCounts}
            triggerClassName="btn btn-navy portal-sheet-print"
            triggerLabel="Print appointments"
          />
          <AddAppointmentDialog
            idempotencyKey={addRequestKey}
            triggerClassName="btn btn-outline portal-sheet-add"
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
          <Link href="/admin/requests" className="btn btn-navy portal-sheet-notice-action">
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
          <Link href="/admin/requests" className="btn btn-outline portal-sheet-notice-action">
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
