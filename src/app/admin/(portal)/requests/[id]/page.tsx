import Link from "next/link";
import { notFound } from "next/navigation";

import { PortalFeedbackProvider } from "@/app/admin/(portal)/portal-feedback";
import type { PortalFeedback } from "@/app/admin/(portal)/portal-feedback";
import { PortalPageHeader } from "@/app/admin/(portal)/portal-page-header";
import { fetchRequestDetail } from "@/app/admin/(portal)/requests/queue";
import { StatusBadge } from "@/app/admin/(portal)/requests/status-badge";
import { buttonVariants } from "@/components/ui/button-variants";
import { requireRole } from "@/lib/portal/auth";
import { firstSearchParam, parseRequestSearch } from "@/lib/portal/request-query";
import { readRequestWorklist } from "@/lib/portal/request-worklist/service";
import { serviceClient } from "@/lib/portal/server";
import { fetchStaffNameMap } from "@/lib/portal/staff-identity";
import { parseRequestStatus, presentationStatus } from "@/lib/portal/workflow/contracts";
import type { RequestState } from "@/lib/portal/workflow/contracts";
import { fetchRequestWorkSurface } from "@/lib/portal/workflow/reads";

import { RequestContactDetails } from "./request-contact-details";
import { RequestPrintButton, StaffRequestCreatedAcknowledgement } from "./request-current-feedback";
import { RequestHistorySection } from "./request-history-list";
import { RequestNotes } from "./request-notes";
import { requestLifecycleSummary, requestRecordViews } from "./request-record";
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

/* A neighbour the queue does not have: the worklist reports an edge as an
   empty id, and an empty id is not a link. */
function neighborHref(requestId: string | null, to: (id: string) => string): string | null {
  return requestId === null || requestId === "" ? null : to(requestId);
}

/* The one thing this page still says through the shared feedback slot: a
   request created on another screen, announcing itself on arrival. Saves
   made here speak in the toast instead (src/components/ui/toast.tsx). */
function createdFeedback(justCreated: boolean): PortalFeedback | null {
  return justCreated
    ? {
        source: "request-created",
        tone: "status",
        message: "Appointment request added to New.",
      }
    : null;
}

/* The header's right-hand cluster: where else staff can go from here, what
   this request is, and the packet it prints. */
function RequestDetailActions({
  prevHref,
  nextHref,
  legacyReview,
  state,
  patientName,
}: Readonly<{
  prevHref: string | null;
  nextHref: string | null;
  legacyReview: boolean;
  state: RequestState;
  patientName: string;
}>) {
  return (
    <>
      {prevHref === null ? null : (
        <Link
          href={prevHref}
          rel="prev"
          data-testid="prev-request"
          data-slot="button"
          className={buttonVariants({ variant: "outline" })}
        >
          Previous
        </Link>
      )}
      {nextHref === null ? null : (
        <Link
          href={nextHref}
          rel="next"
          data-testid="next-request"
          data-slot="button"
          className={buttonVariants({ variant: "outline" })}
        >
          Next
        </Link>
      )}
      {legacyReview ? (
        <span data-testid="legacy-review-tag" className="portal-review-tag">
          Needs review
        </span>
      ) : null}
      <StatusBadge status={presentationStatus(state)} />
      <RequestPrintButton patientName={patientName} />
    </>
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
  const nextHref = neighborHref(nextId, continuityHref);

  const { notes, history, staffCreated } = requestRecordViews(surface.history, nameMap);
  const lifecycle = requestLifecycleSummary(surface);

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
        description={
          lifecycle === null ? undefined : (
            <span data-testid="request-lifecycle-summary">{lifecycle}</span>
          )
        }
        actions={
          <RequestDetailActions
            prevHref={neighborHref(prevId, continuityHref)}
            nextHref={nextHref}
            legacyReview={surface.legacyReviewRequired}
            state={surface.state}
            patientName={row.name}
          />
        }
      />

      <StaffRequestCreatedAcknowledgement />

      <div className="portal-request-layout">
        <div className="portal-request-record">
          <RequestContactDetails row={row} staffCreated={staffCreated} />

          <RequestNotes requestId={row.id} patientName={row.name} notes={notes} />

          <RequestHistorySection lines={history} />
        </div>

        <aside className="portal-workflow-shell" aria-label="Record request outcome">
          <WorkflowPanel
            requestId={row.id}
            patientName={row.name}
            truth={{
              state: surface.state,
              version: surface.version,
              legacyReviewRequired: surface.legacyReviewRequired,
              callAgainAt: surface.callAgainAt,
              undo: surface.undo,
            }}
            nextHref={nextHref}
          />
        </aside>
      </div>
    </section>
  );

  return (
    <PortalFeedbackProvider key={row.id} initialFeedback={createdFeedback(justCreated)}>
      {content}
    </PortalFeedbackProvider>
  );
}
