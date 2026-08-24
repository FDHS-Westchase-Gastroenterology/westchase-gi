import Link from "next/link";
import type { ReactNode, SVGProps } from "react";

import { ChevronRight, Clock, FileText, Globe, Mail, Printer, Users } from "@/components/icons";
import { arrivedOutsideOfficeHours } from "@/lib/portal/business-time";
import { STAFF_REQUEST_SOURCE_PATH } from "@/lib/portal/contracts";
import type { RequestStatus } from "@/lib/portal/contracts";
import { NEW_REQUESTS_HREF, OPEN_NEW_REQUESTS_LABEL } from "@/lib/portal/staff-language";

import { PortalFeedbackMessage, PortalFeedbackProvider } from "./portal-feedback";
import { formatReceived } from "./requests/format";
import { PrintChooser } from "./requests/print-chooser";

interface HomeTask {
  href: string;
  label: string;
  // oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React props carry framework member types that cannot be made readonly
  icon: (props: Readonly<SVGProps<SVGSVGElement>>) => ReactNode;
}

// Occasional destinations, kept as quiet single-line rows. Each label is
// Complete on its own; the aside description carries the shared context.
const DESK_TOOLS: HomeTask[] = [
  { href: "/admin/review-flyers", label: "Print review flyers", icon: Printer },
  { href: "/admin/settings#notifications", label: "Notification recipients", icon: Mail },
  { href: "/admin/settings#staff", label: "Staff access", icon: Users },
  { href: "/admin/settings/software", label: "Website status", icon: Globe },
  { href: "/admin/help#website-changes", label: "Request a website change", icon: FileText },
];

interface NewRequestPreview {
  id: string;
  name: string;
  created_at: string;
}

interface AttentionPath {
  key: string;
  href: string;
  label: string;
}

function waitingHeadline(count: number): string {
  if (count === 0) return "No new appointment requests are waiting.";
  return `${count} new appointment ${count === 1 ? "request is" : "requests are"} waiting.`;
}

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React props carry framework member types that cannot be made readonly
export function HomeWorkbench({
  greeting,
  date,
  afterHours,
  newCount,
  oldestWaiting,
  newest,
  statusCounts,
  attention,
  attentionUnavailable,
  noActiveRecipients,
  deliveryFailureCount,
  announcements,
}: Readonly<{
  greeting: string;
  date: string;
  afterHours: boolean;
  newCount: number | null;
  oldestWaiting: string | null;
  newest: NewRequestPreview[];
  statusCounts: Readonly<Partial<Record<RequestStatus, number | null>>>;
  attention: AttentionPath[];
  attentionUnavailable: boolean;
  noActiveRecipients: boolean;
  deliveryFailureCount: number | null;
  announcements?: ReactNode;
}>) {
  const newViewHref = NEW_REQUESTS_HREF;

  const content = (
    <section aria-labelledby="home-heading">
      <header className="portal-home-masthead">
        <h1 id="home-heading" data-testid="home-greeting" tabIndex={-1}>
          {greeting}
        </h1>
        <p className="portal-home-day">
          <span>{date}</span>
          {afterHours ? (
            <span data-testid="after-hours" className="portal-after-hours">
              <Clock className="h-3.5 w-3.5" />
              After hours
            </span>
          ) : null}
        </p>
      </header>

      {announcements}

      <PortalFeedbackMessage source="requests-output" testId="home-output-feedback" />

      <div className="portal-home-layout">
        <section
          aria-labelledby="queue-overview-heading"
          data-testid="queue-overview"
          className="portal-work-stack"
        >
          <header className="portal-work-stack-header">
            <div>
              <h2 id="queue-overview-heading">Appointment requests</h2>
              <p>New requests wait here.</p>
            </div>
            <div className="portal-work-stack-commands print-hide">
              <Link
                href={STAFF_REQUEST_SOURCE_PATH}
                data-testid="home-add-patient-request"
                className="btn btn-outline portal-work-stack-add"
              >
                Add Appointment
              </Link>
            </div>
          </header>

          {newCount === null ? (
            <div
              data-testid="queue-overview-unavailable"
              className="portal-new-work portal-new-work--unavailable"
            >
              <div>
                <p className="portal-new-work-label">New requests</p>
                <h3 data-testid="queue-overview-headline">
                  The request count is unavailable right now.
                </h3>
                <p>
                  This is not an empty queue. Open Appointments to see the live list, then retry
                  printing from a current New view.
                </p>
              </div>
              <div className="portal-new-work-actions">
                <PrintChooser
                  statusCounts={statusCounts}
                  triggerClassName="btn btn-outline min-h-11"
                />
                <Link href={newViewHref} className="btn btn-navy min-h-11">
                  Open Appointments
                </Link>
              </div>
            </div>
          ) : (
            <div className="portal-new-work" data-state={newCount > 0 ? "waiting" : "clear"}>
              <div>
                <p className="portal-new-work-label">New · not yet contacted</p>
                <h3 data-testid="queue-overview-headline">{waitingHeadline(newCount)}</h3>
                {oldestWaiting !== null && oldestWaiting !== "" ? (
                  <p data-testid="queue-overview-oldest">
                    {newCount === 1 ? "Waiting since " : "Oldest waiting since "}
                    <strong>{oldestWaiting}</strong>.
                  </p>
                ) : (
                  <p>New website requests will appear here as soon as they arrive.</p>
                )}
              </div>
              <div className="portal-new-work-actions">
                <PrintChooser
                  statusCounts={statusCounts}
                  triggerClassName="btn btn-outline min-h-11"
                />
                {newCount === 0 ? (
                  <Link
                    href={NEW_REQUESTS_HREF}
                    data-testid="start-oldest-empty"
                    className="btn btn-navy min-h-11"
                  >
                    {OPEN_NEW_REQUESTS_LABEL}
                  </Link>
                ) : null}
              </div>
            </div>
          )}

          {newest.length > 0 && newCount !== null ? (
            <div className="portal-arrivals">
              <h3>New Appointments</h3>
              <ul
                data-testid="queue-overview-preview"
                data-scroll={newest.length > 3 ? "true" : "false"}
              >
                {newest.map((request) => (
                  <li key={request.id}>
                    <Link href={`/admin/requests/${request.id}`}>
                      <span data-ui-redact="patient-name">{request.name}</span>
                      <small>
                        {formatReceived(request.created_at)}
                        {arrivedOutsideOfficeHours(request.created_at) ? " · after hours" : ""}
                      </small>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {attention.length > 0 || attentionUnavailable ? (
            <div className="portal-attention-next">
              <h3>Continue next</h3>
              {attention.length > 0 ? (
                <ul data-testid="attention-summary">
                  {attention.map((item) => (
                    <li key={item.key}>
                      <Link href={item.href}>
                        <span aria-hidden="true" />
                        <strong>{item.label}</strong>
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : null}
              {attentionUnavailable ? (
                <p data-testid="attention-summary-unavailable">
                  Some follow-up counts could not load. Open Appointments to review the complete
                  queue.
                </p>
              ) : null}
            </div>
          ) : null}

          {noActiveRecipients ? (
            <p data-testid="no-recipients-warning" className="portal-operational-warning">
              <strong>Notification emails are paused.</strong> Requests still land here, but no
              email goes out when one arrives.{" "}
              <Link href="/admin/settings#notifications">Manage recipients</Link>
            </p>
          ) : null}

          {deliveryFailureCount !== null && deliveryFailureCount !== 0 ? (
            <p data-testid="delivery-failure-warning" className="portal-operational-warning">
              <strong>
                {deliveryFailureCount === 1
                  ? "A notification email had trouble sending in the last 24 hours."
                  : `${deliveryFailureCount} notification emails had trouble sending in the last 24 hours.`}
              </strong>{" "}
              The queue remains the system of record.{" "}
              <Link href="/admin/help#something-wrong">See what to check</Link>
            </p>
          ) : null}
        </section>

        <aside aria-labelledby="desk-tools-heading" className="portal-desk-tools">
          <div>
            <h2 id="desk-tools-heading">Desk tools</h2>
            <p>Occasional work, kept out of the appointment-request path.</p>
          </div>
          <ul>
            {DESK_TOOLS.map((task) => (
              <li key={task.href}>
                <Link href={task.href}>
                  <task.icon className="h-4 w-4" />
                  <strong>{task.label}</strong>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </section>
  );

  return <PortalFeedbackProvider>{content}</PortalFeedbackProvider>;
}
