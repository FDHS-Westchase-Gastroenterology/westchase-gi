import {
  formatPhoneForDisplay,
  formatReceived,
  localeLabel,
  LOCATION_LABELS,
  telHref,
  TIME_LABELS,
} from "@/app/admin/(portal)/requests/format";
import type { RequestDetailRow } from "@/app/admin/(portal)/requests/queue";
import { Clock, Mail, MapPin, MessageSquare, Phone } from "@/components/icons";
import { isMailbox } from "@/lib/portal/contracts";

export function RequestContactDetails({
  row,
  staffCreated,
}: Readonly<{
  row: Readonly<RequestDetailRow>;
  staffCreated: boolean;
}>) {
  const mailbox = row.email !== null ? row.email.trim() : "";
  const safeMailbox = mailbox !== "" && isMailbox(mailbox) ? mailbox : null;
  const phoneDisplay = formatPhoneForDisplay(row.phone);
  const formLanguage = localeLabel(row.locale);
  const patientMessage = row.message !== null ? row.message.trim() : "";
  return (
    <section
      className="request-print-card portal-request-details"
      aria-labelledby="request-details-heading"
    >
      <header className="portal-request-details-header">
        <h2 id="request-details-heading">Contact and request</h2>
        <p data-testid="request-intake-meta">
          <span>
            Received <time dateTime={row.created_at}>{formatReceived(row.created_at, true)}</time>
          </span>
          <span>{staffCreated ? "Added by staff" : `${formLanguage} form`}</span>
        </p>
      </header>
      <div className="portal-request-contact" role="group" aria-label="Patient contact options">
        <a
          href={telHref(row.phone)}
          data-testid="request-phone-link"
          className="portal-request-contact-action"
        >
          <Phone className="portal-request-contact-icon" />
          <span className="portal-request-contact-copy">
            <span className="portal-request-contact-label">Call patient</span>
            <strong
              className="portal-request-contact-value portal-request-contact-value--phone"
              data-ui-redact="patient-contact"
            >
              {phoneDisplay}
            </strong>
          </span>
        </a>
        {safeMailbox !== null && safeMailbox !== "" ? (
          <a
            href={`mailto:${safeMailbox}`}
            data-testid="request-email-link"
            className="portal-request-contact-email"
          >
            <Mail className="portal-request-contact-icon" />
            <span className="portal-request-contact-copy">
              <span className="portal-request-contact-label">Email patient</span>
              <strong className="portal-request-contact-value" data-ui-redact="patient-contact">
                {safeMailbox}
              </strong>
            </span>
          </a>
        ) : (
          <p data-testid="request-email-unavailable" className="portal-request-contact-unavailable">
            No email provided
          </p>
        )}
      </div>
      <div
        className="portal-request-context"
        data-empty={patientMessage === "" ? "true" : undefined}
      >
        <div className="portal-request-message">
          <h3>
            <MessageSquare />
            Patient note
          </h3>
          <blockquote
            data-testid="request-message"
            data-ui-redact={patientMessage !== "" ? "patient-message" : undefined}
            data-empty={patientMessage !== "" ? undefined : "true"}
          >
            {patientMessage !== "" ? patientMessage : "No note was included with this request."}
          </blockquote>
        </div>
        <dl
          className="portal-request-preferences"
          data-testid="request-preferences"
          aria-label="Appointment preferences"
        >
          <div>
            <dt>
              <MapPin />
              Preferred office
            </dt>
            <dd>{LOCATION_LABELS[row.location]}</dd>
          </div>
          <div>
            <dt>
              <Clock />
              Preferred time
            </dt>
            <dd>{TIME_LABELS[row.preferred_time]}</dd>
          </div>
        </dl>
      </div>
    </section>
  );
}
