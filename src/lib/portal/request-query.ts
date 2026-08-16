import { z } from "zod";

export const REQUEST_PAGE_SIZE = 50;
export const REQUEST_SEARCH_MAX_LENGTH = 100;
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

export function availableQueueCount(count: number | null, failed: boolean): number | null {
  return failed ? null : (count ?? 0);
}
