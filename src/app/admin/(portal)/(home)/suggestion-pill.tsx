"use client";

import { filterByKey, filterValueLabel } from "@/lib/portal/filters";

import { suggestionLabel } from "./home-line";
import type { FilterSuggestion } from "./home-line";

/* A ghost: one complete, pre-filled filter a click from active, with the
   count it would show. The accessible name carries the count as a phrase
   ("Status New, 2 requests") where the eye reads bare numerals. */

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
