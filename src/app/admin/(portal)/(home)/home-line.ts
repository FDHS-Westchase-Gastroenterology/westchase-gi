import type { RequestLocation, RequestStatus } from "@/lib/portal/contracts";
import { filterByKey, filterValueLabel } from "@/lib/portal/filters";
import type { ActiveFilter, FilterKey } from "@/lib/portal/filters";
/* Type-only import: erased at compile time, so the server-only module never
   enters the client graph. */
import type { AttentionBucket } from "@/lib/portal/queue-attention";

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
  readonly stamp: "Overdue" | "After hours" | null;
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
  if (def.type === "select") {
    return def.decode(raw) === line.bucket;
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
      const count = without.length === 1 ? "1 request" : `${without.length} requests`;
      return `No requests match while ${def.label.toLowerCase()} is ${filterValueLabel(def, raw, nowMs)}. Removing it would show ${count}.`;
    }
  }
  return "No requests match the current filters.";
}

/* ---- Suggestions: complete, pre-filled filters one click from active ---- */

export interface FilterSuggestion {
  readonly key: FilterKey;
  readonly raw: string;
}

/** The bar opens with suggestions tuned to the job: the follow-up round, then
   the unworked. Both sit on Attention — one single-choice dimension — so the
   two can never be active together: activating one while the other is on
   switches the chip, and the value it replaced returns to the bar as a ghost. */
export const BASE_SUGGESTIONS: readonly FilterSuggestion[] = [
  { key: "attention", raw: "follow_up" },
  { key: "attention", raw: "new" },
];

/** One ghost's identity: the dimension *and* the value, since two ghosts may share a dimension. */
export function suggestionId(suggestion: Readonly<FilterSuggestion>): string {
  return `${suggestion.key}:${suggestion.raw}`;
}

export function isSuggestionActive(
  suggestion: Readonly<FilterSuggestion>,
  active: readonly Readonly<ActiveFilter>[],
): boolean {
  return active.some((entry) => entry.key === suggestion.key && entry.raw === suggestion.raw);
}

/* Context-aware suggestion: with filters active and location untouched, offer
   the office most present in the filtered rows. */
export function contextSuggestion(
  filtered: readonly Readonly<HomeLine>[],
  active: readonly Readonly<ActiveFilter>[],
  queued: readonly FilterKey[],
): FilterSuggestion | null {
  if (active.length === 0 || filtered.length === 0) return null;
  if (active.some((entry) => entry.key === "location") || queued.includes("location")) return null;
  const counts = new Map<string, number>();
  for (const line of filtered) {
    if (line.location === "any") continue;
    counts.set(line.location, (counts.get(line.location) ?? 0) + 1);
  }
  let top: string | null = null;
  for (const [location, count] of counts) {
    if (top === null || count > (counts.get(top) ?? 0)) top = location;
  }
  return top === null ? null : { key: "location", raw: top };
}
