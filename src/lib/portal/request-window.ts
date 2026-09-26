import { REQUEST_PAGE_SIZE } from "./request-query";

export interface RequestPageWindow {
  /** Exact matching total from the worklist read, including the active filters. */
  filteredTotal: number;
  /** At least one page, even for an empty queue. */
  totalPages: number;
  /** Redirect before rendering a range when the requested page is past the end. */
  redirectPage: number | null;
  firstShown: number;
  lastShown: number;
}

/** Display arithmetic only: the worklist RPC owns filtering, ordering and paging. */
export function requestPageWindow(page: number, filteredTotal: number): RequestPageWindow {
  const totalPages = Math.max(1, Math.ceil(filteredTotal / REQUEST_PAGE_SIZE));
  const from = (page - 1) * REQUEST_PAGE_SIZE;
  return {
    filteredTotal,
    totalPages,
    redirectPage: page > totalPages ? totalPages : null,
    firstShown: filteredTotal === 0 ? 0 : from + 1,
    lastShown: Math.min(from + REQUEST_PAGE_SIZE, filteredTotal),
  };
}
