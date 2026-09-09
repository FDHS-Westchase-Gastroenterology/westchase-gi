import Link from "next/link";
import { notFound } from "next/navigation";

import { PortalFeedbackProvider } from "@/app/admin/(portal)/portal-feedback";
import { PortalPageHeader } from "@/app/admin/(portal)/portal-page-header";
import { CLOSURE_REASON_LABELS, formatReceived } from "@/app/admin/(portal)/requests/format";
import { fetchRequestDetail } from "@/app/admin/(portal)/requests/queue";
import { StatusBadge } from "@/app/admin/(portal)/requests/status-badge";
import { buttonVariants } from "@/components/ui/registry-button-variants";
import { requireRole } from "@/lib/portal/auth";
import { firstSearchParam, parseRequestSearch } from "@/lib/portal/request-query";
import { readRequestWorklist } from "@/lib/portal/request-worklist/service";
import { serviceClient } from "@/lib/portal/server";
import { displayNameOrEmail, fetchStaffNameMap } from "@/lib/portal/staff-identity";
import { parseRequestStatus, presentationStatus } from "@/lib/portal/workflow/contracts";
import type { HistoryEntry, RequestWorkSurface } from "@/lib/portal/workflow/contracts";
import { fetchRequestWorkSurface } from "@/lib/portal/workflow/reads";

import { RequestContactDetails } from "./request-contact-details";
import {
  RequestPrintButton,
  RequestPrintFeedback,
  StaffRequestCreatedAcknowledgement,
} from "./request-current-feedback";
import { historyLine } from "./request-history";
import type { HistoryLine } from "./request-history";
import { RequestNotes } from "./request-notes";
import type { RequestNoteView } from "./request-notes";
import { WorkflowPanel } from "./workflow-panel";

function firstParam(value: Readonly<string | string[] | undefined>): string | null {
  const first = firstSearchParam(value);
  return first === "" ? null : first;
}

function requestNavigation(statusParam: string | null, search: string, pageParam: string | null) {
  const queueParams = new URLSearchParams();
  if (statusParam !== null && statusParam !== "") queueParams.set("status", statusParam);
  if (search !== "") queueParams.set("q", search);
  if (pageParam !== null && pageParam !== "") queueParams.set("page", pageParam);
  const queueQuery = queueParams.toString();
  const queueHref = `/admin/requests${queueQuery !== "" ? `?${queueQuery}` : ""}`;
  const continuityParams = new URLSearchParams();
  if (statusParam !== null && statusParam !== "") continuityParams.set("status", statusParam);
  if (search !== "") continuityParams.set("q", search);
  const continuityQuery = continuityParams.toString();
  const continuityHref = (requestId: string): string =>
    `/admin/requests/${requestId}${continuityQuery ? `?${continuityQuery}` : ""}`;
  return { queueHref, continuityHref };
}

function requestHistoryViews(
  history: readonly Readonly<HistoryEntry>[],
  nameMap: ReadonlyMap<string, string>,
) {
  // Notes and history come from one composed read. Notes keep their own
  // Surface; every other evidence kind renders in Request history.
  const noteViews: RequestNoteView[] = [];
  const historyLines: HistoryLine[] = [];
  for (const entry of history) {
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
  return { noteViews, historyLines };
}

function requestLifecycleSummary(
  surface: Readonly<
    Pick<
      RequestWorkSurface,
      "state" | "closedAt" | "closureReason" | "legacyReviewRequired" | "bookingConfirmedAt"
    >
  >,
) {
  return surface.state === "closed" && surface.closedAt !== null && surface.closedAt !== "" ? (
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
      Marked Scheduled {formatReceived(surface.bookingConfirmedAt, true)} — the appointment lives in
      the practice scheduling system.
    </span>
  ) : undefined;
}

function RequestHistorySection({
  historyLines,
  nameMap,
}: Readonly<{
  historyLines: readonly Readonly<HistoryLine>[];
  nameMap: ReadonlyMap<string, string>;
}>) {
  return (
    <section
      className="request-print-card portal-request-history"
      data-short={historyLines.length <= 1 ? "true" : undefined}
    >
      <h2 className="portal-record-heading">Request history</h2>
      <p className="portal-request-section-description">
        Everything recorded about this request, newest first — contact attempts, status changes,
        undo corrections, and notification outcomes.
      </p>
      {historyLines.length === 0 ? (
        <p className="portal-request-history-empty">Nothing recorded yet.</p>
      ) : (
        <ul data-testid="request-history" className="portal-request-ledger">
          {historyLines.map((line) => (
            <li key={line.id} className="request-activity-item">
              <p
                className={`portal-request-ledger-event ${
                  line.undone
                    ? "portal-request-ledger-event--undone"
                    : line.attention
                      ? "portal-request-ledger-event--attention"
                      : line.quiet
                        ? "portal-request-ledger-event--quiet"
                        : ""
                }`}
              >
                {line.text}
              </p>
              <p className="portal-request-ledger-meta">
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
  );
}

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
  const session = await requireRole("staff");
  const { id } = await params;
  const continuity = await searchParams;
  const statusParam = firstParam(continuity.status);
  const search = parseRequestSearch(continuity.q);
  const justCreated = firstParam(continuity.created) === "1";

  const { queueHref, continuityHref } = requestNavigation(
    statusParam,
    search,
    firstParam(continuity.page),
  );

  const db = serviceClient();
  // The work surface is the single workflow read (spec §6): durable state,
  // Version for optimistic commands, Undo eligibility, and Request history.
  // A failed read throws to the error boundary — it never renders as an
  // Empty history or a workable request (spec §3).
  const status = statusParam === null ? null : parseRequestStatus(statusParam);
  const [row, surface, nameMap, neighbors] = await Promise.all([
    fetchRequestDetail(db, id),
    fetchRequestWorkSurface(db, id),
    fetchStaffNameMap(db),
    readRequestWorklist(db, session.id, {
      action: "neighbors",
      requestId: id,
      query: search,
      statuses: status === null ? null : [status],
    }),
  ]);
  if (row === null || surface === null) notFound();

  if (!neighbors.ok) throw new Error(`Queue read failed: ${neighbors.code}`);
  const { prevId, nextId } = neighbors.neighbors;

  const staffCreated = surface.history.some(
    (entry) => entry.kind === "created" && entry.origin === "staff",
  );
  const { noteViews, historyLines } = requestHistoryViews(surface.history, nameMap);

  const content = (
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
        description={requestLifecycleSummary(surface)}
        actions={
          <>
            {prevId !== null && prevId !== "" ? (
              <Link
                href={continuityHref(prevId)}
                rel="prev"
                data-testid="prev-request"
                data-slot="button"
                className={buttonVariants({ variant: "outline" })}
              >
                Previous
              </Link>
            ) : null}
            {nextId !== null && nextId !== "" ? (
              <Link
                href={continuityHref(nextId)}
                rel="next"
                data-testid="next-request"
                data-slot="button"
                className={buttonVariants({ variant: "outline" })}
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
            <RequestPrintButton />
          </>
        }
      />

      <StaffRequestCreatedAcknowledgement />
      <RequestPrintFeedback />

      <div className="portal-request-layout">
        <div className="portal-request-record">
          <RequestContactDetails row={row} staffCreated={staffCreated} />

          <section
            className="request-print-card portal-request-notes"
            data-empty={noteViews.length === 0 ? "true" : undefined}
          >
            <RequestNotes requestId={row.id} notes={noteViews} />
          </section>

          <RequestHistorySection historyLines={historyLines} nameMap={nameMap} />
        </div>

        <aside className="portal-workflow-shell" aria-label="Record request outcome">
          <WorkflowPanel
            requestId={row.id}
            truth={{
              state: surface.state,
              version: surface.version,
              legacyReviewRequired: surface.legacyReviewRequired,
              callAgainAt: surface.callAgainAt,
              undo: surface.undo,
            }}
            nextHref={nextId !== null && nextId !== "" ? continuityHref(nextId) : null}
          />
        </aside>
      </div>
    </section>
  );

  return (
    <PortalFeedbackProvider
      key={row.id}
      initialFeedback={
        justCreated
          ? {
              source: "request-created",
              tone: "status",
              message: "Appointment request added to New.",
            }
          : null
      }
    >
      {content}
    </PortalFeedbackProvider>
  );
}
