import { locationFilter } from "./location";
import { dateRangeLabel, datePresets, matchesPreset, receivedFilter } from "./received";
import { searchFilter } from "./search";
import { statusFilter } from "./status";
import type { ActiveFilter, FilterKey, FilterParam, MultiSelectFilterParam } from "./types";

export type {
  ActiveFilter,
  DateFilterParam,
  FilterGroup,
  FilterKey,
  FilterParam,
  MultiSelectFilterParam,
  TextFilterParam,
} from "./types";
export {
  datePresets,
  dayLabel,
  matchesPreset,
  msToNyDay,
  nyEndOfDayMs,
  nyStartOfDayMs,
} from "./received";
export { FOLLOW_UP_WORDS } from "./follow-up";
export type { FollowUpValue } from "./follow-up";
export { STATUS_DEFAULT_RAW, STATUS_WORDS, statusLeaf } from "./status";
export type { StatusLeaf } from "./status";
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
   state) survive untouched. A dimension with a default carries its pill on a
   bare URL, first in the bar, and spells its absence `key=any`. */

/** The absence of a defaulted dimension, as its param spells it. */
export const ANY_VALUE = "any";

function hasDefault(def: FilterParam): def is FilterParam & { readonly defaultRaw: string } {
  return def.type === "multi-select" && def.defaultRaw !== undefined;
}

/** Canonical raw: two spellings of one selection compare equal. */
function canonical(def: FilterParam, raw: string): string | null {
  if (def.type !== "multi-select") return raw;
  const values = def.decode(raw);
  return values === null ? null : def.encode(values);
}

/** Ordered active filters read from a search string. Malformed values drop. */
export function readActiveFilters(search: string): ActiveFilter[] {
  const params = new URLSearchParams(search);
  const seen = new Set<FilterKey>();
  const active: ActiveFilter[] = [];
  for (const [key, raw] of params.entries()) {
    if (!isFilterKey(key) || seen.has(key) || raw === "") continue;
    seen.add(key);
    const def = filterByKey(key);
    if (raw === ANY_VALUE && hasDefault(def)) continue;
    if (def.decode(raw) === null) continue;
    active.push({ key, raw });
  }
  const defaults = HOME_FILTERS.filter(hasDefault).flatMap((def) =>
    seen.has(def.key) ? [] : [{ key: def.key, raw: def.defaultRaw }],
  );
  return [...defaults, ...active];
}

/** The next search string: foreign params keep their relative order, ours
    follow in pill order. A default pill that leads the bar needs no param;
    a defaulted dimension with no pill writes `key=any`. */
export function writeActiveFilters(currentSearch: string, active: readonly ActiveFilter[]): string {
  const next = new URLSearchParams();
  for (const [key, raw] of new URLSearchParams(currentSearch).entries()) {
    if (!isFilterKey(key)) next.append(key, raw);
  }
  active.forEach(({ key, raw }, index) => {
    const def = filterByKey(key);
    const leadingDefault = index === 0 && hasDefault(def) && canonical(def, raw) === def.defaultRaw;
    if (!leadingDefault) next.append(key, raw);
  });
  for (const def of HOME_FILTERS.filter(hasDefault)) {
    if (!active.some((entry) => entry.key === def.key)) next.append(def.key, ANY_VALUE);
  }
  return next.toString();
}

/** True when the bar carries nothing but its defaults: the list as it opens. */
export function isDefaultView(active: readonly ActiveFilter[]): boolean {
  const defaults = HOME_FILTERS.filter(hasDefault);
  return (
    active.length === defaults.length &&
    defaults.every((def) =>
      active.some((entry) => entry.key === def.key && canonical(def, entry.raw) === def.defaultRaw),
    )
  );
}

/* ---- Pills: one per top-level choice ----
   A dimension's param holds one selection, and the bar speaks it as one pill
   per top-level choice: an ungrouped option, or a parent carrying whichever
   of its members are chosen. The opening Status is two pills, New and Call
   again · due, each removable on its own. Pills on one dimension are
   alternatives (a row has one status, one office), so adding one widens the
   list and removing one narrows it; pills on different dimensions narrow. */

export interface FilterPill {
  readonly key: FilterKey;
  /** The top-level choice this pill speaks for: an option, a group, or the whole dimension. */
  readonly choice: string;
  /** This pill's own selection, encoded as the dimension's param carries it. */
  readonly raw: string;
}

export function filterPills(active: readonly ActiveFilter[]): FilterPill[] {
  return active.flatMap(({ key, raw }) => {
    const def = filterByKey(key);
    if (def.type !== "multi-select") return [{ key, choice: key, raw }];
    const chosen = new Set(def.decode(raw));
    const choices = new Map<string, string[]>();
    for (const option of def.options) {
      if (!chosen.has(option.value)) continue;
      const choice = option.group ?? option.value;
      choices.set(choice, [...(choices.get(choice) ?? []), option.value]);
    }
    return [...choices].map(([choice, values]) => ({ key, choice, raw: def.encode(values) }));
  });
}

/** A multi-select param with another selection added to it. */
export function unionRaw(def: MultiSelectFilterParam, raw: string | null, added: string): string {
  const values = new Set([
    ...(raw === null ? [] : (def.decode(raw) ?? [])),
    ...(def.decode(added) ?? []),
  ]);
  return def.encode(
    def.options.flatMap((option) => (values.has(option.value) ? [option.value] : [])),
  );
}

/** The dimension's param once one of its pills is gone; null when none remain. */
export function withoutPill(active: readonly ActiveFilter[], pill: FilterPill): string | null {
  const def = filterByKey(pill.key);
  const entry = active.find((candidate) => candidate.key === pill.key);
  if (def.type !== "multi-select" || entry === undefined) return null;
  const removed = new Set(def.decode(pill.raw));
  const rest = (def.decode(entry.raw) ?? []).filter((value) => !removed.has(value));
  return rest.length > 0 ? def.encode(rest) : null;
}

/* ---- Display labels (pill values, empty-state sentences) ---- */

/* A tree dimension reads by its parents: every member selected is the
   parent's word, a named subset is the subset's word, anything else lists
   the leaves. */
function multiSelectSegments(def: MultiSelectFilterParam, values: readonly string[]): string[] {
  const chosen = new Set(values);
  const segments: string[] = [];
  const spoken = new Set<string>();
  const groups = new Map(def.groups.map((group) => [group.value, group]));
  for (const option of def.options) {
    if (!chosen.has(option.value)) continue;
    const group = option.group === undefined ? undefined : groups.get(option.group);
    if (group === undefined) {
      segments.push(option.label);
      continue;
    }
    if (spoken.has(group.value)) continue;
    const members = def.options.filter((candidate) => candidate.group === group.value);
    const picked = members.filter((member) => chosen.has(member.value));
    const subset = group.subsets.find(
      (candidate) =>
        candidate.values.length === picked.length &&
        picked.every((member) => candidate.values.includes(member.value)),
    );
    if (picked.length === members.length) {
      segments.push(group.label);
      spoken.add(group.value);
    } else if (subset !== undefined) {
      segments.push(subset.label);
      spoken.add(group.value);
    } else {
      segments.push(option.label);
    }
  }
  return segments;
}

/** Decode a raw param into the pill's value label: "New | Call again", "Call again · 3 of 4", "3 selected", "Last 7 days", ""maria"". */
export function filterValueLabel(def: FilterParam, raw: string, nowMs: number): string {
  if (def.type === "multi-select") {
    const values = def.decode(raw);
    if (values === null) return raw;
    const labels = multiSelectSegments(def, values);
    if (labels.length <= 2) return labels.join(" | ");
    /* One parent's pill with three of its members: say whose, and how many. */
    const chosen = new Set(values);
    const parents = new Set(
      def.options.flatMap((option) => (chosen.has(option.value) ? [option.group] : [])),
    );
    const [parent] = parents;
    const group = parents.size === 1 ? def.groups.find((g) => g.value === parent) : undefined;
    if (group === undefined) return `${labels.length} selected`;
    const members = def.options.filter((option) => option.group === group.value).length;
    return `${group.label} · ${chosen.size} of ${members}`;
  }
  if (def.type === "date") {
    const value = def.decode(raw);
    if (value === null) return raw;
    const preset = datePresets(nowMs).find((candidate) => matchesPreset(candidate, value, nowMs));
    return preset === undefined ? dateRangeLabel(value) : preset.label;
  }
  return `\u201C${def.decode(raw) ?? raw}\u201D`;
}
