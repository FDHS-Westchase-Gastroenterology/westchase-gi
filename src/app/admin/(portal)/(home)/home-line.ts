import type { RequestLocation } from "@/lib/portal/contracts";
import { datePresets, filterByKey, filterValueLabel } from "@/lib/portal/filters";
import type { ActiveFilter, FilterKey } from "@/lib/portal/filters";
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
    return key === "location" ? values.includes(line.location) : values.includes(line.status);
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

/** "1 request" / "12 requests": the noun every count on the bar shares. */
export function requestCount(count: number): string {
  return `${count} ${count === 1 ? "request" : "requests"}`;
}

/* ---- Suggestions: complete, pre-filled filters one click from active ---- */

export interface FilterSuggestion {
  readonly key: FilterKey;
  readonly raw: string;
  /** How many rows the list would show with this filter applied; absent
     while the day is still loading and no count is honest. */
  readonly count?: number;
}

/** What the loading bar offers before any row exists to count: the job,
   uncounted. The ranked list takes over the moment the day arrives. */
export const PLACEHOLDER_SUGGESTIONS: readonly FilterSuggestion[] = [
  { key: "status", raw: "new" },
  { key: "status", raw: "contacted" },
];

/** The most ghosts the bar offers at once; more reads as a second menu. */
export const SUGGESTION_LIMIT = 4;

/** One ghost's identity: the dimension *and* the value, since two ghosts may share a dimension. */
export function suggestionId(suggestion: Readonly<Pick<FilterSuggestion, "key" | "raw">>): string {
  return `${suggestion.key}:${suggestion.raw}`;
}

/** A ghost's accessible name: "Status New, 2 requests"; no count while none is honest. */
export function suggestionLabel(suggestion: Readonly<FilterSuggestion>, nowMs: number): string {
  const def = filterByKey(suggestion.key);
  const head = `${def.label} ${filterValueLabel(def, suggestion.raw, nowMs)}`;
  return suggestion.count === undefined ? head : `${head}, ${requestCount(suggestion.count)}`;
}

/* Two filters on one dimension are the same filter when they render the same
   pill. A "Today" range minted last minute and one minted now differ as
   strings, not as filters, so raw equality alone would offer a ghost beside
   its own pill after a reload. */
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

/* `applyFilters` keeps list order and hands back the same line objects, so two
   results are the same rows exactly when they pair off. Counts alone cannot
   say that: a same-dimension ghost can swap every row and keep the number. */
function sameRows(a: readonly Readonly<HomeLine>[], b: readonly Readonly<HomeLine>[]): boolean {
  return a.length === b.length && a.every((line, index) => line === b[index]);
}

/** The filters the bar would carry after activating a ghost: one param per
   dimension, so a ghost on an occupied dimension replaces that pill. */
export function withSuggestion(
  active: readonly Readonly<ActiveFilter>[],
  suggestion: Readonly<Pick<FilterSuggestion, "key" | "raw">>,
): ActiveFilter[] {
  const others = active.filter((entry) => entry.key !== suggestion.key);
  return [...others, { key: suggestion.key, raw: suggestion.raw }];
}

/* The office most present in the rows on screen, when the rows split
   between offices at all. "Either office" never leads: it is not a place to
   narrow to. */
function leadingLocation(filtered: readonly Readonly<HomeLine>[]): string | null {
  const counts = new Map<string, number>();
  for (const line of filtered) {
    if (line.location === "any") continue;
    counts.set(line.location, (counts.get(line.location) ?? 0) + 1);
  }
  let top: string | null = null;
  let tied = false;
  for (const [location, count] of counts) {
    const best = top === null ? -1 : (counts.get(top) ?? 0);
    if (count > best) {
      top = location;
      tied = false;
    } else if (count === best) {
      tied = true;
    }
  }
  /* An exact tie has no leader. Insertion order follows attention order,
     which a recorded outcome reshuffles, so picking one would flip the
     ghost between offices on refresh. */
  return tied ? null : top;
}

/** Candidate ghosts in offer order: the job first (the unworked, then the
   pile already called), then today's arrivals, then the office the visible
   rows lean toward, then the booked tail. */
function candidates(
  filtered: readonly Readonly<HomeLine>[],
  nowMs: number,
): readonly Pick<FilterSuggestion, "key" | "raw">[] {
  const today = datePresets(nowMs).find((preset) => preset.id === "today");
  const received = filterByKey("received");
  const location = leadingLocation(filtered);
  return [
    { key: "status", raw: "new" },
    { key: "status", raw: "contacted" },
    ...(today === undefined || received.type !== "date"
      ? []
      : [{ key: "received" as const, raw: received.encode(today.range) }]),
    ...(location === null ? [] : [{ key: "location" as const, raw: location }]),
    { key: "status", raw: "scheduled" },
  ];
}

/** The ghosts worth offering right now, ranked, each with the count it would
   show. A ghost that is already the active pill, that would empty the list,
   or that would change nothing (every visible row already matches) is noise
   and stays out. `demoted` holds ids the user just removed, which take the
   end of the bar in removal order so the eye finds them where they went. */
export function suggestFilters(
  lines: readonly Readonly<HomeLine>[],
  active: readonly Readonly<ActiveFilter>[],
  nowMs: number,
  demoted: readonly string[] = [],
): (FilterSuggestion & { readonly count: number })[] {
  const filtered = applyFilters(lines, active);
  const ranked: (FilterSuggestion & { readonly count: number })[] = [];
  for (const candidate of candidates(filtered, nowMs)) {
    if (isSuggestionActive(candidate, active, nowMs)) continue;
    const shown = applyFilters(lines, withSuggestion(active, candidate));
    if (shown.length === 0 || sameRows(shown, filtered)) continue;
    ranked.push({ ...candidate, count: shown.length });
  }
  /* Membership is decided by rank alone; demotion only reorders what made
     the cut, so removing a pill never knocks its ghost off the bar. Sort is
     stable, so the undemoted (index -1) keep their rank order up front. */
  return ranked
    .slice(0, SUGGESTION_LIMIT)
    .sort((a, b) => demoted.indexOf(suggestionId(a)) - demoted.indexOf(suggestionId(b)));
}
