import type { Metadata } from "next";
import Link from "next/link";

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
import { requireRole } from "@/lib/portal/auth";
import { prepareNewRequestPrintPacket } from "@/lib/portal/request-print";
import type { NewRequestPrintRow } from "@/lib/portal/request-print";
import { serviceClient } from "@/lib/portal/server";

import { PrintPacketControls } from "./print-controls";

export const metadata: Metadata = {
  title: "Print new appointment requests | Staff portal",
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
          <h2>New appointment request</h2>
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
          <PacketField label="Status when prepared" value="New — not yet contacted" />
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
  searchParams: Promise<{ auto?: string }>;
}>) {
  const session = await requireRole("staff");
  const [params, packet] = await Promise.all([
    searchParams,
    prepareNewRequestPrintPacket({
      db: serviceClient(),
      actorEmail: session.email,
    }),
  ]);

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
            continue from the live New view so work is not blocked, then report the printing
            problem.
          </p>
          <div>
            <Link href="/admin/requests/print" prefetch={false} className="btn btn-navy min-h-11">
              Try again
            </Link>
            <Link href="/admin/requests?status=new" className="btn btn-outline min-h-11">
              Open New requests
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
          title="No new appointment requests to print"
          description="No appointment requests were New when this packet was prepared. No pages were created for printing and no request changed."
        />
        <section className="portal-empty-state">
          <Printer className="h-7 w-7" />
          <h2>There is no New work to hand off</h2>
          <p>
            The live queue may have changed since you opened this window. Return to Home for the
            next task, or open Appointments to review the current queue.
          </p>
          <div>
            <Link href="/admin" className="btn btn-navy min-h-11">
              Back to Home
            </Link>
            <Link href="/admin/requests" className="btn btn-outline min-h-11">
              Open Appointments
            </Link>
          </div>
        </section>
      </>
    );
  }

  return (
    <>
      <div className="print-hide">
        <PortalPageHeader
          back={{ href: "/admin", label: "Back to Home" }}
          title="Print new appointment requests"
          description={`${packet.requests.length} ${
            packet.requests.length === 1 ? "request was" : "requests were"
          } New when this packet was prepared, ordered oldest first for a fair paper handoff.`}
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
            New view before handing out the pages.
          </span>
        </div>
        <PrintPacketControls autoStart={params.auto === "1"} count={packet.requests.length} />
      </div>

      <section className="portal-print-packet" aria-label="New appointment request print packet">
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
        <Link href="/admin/requests?status=new" className="btn btn-outline min-h-11">
          Open New requests
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </>
  );
}
