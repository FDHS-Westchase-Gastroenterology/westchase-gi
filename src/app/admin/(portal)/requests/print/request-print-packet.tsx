import type { NewRequestPrintRow } from "@/lib/portal/request-print";
import {
  CLOSURE_REASON_LABELS,
  CONTACT_OUTCOME_LABELS,
  formatReceived,
  LOCALE_LABELS,
  LOCATION_LABELS,
  STATUS_LABELS,
  TIME_LABELS,
} from "../format";

const packetReferenceTime = new Intl.DateTimeFormat("en-US", {
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
  return value?.trim() || "Not provided";
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
}: {
  label: string;
  value: string;
  wide?: boolean;
  redact?: "patient-name" | "patient-contact" | "patient-message";
}) {
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

function RequestWorksheet({
  request,
  index,
  total,
  generatedAt,
}: {
  request: NewRequestPrintRow;
  index: number;
  total: number;
  generatedAt: string;
}) {
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
          <span>Prepared {packetReferenceTime.format(new Date(generatedAt))}</span>
        </div>
      </header>

      <section aria-labelledby={`patient-${request.id}`}>
        <h3 id={`patient-${request.id}`}>Patient contact</h3>
        <dl className="portal-print-fields portal-print-fields--contact">
          <PacketField label="Name" value={request.name} redact="patient-name" />
          <PacketField label="Phone" value={request.phone} redact="patient-contact" />
          <PacketField
            label="Email"
            value={valueOrDash(request.email)}
            redact="patient-contact"
          />
          <PacketField
            label="Preferred language"
            value={LOCALE_LABELS[request.locale] ?? request.locale.toUpperCase()}
          />
        </dl>
      </section>

      <section aria-labelledby={`request-${request.id}`}>
        <h3 id={`request-${request.id}`}>Request details</h3>
        <dl className="portal-print-fields">
          <PacketField
            label="Office"
            value={LOCATION_LABELS[request.location]}
          />
          <PacketField
            label="Best time to call"
            value={TIME_LABELS[request.preferredTime]}
          />
          <PacketField
            label="Received"
            value={formatReceived(request.createdAt, true)}
          />
          <PacketField label="Status" value="New — not yet contacted" />
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
          {sentenceCase(CLOSURE_REASON_LABELS.wont_schedule)} — record the
          contact attempt first, then close the request.
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
        <span>Request reference {request.id}</span>
        <span>Source {request.sourcePath}</span>
      </footer>
    </article>
  );
}

export function RequestPrintPacket({
  requests,
  generatedAt,
}: {
  requests: NewRequestPrintRow[];
  generatedAt: string;
}) {
  return (
    <section
      className="portal-print-packet"
      aria-label="New appointment request print packet"
      data-testid="print-request-packet"
    >
      {requests.map((request, index) => (
        <RequestWorksheet
          key={request.id}
          request={request}
          index={index}
          total={requests.length}
          generatedAt={generatedAt}
        />
      ))}
    </section>
  );
}
