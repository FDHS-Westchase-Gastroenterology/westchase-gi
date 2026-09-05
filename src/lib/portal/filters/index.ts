import { locationFilter } from "./location";
import { dateRangeLabel, datePresets, matchesPreset, receivedFilter } from "./received";
import { searchFilter } from "./search";
import { statusFilter } from "./status";
import type { ActiveFilter, FilterKey, FilterParam } from "./types";

export type {
  ActiveFilter,
  DateFilterParam,
  DateRange,
  FilterKey,
  FilterOption,
  FilterParam,
  FilterValue,
  MultiSelectFilterParam,
  TextFilterParam,
} from "./types";
export { locationFilter } from "./location";
export {
  datePresets,
  dateRangeLabel,
  dayLabel,
  matchesPreset,
  msToNyDay,
  nyEndOfDayMs,
  nyStartOfDayMs,
  receivedFilter,
} from "./received";
export type { DatePreset } from "./received";
export { searchFilter } from "./search";
export { statusFilter, STATUS_WORDS } from "./status";
/* The client hooks live in ./use-filter-param ("use client"); import them
   directly so this barrel stays importable from server code. */

/** The portal home bar, in Add-Filter menu order. */
export const HOME_FILTERS: readonly FilterParam[] = [
  statusFilter,
  locationFilter,
  receivedFilter,
  searchFilter,
];

export function filterByKey(key: FilterKey): FilterParam {
  const hit = HOME_FILTERS.find((def) => def.key === key);
  if (hit === undefined) throw new Error(`Unknown filter key: ${key}`);
  return hit;
}

function isFilterKey(value: string): value is FilterKey {
  return HOME_FILTERS.some((def) => def.key === value);
}

/* ---- The URL contract (brief §2.5 / §4.2) ----
   One param per filter; multi-select joins with commas; **param order is pill
   order** — first occurrence wins; params that are not ours (host or viewer
   state) survive untouched. */

/** Ordered active filters read from a search string. Malformed values drop. */
export function readActiveFilters(search: string): ActiveFilter[] {
  const params = new URLSearchParams(search);
  const seen = new Set<FilterKey>();
  const active: ActiveFilter[] = [];
  for (const [key, raw] of params.entries()) {
    if (!isFilterKey(key) || seen.has(key) || raw === "") continue;
    seen.add(key);
    if (filterByKey(key).decode(raw) === null) continue;
    active.push({ key, raw });
  }
  return active;
}

/** The next search string: foreign params keep their relative order, ours follow in pill order. */
export function writeActiveFilters(currentSearch: string, active: readonly ActiveFilter[]): string {
  const next = new URLSearchParams();
  for (const [key, raw] of new URLSearchParams(currentSearch).entries()) {
    if (!isFilterKey(key)) next.append(key, raw);
  }
  for (const { key, raw } of active) next.append(key, raw);
  return next.toString();
}

/* ---- Display labels (pill values, empty-state sentences) ---- */

/** Decode a raw param into the pill's value label: "New | Call again", "3 selected", "Last 7 days", ""maria"". */
export function filterValueLabel(def: FilterParam, raw: string, nowMs: number): string {
  if (def.type === "multi-select") {
    const values = def.decode(raw);
    if (values === null) return raw;
    const labels = values.map(
      (value) => def.options.find((option) => option.value === value)?.label ?? value,
    );
    return labels.length <= 2 ? labels.join(" | ") : `${labels.length} selected`;
  }
  if (def.type === "date") {
    const value = def.decode(raw);
    if (value === null) return raw;
    const preset = datePresets(nowMs).find((candidate) => matchesPreset(candidate, value, nowMs));
    return preset === undefined ? dateRangeLabel(value) : preset.label;
  }
  return `\u201C${def.decode(raw) ?? raw}\u201D`;
}
