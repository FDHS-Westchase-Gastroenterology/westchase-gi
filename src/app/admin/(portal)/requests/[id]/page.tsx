import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { PortalPageHeader } from "@/app/admin/(portal)/portal-page-header";
import {
  CLOSURE_REASON_LABELS,
  CONTACT_OUTCOME_LABELS,
  formatReceived,
  followUpWhenLabel,
  localeLabel,
  LOCATION_LABELS,
  presentationStatus,
  STATE_LABELS,
  TIME_LABELS,
} from "@/app/admin/(portal)/requests/format";
import {
  fetchAttentiveOpenRows,
  fetchClosedRows,
  OPEN_CANDIDATE_LIMIT,
  OPEN_STATUSES,
} from "@/app/admin/(portal)/requests/queue";
import { StatusBadge } from "@/app/admin/(portal)/requests/status-badge";
import { Check, Clock, Mail, MapPin, MessageSquare, Phone } from "@/components/icons";
import { PrintButton } from "@/components/PrintButton";
import { requireRole } from "@/lib/portal/auth";
import { isMailbox, REQUEST_STATUSES } from "@/lib/portal/contracts";
import type { RequestStatus } from "@/lib/portal/contracts";
import { parseRequestSearch, requestSearchFilter } from "@/lib/portal/request-query";
import { serviceClient } from "@/lib/portal/server";
import { displayNameOrEmail, fetchStaffNameMap } from "@/lib/portal/staff-identity";
import type { HistoryEntry } from "@/lib/portal/workflow/contracts";
import { fetchRequestWorkSurface } from "@/lib/portal/workflow/reads";

import { RequestNotes } from "./request-notes";
import type { RequestNoteView } from "./request-notes";
import { WorkflowPanel } from "./workflow-panel";

const requestStatusSchema = z.enum(REQUEST_STATUSES);

const requestDetailSchema = z.object({
  id: z.string(),
  name: z.string(),
  phone: z.string(),
  email: z.string().nullable(),
  location: z.enum(["any", "tampa", "lutz"]),
  preferred_time: z.enum(["any", "morning", "afternoon"]),
  message: z.string().nullable(),
  locale: z.string(),
  created_at: z.string(),
});

function firstParam(value: Readonly<string | string[] | undefined>): string | null {
  const parsed = z.union([z.string(), z.array(z.string())]).safeParse(value);
  if (!parsed.success) return null;
  if (Array.isArray(parsed.data)) {
    const first = parsed.data.at(0);
    return first !== undefined && first !== "" ? first : null;
  }
  return parsed.data !== "" ? parsed.data : null;
}

function formatPhoneForDisplay(value: string): string {
  const trimmed = value.trim();
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11 && digits.startsWith("1")) {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  return trimmed;
}

// Request history keeps each evidence kind distinct (DEC-05): contact
// Attempts, lifecycle transitions, Undo evidence, the legacy-review
// Classification, and relevant delivery outcomes. Notes keep their own
// Staff surface above the panel; the technical audit stays on the
// Activity log page. A RecordContactAttempt save renders once — as its
// Contact attempt — so its self-transition row is presentation-skipped.
interface HistoryLine {
  id: string;
  text: string;
  actor: string | null;
  at: string;
  undone: boolean;
  quiet: boolean;
  attention: boolean;
}

function historyLine(entry: Readonly<HistoryEntry>): HistoryLine | null {
  switch (entry.kind) {
    case "created":
      return {
        id: "created",
        text:
          entry.origin === "staff"
            ? "Appointment request added by staff"
            : "Appointment request received from the website",
        actor: null,
        at: entry.at,
        quiet: true,
        undone: false,
        attention: false,
      };
    case "contact_attempt":
      return {
        id: entry.id,
        text: `${CONTACT_OUTCOME_LABELS[entry.outcome]}${
          entry.callAgainAt !== null && entry.callAgainAt !== ""
            ? ` — call again ${followUpWhenLabel(entry.callAgainAt)}`
            : ""
        }`,
        actor: entry.actor,
        at: entry.at,
        quiet: false,
        undone: false,
        attention: false,
      };
    case "note":
      // Notes render in their own surface above the work panel.
      return null;
    case "transition":
      if (entry.command === "record_contact_attempt") return null;
      return {
        id: entry.id,
        text:
          entry.command === "confirm_booking_handoff"
            ? "Marked Scheduled — appointment booked"
            : entry.command === "close_request"
              ? `Closed — ${entry.closureReason !== null ? CLOSURE_REASON_LABELS[entry.closureReason] : "no appointment booked"}`
              : entry.command === "reopen_request"
                ? "Reopened — returned to Contacted"
                : `Marked ${STATE_LABELS[entry.to]}`,
        actor: entry.actor,
        at: entry.at,
        undone: entry.undone,
        quiet: false,
        attention: false,
      };
    case "undo":
      return {
        id: entry.id,
        text: `Undo — restored to ${STATE_LABELS[entry.restoredState]}`,
        actor: entry.actor,
        at: entry.at,
        quiet: false,
        undone: false,
        attention: false,
      };
    case "legacy_classified":
      return {
        id: entry.id,
        text:
          entry.to === "booked"
            ? "Record reviewed — an appointment was booked (Scheduled)"
            : "Record reviewed — closed without an appointment",
        actor: entry.actor,
        at: entry.at,
        quiet: false,
        undone: false,
        attention: false,
      };
    case "delivery":
      return {
        id: entry.id,
        text: `Notification email ${
          entry.accepted ? "accepted for delivery" : "failed"
        } — ${entry.recipient !== "" ? entry.recipient : "recipient unavailable"}`,
        actor: null,
        at: entry.at,
        quiet: entry.accepted,
        attention: !entry.accepted,
        undone: false,
      };
  }
  return null;
}

// One protected fetch feeds one cohesive request workflow; splitting its JSX
// Would add patient-data prop surfaces without isolating reusable behavior.
// react-doctor-disable-next-line react-doctor/no-giant-component
export default async function RequestDetailPage({
  params,
  searchParams,
}: Readonly<{
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    status?: string | string[];
    q?: string | string[];
    page?: string | string[];
    created?: string | string[];
  }>;
}>) {
  await requireRole("staff");
  const { id } = await params;
  const continuity = await searchParams;
  const statusParam = firstParam(continuity.status);
  const search = parseRequestSearch(continuity.q);
  const searchFilter = search ? requestSearchFilter(search) : "";
  const justCreated = firstParam(continuity.created) === "1";

  const queueParams = new URLSearchParams();
  if (statusParam !== null && statusParam !== "") queueParams.set("status", statusParam);
  if (search !== "") queueParams.set("q", search);
  const pageParam = firstParam(continuity.page);
  if (pageParam !== null && pageParam !== "") queueParams.set("page", pageParam);
  const queueQuery = queueParams.toString();
  const queueHref = `/admin/requests${queueQuery !== "" ? `?${queueQuery}` : ""}`;
  const continuityParams = new URLSearchParams();
  if (statusParam !== null && statusParam !== "") continuityParams.set("status", statusParam);
  if (search !== "") continuityParams.set("q", search);
  const continuityQuery = continuityParams.toString();
  const continuityHref = (requestId: string): string =>
    `/admin/requests/${requestId}${continuityQuery ? `?${continuityQuery}` : ""}`;

  const db = serviceClient();
  // The work surface is the single workflow read (spec §6): durable state,
  // Version for optimistic commands, Undo eligibility, and Request history.
  // A failed read throws to the error boundary — it never renders as an
  // Empty history or a workable request (DEC-24).
  const [{ data: request, error }, surface, nameMap] = await Promise.all([
    db
      .from("requests")
      .select("id, name, phone, email, location, preferred_time, message, locale, created_at")
      .eq("id", id)
      .maybeSingle(),
    fetchRequestWorkSurface(db, id),
    fetchStaffNameMap(db),
  ]);

  if (error) throw new Error("Request detail read failed");
  const parsedRequest = requestDetailSchema.safeParse(request);
  if (!parsedRequest.success || surface === null) notFound();

  // Previous/next within the viewer's queue scope: the same attention
  // Ordering the list renders, so staff can keep working without
  // Returning to the list each time. A request outside the current scope
  // (e.g. an old closed row beyond the tail window) simply shows no chain.
  const scopedStatus = requestStatusSchema.safeParse(statusParam);
  const scoped: RequestStatus | null =
    statusParam !== null && statusParam !== "" && statusParam !== "all" && scopedStatus.success
      ? scopedStatus.data
      : null;
  const neighborIds: string[] = [];
  if (scoped !== "closed") {
    const openStatuses = scoped ? [scoped] : [...OPEN_STATUSES];
    const openRows = await fetchAttentiveOpenRows(db, {
      statuses: openStatuses,
      searchFilter,
    });
    neighborIds.push(...openRows.map((row) => row.id));
  }
  if (scoped === null || scoped === "closed") {
    const closedRows = await fetchClosedRows(db, {
      from: 0,
      limit: OPEN_CANDIDATE_LIMIT,
      searchFilter,
    });
    neighborIds.push(...closedRows.map((row) => row.id));
  }
  const selfIndex = neighborIds.indexOf(id);
  const prevId = selfIndex > 0 ? neighborIds[selfIndex - 1] : null;
  const nextId =
    selfIndex >= 0 && selfIndex < neighborIds.length - 1 ? neighborIds[selfIndex + 1] : null;

  const row = parsedRequest.data;
  const mailbox = row.email !== null ? row.email.trim() : "";
  const safeMailbox = mailbox !== "" && isMailbox(mailbox) ? mailbox : null;
  const phoneDisplay = formatPhoneForDisplay(row.phone);
  const formLanguage = localeLabel(row.locale);
  const patientMessage = row.message !== null ? row.message.trim() : "";
  const staffCreated = surface.history.some(
    (entry) => entry.kind === "created" && entry.origin === "staff",
  );
  // Notes and history come from one composed read. Notes keep their own
  // Surface; every other evidence kind renders in Request history.
  const noteViews: RequestNoteView[] = [];
  const historyLines: HistoryLine[] = [];
  for (const entry of surface.history) {
    if (entry.kind === "note") {
      noteViews.push({
        id: entry.id,
        text: entry.text,
        byline: `${displayNameOrEmail(nameMap, entry.actor)} · ${formatReceived(entry.at, true)}`,
      });
      continue;
    }
    const line = historyLine(entry);
    if (line !== null) historyLines.push(line);
  }

  return (
    <section aria-labelledby="request-heading" className="request-detail-print">
      <div className="hidden border-b-2 border-black pb-3 print:block">
        <p className="text-[15pt] font-bold">Westchase Gastroenterology</p>
        <p className="mt-1 text-[9pt] font-bold tracking-[0.08em] uppercase">Appointment request</p>
      </div>

      <PortalPageHeader
        back={{ href: queueHref, label: "Back to Appointments" }}
        title={
          <span
            id="request-heading"
            data-testid="request-detail-name"
            data-ui-redact="patient-name"
          >
            {row.name}
          </span>
        }
        description={
          surface.state === "closed" && surface.closedAt !== null && surface.closedAt !== "" ? (
            <span data-testid="request-lifecycle-summary">
              Closed {formatReceived(surface.closedAt, true)}
              {surface.closureReason !== null
                ? ` — ${CLOSURE_REASON_LABELS[surface.closureReason]}`
                : " — no appointment booked"}
              .
            </span>
          ) : surface.state === "closed" && surface.legacyReviewRequired ? (
            <span data-testid="request-lifecycle-summary">
              Closed before outcomes were recorded — how it ended still needs review.
            </span>
          ) : surface.state === "booked" &&
            surface.bookingConfirmedAt !== null &&
            surface.bookingConfirmedAt !== "" ? (
            <span data-testid="request-lifecycle-summary">
              Marked Scheduled {formatReceived(surface.bookingConfirmedAt, true)} — the appointment
              lives in the practice scheduling system.
            </span>
          ) : undefined
        }
        actions={
          <>
            {prevId !== null && prevId !== "" ? (
              <Link
                href={continuityHref(prevId)}
                rel="prev"
                data-testid="prev-request"
                className="btn btn-outline min-h-11"
              >
                Previous
              </Link>
            ) : null}
            {nextId !== null && nextId !== "" ? (
              <Link
                href={continuityHref(nextId)}
                rel="next"
                data-testid="next-request"
                className="btn btn-outline min-h-11"
              >
                Next
              </Link>
            ) : null}
            {surface.legacyReviewRequired ? (
              <span data-testid="legacy-review-tag" className="portal-review-tag">
                Needs review
              </span>
            ) : null}
            <StatusBadge status={presentationStatus(surface.state)} />
            <PrintButton label="Print request" />
          </>
        }
      />

      {justCreated ? (
        <div role="status" data-testid="staff-request-created" className="portal-request-created">
          <Check className="h-5 w-5" />
          <div>
            <strong>Patient request added to New.</strong>
            <p>No notification email was sent. The request is ready for staff follow-up below.</p>
          </div>
        </div>
      ) : null}

      <div className="portal-request-layout">
        <section
          className="request-print-card portal-request-details"
          aria-labelledby="request-details-heading"
        >
          <header className="portal-request-details-header">
            <h2 id="request-details-heading">Contact and request</h2>
            <p data-testid="request-intake-meta">
              <span>
                Received{" "}
                <time dateTime={row.created_at}>{formatReceived(row.created_at, true)}</time>
              </span>
              <span>{staffCreated ? "Added by staff" : `${formLanguage} form`}</span>
            </p>
          </header>
          <div className="portal-request-contact" role="group" aria-label="Patient contact options">
            <a
              href={`tel:${row.phone}`}
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
                className="portal-request-contact-action"
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
              <div
                data-testid="request-email-unavailable"
                className="portal-request-contact-action portal-request-contact-action--unavailable"
              >
                <Mail className="portal-request-contact-icon" />
                <span className="portal-request-contact-copy">
                  <span className="portal-request-contact-label">Email patient</span>
                  <strong className="portal-request-contact-value">No email provided</strong>
                </span>
              </div>
            )}
          </div>
          <div className="portal-request-context">
            <div className="portal-request-message">
              <h3>
                <MessageSquare />
                Patient note
              </h3>
              <blockquote
                data-testid="request-message"
                data-ui-redact="patient-message"
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

        <aside className="portal-workflow-shell" aria-label="Record request outcome">
          <WorkflowPanel
            requestId={row.id}
            state={surface.state}
            version={surface.version}
            legacyReviewRequired={surface.legacyReviewRequired}
            callAgainAt={surface.callAgainAt}
            undo={surface.undo}
            nextHref={nextId !== null && nextId !== "" ? continuityHref(nextId) : null}
          />
        </aside>

        <section className="request-print-card portal-request-notes">
          <RequestNotes requestId={row.id} notes={noteViews} />
        </section>

        <section className="request-print-card portal-request-history">
          <h2>Request history</h2>
          <p className="portal-request-section-description">
            Everything recorded about this request, newest first — contact attempts, status changes,
            undo corrections, and notification outcomes.
          </p>
          {historyLines.length === 0 ? (
            <p className="mt-3 text-[0.95rem] text-[var(--color-muted)]">Nothing recorded yet.</p>
          ) : (
            <ul
              data-testid="request-history"
              className="mt-4 divide-y divide-[var(--color-line)] border-y border-[var(--color-line)]"
            >
              {historyLines.map((line) => (
                <li key={line.id} className="request-activity-item py-4">
                  <p
                    className={`text-[0.95rem] ${
                      line.undone
                        ? "font-bold text-[var(--color-muted)] line-through decoration-1"
                        : line.attention
                          ? "font-bold text-[var(--portal-attention-ink)]"
                          : line.quiet
                            ? "text-[var(--color-muted)]"
                            : "font-bold text-[var(--color-ink)]"
                    }`}
                  >
                    {line.text}
                  </p>
                  <p className="mt-1.5 text-[0.8rem] font-bold text-[var(--color-teal-ink)]">
                    {line.actor !== null && line.actor !== ""
                      ? `${displayNameOrEmail(nameMap, line.actor)} · `
                      : ""}
                    {formatReceived(line.at, true)}
                    {line.undone ? " · later undone" : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </section>
  );
}
