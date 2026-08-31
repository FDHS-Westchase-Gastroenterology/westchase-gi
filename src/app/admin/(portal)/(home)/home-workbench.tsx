import Link from "next/link";
import type { ReactNode } from "react";

import { AddAppointmentDialog } from "@/app/admin/(portal)/add-appointment-dialog";
import {
  PortalFeedbackMessage,
  PortalFeedbackProvider,
} from "@/app/admin/(portal)/portal-feedback";
import { PrintChooser } from "@/app/admin/(portal)/requests/print-chooser";
import { buttonVariants } from "@/components/ui/button-variants";
import type { RequestStatus } from "@/lib/portal/contracts";
import { cn } from "@/lib/utils";

import { HomeDashboard } from "./home-dashboard";
import type { HomeLine } from "./home-line";

import "./home.css";

/* THESIS: Home is a working list under the header it already has. The header
   — greeting as small print, the date as the headline, Print appointments
   and Add appointment opposite, the rule beneath — is kept verbatim; below
   the rule sits the filter bar, then one flat, attention-ordered list whose
   whole state lives in the URL (portal-home-redesign-brief §1, §3.3).

   ONE LIST, NO SECTIONS. The old New / Call Again groups do not survive.
   Filters are the organizing principle; state moved into the lines — each
   line's status badge and amber stamp carry its standing, so the page never
   pre-sorts lines into boxes to communicate it.

   OWN-WORLD: the reference's bones — density, one-line rows, the filter bar
   — painted entirely with the portal's tokens through the bridge. Amber only
   as a stamp, teal only as working ink, mint the only tint. */

const ELSEWHERE = [
  { href: "/admin/review-flyers", label: "Review flyers" },
  { href: "/admin/settings#notifications", label: "Notification recipients" },
  { href: "/admin/settings#staff", label: "Staff access" },
  { href: "/admin/settings/software", label: "Website status" },
  { href: "/admin/help#website-changes", label: "Request a website change" },
];

export function HomeWorkbench({
  greeting,
  date,
  lines,
  nowMs,
  closedCapped,
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
  /** Null when the queue read failed — never an empty day. */
  lines: readonly Readonly<HomeLine>[] | null;
  /** One server clock for every relative label on the page. */
  nowMs: number;
  closedCapped: boolean;
  statusCounts: Readonly<Partial<Record<RequestStatus, number | null>>>;
  noActiveRecipients: boolean;
  deliveryFailureCount: number | null;
  announcements?: ReactNode;
}>) {
  return (
    <PortalFeedbackProvider>
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

        {lines === null ? (
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
        ) : (
          <HomeDashboard lines={lines} nowMs={nowMs} closedCapped={closedCapped} />
        )}

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
    </PortalFeedbackProvider>
  );
}
