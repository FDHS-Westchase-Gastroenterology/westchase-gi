import { z } from "zod";

// ponytail: offset pagination is bounded to 500,000 rows; use cursor
// Pagination only if request volume approaches that ceiling.
const MAX_PAGE = 10_000;

type SearchParam = string | string[] | undefined;

function firstSearchParam(value: Readonly<SearchParam>): string {
  const parsed = z.union([z.string(), z.array(z.string())]).safeParse(value);
  if (!parsed.success) return "";
  if (Array.isArray(parsed.data)) return parsed.data[0] ?? "";
  return parsed.data;
}

export function parsePage(value: Readonly<SearchParam>): number {
  const parsed = Number(firstSearchParam(value));
  return Number.isSafeInteger(parsed) && parsed > 0 ? Math.min(parsed, MAX_PAGE) : 1;
}

export function availableQueueCount(count: number | null, failed: boolean): number | null {
  return failed ? null : (count ?? 0);
}
