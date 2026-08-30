// Request page window — which slice of the attention-ordered open set and
// Which window of the closed tail make up one page of the queue, plus the
// Exact "Showing x–y of z" display numbers and the past-the-end redirect
// Target. This is the composition between the queue reads (the requests
// Route's queue.ts) and the attention ordering (queue-attention.ts): pure,
// With no database, React, or clock dependency, so the page server component
// Only fetches and renders and a pagination off-by-one fails a unit test
// Instead of reaching staff.
//
// Display totals come from the exact unique per-status SQL counts. The open
// Slice is taken from the capped in-memory open fetch. Under the cap the two
// Agree. Beyond it the open slice simply runs out and the closed tail is
// Read from its own offset against the unique closed count — the totals stay
// Exact even though the deepest pages thin out (see OPEN_CANDIDATE_LIMIT in
// The route's queue.ts, which would need a database view before that matters).
//
// Closed paging uses counts.closed, not a second unfiltered probe. A search
// That matches one unique closed request must show 1–1 of 1 even when other
// Closed rows exist outside the query.

import type { RequestStatus } from "./contracts";
import { REQUEST_PAGE_SIZE } from "./request-query";

export interface RequestPageWindowInput {
  /** The active status filter; "all" lists every status. */
  filter: RequestStatus | "all";
  /** The requested page, already parsed to a positive integer. */
  page: number;
  /** Exact unique per-status request counts for the active search. */
  counts: Record<RequestStatus, number>;
  /** Unique rows the capped attention-ordered open fetch actually returned. */
  openRows: number;
}

export interface RequestPageWindow {
  /** Exact rows matching filter and search — the "of z" in the summary. */
  filteredTotal: number;
  /** At least 1, so the empty queue still sits on a first page. */
  totalPages: number;
  /** Last page when the requested page is past the end, else null. */
  redirectPage: number | null;
  /** Start index into the attention-ordered open rows. */
  openFrom: number;
  /** Exclusive end index into the open rows; empty when openFrom === openTo. */
  openTo: number;
  /** Offset into the newest-first closed tail. */
  closedFrom: number;
  /** Closed rows to fetch; 0 means the page needs no closed read. */
  closedLimit: number;
  /** First row number in "Showing x–y of z" (0 when nothing matches). */
  firstShown: number;
  /** Last row number in "Showing x–y of z". */
  lastShown: number;
}

/** Whether the filter lists the closed tail beneath the open set. */
function includesClosedTail(filter: RequestStatus | "all"): boolean {
  return filter === "all" || filter === "closed";
}

export function requestPageWindow({
  filter,
  page,
  counts,
  openRows,
}: Readonly<RequestPageWindowInput>): RequestPageWindow {
  // Unique request counts from the requests table are the only total. A
  // Related-table fan-out never belongs here; neither does an unfiltered
  // Closed probe that can disagree with the chips.
  const filteredTotal =
    filter === "all"
      ? counts.new + counts.contacted + counts.scheduled + counts.closed
      : counts[filter];
  const closedTotal = includesClosedTail(filter) ? counts.closed : 0;
  const totalPages = Math.max(1, Math.ceil(filteredTotal / REQUEST_PAGE_SIZE));
  const redirectPage = page > totalPages ? totalPages : null;

  // Open rows first (attention-ordered), then the closed tail fetched from
  // Its own offset once the open set runs out.
  const from = (page - 1) * REQUEST_PAGE_SIZE;
  const openFrom = Math.min(from, openRows);
  const openTo = Math.min(from + REQUEST_PAGE_SIZE, openRows);
  const closedFrom = Math.max(0, from - openRows);
  const closedCapacity = REQUEST_PAGE_SIZE - (openTo - openFrom);
  const readsClosed = closedCapacity > 0 && closedFrom < closedTotal;
  const closedLimit = readsClosed ? closedCapacity : 0;
  const closedShown = readsClosed ? Math.min(closedCapacity, closedTotal - closedFrom) : 0;

  return {
    filteredTotal,
    totalPages,
    redirectPage,
    openFrom,
    openTo,
    closedFrom,
    closedLimit,
    firstShown: filteredTotal === 0 ? 0 : from + 1,
    lastShown: from + (openTo - openFrom) + closedShown,
  };
}
