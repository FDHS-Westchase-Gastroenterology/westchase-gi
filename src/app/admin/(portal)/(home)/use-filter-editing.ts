"use client";

import { useMemo, useState } from "react";

import { filterByKey, filterPills, withoutPill } from "@/lib/portal/filters";
import type { ActiveFilter, FilterKey, FilterPill } from "@/lib/portal/filters";

import { suggestFilters, suggestionId, suggestionRaw } from "./home-line";
import type { FilterSuggestion, HomeLine } from "./home-line";

/* How the filter bar's pills and ghosts edit a set of filters, apart from
   where those filters live. Home keeps them in its URL (useActiveFilters);
   the Print sheet keeps its own copy in local state, so a change there
   never reaches Home. Both hand this hook the one write they own, and the
   bar behaves the same over either. */

interface FilterStore {
  readonly active: readonly ActiveFilter[];
  /** Write one dimension's param; null takes the dimension off the bar. */
  readonly writeParam: (key: FilterKey, raw: string | null) => void;
  /** Take every filter off the bar. */
  readonly clearAll: () => void;
}

interface FilterEditing {
  readonly suggestions: readonly FilterSuggestion[];
  readonly setParam: (key: FilterKey, raw: string | null) => void;
  readonly activate: (suggestion: FilterSuggestion) => void;
  readonly remove: (pill: FilterPill) => void;
  /** Clear filters, and forget the way-back ghosts with them. */
  readonly clearFilters: () => void;
}

export function useFilterEditing(
  lines: readonly Readonly<HomeLine>[],
  nowMs: number,
  { active, writeParam, clearAll }: FilterStore,
): FilterEditing {
  /* Pills the user removed, in removal order. A removed pill returns to the
     bar as a ghost at the end, so the eye finds it where it went, and it is
     the one kind of ghost allowed to widen or swap the rows rather than
     narrow them; the ranking in `suggestFilters` owns everything else. */
  const [demoted, setDemoted] = useState<readonly ActiveFilter[]>([]);

  const suggestions = useMemo(
    () => suggestFilters(lines, active, nowMs, demoted),
    [lines, active, nowMs, demoted],
  );

  /* A search pill is never a ghost, so there is nothing to remember for it. */
  const demote = (entry: Readonly<ActiveFilter>) => {
    if (entry.key === "search") return;
    const id = suggestionId(entry);
    setDemoted((queue) => [
      ...queue.filter((candidate) => suggestionId(candidate) !== id),
      { key: entry.key, raw: entry.raw },
    ]);
  };

  const activate = (suggestion: FilterSuggestion) => {
    /* A multi-select ghost joins its dimension's pills; a date ghost takes
       the one Received pill's place, and that pill comes back as a ghost. */
    const replaced =
      filterByKey(suggestion.key).type === "multi-select"
        ? undefined
        : active.find((entry) => entry.key === suggestion.key);
    writeParam(suggestion.key, suggestionRaw(active, suggestion));
    const id = suggestionId(suggestion);
    setDemoted((queue) => queue.filter((candidate) => suggestionId(candidate) !== id));
    if (replaced !== undefined) demote(replaced);
  };

  /* Every path that takes a pill off the bar demotes it: the x button, an
     editor's Any row or unchecked box, an emptied search. Each pill that
     leaves lands at the end as its own ghost. */
  const setParam = (key: FilterKey, raw: string | null) => {
    const after = new Set(
      filterPills(raw === null ? [] : [{ key, raw }]).map((pill) => pill.choice),
    );
    const gone = filterPills(active).filter((pill) => pill.key === key && !after.has(pill.choice));
    writeParam(key, raw);
    for (const pill of gone) demote(pill);
  };

  const remove = (pill: FilterPill) => {
    setParam(pill.key, withoutPill(active, pill));
  };

  const clearFilters = () => {
    clearAll();
    setDemoted([]);
  };

  return { suggestions, setParam, activate, remove, clearFilters };
}
