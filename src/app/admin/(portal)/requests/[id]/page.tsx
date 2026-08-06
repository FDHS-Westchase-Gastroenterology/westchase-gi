import Link from "next/link";
import { notFound } from "next/navigation";
import { PrintButton } from "@/components/PrintButton";
import {
  isMailbox,
  REQUEST_STATUSES,
  type RequestStatus,
} from "@/lib/portal/contracts";
import { requireRole } from "@/lib/portal/auth";
import {
  parseRequestSearch,
  requestSearchFilter,
} from "@/lib/portal/request-query";
import { serviceClient } from "@/lib/portal/server";
import {
  displayNameOrEmail,
  fetchStaffNameMap,
} from "@/lib/portal/staff-identity";
import { fetchRequestWorkSurface } from "@/lib/portal/workflow/reads";
import type { HistoryEntry } from "@/lib/portal/workflow/contracts";
import {
  fetchAttentiveOpenRows,
  fetchClosedRows,
  OPEN_CANDIDATE_LIMIT,
  OPEN_STATUSES,
} from "../queue";
import { StatusBadge } from "../status-badge";
import {
  CLOSURE_REASON_LABELS,
  CONTACT_OUTCOME_LABELS,
  formatReceived,
  followUpWhenLabel,
  LOCALE_LABELS,
  LOCATION_LABELS,
  presentationStatus,
  STATE_LABELS,
  TIME_LABELS,
} from "../format";
import { WorkflowPanel } from "./workflow-panel";
import {
  RequestNotes,
  type RequestNoteView,
} from "./request-notes";

type RequestRow = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  location: "any" | "tampa" | "lutz";
  preferred_time: "any" | "morning" | "afternoon";
  message: string | null;
  locale: string;
  source_path: string;
  created_at: string;
};

function firstParam(value: string | string[] | undefined): string | null {
  return Array.isArray(value) ? (value[0] ?? null) : (value ?? null);
}

// Request history keeps each evidence kind distinct (DEC-05): contact
// attempts, lifecycle transitions, Undo evidence, the legacy-review
// classification, and relevant delivery outcomes. Notes keep their own
// staff surface above the panel; the technical audit stays on the
// Activity log page. A RecordContactAttempt save renders once — as its
// contact attempt — so its self-transition row is presentation-skipped.
type HistoryLine = {
  id: string;
  text: string;
  actor: string | null;
  at: string;
  undone?: boolean;
  quiet?: boolean;
  attention?: boolean;
};

function historyLine(entry: HistoryEntry): HistoryLine | null {
  switch (entry.kind) {
    case "created":
      return {
        id: "created",
        text: "Appointment request received from the website",
        actor: null,
        at: entry.at,
        quiet: true,
      };
    case "contact_attempt":
      return {
        id: entry.id,
        text: `${CONTACT_OUTCOME_LABELS[entry.outcome]}${
          entry.callAgainAt
            ? ` — call again ${followUpWhenLabel(entry.callAgainAt)}`
            : ""
        }`,
        actor: entry.actor,
        at: entry.at,
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
              ? `Closed — ${entry.closureReason ? CLOSURE_REASON_LABELS[entry.closureReason] : "no appointment booked"}`
              : entry.command === "reopen_request"
                ? "Reopened — returned to Contacted"
                : `Marked ${STATE_LABELS[entry.to]}`,
        actor: entry.actor,
        at: entry.at,
        undone: entry.undone,
      };
    case "undo":
      return {
        id: entry.id,
        text: `Undo — restored to ${STATE_LABELS[entry.restoredState]}`,
        actor: entry.actor,
        at: entry.at,
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
      };
    case "delivery":
      return {
        id: entry.id,
        text: `Notification email ${
          entry.accepted ? "accepted for delivery" : "failed"
        } — ${entry.recipient || "recipient unavailable"}`,
        actor: null,
        at: entry.at,
        quiet: entry.accepted,
        attention: !entry.accepted,
      };
  }
}

// One protected fetch feeds one cohesive request workflow; splitting its JSX
// would add patient-data prop surfaces without isolating reusable behavior.
// react-doctor-disable-next-line react-doctor/no-giant-component
export default async function RequestDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    status?: string | string[];
    q?: string | string[];
    page?: string | string[];
  }>;
}) {
  await requireRole("staff");
  const { id } = await params;
  const continuity = await searchParams;
  const statusParam = firstParam(continuity.status);
  const search = parseRequestSearch(continuity.q);
  const searchFilter = search ? requestSearchFilter(search) : "";

  const queueParams = new URLSearchParams();
  if (statusParam) queueParams.set("status", statusParam);
  if (search) queueParams.set("q", search);
  const pageParam = firstParam(continuity.page);
  if (pageParam) queueParams.set("page", pageParam);
  const queueQuery = queueParams.toString();
  const queueHref = `/admin/requests${queueQuery ? `?${queueQuery}` : ""}`;
  const continuityParams = new URLSearchParams();
  if (statusParam) continuityParams.set("status", statusParam);
  if (search) continuityParams.set("q", search);
  const continuityQuery = continuityParams.toString();
  const continuityHref = (requestId: string): string =>
    `/admin/requests/${requestId}${continuityQuery ? `?${continuityQuery}` : ""}`;

  const db = serviceClient();
  // The work surface is the single workflow read (spec §6): durable state,
  // version for optimistic commands, Undo eligibility, and Request history.
  // A failed read throws to the error boundary — it never renders as an
  // empty history or a workable request (DEC-24).
  const [{ data: request, error }, surface, nameMap] = await Promise.all([
    db
      .from("requests")
      .select(
        "id, name, phone, email, location, preferred_time, message, locale, source_path, created_at",
      )
      .eq("id", id)
      .maybeSingle(),
    fetchRequestWorkSurface(db, id),
    fetchStaffNameMap(db),
  ]);

  if (error || !request || !surface) notFound();

  // Previous/next within the viewer's queue scope: the same attention
  // ordering the list renders, so staff can keep working without
  // returning to the list each time. A request outside the current scope
  // (e.g. an old closed row beyond the tail window) simply shows no chain.
  const scoped =
    statusParam &&
    statusParam !== "all" &&
    (REQUEST_STATUSES as readonly string[]).includes(statusParam)
      ? (statusParam as RequestStatus)
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
    selfIndex >= 0 && selfIndex < neighborIds.length - 1
      ? neighborIds[selfIndex + 1]
      : null;

  const row = request as RequestRow;
  const mailbox = row.email?.trim();
  const safeMailbox = mailbox && isMailbox(mailbox) ? mailbox : null;
  // Notes and history come from one composed read. Notes keep their own
  // surface; every other evidence kind renders in Request history.
  const noteViews: RequestNoteView[] = surface.history
    .filter((entry) => entry.kind === "note")
    .map((note) => ({
      id: note.id,
      text: note.text,
      byline: `${displayNameOrEmail(nameMap, note.actor)} · ${formatReceived(
        note.at,
        true,
      )}`,
    }));
  const historyLines = surface.history
    .map(historyLine)
    .filter((line): line is HistoryLine => line !== null);

  const fields: Array<{ label: string; value: React.ReactNode }> = [
    {
      label: "Phone",
      value: (
        <a
          href={`tel:${row.phone}`}
          className="font-bold text-[var(--color-teal-ink)] underline underline-offset-2"
        >
          {row.phone}
        </a>
      ),
    },
    {
      label: "Email",
      value: safeMailbox ? (
        <a
          href={`mailto:${safeMailbox}`}
          className="break-all font-bold text-[var(--color-teal-ink)] underline underline-offset-2"
        >
          {safeMailbox}
        </a>
      ) : (
        <span className="text-[var(--color-muted)]">
          Not provided — call the phone number above
        </span>
      ),
    },
    { label: "Preferred office", value: LOCATION_LABELS[row.location] },
    { label: "Preferred time", value: TIME_LABELS[row.preferred_time] },
    {
      label: "Submitted in",
      value: LOCALE_LABELS[row.locale] ?? row.locale,
    },
    { label: "From page", value: row.source_path },
    { label: "Received", value: formatReceived(row.created_at, true) },
  ];

  return (
    <section
      aria-labelledby="request-heading"
      className="request-detail-print"
    >
      <div className="hidden border-b-2 border-black pb-3 print:block">
        <p className="text-[15pt] font-bold">Westchase Gastroenterology</p>
        <p className="mt-1 text-[9pt] font-bold uppercase tracking-[0.08em]">
          Appointment request
        </p>
      </div>

      <nav
        aria-label="Breadcrumb"
        className="print-hide flex items-center text-[0.9rem]"
      >
        <Link
          href={queueHref}
          className="inline-flex min-h-11 items-center font-bold text-[var(--color-teal-ink)] underline underline-offset-2"
        >
          Appointments
        </Link>
        <span aria-hidden="true" className="mx-2 text-[var(--color-muted)]">
          /
        </span>
        <span className="truncate text-[var(--color-muted)]">{row.name}</span>
        {prevId || nextId ? (
          <span className="ml-auto flex items-center gap-3">
            {prevId ? (
              <Link
                href={continuityHref(prevId)}
                rel="prev"
                data-testid="prev-request"
                className="inline-flex min-h-11 items-center font-bold text-[var(--color-teal-ink)] underline underline-offset-2"
              >
                ← Previous
              </Link>
            ) : null}
            {nextId ? (
              <Link
                href={continuityHref(nextId)}
                rel="next"
                data-testid="next-request"
                className="inline-flex min-h-11 items-center font-bold text-[var(--color-teal-ink)] underline underline-offset-2"
              >
                Next →
              </Link>
            ) : null}
          </span>
        ) : null}
      </nav>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <h1
          id="request-heading"
          data-testid="request-detail-name"
          className="portal-title"
        >
          {row.name}
        </h1>
        <div className="flex flex-wrap items-center gap-3">
          {surface.legacyReviewRequired ? (
            <span
              data-testid="legacy-review-tag"
              className="inline-flex items-center rounded-full bg-[var(--color-amber-soft)] px-2.5 py-1 text-[0.75rem] font-bold uppercase tracking-[0.05em] text-[var(--color-ink)]"
            >
              Needs review
            </span>
          ) : null}
          <StatusBadge status={presentationStatus(surface.state)} />
          <PrintButton label="Print patient page" />
        </div>
      </div>
      {surface.state === "closed" && surface.closedAt ? (
        <p
          data-testid="request-lifecycle-summary"
          className="mt-1.5 text-[0.9rem] text-[var(--color-muted)]"
        >
          Closed {formatReceived(surface.closedAt, true)}
          {surface.closureReason
            ? ` — ${CLOSURE_REASON_LABELS[surface.closureReason]}`
            : " — no appointment booked"}
          .
        </p>
      ) : surface.state === "closed" && surface.legacyReviewRequired ? (
        <p
          data-testid="request-lifecycle-summary"
          className="mt-1.5 text-[0.9rem] text-[var(--color-muted)]"
        >
          Closed before outcomes were recorded — how it ended still needs
          review.
        </p>
      ) : surface.state === "booked" && surface.bookingConfirmedAt ? (
        <p
          data-testid="request-lifecycle-summary"
          className="mt-1.5 text-[0.9rem] text-[var(--color-muted)]"
        >
          Marked Scheduled {formatReceived(surface.bookingConfirmedAt, true)} —
          the appointment lives in the practice scheduling system.
        </p>
      ) : null}

      <div className="request-print-card mt-6 rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-white p-6 sm:p-7">
        <h2 className="text-[1.05rem] font-black text-[var(--color-ink)]">
          Appointment request details
        </h2>
        <dl className="mt-4 grid gap-x-8 gap-y-4 sm:grid-cols-2">
          {fields.map((field) => (
            <div key={field.label}>
              <dt className="text-[0.8rem] font-bold uppercase tracking-[0.06em] text-[var(--color-muted)]">
                {field.label}
              </dt>
              <dd className="mt-1 text-[0.95rem] text-[var(--color-ink)]">
                {field.value}
              </dd>
            </div>
          ))}
        </dl>
        <div className="mt-5 border-t border-[var(--color-line)] pt-5">
          <h3 className="text-[0.8rem] font-bold uppercase tracking-[0.06em] text-[var(--color-muted)]">
            Reason for requesting this appointment
          </h3>
          <p
            data-testid="request-message"
            className="mt-2 whitespace-pre-wrap text-[0.95rem] leading-relaxed text-[var(--color-body)]"
          >
            {row.message?.trim() || "— none provided —"}
          </p>
        </div>
      </div>

      <div className="request-print-card mt-6 rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-white p-6 sm:p-7">
        <RequestNotes requestId={row.id} notes={noteViews} />

        <WorkflowPanel
          requestId={row.id}
          state={surface.state}
          version={surface.version}
          legacyReviewRequired={surface.legacyReviewRequired}
          callAgainAt={surface.callAgainAt}
          undo={surface.undo}
          nextHref={nextId ? continuityHref(nextId) : null}
        />
      </div>

      <div className="request-print-card mt-6 rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-white p-6 sm:p-7">
        <h2 className="text-[1.05rem] font-black text-[var(--color-ink)]">
          Request history
        </h2>
        <p className="mt-1.5 text-[0.88rem] leading-relaxed text-[var(--color-muted)]">
          Everything recorded about this request, newest first — contact
          attempts, status changes, undo corrections, and notification
          outcomes.
        </p>
        {historyLines.length === 0 ? (
          <p className="mt-3 text-[0.95rem] text-[var(--color-muted)]">
            Nothing recorded yet.
          </p>
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
                        ? "font-bold text-[var(--color-amber-deep)]"
                        : line.quiet
                          ? "text-[var(--color-muted)]"
                          : "font-bold text-[var(--color-ink)]"
                  }`}
                >
                  {line.text}
                </p>
                <p className="mt-1.5 text-[0.8rem] font-bold text-[var(--color-teal-ink)]">
                  {line.actor
                    ? `${displayNameOrEmail(nameMap, line.actor)} · `
                    : ""}
                  {formatReceived(line.at, true)}
                  {line.undone ? " · later undone" : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
