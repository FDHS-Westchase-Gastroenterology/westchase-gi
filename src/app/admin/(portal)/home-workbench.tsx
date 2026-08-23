import Link from "next/link";
import type { ReactNode, SVGProps } from "react";

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
import { arrivedOutsideOfficeHours } from "@/lib/portal/business-time";
import { STAFF_REQUEST_SOURCE_PATH } from "@/lib/portal/contracts";
import {
  NEW_REQUESTS_HREF,
  OPEN_NEW_REQUESTS_LABEL,
  oldestNewRequestAction,
} from "@/lib/portal/staff-language";

import { PortalPageHeader } from "./portal-page-header";
import { formatReceived } from "./requests/format";

interface HomeTask {
  href: string;
  label: string;
  description: string;
  // oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React props carry framework member types that cannot be made readonly
  icon: (props: Readonly<SVGProps<SVGSVGElement>>) => ReactNode;
}

const DESK_TOOLS: HomeTask[] = [
  {
    href: "/admin/review-flyers",
    label: "Print review flyers",
    description: "Bilingual QR flyers for the front desk.",
    icon: Printer,
  },
  {
    href: "/admin/settings#notifications",
    label: "Notification recipients",
    description: "Choose who hears when a new request arrives.",
    icon: Mail,
  },
  {
    href: "/admin/settings#staff",
    label: "Staff access",
    description: "Invite staff and manage portal roles.",
    icon: Users,
  },
  {
    href: "/admin/settings/software",
    label: "Website status",
    description: "Review the clinic site and its connections.",
    icon: Globe,
  },
  {
    href: "/admin/help#website-changes",
    label: "Request a website change",
    description: "Send content and update requests safely.",
    icon: FileText,
  },
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
  oldestRequestId,
  newest,
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
  oldestRequestId: string | null;
  newest: NewRequestPreview[];
  attention: AttentionPath[];
  attentionUnavailable: boolean;
  noActiveRecipients: boolean;
  deliveryFailureCount: number | null;
  announcements?: ReactNode;
}>) {
  const newViewHref = NEW_REQUESTS_HREF;
  const oldestAction = oldestNewRequestAction({ newCount, oldestRequestId });

  return (
    <section aria-labelledby="home-heading">
      <PortalPageHeader
        title={
          <span id="home-heading" data-testid="home-greeting">
            {greeting}
          </span>
        }
        description="Start with what needs contact, then record the real outcome in Appointments."
        actions={
          <Link
            href={STAFF_REQUEST_SOURCE_PATH}
            data-testid="home-add-patient-request"
            className="btn btn-outline min-h-11"
          >
            Add appointment request
          </Link>
        }
        meta={
          <>
            <span>{date}</span>
            {afterHours ? (
              <span data-testid="after-hours" className="portal-after-hours">
                <Clock className="h-3.5 w-3.5" />
                After hours
              </span>
            ) : null}
          </>
        }
      />

      {announcements}

      <div className="portal-home-layout">
        <section
          aria-labelledby="queue-overview-heading"
          data-testid="queue-overview"
          className="portal-work-stack"
        >
          <header className="portal-work-stack-header">
            <div>
              <h2 id="queue-overview-heading">Appointment requests</h2>
              <p>New requests wait here. Contact the longest-waiting one first.</p>
            </div>
            <Link href="/admin/requests" className="portal-inline-link">
              Open Appointments
              <ArrowRight className="h-4 w-4" />
            </Link>
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
                <button type="button" className="btn btn-outline min-h-11" disabled>
                  <Printer className="h-4 w-4" />
                  Printing unavailable
                </button>
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
                {newCount > 0 ? (
                  <>
                    {oldestAction.kind === "open-oldest" ? (
                      <Link
                        href={oldestAction.href}
                        data-testid="start-oldest-request"
                        className="btn btn-navy min-h-11"
                      >
                        {oldestAction.label}
                      </Link>
                    ) : oldestAction.kind === "empty" ? (
                      <Link
                        href={oldestAction.href}
                        data-testid="start-oldest-empty"
                        className="btn btn-navy min-h-11"
                      >
                        {oldestAction.label}
                      </Link>
                    ) : null}
                    <Link
                      href="/admin/requests/print?auto=1"
                      target="_blank"
                      rel="noopener"
                      prefetch={false}
                      className="btn btn-outline min-h-11"
                      aria-label={`Print all ${newCount} new appointment ${
                        newCount === 1 ? "request" : "requests"
                      }; opens in a new tab`}
                    >
                      <Printer className="h-4 w-4" />
                      <span data-testid="print-new-count">Print all {newCount}</span>
                    </Link>
                  </>
                ) : (
                  <>
                    <button type="button" className="btn btn-outline min-h-11" disabled>
                      <Printer className="h-4 w-4" />
                      <span data-testid="print-new-empty">Nothing to print</span>
                    </button>
                    <Link
                      href={NEW_REQUESTS_HREF}
                      data-testid="start-oldest-empty"
                      className="btn btn-outline min-h-11"
                    >
                      {OPEN_NEW_REQUESTS_LABEL}
                    </Link>
                  </>
                )}
              </div>
            </div>
          )}

          {newest.length > 0 && newCount !== null ? (
            <div className="portal-arrivals">
              <h3>Newest arrivals</h3>
              <ul data-testid="queue-overview-preview">
                {newest.map((request) => (
                  <li key={request.id}>
                    <Link href={`/admin/requests/${request.id}`}>
                      <span data-ui-redact="patient-name">{request.name}</span>
                      <small>
                        {formatReceived(request.created_at)}
                        {arrivedOutsideOfficeHours(request.created_at) ? " · after hours" : ""}
                      </small>
                      <ChevronRight className="h-4 w-4" />
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
            {DESK_TOOLS.map((task) => {
              const slug = task.label.toLowerCase().replace(/[^a-z]+/g, "-");
              return (
                <li key={task.href}>
                  <Link
                    href={task.href}
                    aria-labelledby={`desk-tool-${slug}`}
                    aria-describedby={`desk-tool-${slug}-description`}
                  >
                    <task.icon className="h-[1.1rem] w-[1.1rem]" />
                    <span>
                      <strong id={`desk-tool-${slug}`}>{task.label}</strong>
                      <small id={`desk-tool-${slug}-description`}>{task.description}</small>
                    </span>
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </aside>
      </div>
    </section>
  );
}
