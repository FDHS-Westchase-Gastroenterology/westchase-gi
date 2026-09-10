import type { RequestLocation } from "@/lib/portal/contracts";
import { datePresets, filterByKey, filterValueLabel } from "@/lib/portal/filters";
import type { ActiveFilter, FilterKey, FollowUpValue } from "@/lib/portal/filters";
import { receivedFilter } from "@/lib/portal/filters/received";
import { statusFilter } from "@/lib/portal/filters/status";
/* Type-only import: erased at compile time, so the server-only module never
   enters the client graph. */
import type { AttentionBucket } from "@/lib/portal/queue-attention";
import type { RequestStatus } from "@/lib/portal/workflow/contracts";

/* One line of the flat list. Every display string is precomputed on the
   server against one `now`, so SSR and hydration read the same text; the raw
   fields beside them are what the client-side filter predicates chew on. */
export interface HomeLine {
  readonly id: string;
  /** Optimistic-concurrency token, so the outcome can be recorded on the line. */
  readonly version: number;
  readonly name: string;
  readonly phoneDisplay: string;
  readonly phoneDigits: string;
  readonly tel: string;
  readonly status: RequestStatus;
  readonly bucket: AttentionBucket;
  readonly location: RequestLocation;
  readonly createdAtMs: number;
  /** "Tampa · Morning" */
  readonly pref: string;
  /** "waiting 3h" / "due today" / "back Sep 4" / "quiet 5d" / "handed off" / "closed" */
  readonly timing: string;
  /** The only amber on a line, and it always carries a word. */
  readonly stamp: "Overdue" | null;
  /** Where a Call again row stands against its call-again date; null on every other status. */
  readonly followUp: FollowUpValue | null;
  readonly receivedRel: string;
  readonly receivedFull: string;
  readonly actorName: string | null;
  readonly actorInitials: string | null;
  readonly lastActivityRel: string | null;
  readonly followUpSet: boolean;
  readonly detailHref: string;
}

/* ---- Predicates: one per filter, decoded through the definitions ---- */

function passes(line: Readonly<HomeLine>, key: FilterKey, raw: string): boolean {
  const def = filterByKey(key);
  if (def.type === "multi-select") {
    const values = def.decode(raw);
    if (values === null) return true;
    if (key === "location") return values.includes(line.location);
    if (key === "followup") return line.followUp !== null && values.includes(line.followUp);
    return values.includes(line.status);
  }
  if (def.type === "date") {
    const range = def.decode(raw);
    if (range === null) return true;
    return line.createdAtMs >= range.from && line.createdAtMs <= range.to;
  }
  const query = def.decode(raw);
  if (query === null) return true;
  const q = query.toLowerCase();
  const qDigits = q.replaceAll(/\D/gu, "");
  if (line.name.toLowerCase().includes(q)) return true;
  return qDigits.length > 0 && line.phoneDigits.includes(qDigits);
}

export function applyFilters(
  lines: readonly Readonly<HomeLine>[],
  active: readonly Readonly<ActiveFilter>[],
): readonly Readonly<HomeLine>[] {
  if (active.length === 0) return lines;
  return lines.filter((line) => active.every(({ key, raw }) => passes(line, key, raw)));
}

/* The zero-result sentence names the responsible filter: the first active
   filter whose removal would surface rows again. */
export function emptyStateMessage(
  lines: readonly Readonly<HomeLine>[],
  active: readonly Readonly<ActiveFilter>[],
  nowMs: number,
): string {
  for (const { key, raw } of active) {
    const without = applyFilters(
      lines,
      active.filter((entry) => entry.key !== key),
    );
    if (without.length > 0) {
      const def = filterByKey(key);
      return `No requests match while ${def.label.toLowerCase()} is ${filterValueLabel(def, raw, nowMs)}. Removing it would show ${requestCount(without.length)}.`;
    }
  }
  return "No requests match the current filters.";
}

export function requestCount(count: number): string {
  return `${count} ${count === 1 ? "request" : "requests"}`;
}

/* ---- Suggestions: complete, pre-filled filters one click from active ---- */

export interface FilterSuggestion {
  readonly key: FilterKey;
  readonly raw: string;
  /** Omitted until request data has loaded. */
  readonly count?: number;
}

export const PLACEHOLDER_SUGGESTIONS: readonly FilterSuggestion[] = [
  { key: "status", raw: "new" },
  { key: "status", raw: "contacted" },
];

export const SUGGESTION_LIMIT = 4;

/** One ghost's identity: the dimension *and* the value, since two ghosts may share a dimension. */
export function suggestionId(suggestion: Readonly<Pick<FilterSuggestion, "key" | "raw">>): string {
  return `${suggestion.key}:${suggestion.raw}`;
}

export function suggestionLabel(suggestion: Readonly<FilterSuggestion>, nowMs: number): string {
  const def = filterByKey(suggestion.key);
  const head = `${def.label} ${filterValueLabel(def, suggestion.raw, nowMs)}`;
  return suggestion.count === undefined ? head : `${head}, ${requestCount(suggestion.count)}`;
}

// Relative date ranges can differ in milliseconds but render the same pill.
function sameFilter(a: Readonly<ActiveFilter>, b: Readonly<ActiveFilter>, nowMs: number): boolean {
  if (a.key !== b.key) return false;
  if (a.raw === b.raw) return true;
  const def = filterByKey(a.key);
  return filterValueLabel(def, a.raw, nowMs) === filterValueLabel(def, b.raw, nowMs);
}

function isSuggestionActive(
  suggestion: Readonly<Pick<FilterSuggestion, "key" | "raw">>,
  active: readonly Readonly<ActiveFilter>[],
  nowMs: number,
): boolean {
  return active.some((entry) => sameFilter(entry, suggestion, nowMs));
}

// Filtering preserves row identity and order; equal counts alone do not.
function sameRows(a: readonly Readonly<HomeLine>[], b: readonly Readonly<HomeLine>[]): boolean {
  return a.length === b.length && a.every((line, index) => line === b[index]);
}

/** Replaces any active filter on the same dimension. */
export function withSuggestion(
  active: readonly Readonly<ActiveFilter>[],
  suggestion: Readonly<Pick<FilterSuggestion, "key" | "raw">>,
): ActiveFilter[] {
  const others = active.filter((entry) => entry.key !== suggestion.key);
  return [...others, { key: suggestion.key, raw: suggestion.raw }];
}

// Ranked suggestions must narrow the visible set, not replace it.
function narrows(
  shown: readonly Readonly<HomeLine>[],
  filtered: readonly Readonly<HomeLine>[],
): boolean {
  if (shown.length === 0 || shown.length >= filtered.length) return false;
  const visible = new Set(filtered);
  return shown.every((line) => visible.has(line));
}

// "Either office" is not a place to narrow to.
function leadingLocation(filtered: readonly Readonly<HomeLine>[]): string | null {
  const counts = new Map<string, number>();
  for (const line of filtered) {
    if (line.location === "any") continue;
    counts.set(line.location, (counts.get(line.location) ?? 0) + 1);
  }
  let top: string | null = null;
  let bestCount = 0;
  let tied = false;
  for (const [location, count] of counts) {
    if (count > bestCount) {
      top = location;
      bestCount = count;
      tied = false;
    } else if (count === bestCount) {
      tied = true;
    }
  }
  // Ties have no leader; choosing by row order would change on refresh.
  return tied ? null : top;
}

type Candidate = Pick<FilterSuggestion, "key" | "raw">;

function receivedCandidates(nowMs: number): Candidate[] {
  return datePresets(nowMs).flatMap((preset) =>
    preset.id === "month" ? [] : [{ key: "received", raw: receivedFilter.encode(preset.range) }],
  );
}

/* Offer Follow-up only for an unfiltered status or Call again alone;
   otherwise it would silently drop New rows from a mixed status filter.
   Received applies to the inbox. Each group contributes one refinement. */
function candidateGroups(
  filtered: readonly Readonly<HomeLine>[],
  active: readonly Readonly<ActiveFilter>[],
  nowMs: number,
): readonly (readonly Candidate[])[] {
  const statusEntry = active.find((entry) => entry.key === "status");
  const statuses = statusEntry === undefined ? null : statusFilter.decode(statusEntry.raw);
  const statusOffered = statuses === null;
  const followUpOffered =
    statuses === null || (statuses.length === 1 && statuses[0] === "contacted");
  const receivedOffered = statuses === null || statuses.includes("new");
  const location = leadingLocation(filtered);

  const status = (raw: string): readonly Candidate[] =>
    statusOffered ? [{ key: "status", raw }] : [];
  const followUp = (raw: FollowUpValue): readonly Candidate[] =>
    followUpOffered ? [{ key: "followup", raw }] : [];

  return [
    status("new"),
    status("contacted"),
    followUp("overdue"),
    receivedOffered ? receivedCandidates(nowMs) : [],
    followUp("due_today"),
    followUp("needs_date"),
    location === null ? [] : [{ key: "location", raw: location }],
    followUp("upcoming"),
    status("scheduled"),
  ];
}

/** Removed filters return at the end, displacing the lowest-ranked refinements. */
export function suggestFilters(
  lines: readonly Readonly<HomeLine>[],
  active: readonly Readonly<ActiveFilter>[],
  nowMs: number,
  demoted: readonly Readonly<ActiveFilter>[] = [],
): (FilterSuggestion & { readonly count: number })[] {
  const filtered = applyFilters(lines, active);
  const demotedIds = new Set(demoted.map(suggestionId));

  const ranked: (FilterSuggestion & { readonly count: number })[] = [];
  for (const group of candidateGroups(filtered, active, nowMs)) {
    for (const candidate of group) {
      if (isSuggestionActive(candidate, active, nowMs) || demotedIds.has(suggestionId(candidate))) {
        continue;
      }
      const shown = applyFilters(lines, withSuggestion(active, candidate));
      if (!narrows(shown, filtered)) continue;
      ranked.push({ ...candidate, count: shown.length });
      break;
    }
  }

  const wayBack: (FilterSuggestion & { readonly count: number })[] = [];
  for (const candidate of demoted) {
    if (candidate.key === "search" || isSuggestionActive(candidate, active, nowMs)) continue;
    const shown = applyFilters(lines, withSuggestion(active, candidate));
    if (shown.length === 0 || sameRows(shown, filtered)) continue;
    wayBack.push({ key: candidate.key, raw: candidate.raw, count: shown.length });
  }

  const room = Math.max(0, SUGGESTION_LIMIT - wayBack.length);
  return [...ranked.slice(0, room), ...wayBack.slice(0, SUGGESTION_LIMIT)];
}
