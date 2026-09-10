"use client";

import { filterByKey, filterValueLabel } from "@/lib/portal/filters";

import { suggestionLabel } from "./home-line";
import type { FilterSuggestion } from "./home-line";

interface SuggestionPillProps {
  readonly suggestion: FilterSuggestion;
  readonly nowMs: number;
  readonly onActivate: (suggestion: FilterSuggestion) => void;
}

export function SuggestionPill({ suggestion, nowMs, onActivate }: SuggestionPillProps) {
  const def = filterByKey(suggestion.key);
  const count = suggestion.count;
  return (
    <button
      type="button"
      className="wgi-sug"
      aria-label={suggestionLabel(suggestion, nowMs)}
      onClick={() => {
        onActivate(suggestion);
      }}
    >
      <span className="wgi-pill-key">{def.label}</span>
      <span className="wgi-pill-value">{filterValueLabel(def, suggestion.raw, nowMs)}</span>
      {count === undefined ? null : <span className="wgi-sug-count">{count}</span>}
    </button>
  );
}
