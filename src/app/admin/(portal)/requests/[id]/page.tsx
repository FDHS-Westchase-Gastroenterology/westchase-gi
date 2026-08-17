import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

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
} from "@/app/admin/(portal)/requests/format";
import {
  fetchAttentiveOpenRows,
  fetchClosedRows,
  OPEN_CANDIDATE_LIMIT,
  OPEN_STATUSES,
} from "@/app/admin/(portal)/requests/queue";
import { StatusBadge } from "@/app/admin/(portal)/requests/status-badge";
import { PrintButton } from "@/components/PrintButton";
import { isLocale } from "@/lib/i18n";
import { requireRole } from "@/lib/portal/auth";
import { isMailbox, REQUEST_STATUSES } from "@/lib/portal/contracts";
import { parseRequestSearch, requestSearchFilter } from "@/lib/portal/request-query";
import { serviceClient } from "@/lib/portal/server";
import { displayNameOrEmail, fetchStaffNameMap } from "@/lib/portal/staff-identity";
import type { HistoryEntry } from "@/lib/portal/workflow/contracts";
import { fetchRequestWorkSurface } from "@/lib/portal/workflow/reads";

import { RequestNotes } from "./request-notes";
import type { RequestNoteView } from "./request-notes";
import { WorkflowPanel } from "./workflow-panel";

interface RequestRow {
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
}

const requestRowSchema = z.object({
  id: z.string(),
  name: z.string(),
  phone: z.string(),
  email: z.string().nullable(),
  location: z.enum(["any", "tampa", "lutz"]),
  preferred_time: z.enum(["any", "morning", "afternoon"]),
  message: z.string().nullable(),
  locale: z.string(),
  source_path: z.string(),
  created_at: z.string(),
});
const requestStatusSchema = z.enum(REQUEST_STATUSES);

function isStringArray(value: string | readonly string[]): value is readonly string[] {
  return Array.isArray(value);
}

function firstParam(value: string | readonly string[] | undefined): string | null {
  if (value === undefined) return null;
  return isStringArray(value) ? (value[0] ?? null) : value;
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
  undone?: boolean;
  quiet?: boolean;
  attention?: boolean;
}

function historyLine(entry: Readonly<HistoryEntry>): HistoryLine | null {
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
          entry.callAgainAt !== null && entry.callAgainAt !== ""
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
              ? `Closed — ${entry.closureReason !== null ? CLOSURE_REASON_LABELS[entry.closureReason] : "no appointment booked"}`
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
  }>;
}>) {
  await requireRole("staff");
  const { id } = await params;
  const continuity = await searchParams;
  const statusParam = firstParam(continuity.status);
  const search = parseRequestSearch(continuity.q);
  const searchFilter = search ? requestSearchFilter(search) : "";

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
    `/admin/requests/${requestId}${continuityQuery !== "" ? `?${continuityQuery}` : ""}`;

  const db = serviceClient();
  // The work surface is the single workflow read (spec §6): durable state,
  // Version for optimistic commands, Undo eligibility, and Request history.
  // A failed read throws to the error boundary — it never renders as an
  // Empty history or a workable request (DEC-24).
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

  if (error !== null || request === null || surface === null) notFound();

  // Previous/next within the viewer's queue scope: the same attention
  // Ordering the list renders, so staff can keep working without
  // Returning to the list each time. A request outside the current scope
  // (E.g. an old closed row beyond the tail window) simply shows no chain.
  const scopedParsed = requestStatusSchema.safeParse(statusParam);
  const scoped = scopedParsed.success ? scopedParsed.data : null;
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

  const parsedRequest = requestRowSchema.safeParse(request);
  if (!parsedRequest.success) notFound();
  const row: RequestRow = parsedRequest.data;
  const mailbox = row.email?.trim();
  const safeMailbox =
    mailbox !== undefined && mailbox !== "" && isMailbox(mailbox) ? mailbox : null;
  // Notes and history come from one composed read. Notes keep their own
  // Surface; every other evidence kind renders in Request history.
  const noteViews: RequestNoteView[] = [];
  for (const entry of surface.history) {
    if (entry.kind !== "note") continue;
    noteViews.push({
      id: entry.id,
      text: entry.text,
      byline: `${displayNameOrEmail(nameMap, entry.actor)} · ${formatReceived(entry.at, true)}`,
    });
  }
  const historyLines = surface.history
    .map(historyLine)
    .filter((line): line is HistoryLine => line !== null);

  const fields: { label: string; value: React.ReactNode }[] = [
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
      value:
        safeMailbox !== null ? (
          <a
            href={`mailto:${safeMailbox}`}
            className="font-bold break-all text-[var(--color-teal-ink)] underline underline-offset-2"
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
      value: isLocale(row.locale) ? LOCALE_LABELS[row.locale] : row.locale,
    },
    { label: "From page", value: row.source_path },
    { label: "Received", value: formatReceived(row.created_at, true) },
  ];

  return (
    <section aria-labelledby="request-heading" className="request-detail-print">
      <div className="hidden border-b-2 border-black pb-3 print:block">
        <p className="text-[15pt] font-bold">Westchase Gastroenterology</p>
        <p className="mt-1 text-[9pt] font-bold tracking-[0.08em] uppercase">Appointment request</p>
      </div>

      <nav aria-label="Breadcrumb" className="print-hide flex items-center text-[0.9rem]">
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
        {(prevId !== null && prevId !== "") || (nextId !== null && nextId !== "") ? (
          <span className="ml-auto flex items-center gap-3">
            {prevId !== null && prevId !== "" ? (
              <Link
                href={continuityHref(prevId)}
                rel="prev"
                data-testid="prev-request"
                className="inline-flex min-h-11 items-center font-bold text-[var(--color-teal-ink)] underline underline-offset-2"
              >
                ← Previous
              </Link>
            ) : null}
            {nextId !== null && nextId !== "" ? (
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
        <h1 id="request-heading" data-testid="request-detail-name" className="portal-title">
          {row.name}
        </h1>
        <div className="flex flex-wrap items-center gap-3">
          {surface.legacyReviewRequired ? (
            <span
              data-testid="legacy-review-tag"
              className="inline-flex items-center rounded-full bg-[var(--color-amber-soft)] px-2.5 py-1 text-[0.75rem] font-bold tracking-[0.05em] text-[var(--color-ink)] uppercase"
            >
              Needs review
            </span>
          ) : null}
          <StatusBadge status={presentationStatus(surface.state)} />
          <PrintButton label="Print patient page" />
        </div>
      </div>
      {surface.state === "closed" && surface.closedAt !== null && surface.closedAt !== "" ? (
        <p
          data-testid="request-lifecycle-summary"
          className="mt-1.5 text-[0.9rem] text-[var(--color-muted)]"
        >
          Closed {formatReceived(surface.closedAt, true)}
          {surface.closureReason !== null
            ? ` — ${CLOSURE_REASON_LABELS[surface.closureReason]}`
            : " — no appointment booked"}
          .
        </p>
      ) : surface.state === "closed" && surface.legacyReviewRequired ? (
        <p
          data-testid="request-lifecycle-summary"
          className="mt-1.5 text-[0.9rem] text-[var(--color-muted)]"
        >
          Closed before outcomes were recorded — how it ended still needs review.
        </p>
      ) : surface.state === "booked" &&
        surface.bookingConfirmedAt !== null &&
        surface.bookingConfirmedAt !== "" ? (
        <p
          data-testid="request-lifecycle-summary"
          className="mt-1.5 text-[0.9rem] text-[var(--color-muted)]"
        >
          Marked Scheduled {formatReceived(surface.bookingConfirmedAt, true)} — the appointment
          lives in the practice scheduling system.
        </p>
      ) : null}

      <div className="request-print-card mt-6 rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-white p-6 sm:p-7">
        <h2 className="text-[1.05rem] font-black text-[var(--color-ink)]">
          Appointment request details
        </h2>
        <dl className="mt-4 grid gap-x-8 gap-y-4 sm:grid-cols-2">
          {fields.map((field) => (
            <div key={field.label}>
              <dt className="text-[0.8rem] font-bold tracking-[0.06em] text-[var(--color-muted)] uppercase">
                {field.label}
              </dt>
              <dd className="mt-1 text-[0.95rem] text-[var(--color-ink)]">{field.value}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-5 border-t border-[var(--color-line)] pt-5">
          <h3 className="text-[0.8rem] font-bold tracking-[0.06em] text-[var(--color-muted)] uppercase">
            Reason for requesting this appointment
          </h3>
          <p
            data-testid="request-message"
            className="mt-2 text-[0.95rem] leading-relaxed whitespace-pre-wrap text-[var(--color-body)]"
          >
            {row.message !== null && row.message.trim() !== ""
              ? row.message.trim()
              : "— none provided —"}
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
          nextHref={nextId !== null && nextId !== "" ? continuityHref(nextId) : null}
        />
      </div>

      <div className="request-print-card mt-6 rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-white p-6 sm:p-7">
        <h2 className="text-[1.05rem] font-black text-[var(--color-ink)]">Request history</h2>
        <p className="mt-1.5 text-[0.88rem] leading-relaxed text-[var(--color-muted)]">
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
                    line.undone === true
                      ? "font-bold text-[var(--color-muted)] line-through decoration-1"
                      : line.attention === true
                        ? "font-bold text-[var(--color-amber-deep)]"
                        : line.quiet === true
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
                  {line.undone === true ? " · later undone" : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
