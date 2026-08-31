"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";

import { readActiveFilters, writeActiveFilters } from "./index";
import type { ActiveFilter, FilterKey, FilterParam, FilterValue } from "./types";

/* Provider-less hooks (brief §4.3): a filter's value is a pure function of
   the current search params, so this needs no context. Writes go through the
   native History API — Next keeps `useSearchParams` in sync — so toggling a
   filter never round-trips the server; the list is already client-side. */

function replaceSearch(pathname: string, search: string): void {
  window.history.replaceState(null, "", search === "" ? pathname : `${pathname}?${search}`);
}

/** What the bar needs: the ordered pill list plus the one mutation every editor shares. */
export interface ActiveFilterControls {
  readonly active: ActiveFilter[];
  readonly setParam: (key: FilterKey, raw: string | null) => void;
  readonly clearAll: () => void;
}

export function useActiveFilters(): ActiveFilterControls {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString();

  const active = useMemo(() => readActiveFilters(search), [search]);

  const setParam = useCallback(
    (key: FilterKey, raw: string | null) => {
      const current = readActiveFilters(window.location.search);
      const index = current.findIndex((entry) => entry.key === key);
      let next: ActiveFilter[];
      if (raw === null) {
        next = current.filter((entry) => entry.key !== key);
      } else if (index >= 0) {
        next = current.map((entry, at) => (at === index ? { key, raw } : entry));
      } else {
        next = [...current, { key, raw }];
      }
      replaceSearch(pathname, writeActiveFilters(window.location.search, next));
    },
    [pathname],
  );

  const clearAll = useCallback(() => {
    replaceSearch(pathname, writeActiveFilters(window.location.search, []));
  }, [pathname]);

  return { active, setParam, clearAll };
}

/** `useState` DX over one filter definition: `const [status, setStatus] = useFilterParam(statusFilter)`. */
export function useFilterParam<P extends FilterParam>(
  def: P,
): [FilterValue<P> | null, (value: FilterValue<P> | null) => void] {
  const { active, setParam } = useActiveFilters();
  const raw = active.find((entry) => entry.key === def.key)?.raw ?? null;

  const value = useMemo(
    // SAFETY: a definition's decode returns exactly its own FilterValue shape.
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- decode's return narrows with the definition's type
    () => (raw === null ? null : (def.decode(raw) as FilterValue<P> | null)),
    [def, raw],
  );

  const set = useCallback(
    (next: FilterValue<P> | null) => {
      // SAFETY: encode accepts exactly the value shape decode produced.
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- encode's parameter narrows with the definition's type
      setParam(def.key, next === null ? null : (def.encode as (v: FilterValue<P>) => string)(next));
    },
    [def, setParam],
  );

  return [value, set];
}
