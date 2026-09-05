"use client";

import { useState } from "react";

import { useActiveFilters } from "@/lib/portal/filters/use-filter-param";

import { FilterBar } from "./filter-bar";
import { BASE_SUGGESTIONS } from "./home-line";

import "./home.css";

/* While the day loads, skeleton rows hold the exact geometry of real lines —
   and the filter bar renders for real, because filter state is computable
   from the URL alone before any data arrives (brief §2.1, checklist #9). */

const SKELETON_WIDTHS: readonly { name: string; second: string }[] = [
  { name: "11rem", second: "9rem" },
  { name: "9rem", second: "11rem" },
  { name: "12rem", second: "8rem" },
  { name: "8.5rem", second: "10rem" },
  { name: "10.5rem", second: "9.5rem" },
  { name: "9.5rem", second: "8.5rem" },
  { name: "11.5rem", second: "10.5rem" },
];

export default function HomeLoading() {
  const { active, setParam } = useActiveFilters();
  const [nowMs] = useState(() => Date.now());
  const suggestions = BASE_SUGGESTIONS.filter(
    (suggestion) => !active.some((entry) => entry.key === suggestion.key),
  );

  return (
    <section aria-busy="true" aria-live="polite" className="portal-sheet">
      <span className="sr-only">Loading today&rsquo;s list</span>
      <div className="wgi-loading-head" aria-hidden="true">
        <span />
        <i />
      </div>
      <FilterBar
        active={active}
        suggestions={suggestions}
        nowMs={nowMs}
        setParam={setParam}
        onRemove={(key) => {
          setParam(key, null);
        }}
        onActivate={(suggestion) => {
          setParam(suggestion.key, suggestion.raw);
        }}
      />
      <ul className="wgi-skeleton-list" aria-hidden="true">
        {SKELETON_WIDTHS.map((row) => (
          <li key={`${row.name}-${row.second}`}>
            <span style={{ width: row.name }} />
            <span style={{ width: "7rem" }} />
            <span style={{ width: row.second }} />
            <span />
          </li>
        ))}
      </ul>
    </section>
  );
}
