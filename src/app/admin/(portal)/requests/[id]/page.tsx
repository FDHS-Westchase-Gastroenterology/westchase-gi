import { notFound } from "next/navigation";

import { PortalFeedbackProvider } from "@/app/admin/(portal)/portal-feedback";
import { fetchRequestDetail } from "@/app/admin/(portal)/requests/queue";
import { requireRole } from "@/lib/portal/auth";
import { firstSearchParam, parseRequestSearch } from "@/lib/portal/request-query";
import { readRequestWorklist } from "@/lib/portal/request-worklist/service";
import { serviceClient } from "@/lib/portal/server";
import { fetchStaffNameMap } from "@/lib/portal/staff-identity";
import { parseRequestStatus } from "@/lib/portal/workflow/contracts";
import { fetchRequestWorkSurface } from "@/lib/portal/workflow/reads";

import { RequestContactDetails } from "./request-contact-details";
import {
  RequestPrintFeedback,
  StaffRequestCreatedAcknowledgement,
} from "./request-current-feedback";
import { RequestDetailHeader } from "./request-detail-header";
import { requestHistoryViews } from "./request-history-views";
import { RequestNotes } from "./request-notes";
import { RequestDetailPaper, RequestHistorySection } from "./request-record-sections";
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
  const preparedAt = new Date().toISOString();
  const printedBy = session.displayName === "" ? session.email : session.displayName;

  const content = (
    <section aria-labelledby="request-heading" className="print-hide">
      <RequestDetailHeader
        name={row.name}
        surface={surface}
        queueHref={queueHref}
        prevHref={prevId !== null && prevId !== "" ? continuityHref(prevId) : null}
        nextHref={nextId !== null && nextId !== "" ? continuityHref(nextId) : null}
      />

      <StaffRequestCreatedAcknowledgement />
      <RequestPrintFeedback />

      <div className="portal-request-layout">
        <div className="portal-request-record">
          <RequestContactDetails row={row} staffCreated={staffCreated} />

          <section
            className="portal-request-notes"
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
      <RequestDetailPaper
        row={row}
        surface={surface}
        nameMap={nameMap}
        preparedAt={preparedAt}
        printedBy={printedBy}
      />
    </PortalFeedbackProvider>
  );
}
