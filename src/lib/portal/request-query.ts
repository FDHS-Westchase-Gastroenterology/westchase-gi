export const REQUEST_PAGE_SIZE = 50;
export const REQUEST_SEARCH_MAX_LENGTH = 100;
const MAX_PAGE = 10_000;

type SearchParam = string | string[] | undefined;

function first(value: SearchParam): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

export function parsePage(value: SearchParam): number {
  const parsed = Number(first(value));
  return Number.isSafeInteger(parsed) && parsed > 0
    ? Math.min(parsed, MAX_PAGE)
    : 1;
}

export function parseRequestSearch(value: SearchParam): string {
  return first(value)
    .replace(/\p{Cc}+/gu, " ")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, REQUEST_SEARCH_MAX_LENGTH);
}

export function requestSearchFilter(search: string): string {
  const literalRegex = search.replace(/[\\^$.*+?()[\]{}|]/g, "\\$&");
  const quoted = `".*${literalRegex
    .replaceAll("\\", "\\\\")
    .replaceAll('"', '\\"')}.*"`;
  return `name.imatch.${quoted},phone.imatch.${quoted},email.imatch.${quoted}`;
}
