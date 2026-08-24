import Link from "next/link";
import { redirect } from "next/navigation";
import { z } from "zod";

import { PortalFeedbackProvider } from "@/app/admin/(portal)/portal-feedback";
import { ChevronRight } from "@/components/icons";
import { requireRole } from "@/lib/portal/auth";
import { waitingSince } from "@/lib/portal/business-time";
import { REQUEST_STATUSES, STAFF_REQUEST_SOURCE_PATH } from "@/lib/portal/contracts";
import type { RequestStatus } from "@/lib/portal/contracts";
import type { AttentionBucket } from "@/lib/portal/queue-attention";
import {
  parsePage,
  parseRequestSearch,
  requestSearchFilter,
  requestsHref,
} from "@/lib/portal/request-query";
import { requestPageWindow } from "@/lib/portal/request-window";
import { serviceClient } from "@/lib/portal/server";

import {
  followUpShortLabel,
  formatReceived,
  LOCATION_LABELS,
  STATUS_LABELS,
  TIME_LABELS,
} from "./format";
import { fetchAttentiveOpenRows, fetchClosedRows, OPEN_STATUSES, VIEW_DB_STATUSES } from "./queue";
import type { QueueRow } from "./queue";
import { RequestSearchForm } from "./request-search-form";
import { RequestsOutputActions, RequestsOutputFeedback } from "./requests-output-actions";
import { StatusBadge } from "./status-badge";

type SearchParams = Promise<{
  page?: string | string[];
  q?: string | string[];
  status?: string | string[];
}>;

const requestStatusSchema = z.enum(REQUEST_STATUSES);

function activeFilter(raw: Readonly<string | string[] | undefined>): RequestStatus | "all" {
  const parsed = Array.isArray(raw)
    ? requestStatusSchema.safeParse(raw.at(0))
    : requestStatusSchema.safeParse(raw);
  return parsed.success ? parsed.data : "all";
}

function detailHref({
  focusCallAgain = false,
  id,
  page,
  search,
  status,
}: Readonly<{
  focusCallAgain?: boolean;
  id: string;
  page: number;
  search: string;
  status: RequestStatus | "all";
}>): string {
  const params = new URLSearchParams();
  if (status !== "all") params.set("status", status);
  if (search) params.set("q", search);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return `/admin/requests/${id}${query ? `?${query}` : ""}${focusCallAgain ? "#set-call-again" : ""}`;
}

// Next-action language per attention bucket. The queue leads with what to
// Work next: unworked rows by age, call-again rows whose time arrived,
// Touched rows that went silent with no call-again day set.
function nextActionHint({
  bucket,
  followUpAt,
  lastActivityAt,
  createdAt,
  now,
}: Readonly<{
  bucket: AttentionBucket;
  followUpAt: string | null;
  lastActivityAt: string | null;
  createdAt: string;
  now: Date;
}>): { text: string; attention: boolean } | null {
  switch (bucket) {
    case "follow_up":
      return followUpAt !== null && followUpAt !== ""
        ? {
            text: `Call again — due ${followUpShortLabel(followUpAt, now)}`,
            attention: true,
          }
        : null;
    case "stale": {
      const since = waitingSince(lastActivityAt ?? createdAt, now);
      return {
        text: `Set a call-again day${since !== null && since !== "" ? ` — silent since ${since}` : ""}`,
        attention: true,
      };
    }
    case "upcoming":
      return followUpAt !== null && followUpAt !== ""
        ? { text: `Call again ${followUpShortLabel(followUpAt, now)}`, attention: false }
        : { text: "Set a call-again day", attention: true };
    case "scheduled":
      return { text: "On the schedule", attention: false };
    case "new":
    case "closed":
      return null;
  }
  return null;
}

interface FilterItem {
  key: RequestStatus | "all";
  label: string;
  count: number;
}

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React props carry framework member types that cannot be made readonly
function FilterChips({
  filters,
  active,
  search,
}: Readonly<{
  filters: FilterItem[];
  active: RequestStatus | "all";
  search: string;
}>) {
  return (
    <nav aria-label="Filter by status" className="portal-filter-tabs">
      <ul>
        {filters.map((item) => {
          const isActive = active === item.key;
          const href = requestsHref({
            search,
            status: item.key,
          });
          return (
            <li key={item.key}>
              <Link
                href={href}
                aria-current={isActive ? "page" : undefined}
                data-filter={item.key}
                className="portal-filter-tab"
              >
                {item.label}
                <span
                  data-filter-count={item.key}
                  data-empty={item.count === 0 ? "true" : undefined}
                >
                  {item.count}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React props carry framework member types that cannot be made readonly
function QueueRowLink({
  request,
  bucket,
  lastActivityAt,
  page,
  search,
  filter,
  now,
}: Readonly<{
  request: QueueRow;
  bucket: AttentionBucket;
  lastActivityAt: string | null;
  page: number;
  search: string;
  filter: RequestStatus | "all";
  now: Date;
}>) {
  const hint = nextActionHint({
    bucket,
    followUpAt: request.follow_up_at,
    lastActivityAt,
    createdAt: request.created_at,
    now,
  });
  const waiting = request.status === "new" ? waitingSince(request.created_at, now) : null;
  const needsCallAgain =
    request.status === "contacted" &&
    (request.follow_up_at === null || request.follow_up_at === "");
  const nextAction =
    hint ??
    (request.status === "new"
      ? { text: "Make first contact", attention: true }
      : request.status === "closed"
        ? { text: "No further action", attention: false }
        : null);
  // The action column is the queue's comparison axis: the next step first,
  // Then its operational reason or timing, then scheduling context. The
  // Status pill and received time stay available in the quiet meta column.
  return (
    <li>
      <Link
        href={detailHref({
          focusCallAgain: needsCallAgain,
          id: request.id,
          page,
          search,
          status: filter,
        })}
        data-testid="request-row"
        className="portal-ledger-row"
      >
        <span className="portal-ledger-person">
          <span data-testid="request-name" data-ui-redact="patient-name">
            {request.name}
          </span>
          <span data-ui-redact="patient-contact">{request.phone}</span>
        </span>
        <span className="portal-ledger-next">
          {nextAction ? (
            <strong
              data-testid="request-next-action"
              data-attention={nextAction.attention ? "true" : undefined}
            >
              {nextAction.text}
            </strong>
          ) : null}
          <span className="portal-ledger-context">
            {waiting !== null && waiting !== "" ? (
              <span data-testid="request-waiting">Waiting since {waiting}</span>
            ) : null}
            <span>
              {LOCATION_LABELS[request.location]} · {TIME_LABELS[request.preferred_time]}
            </span>
          </span>
        </span>
        <span className="portal-ledger-meta">
          <span className="portal-ledger-meta-status">
            <StatusBadge status={request.status} />
            {request.legacy_review_required ? (
              <span data-testid="legacy-review-tag" className="portal-review-tag">
                Needs review
              </span>
            ) : null}
          </span>
          <small>Received {formatReceived(request.created_at)}</small>
        </span>
        <ChevronRight className="portal-ledger-disclosure h-4 w-4" />
      </Link>
    </li>
  );
}

export default async function AdminRequestsPage({
  searchParams,
}: Readonly<{ searchParams: SearchParams }>) {
  await requireRole("staff");
  const params = await searchParams;
  const filter = activeFilter(params.status);
  const page = parsePage(params.page);
  const search = parseRequestSearch(params.q);
  const searchFilter = search ? requestSearchFilter(search) : "";
  const now = new Date();

  const db = serviceClient();

  // Unique per-status counts stay on the requests table so related-row
  // Matches cannot inflate chips or the summary. The open set is small
  // Enough to order by attention in memory.
  const countQueries = REQUEST_STATUSES.map((status) => {
    let countQuery = db
      .from("requests")
      .select("id", { count: "exact", head: true })
      .in("status", [...VIEW_DB_STATUSES[status]]);
    if (searchFilter) countQuery = countQuery.or(searchFilter);
    return countQuery;
  });

  const openStatuses = filter === "all" ? OPEN_STATUSES : filter === "closed" ? [] : [filter];
  const [orderedOpen, ...countResults] = await Promise.all([
    openStatuses.length > 0
      ? fetchAttentiveOpenRows(db, { statuses: openStatuses, searchFilter, now })
      : Promise.resolve([]),
    ...countQueries,
  ]);

  const countError = countResults.find((result) => result.error)?.error;
  if (countError) {
    throw new Error(`Queue read failed: ${countError.code}`);
  }
  const counts = {
    new: countResults[0].count ?? 0,
    contacted: countResults[1].count ?? 0,
    scheduled: countResults[2].count ?? 0,
    closed: countResults[3].count ?? 0,
  } as const satisfies Record<RequestStatus, number>;
  const total = REQUEST_STATUSES.reduce((sum, status) => sum + counts[status], 0);

  // The page window — open slice, closed-tail range, display totals, and the
  // Past-the-end redirect — is pure math, unit-tested in request-window.
  // Unique per-status SQL counts are the only total; there is no second
  // Unfiltered closed probe that can disagree with the chips and rows.
  const pageWindow = requestPageWindow({
    filter,
    page,
    counts,
    openRows: orderedOpen.length,
  });
  if (pageWindow.redirectPage !== null) {
    redirect(requestsHref({ page: pageWindow.redirectPage, search, status: filter }));
  }
  const { filteredTotal, totalPages, firstShown, lastShown } = pageWindow;

  // The page window: open rows first (attention-ordered), then the closed
  // Tail (newest first) fetched from its own offset.
  const openSlice = orderedOpen.slice(pageWindow.openFrom, pageWindow.openTo);
  let closedSlice: QueueRow[] = [];
  if (pageWindow.closedLimit > 0) {
    closedSlice = await fetchClosedRows(db, {
      from: pageWindow.closedFrom,
      limit: pageWindow.closedLimit,
      searchFilter,
    });
  }

  const openBuckets = new Map(openSlice.map((row) => [row.id, row]));
  const requests = [...openSlice, ...closedSlice];

  const filters: { key: RequestStatus | "all"; label: string; count: number }[] = [
    { key: "all", label: "All", count: total },
    ...REQUEST_STATUSES.map((status) => ({
      key: status,
      label: STATUS_LABELS[status],
      count: counts[status],
    })),
  ];

  const content = (
    <section aria-labelledby="requests-heading">
      {/* One-line masthead in the Home grammar: identity, one true
          Sentence, and the page commands. Opening a request is the
          Recurring task, so Print and Export sit in a quiet utility group
          Beside Add instead of competing as page actions. */}
      <header className="portal-queue-masthead">
        <div>
          <h1 id="requests-heading" className="portal-queue-title">
            Appointments
          </h1>
          <p className="portal-queue-lede">
            Every appointment request, ordered by what needs attention first.
          </p>
        </div>
        <div className="portal-queue-masthead-actions print-hide">
          <Link
            href={`${STAFF_REQUEST_SOURCE_PATH}?from=appointments`}
            data-testid="appointments-add-patient-request"
            className="btn btn-outline portal-queue-add min-h-11"
          >
            Add appointment request
          </Link>
          <span className="portal-utility-group">
            <RequestsOutputActions
              exportHref={requestsHref({
                path: "/admin/requests/export",
                search,
                status: filter,
              })}
              filteredTotal={filteredTotal}
              filterLabel={filter === "all" ? "All" : STATUS_LABELS[filter]}
              hasSearch={search !== ""}
              newCount={counts.new}
            />
          </span>
        </div>
      </header>

      <RequestsOutputFeedback />

      <section className="portal-queue-workbench" aria-label="Appointment request queue">
        <RequestSearchForm filter={filter} filteredTotal={filteredTotal} search={search} />

        <FilterChips filters={filters} active={filter} search={search} />

        {requests.length === 0 ? (
          <div className="portal-queue-empty">
            <h2>
              {page > 1
                ? "No requests are available on this page"
                : search
                  ? "No appointment requests match that search"
                  : filter === "all"
                    ? "No appointment requests yet"
                    : `Nothing marked ${STATUS_LABELS[filter].toLowerCase()}`}
            </h2>
            <p>
              {page > 1
                ? "Go back to the previous page to continue reviewing requests."
                : search
                  ? "Try a name, phone number, or email address."
                  : filter === "all"
                    ? "When a patient submits the appointment form on the website, the appointment request appears here instantly and everyone on the notification list gets a notification email."
                    : "Requests reach this view as staff work them from their request page — open one from another view to record what happened."}
            </p>
            {page === 1 && !search && filter === "all" ? (
              <Link
                href={`${STAFF_REQUEST_SOURCE_PATH}?from=appointments`}
                className="portal-inline-link"
              >
                Add an appointment request from a call or visit
              </Link>
            ) : page === 1 && search ? (
              <Link
                href={requestsHref({ page: 1, search: "", status: filter })}
                className="portal-inline-link"
              >
                Clear search
              </Link>
            ) : page === 1 && filter !== "all" ? (
              <Link
                href={requestsHref({ page: 1, search, status: "all" })}
                className="portal-inline-link"
              >
                View all requests
              </Link>
            ) : null}
          </div>
        ) : (
          <ul data-testid="request-list" className="portal-ledger-list">
            {requests.map((request) => {
              const derived = openBuckets.get(request.id);
              return (
                <QueueRowLink
                  key={request.id}
                  request={request}
                  bucket={derived?.bucket ?? "closed"}
                  lastActivityAt={derived?.lastActivityAt ?? null}
                  page={page}
                  search={search}
                  filter={filter}
                  now={now}
                />
              );
            })}
          </ul>
        )}

        {filteredTotal > 0 && (requests.length > 0 || page > 1) ? (
          <div className="portal-queue-pagination">
            {requests.length > 0 ? (
              <p data-testid="request-page-summary">
                Showing {firstShown}–{lastShown} of {filteredTotal}
              </p>
            ) : null}
            {totalPages > 1 ? (
              <nav aria-label="Appointment request pages" className="portal-page-nav">
                {page > 1 ? (
                  <Link
                    href={requestsHref({
                      page: page - 1,
                      search,
                      status: filter,
                    })}
                    rel="prev"
                    className="btn btn-outline"
                  >
                    Previous
                  </Link>
                ) : null}
                <span>Page {page} of {totalPages}</span>
                {requests.length > 0 && page < totalPages ? (
                  <Link
                    href={requestsHref({
                      page: page + 1,
                      search,
                      status: filter,
                    })}
                    rel="next"
                    className="btn btn-outline"
                  >
                    Next
                  </Link>
                ) : null}
              </nav>
            ) : null}
          </div>
        ) : null}
      </section>
    </section>
  );

  return <PortalFeedbackProvider>{content}</PortalFeedbackProvider>;
}
