"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import type { FilterKey } from "@/lib/portal/filters";
import { useActiveFilters } from "@/lib/portal/filters/use-filter-param";

import { FilterBar } from "./filter-bar";
import { FullRecordSheet } from "./full-record-sheet";
import { applyFilters, BASE_SUGGESTIONS, contextSuggestion, emptyStateMessage } from "./home-line";
import type { FilterSuggestion, HomeLine } from "./home-line";
import { LineList } from "./line-list";

/* The working list under the header (brief §1): a filter bar, then one flat,
   attention-ordered list. Filters are the organizing principle — what the
   list shows is whatever the URL says, nothing more. The rows arrive from
   the server already attention-ordered; the client only slices. */

interface HomeDashboardProps {
  readonly lines: readonly Readonly<HomeLine>[];
  /** One server clock for every relative label, so SSR and hydration agree. */
  readonly nowMs: number;
  /** True when the closed tail hit its fetch window — older rows live in Appointments. */
  readonly closedCapped: boolean;
}

export function HomeDashboard({ lines, nowMs, closedCapped }: HomeDashboardProps) {
  const { active, setParam, clearAll } = useActiveFilters();

  /* Suggestion queue: base suggestions not already active, in offer order.
     Removing an active filter returns its suggestion to the end of the bar. */
  const [suggestionQueue, setSuggestionQueue] = useState<readonly FilterKey[]>(() => {
    const activeKeys = new Set(active.map((entry) => entry.key));
    return BASE_SUGGESTIONS.flatMap((suggestion) =>
      activeKeys.has(suggestion.key) ? [] : [suggestion.key],
    );
  });

  const [openRowId, setOpenRowId] = useState<string | null>(null);
  const [sheetRowId, setSheetRowId] = useState<string | null>(null);
  const [settledId, setSettledId] = useState<string | null>(null);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* One timer, not one per row: a new outcome on another row moves the tint
     and lets the previous row's transition retarget on its own. The clear at
     200ms is what arms the exhale (CSS handles the 240ms fade) and what lets
     the same row acknowledge a second outcome later. */
  const markSettled = (id: string) => {
    if (settleTimer.current !== null) clearTimeout(settleTimer.current);
    setSettledId(id);
    settleTimer.current = setTimeout(() => {
      settleTimer.current = null;
      setSettledId(null);
    }, 200);
  };

  useEffect(
    () => () => {
      if (settleTimer.current !== null) clearTimeout(settleTimer.current);
    },
    [],
  );

  const filtered = useMemo(() => applyFilters(lines, active), [lines, active]);

  /* The visible queue is derived, not synchronized: queued keys that are not
     active, then any base suggestion the URL freed up behind our back
     (back/forward, a pasted link) rejoining at the end. */
  const activeKeys = new Set(active.map((entry) => entry.key));
  const queuedKeys = new Set(suggestionQueue);
  const visibleQueue = [
    ...suggestionQueue.filter((key) => !activeKeys.has(key)),
    ...BASE_SUGGESTIONS.flatMap((suggestion) =>
      activeKeys.has(suggestion.key) || queuedKeys.has(suggestion.key) ? [] : [suggestion.key],
    ),
  ];
  const suggestions: FilterSuggestion[] = visibleQueue
    .map((key) => BASE_SUGGESTIONS.find((suggestion) => suggestion.key === key))
    .filter((suggestion): suggestion is FilterSuggestion => suggestion !== undefined);
  const contextual = contextSuggestion(filtered, active, visibleQueue);
  if (contextual !== null) suggestions.push(contextual);

  const activate = (suggestion: FilterSuggestion) => {
    setParam(suggestion.key, suggestion.raw);
    setSuggestionQueue((queue) => queue.filter((key) => key !== suggestion.key));
  };

  const remove = (key: FilterKey) => {
    setParam(key, null);
    if (BASE_SUGGESTIONS.some((suggestion) => suggestion.key === key)) {
      setSuggestionQueue((queue) => (queue.includes(key) ? queue : [...queue, key]));
    }
  };

  const sheetLine =
    sheetRowId === null ? null : (lines.find((line) => line.id === sheetRowId) ?? null);
  const showClosedNote =
    closedCapped &&
    active.some((entry) => entry.key === "status" && entry.raw.split(",").includes("closed"));

  return (
    <>
      <FilterBar
        active={active}
        suggestions={suggestions}
        nowMs={nowMs}
        setParam={setParam}
        onRemove={remove}
        onActivate={activate}
      />

      {filtered.length > 0 ? (
        <>
          <LineList
            lines={filtered}
            openRowId={openRowId}
            settledId={settledId}
            onOpenRow={setOpenRowId}
            onOpenFull={(id) => {
              setSheetRowId(id);
              setOpenRowId(null);
            }}
            onSettled={markSettled}
          />
          {showClosedNote ? (
            <p className="wgi-list-note">
              Showing the latest closed requests —{" "}
              <Link href="/admin/requests?status=closed">older ones live in Appointments</Link>.
            </p>
          ) : null}
        </>
      ) : active.length > 0 ? (
        <div className="wgi-empty" data-testid="home-no-results">
          <h2>No results</h2>
          <p>{emptyStateMessage(lines, active, nowMs)}</p>
          <button
            type="button"
            className="wgi-empty-clear"
            onClick={() => {
              clearAll();
              setSuggestionQueue(BASE_SUGGESTIONS.map((suggestion) => suggestion.key));
            }}
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="wgi-empty" data-testid="sheet-empty">
          <h2>No requests yet.</h2>
          <p>
            A website request lands here the moment a patient submits the form, and a contacted
            request comes back on the day staff set for it.
          </p>
        </div>
      )}

      <FullRecordSheet
        line={sheetLine}
        onOpenChange={(open) => {
          if (!open) setSheetRowId(null);
        }}
      />
    </>
  );
}
