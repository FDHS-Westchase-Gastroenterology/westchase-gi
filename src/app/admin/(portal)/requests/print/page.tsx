import type { Metadata } from "next";
import Link from "next/link";

import { PortalFeedbackProvider } from "@/app/admin/(portal)/portal-feedback";
import { PortalPageHeader } from "@/app/admin/(portal)/portal-page-header";
import {
  CLOSURE_REASON_LABELS,
  CONTACT_OUTCOME_LABELS,
  formatReceived,
  localeLabel,
  LOCATION_LABELS,
  STATUS_LABELS,
  TIME_LABELS,
} from "@/app/admin/(portal)/requests/format";
import { ArrowRight, Printer } from "@/components/icons";
import { buttonVariants } from "@/components/ui/button-variants";
import { recordAudit } from "@/lib/portal/audit";
import { requireRole } from "@/lib/portal/auth";
import { AUDIT_ACTIONS } from "@/lib/portal/contracts";
import type { RequestStatus } from "@/lib/portal/contracts";
import {
  formatStatusList,
  isNewOnlyPrintSelection,
  parsePrintStatusSelection,
  printPacketHref,
} from "@/lib/portal/print-selection";
import {
  prepareNewRequestPrintPacket,
  prepareStatusRequestPrintPacket,
} from "@/lib/portal/request-print";
import type { NewRequestPrintRow } from "@/lib/portal/request-print";
import { serviceClient } from "@/lib/portal/server";

import { PrintPacketControls } from "./print-controls";

export const metadata: Metadata = {
  title: "Print appointment requests | Staff portal",
};

export const dynamic = "force-dynamic";

const referenceTime = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
  timeZone: "America/New_York",
  timeZoneName: "short",
});

function valueOrDash(value: string | null | undefined): string {
  const trimmed = value?.trim() ?? "";
  return trimmed !== "" ? trimmed : "Not provided";
}

function sentenceCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

const PAPER_INITIAL_OUTCOMES = [
  `Appointment ${STATUS_LABELS.scheduled.toLowerCase()}`,
  CONTACT_OUTCOME_LABELS.reached_follow_up,
  CONTACT_OUTCOME_LABELS.voicemail,
  CONTACT_OUTCOME_LABELS.no_answer,
  sentenceCase(CLOSURE_REASON_LABELS.not_actionable),
] as const;

function PacketField({
  label,
  value,
  wide = false,
  redact,
}: Readonly<{
  label: string;
  value: string;
  wide?: boolean;
  redact?: "patient-name" | "patient-contact" | "patient-message";
}>) {
  const className = [
    "portal-print-field",
    wide ? "portal-print-field--wide" : "",
    redact === "patient-message" ? "portal-print-field--message" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={className}>
      <dt>{label}</dt>
      <dd data-ui-redact={redact}>{value}</dd>
    </div>
  );
}

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React props carry framework member types that cannot be made readonly
function RequestWorksheet({
  request,
  index,
  total,
  generatedAt,
}: Readonly<{
  request: NewRequestPrintRow;
  index: number;
  total: number;
  generatedAt: string;
}>) {
  const hasLongMessage = (request.message?.length ?? 0) > 1_000;

  return (
    <article
      className={`portal-print-sheet${hasLongMessage ? " portal-print-sheet--dense" : ""}`}
      data-testid="print-request-sheet"
    >
      <header className="portal-print-sheet-header">
        <div>
          <p>Westchase Gastroenterology</p>
          <h2>
            {request.status === "new"
              ? "New appointment request"
              : `${STATUS_LABELS[request.status]} appointment request`}
          </h2>
        </div>
        <div>
          <strong>
            {index + 1} of {total}
          </strong>
          <span>Prepared {referenceTime.format(new Date(generatedAt))}</span>
        </div>
      </header>

      <section aria-labelledby={`patient-${request.id}`}>
        <h3 id={`patient-${request.id}`}>Patient contact</h3>
        <dl className="portal-print-fields portal-print-fields--contact">
          <PacketField label="Name" value={request.name} redact="patient-name" />
          <PacketField label="Phone" value={request.phone} redact="patient-contact" />
          <PacketField label="Email" value={valueOrDash(request.email)} redact="patient-contact" />
          <PacketField label="Preferred language" value={localeLabel(request.locale)} />
        </dl>
      </section>

      <section aria-labelledby={`request-${request.id}`}>
        <h3 id={`request-${request.id}`}>Request details</h3>
        <dl className="portal-print-fields">
          <PacketField label="Office" value={LOCATION_LABELS[request.location]} />
          <PacketField label="Best time to call" value={TIME_LABELS[request.preferredTime]} />
          <PacketField label="Received" value={formatReceived(request.createdAt, true)} />
          <PacketField
            label="Status when prepared"
            value={
              request.status === "new" ? "New — not yet contacted" : STATUS_LABELS[request.status]
            }
          />
          <PacketField
            label="What the patient shared"
            value={valueOrDash(request.message)}
            wide
            redact="patient-message"
          />
        </dl>
      </section>

      <section className="portal-paper-handoff" aria-labelledby={`handoff-${request.id}`}>
        <h3 id={`handoff-${request.id}`}>Paper handoff</h3>
        <p className="portal-paper-identity">
          <span data-ui-redact="patient-name">{request.name}</span>
          <small>Request {request.id}</small>
        </p>
        <div className="portal-paper-lines">
          <p>
            <span>Assigned to</span>
          </p>
          <p>
            <span>First call</span>
          </p>
        </div>
        <div className="portal-paper-outcomes">
          <p>Record first in the portal</p>
          <ul>
            {PAPER_INITIAL_OUTCOMES.map((outcome) => (
              <li key={outcome}>
                <span aria-hidden="true" />
                {outcome}
              </li>
            ))}
          </ul>
        </div>
        <p className="portal-paper-later-outcome">
          <span aria-hidden="true" />
          {sentenceCase(CLOSURE_REASON_LABELS.wont_schedule)} — record the contact attempt first,
          then close the request.
        </p>
        <p className="portal-paper-follow-up">
          <span>Follow up</span>
        </p>
        <div className="portal-paper-notes">
          <span>Notes for the next staff member</span>
          <i />
          <i />
          <i />
        </div>
      </section>

      <footer className="portal-print-sheet-footer">
        <strong className="portal-print-confidentiality">
          Confidential patient information — clinic use only. Keep inside the clinic and dispose of
          securely.
        </strong>
        <span>Request reference {request.id}</span>
        <span>Source {request.sourcePath}</span>
      </footer>
    </article>
  );
}

export default async function PrintNewRequestsPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{ auto?: string; status?: string | string[] }>;
}>) {
  const session = await requireRole("staff");
  const params = await searchParams;
  const selection = parsePrintStatusSelection(params.status);
  if (selection === "invalid") {
    return (
      <>
        <PortalPageHeader
          back={{ href: "/admin", label: "Back to Home" }}
          title="That print list is not valid"
          description="No patient details were shown and no appointment request changed."
        />
        <section className="portal-empty-state" role="alert">
          <h2>Choose statuses again</h2>
          <p>Use Print on Home or Appointments and pick one or more request statuses.</p>
          <div>
            <Link href="/admin" data-slot="button" className={buttonVariants()}>
              Back to Home
            </Link>
          </div>
        </section>
      </>
    );
  }

  const selectedStatuses: readonly RequestStatus[] = selection === "default" ? ["new"] : selection;
  const newOnly = isNewOnlyPrintSelection(selection);
  const db = serviceClient();
  const packet = newOnly
    ? await prepareNewRequestPrintPacket({
        db,
        actorEmail: session.email,
      })
    : await prepareStatusRequestPrintPacket({
        db,
        statuses: selectedStatuses,
      });

  if (packet.ok && !newOnly) {
    try {
      await recordAudit(db, {
        actorEmail: session.email,
        action: AUDIT_ACTIONS.REQUESTS_PRINT_NEW,
        entity: "requests",
        entityId: null,
        detail: {
          row_count: packet.requests.length,
          status_filter: selectedStatuses.join(","),
        },
      });
    } catch {
      return (
        <>
          <PortalPageHeader
            back={{ href: "/admin", label: "Back to Home" }}
            title="Printing is temporarily unavailable"
            description="No patient details were shown and no appointment request changed."
          />
          <section className="portal-empty-state" role="alert">
            <h2>Try preparing the packet again</h2>
            <p>
              The secure print service did not prepare a packet. Try again once. If it still fails,
              continue from Appointments so work is not blocked, then report the printing problem.
            </p>
            <div>
              <Link href="/admin" data-slot="button" className={buttonVariants()}>
                Back to Home
              </Link>
            </div>
          </section>
        </>
      );
    }
  }

  const statusList = formatStatusList(selectedStatuses, STATUS_LABELS);

  if (!packet.ok) {
    return (
      <>
        <PortalPageHeader
          back={{ href: "/admin", label: "Back to Home" }}
          title="Printing is temporarily unavailable"
          description="No patient details were shown and no appointment request changed."
        />
        <section className="portal-empty-state" role="alert">
          <h2>Try preparing the packet again</h2>
          <p>
            The secure print service did not prepare a packet. Try again once. If it still fails,
            continue from Appointments so work is not blocked, then report the printing problem.
          </p>
          <div>
            <Link
              href={printPacketHref(selectedStatuses, false)}
              prefetch={false}
              data-slot="button"
              className={buttonVariants()}
            >
              Try again
            </Link>
            <Link
              href={newOnly ? "/admin/requests?status=new" : "/admin/requests"}
              data-slot="button"
              className={buttonVariants({ variant: "outline" })}
            >
              {newOnly ? "Open New requests" : "Open Appointments"}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </>
    );
  }

  if (packet.requests.length === 0) {
    return (
      <>
        <PortalPageHeader
          back={{ href: "/admin", label: "Back to Home" }}
          title={`No ${statusList} appointment requests to print`}
          description={`None of those statuses had requests when this packet was prepared. No pages were created and no request changed.`}
        />
        <section className="portal-empty-state">
          <Printer className="h-7 w-7" />
          <h2>There is no {statusList} work to hand off</h2>
          <p>
            The live queue may have changed since you opened this window. Return to Home for the
            next task, or open Appointments to review the current queue.
          </p>
          <div>
            <Link href="/admin" data-slot="button" className={buttonVariants()}>
              Back to Home
            </Link>
            <Link
              href="/admin/requests"
              data-slot="button"
              className={buttonVariants({ variant: "outline" })}
            >
              Open Appointments
            </Link>
          </div>
        </section>
      </>
    );
  }

  return (
    <PortalFeedbackProvider>
      <div className="print-hide">
        <PortalPageHeader
          back={{ href: "/admin", label: "Back to Home" }}
          title={newOnly ? "Print new appointment requests" : "Print appointment requests"}
          description={`${packet.requests.length} ${
            packet.requests.length === 1 ? "request was" : "requests were"
          } ${statusList} when this packet was prepared, ordered oldest first for a fair paper handoff.`}
          meta={
            <>
              <span>Prepared {referenceTime.format(new Date(packet.generatedAt))}</span>
              <span>Secure clinic copy</span>
            </>
          }
        />
        <div className="portal-print-guidance">
          <strong>Confirm the page count before printing.</strong>
          <span>
            This is a time-stamped snapshot. If the packet sits unattended, compare it with the live
            queue before handing out the pages.
          </span>
        </div>
        <PrintPacketControls autoStart={params.auto === "1"} count={packet.requests.length} />
      </div>

      <section
        className="portal-print-packet"
        aria-label={
          newOnly ? "New appointment request print packet" : "Appointment request print packet"
        }
      >
        {packet.requests.map((request, index) => (
          <RequestWorksheet
            key={request.id}
            request={request}
            index={index}
            total={packet.requests.length}
            generatedAt={packet.generatedAt}
          />
        ))}
      </section>

      <div className="portal-print-follow-up print-hide">
        <p>
          Finished printing? Close this packet window, then return to the live queue before staff
          begin work. Paper notes do not update the portal.
        </p>
        <Link
          href={newOnly ? "/admin/requests?status=new" : "/admin/requests"}
          data-slot="button"
          className={buttonVariants({ variant: "outline" })}
        >
          {newOnly ? "Open New requests" : "Open Appointments"}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </PortalFeedbackProvider>
  );
}
