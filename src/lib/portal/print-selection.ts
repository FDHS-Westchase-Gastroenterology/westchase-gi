import { parseRequestStatus } from "./workflow/contracts";
import type { RequestStatus, StatusCounts } from "./workflow/contracts";

export const NEW_PRINT_PACKET_HREF = "/admin/requests/print";

export type PrintStatusSelection = readonly RequestStatus[] | "default" | "invalid";

function isStatusTokenList(raw: string | readonly string[]): raw is readonly string[] {
  return Array.isArray(raw);
}

function statusTokens(raw: string | readonly string[]): string[] {
  const values = isStatusTokenList(raw) ? [...raw] : [raw];
  return values.flatMap((value) => value.split(",").map((part) => part.trim()));
}

export function parsePrintStatusSelection(
  raw: string | readonly string[] | undefined,
): PrintStatusSelection {
  if (raw === undefined) return "default";
  const tokens = statusTokens(raw);
  const unique: RequestStatus[] = [];
  const seen = new Set<RequestStatus>();
  for (const token of tokens) {
    if (token === "") continue;
    const status = parseRequestStatus(token);
    if (status === null) return "invalid";
    if (seen.has(status)) continue;
    seen.add(status);
    unique.push(status);
  }
  return unique.length === 0 ? "invalid" : unique;
}

export function isNewOnlyPrintSelection(selection: PrintStatusSelection): boolean {
  return (
    selection === "default" ||
    (Array.isArray(selection) && selection.length === 1 && selection[0] === "new")
  );
}

export function printPacketHref(statuses: readonly RequestStatus[], auto = true): string {
  const params = new URLSearchParams();
  if (!(statuses.length === 1 && statuses[0] === "new")) {
    params.set("status", statuses.join(","));
  }
  if (auto) params.set("auto", "1");
  const query = params.toString();
  return query === "" ? NEW_PRINT_PACKET_HREF : `${NEW_PRINT_PACKET_HREF}?${query}`;
}

export function formatStatusList(
  statuses: readonly RequestStatus[],
  labels: Readonly<Record<RequestStatus, string>>,
): string {
  const names = statuses.map((status) => labels[status]);
  if (names.length === 1) return names[0] ?? "";
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")}, and ${names.at(-1)}`;
}

export function knownSelectionCount(
  statuses: readonly RequestStatus[],
  counts: StatusCounts,
): number | null {
  let total = 0;
  for (const status of statuses) {
    const count = counts[status];
    if (count === undefined || count === null) return null;
    total += count;
  }
  return total;
}

export function printSelectionIsAvailable(
  statuses: readonly RequestStatus[],
  counts: StatusCounts,
): boolean {
  if (statuses.length === 0) return false;
  if (statuses.length === 1 && counts[statuses[0]] === null) return false;
  return knownSelectionCount(statuses, counts) !== 0;
}
