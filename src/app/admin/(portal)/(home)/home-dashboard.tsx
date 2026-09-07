"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import type { ActiveFilter, FilterKey } from "@/lib/portal/filters";
import { useActiveFilters } from "@/lib/portal/filters/use-filter-param";

import { FilterBar } from "./filter-bar";
import { FullRecordSheet } from "./full-record-sheet";
import { applyFilters, emptyStateMessage, suggestFilters, suggestionId } from "./home-line";
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
  const { active, setParam: writeParam, clearAll } = useActiveFilters();

  /* Ghosts the user removed, by suggestion id, in removal order. A removed
     filter returns to the bar as a ghost at the end, so the eye finds it
     where it went; the ranking in `suggestFilters` owns everything else. */
  const [demoted, setDemoted] = useState<readonly string[]>([]);

  const [openRowId, setOpenRowId] = useState<string | null>(null);
  /* The full-record sheet: which line, and whether the keyboard opened it
     (a keyboard-initiated open shows the sheet without motion). */
  const [sheet, setSheet] = useState<{ id: string; instant: boolean } | null>(null);
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

  const suggestions = useMemo(
    () => suggestFilters(lines, active, nowMs, demoted),
    [lines, active, nowMs, demoted],
  );

  /* A search pill is never a ghost, so there is nothing to remember for it. */
  const demote = (entry: Readonly<ActiveFilter>) => {
    if (entry.key === "search") return;
    const id = suggestionId(entry);
    setDemoted((queue) => [...queue.filter((candidate) => candidate !== id), id]);
  };

  const activate = (suggestion: FilterSuggestion) => {
    /* The pill this ghost replaces, if any, comes back as a ghost at the end. */
    const replaced = active.find((entry) => entry.key === suggestion.key);
    writeParam(suggestion.key, suggestion.raw);
    setDemoted((queue) => queue.filter((id) => id !== suggestionId(suggestion)));
    if (replaced !== undefined) demote(replaced);
  };

  /* Every path that clears a pill demotes it: the x button, an editor's Any
     row, an emptied search. The ghost lands at the end either way. */
  const setParam = (key: FilterKey, raw: string | null) => {
    const entry = raw === null ? active.find((candidate) => candidate.key === key) : undefined;
    writeParam(key, raw);
    if (entry !== undefined) demote(entry);
  };

  const remove = (key: FilterKey) => {
    setParam(key, null);
  };

  const sheetLine = sheet === null ? null : (lines.find((line) => line.id === sheet.id) ?? null);
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
            onOpenFull={(id, instant) => {
              setSheet({ id, instant });
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
              setDemoted([]);
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
        instant={sheet?.instant ?? false}
        onOpenChange={(open) => {
          if (!open) setSheet(null);
        }}
      />
    </>
  );
}
