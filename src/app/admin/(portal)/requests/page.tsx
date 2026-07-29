import Link from "next/link";
import { redirect } from "next/navigation";
import {
  REQUEST_STATUSES,
  type RequestStatus,
} from "@/lib/portal/contracts";
import { requireRole } from "@/lib/portal/auth";
import { waitingSince } from "@/lib/portal/business-time";
import type { AttentionBucket } from "@/lib/portal/queue-attention";
import {
  parsePage,
  parseRequestSearch,
  requestSearchFilter,
  REQUEST_PAGE_SIZE,
  REQUEST_SEARCH_MAX_LENGTH,
} from "@/lib/portal/request-query";
import { serviceClient } from "@/lib/portal/server";
import {
  fetchAttentiveOpenRows,
  fetchClosedRows,
  OPEN_STATUSES,
  type QueueRow,
} from "./queue";
import { StatusBadge } from "./status-badge";
import {
  followUpShortLabel,
  formatReceived,
  LOCATION_LABELS,
  STATUS_LABELS,
  TIME_LABELS,
} from "./format";

type SearchParams = Promise<{
  page?: string | string[];
  q?: string | string[];
  status?: string | string[];
}>;

function activeFilter(raw: string | string[] | undefined): RequestStatus | "all" {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value && (REQUEST_STATUSES as readonly string[]).includes(value)
    ? (value as RequestStatus)
    : "all";
}

function requestsHref({
  page = 1,
  path = "/admin/requests",
  search,
  status,
}: {
  page?: number;
  path?: string;
  search: string;
  status: RequestStatus | "all";
}): string {
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
}: {
  id: string;
  page: number;
  search: string;
  status: RequestStatus | "all";
}): string {
  const params = new URLSearchParams();
  if (status !== "all") params.set("status", status);
  if (search) params.set("q", search);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return `/admin/requests/${id}${query ? `?${query}` : ""}`;
}

// Next-action language per attention bucket. The queue leads with what to
// work next: unworked rows by age, call-again rows whose time arrived,
// touched rows that went silent with no follow-up set.
function nextActionHint({
  bucket,
  followUpAt,
  lastActivityAt,
  createdAt,
  now,
}: {
  bucket: AttentionBucket;
  followUpAt: string | null;
  lastActivityAt: string | null;
  createdAt: string;
  now: Date;
}): { text: string; attention: boolean } | null {
  switch (bucket) {
    case "follow_up":
      return followUpAt
        ? {
            text: `Call again — due ${followUpShortLabel(followUpAt, now)}`,
            attention: true,
          }
        : null;
    case "stale": {
      const since = waitingSince(lastActivityAt ?? createdAt, now);
      return {
        text: `Silent${since ? ` since ${since}` : " since before today"} — set a call-again day`,
        attention: true,
      };
    }
    case "upcoming":
      return followUpAt
        ? { text: `Call again ${followUpShortLabel(followUpAt, now)}`, attention: false }
        : null;
    case "scheduled":
      return { text: "On the schedule", attention: false };
    default:
      return null;
  }
}

type FilterItem = { key: RequestStatus | "all"; label: string; count: number };

function FilterChips({
  filters,
  active,
  search,
}: {
  filters: FilterItem[];
  active: RequestStatus | "all";
  search: string;
}) {
  return (
    <nav aria-label="Filter by status" className="mt-6 overflow-x-auto">
      <ul className="flex min-w-max gap-2">
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
                className={`flex min-h-10 items-center gap-x-2 rounded-full border px-3.5 text-[0.9rem] font-bold transition-colors ${
                  isActive
                    ? "border-[var(--color-navy)] bg-[var(--color-navy)] text-[var(--color-on-dark)]"
                    : "border-[var(--color-line-2)] bg-white text-[var(--color-body)] hover:border-[var(--color-navy)]"
                }`}
              >
                {item.label}
                <span
                  data-filter-count={item.key}
                  className={`rounded-full px-1.5 text-[0.75rem] tabular-nums ${
                    isActive
                      ? "bg-white/15"
                      : "bg-[var(--color-mint)] text-[var(--color-teal-ink)]"
                  }`}
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

function QueueRowLink({
  request,
  bucket,
  lastActivityAt,
  page,
  search,
  filter,
  now,
}: {
  request: QueueRow;
  bucket: AttentionBucket;
  lastActivityAt: string | null;
  page: number;
  search: string;
  filter: RequestStatus | "all";
  now: Date;
}) {
  const hint = nextActionHint({
    bucket,
    followUpAt: request.follow_up_at,
    lastActivityAt,
    createdAt: request.created_at,
    now,
  });
  const waiting =
    request.status === "new" ? waitingSince(request.created_at, now) : null;
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
        className="grid gap-x-6 gap-y-2 rounded-[var(--radius)] border border-[var(--color-line)] bg-white px-5 py-4 transition-colors hover:border-[var(--color-teal)] sm:grid-cols-[1.4fr_1fr_auto] sm:items-center"
      >
        <span className="min-w-0">
          <span
            data-testid="request-name"
            className="block truncate font-bold text-[var(--color-ink)]"
          >
            {request.name}
          </span>
          <span className="mt-0.5 block text-[0.9rem] text-[var(--color-muted)]">
            {request.phone}
          </span>
        </span>
        <span className="text-[0.9rem] text-[var(--color-body)]">
          <span className="block">
            {LOCATION_LABELS[request.location]} ·{" "}
            {TIME_LABELS[request.preferred_time]}
          </span>
          <span className="mt-0.5 block text-[var(--color-muted)]">
            Received {formatReceived(request.created_at)}
          </span>
          {waiting ? (
            <span
              data-testid="request-waiting"
              className="mt-0.5 block text-[0.85rem] font-bold text-[var(--color-amber-deep)]"
            >
              Waiting since {waiting}
            </span>
          ) : null}
          {hint ? (
            <span
              data-testid="request-next-action"
              className={`mt-0.5 block text-[0.85rem] ${
                hint.attention
                  ? "font-bold text-[var(--color-amber-deep)]"
                  : "text-[var(--color-muted)]"
              }`}
            >
              {hint.text}
            </span>
          ) : null}
        </span>
        <span className="justify-self-start sm:justify-self-end">
          <StatusBadge status={request.status} />
        </span>
      </Link>
    </li>
  );
}

export default async function AdminRequestsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireRole("staff");
  const params = await searchParams;
  const filter = activeFilter(params.status);
  const page = parsePage(params.page);
  const search = parseRequestSearch(params.q);
  const searchFilter = search ? requestSearchFilter(search) : "";
  const from = (page - 1) * REQUEST_PAGE_SIZE;
  const now = new Date();

  const db = serviceClient();

  // Chip counts and the closed tail stay database-paged exactly as before;
  // the open set is small enough to order by attention in memory.
  const countQueries = REQUEST_STATUSES.map((status) => {
    let countQuery = db
      .from("requests")
      .select("id", { count: "exact", head: true })
      .eq("status", status);
    if (searchFilter) countQuery = countQuery.or(searchFilter);
    return countQuery;
  });

  const wantsClosed = filter === "all" || filter === "closed";
  const openStatuses =
    filter === "all" ? OPEN_STATUSES : filter === "closed" ? [] : [filter];
  const [orderedOpen, closedCountProbe, ...countResults] = await Promise.all([
    openStatuses.length > 0
      ? fetchAttentiveOpenRows(db, { statuses: openStatuses, searchFilter, now })
      : Promise.resolve([]),
    // Closed rows join the default view after the open set; their own window
    // is computed once the open size is known.
    wantsClosed
      ? db.from("requests").select("id", { count: "exact", head: true }).eq("status", "closed")
      : Promise.resolve({ count: 0, error: null }),
    ...countQueries,
  ]);

  const countError =
    countResults.find((result) => result.error)?.error ?? closedCountProbe.error;
  if (countError) {
    throw new Error(`Queue read failed: ${countError.code}`);
  }
  const counts = Object.fromEntries(
    REQUEST_STATUSES.map((status, index) => [
      status,
      countResults[index].count ?? 0,
    ]),
  ) as Record<RequestStatus, number>;
  const total = REQUEST_STATUSES.reduce(
    (sum, status) => sum + counts[status],
    0,
  );

  const openTotal = orderedOpen.length;
  const closedTotal = wantsClosed ? (closedCountProbe.count ?? 0) : 0;
  // Display totals come from the SQL counts (the open fetch is capped);
  // under the cap they are identical, and the window math uses the same
  // numbers, so "Showing x–y of z" stays exact.
  const openSqlTotal =
    filter === "all"
      ? counts.new + counts.contacted + counts.scheduled
      : filter === "closed"
        ? 0
        : counts[filter];
  const filteredTotal = openSqlTotal + closedTotal;
  const totalPages = Math.max(1, Math.ceil(filteredTotal / REQUEST_PAGE_SIZE));
  if (page > totalPages) {
    redirect(requestsHref({ page: totalPages, search, status: filter }));
  }

  // The page window: open rows first (attention-ordered), then the closed
  // tail (newest first) fetched from its own offset.
  const openSlice = orderedOpen.slice(from, from + REQUEST_PAGE_SIZE);
  const closedFrom = Math.max(0, from - openTotal);
  const closedLimit = REQUEST_PAGE_SIZE - openSlice.length;
  let closedSlice: QueueRow[] = [];
  if (wantsClosed && closedLimit > 0 && closedFrom < closedTotal) {
    closedSlice = await fetchClosedRows(db, {
      from: closedFrom,
      limit: closedLimit,
      searchFilter,
    });
  }

  const openBuckets = new Map(openSlice.map((row) => [row.id, row]));
  const requests = [...openSlice, ...closedSlice];
  const firstShown = filteredTotal === 0 ? 0 : from + 1;
  const lastShown = from + requests.length;

  const filters: Array<{ key: RequestStatus | "all"; label: string; count: number }> = [
    { key: "all", label: "All", count: total },
    ...REQUEST_STATUSES.map((status) => ({
      key: status,
      label: STATUS_LABELS[status],
      count: counts[status],
    })),
  ];

  return (
    <section aria-labelledby="requests-heading">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1
            id="requests-heading"
            className="portal-title"
          >
            Appointment requests
          </h1>
          <p className="mt-1.5 max-w-[60ch] text-[0.95rem] text-[var(--color-muted)]">
            What needs attention first, then the rest.
          </p>
        </div>
        <a
          href={requestsHref({
            path: "/admin/requests/export",
            search,
            status: filter,
          })}
          data-testid="export-csv"
          className="btn btn-outline"
        >
          Export CSV
        </a>
      </div>

      <form
        action="/admin/requests"
        method="get"
        role="search"
        className="mt-6 flex max-w-2xl flex-wrap items-end gap-3"
      >
        {filter !== "all" ? (
          <input type="hidden" name="status" value={filter} />
        ) : null}
        <label
          htmlFor="request-search"
          className="min-w-64 flex-1 text-sm font-bold text-[var(--color-ink)]"
        >
          Search requests
          <input
            id="request-search"
            name="q"
            type="search"
            defaultValue={search}
            maxLength={REQUEST_SEARCH_MAX_LENGTH}
            placeholder="Name, phone, or email"
            className="mt-2 min-h-11 w-full rounded-[var(--radius)] border border-[var(--color-line-2)] bg-white px-3.5 text-[0.95rem] font-normal outline-none transition-colors focus:border-[var(--color-teal-ink)]"
          />
        </label>
        <button type="submit" className="btn btn-navy">
          Search
        </button>
        {search ? (
          <Link
            href={requestsHref({ search: "", status: filter })}
            className="btn btn-outline"
          >
            Clear
          </Link>
        ) : null}
      </form>

      <FilterChips filters={filters} active={filter} search={search} />

      {requests.length === 0 ? (
        <div className="mt-8 rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-white p-8 text-center sm:p-12">
          <h2 className="text-[1.1rem] font-black text-[var(--color-ink)]">
            {search
              ? "No appointment requests match that search"
              : filter === "all"
                ? "No appointment requests yet"
                : `Nothing marked ${STATUS_LABELS[filter as RequestStatus].toLowerCase()}`}
          </h2>
          <p className="mx-auto mt-2 max-w-[52ch] text-[0.95rem] leading-relaxed text-[var(--color-body)]">
            {search
              ? "Try a name, phone number, or email address."
              : filter === "all"
                ? "When a patient submits the appointment form on the website, the appointment request appears here instantly and the notification list gets an email ping."
                : "Appointment requests move between statuses from their detail page — open one from another filter to triage it."}
          </p>
        </div>
      ) : (
        <ul data-testid="request-list" className="mt-8 space-y-3">
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

      {filteredTotal > 0 ? (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <p
            data-testid="request-page-summary"
            className="text-[0.9rem] text-[var(--color-muted)]"
          >
            Showing {firstShown}–{lastShown} of {filteredTotal}
          </p>
          {totalPages > 1 ? (
            <nav
              aria-label="Appointment request pages"
              className="flex items-center gap-3"
            >
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
              {page < totalPages ? (
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
  );
}
