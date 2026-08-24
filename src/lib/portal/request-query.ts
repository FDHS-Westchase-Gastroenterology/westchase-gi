import { z } from "zod";

import type { RequestStatus } from "./contracts";

export const REQUEST_PAGE_SIZE = 50;
export const REQUEST_SEARCH_MAX_LENGTH = 100;
export const REQUEST_SEARCH_INPUT_ID = "request-search";
export const REQUEST_SEARCH_SUBMIT_ID = "request-search-submit";
export const REQUEST_SEARCH_STATUS_ID = "request-search-status";
// ponytail: offset pagination is bounded to 500,000 rows; use cursor
// Pagination only if request volume approaches that ceiling.
const MAX_PAGE = 10_000;

type SearchParam = string | string[] | undefined;

function first(value: Readonly<SearchParam>): string {
  const parsed = z.union([z.string(), z.array(z.string())]).safeParse(value);
  if (!parsed.success) return "";
  if (Array.isArray(parsed.data)) return parsed.data[0] ?? "";
  return parsed.data;
}

export function parsePage(value: Readonly<SearchParam>): number {
  const parsed = Number(first(value));
  return Number.isSafeInteger(parsed) && parsed > 0 ? Math.min(parsed, MAX_PAGE) : 1;
}

export function parseRequestSearch(value: Readonly<SearchParam>): string {
  return first(value)
    .replace(/\p{Cc}+/gu, " ")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, REQUEST_SEARCH_MAX_LENGTH);
}

export function requestSearchFilter(search: string): string {
  const literalRegex = search.replace(/[\\^$.*+?()[\]{}|]/g, "\\$&");
  const quoted = `".*${literalRegex.replaceAll("\\", "\\\\").replaceAll('"', '\\"')}.*"`;
  return `name.imatch.${quoted},phone.imatch.${quoted},email.imatch.${quoted}`;
}

/**
 * One appointment request counts once. Related-table rows such as notes,
 * Events, or audit entries can fan out to several matches for the same id;
 * The queue, chips, range, and total all consume this unique set.
 */
export function uniqueByRequestId<Row extends { readonly id: string }>(
  rows: readonly Row[],
): Row[] {
  const seen = new Set<string>();
  const unique: Row[] = [];
  for (const row of rows) {
    if (seen.has(row.id)) continue;
    seen.add(row.id);
    unique.push(row);
  }
  return unique;
}

export function requestsHref({
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

export function requestSearchStatus({
  filteredTotal,
  search,
}: Readonly<{
  filteredTotal: number;
  search: string;
}>): string {
  if (search !== "") {
    if (filteredTotal === 0) return "No appointment requests match that search.";
    if (filteredTotal === 1) return "1 matching appointment request.";
    return `${filteredTotal} matching appointment requests.`;
  }
  if (filteredTotal === 0) return "No appointment requests.";
  if (filteredTotal === 1) return "1 appointment request.";
  return `${filteredTotal} appointment requests.`;
}

export function availableQueueCount(count: number | null, failed: boolean): number | null {
  return failed ? null : (count ?? 0);
}
