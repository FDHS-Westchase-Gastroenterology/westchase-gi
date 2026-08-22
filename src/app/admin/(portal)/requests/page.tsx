import Link from "next/link";
import { redirect } from "next/navigation";
import { z } from "zod";

import { PortalPageHeader } from "@/app/admin/(portal)/portal-page-header";
import { ChevronRight, Printer } from "@/components/icons";
import { requireRole } from "@/lib/portal/auth";
import { waitingSince } from "@/lib/portal/business-time";
import { REQUEST_STATUSES, STAFF_REQUEST_SOURCE_PATH } from "@/lib/portal/contracts";
import type { RequestStatus } from "@/lib/portal/contracts";
import type { AttentionBucket } from "@/lib/portal/queue-attention";
import {
  parsePage,
  parseRequestSearch,
  requestSearchFilter,
  REQUEST_SEARCH_MAX_LENGTH,
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

function requestsHref({
  page = 1,
  path = "/admin/requests",
  search,
  status,
}: Readonly<{
  page?: number;
  path?: string;
  search: string;
  status: RequestStatus | "all";
}>): string {
  const params = new URLSearchParams();
  if (status !== "all") params.set("status", status);
  if (search) params.set("q", search);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return `${path}${query ? `?${query}` : ""}`;
}

function detailHref({
  id,
  page,
  search,
  status,
}: Readonly<{
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
  return `/admin/requests/${id}${query ? `?${query}` : ""}`;
}

// Next-action language per attention bucket. The queue leads with what to
// Work next: unworked rows by age, call-again rows whose time arrived,
// Touched rows that went silent with no callback date set.
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
        text: `Silent${since !== null && since !== "" ? ` since ${since}` : " since before today"} — set a call-again day`,
        attention: true,
      };
    }
    case "upcoming":
      return followUpAt !== null && followUpAt !== ""
        ? { text: `Call again ${followUpShortLabel(followUpAt, now)}`, attention: false }
        : null;
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
  const nextAction =
    hint ??
    (request.status === "new"
      ? { text: "Make first contact", attention: true }
      : request.status === "closed"
        ? { text: "No further action", attention: false }
        : null);
  return (
    <li>
      <Link
        href={detailHref({
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
          <small>Next step</small>
          {nextAction ? (
            <strong
              data-testid="request-next-action"
              data-attention={nextAction.attention ? "true" : undefined}
            >
              {nextAction.text}
            </strong>
          ) : null}
          <span>
            {LOCATION_LABELS[request.location]} · {TIME_LABELS[request.preferred_time]}
          </span>
          {waiting !== null && waiting !== "" ? (
            <span data-testid="request-waiting">Waiting since {waiting}</span>
          ) : null}
        </span>
        <span className="portal-ledger-meta">
          <span>
            <StatusBadge status={request.status} />
            {request.legacy_review_required ? (
              <span data-testid="legacy-review-tag" className="portal-review-tag">
                Needs review
              </span>
            ) : null}
          </span>
          <small>Received {formatReceived(request.created_at)}</small>
          <ChevronRight className="h-4 w-4" />
        </span>
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

  // Chip counts and the closed tail stay database-paged exactly as before;
  // The open set is small enough to order by attention in memory.
  const countQueries = REQUEST_STATUSES.map((status) => {
    let countQuery = db
      .from("requests")
      .select("id", { count: "exact", head: true })
      .in("status", [...VIEW_DB_STATUSES[status]]);
    if (searchFilter) countQuery = countQuery.or(searchFilter);
    return countQuery;
  });

  const wantsClosed = filter === "all" || filter === "closed";
  const openStatuses = filter === "all" ? OPEN_STATUSES : filter === "closed" ? [] : [filter];
  const [orderedOpen, closedCountProbe, ...countResults] = await Promise.all([
    openStatuses.length > 0
      ? fetchAttentiveOpenRows(db, { statuses: openStatuses, searchFilter, now })
      : Promise.resolve([]),
    // Closed rows join the default view after the open set; their own window
    // Is computed once the open size is known.
    wantsClosed
      ? db.from("requests").select("id", { count: "exact", head: true }).eq("status", "closed")
      : Promise.resolve({ count: 0, error: null }),
    ...countQueries,
  ]);

  const countError = countResults.find((result) => result.error)?.error ?? closedCountProbe.error;
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
  const pageWindow = requestPageWindow({
    filter,
    page,
    counts,
    openRows: orderedOpen.length,
    closedCount: closedCountProbe.count ?? 0,
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

  return (
    <section aria-labelledby="requests-heading">
      <PortalPageHeader
        title={<span id="requests-heading">Appointments</span>}
        description="Every appointment request, ordered by what needs attention first. Open one to call, document the outcome, and continue without losing your place."
        actions={
          <>
            <Link
              href={`${STAFF_REQUEST_SOURCE_PATH}?from=appointments`}
              data-testid="appointments-add-patient-request"
              className="btn btn-outline min-h-11"
            >
              Add appointment request
            </Link>
            {counts.new > 0 ? (
              <Link
                href="/admin/requests/print?auto=1"
                target="_blank"
                rel="noopener"
                prefetch={false}
                aria-label={`Print ${counts.new} new appointment ${
                  counts.new === 1 ? "request" : "requests"
                }; opens in a new tab`}
                className="btn btn-navy min-h-11"
              >
                <Printer className="h-4 w-4" />
                Print new ({counts.new})
              </Link>
            ) : null}
            <a
              href={requestsHref({
                path: "/admin/requests/export",
                search,
                status: filter,
              })}
              data-testid="export-csv"
              className="btn btn-outline min-h-11"
            >
              Export CSV
            </a>
          </>
        }
      />

      <section className="portal-queue-workbench" aria-label="Appointment request queue">
        <form action="/admin/requests" method="get" role="search" className="portal-queue-search">
          {filter !== "all" ? <input type="hidden" name="status" value={filter} /> : null}
          <label htmlFor="request-search">
            Search requests
            <input
              id="request-search"
              name="q"
              type="search"
              defaultValue={search}
              maxLength={REQUEST_SEARCH_MAX_LENGTH}
              placeholder="Name, phone, or email"
            />
          </label>
          <button type="submit" className="btn btn-navy min-h-11">
            Search
          </button>
          {search ? (
            <Link
              href={requestsHref({ search: "", status: filter })}
              className="btn btn-outline min-h-11"
            >
              Clear
            </Link>
          ) : null}
        </form>

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
                <span className="text-[0.9rem] font-bold text-[var(--color-body)]">
                  Page {page} of {totalPages}
                </span>
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
}
