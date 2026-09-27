"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { useActiveFilters } from "@/lib/portal/filters/use-filter-param";

import { FilterBar } from "./filter-bar";
import { ClosedTailNote, FilterEmptyState } from "./filter-empty-state";
import { FullRecordSheet } from "./full-record-sheet";
import { applyFilters, closedTailCut } from "./home-line";
import type { HomeLine } from "./home-line";
import { LineList } from "./line-list";
import { useFilterEditing } from "./use-filter-editing";

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
  const filters = useActiveFilters();
  const { active } = filters;
  const { suggestions, setParam, activate, remove, clearFilters } = useFilterEditing(lines, nowMs, {
    active,
    writeParam: filters.setParam,
    clearAll: filters.clearAll,
  });

  const [openRowId, setOpenRowId] = useState<string | null>(null);
  /* The full-record sheet: which line, and whether the keyboard opened it
     (a keyboard-initiated open shows the sheet without motion). */
  const [sheet, setSheet] = useState<{ id: string; instant: boolean } | null>(null);
  /* A toggle-close from the card's footer carries no Base UI change
     details for the sheet to read, so the dashboard remembers whether the
     key — not the pointer — asked for it; the exit is then instant. */
  const [closedByKey, setClosedByKey] = useState(false);
  /* The record being worked on: the row whose card is open, or whose full
     record is open — held through the sheet's closing transition,
     independent of hover, keyboard focus, and of whether the card closed
     before the sheet did. */
  const [selectedId, setSelectedId] = useState<string | null>(null);
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

  const sheetLine = sheet === null ? null : (lines.find((line) => line.id === sheet.id) ?? null);

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

      <LineList
        lines={filtered}
        resetKey={active.map((entry) => `${entry.key}=${entry.raw}`).join("&")}
        openRowId={openRowId}
        sheetId={sheet?.id ?? null}
        selectedId={selectedId}
        settledId={settledId}
        onOpenRow={(id) => {
          setOpenRowId(id);
          if (id !== null) {
            setSelectedId(id);
            /* The sheet follows the most recently opened card: another
               row's card retargets an open sheet to that record without
               re-entering (plans/full-record-sheet-decisions.md, Phase 0). */
            setSheet((current) =>
              current === null || current.id === id ? current : { id, instant: current.instant },
            );
          } else if (sheet === null) {
            setSelectedId(null);
          }
        }}
        onOpenFull={(id, instant) => {
          /* The card's footer is the sheet's toggle — "Open full record",
             then "Hide full record" — and the card stays open beside the
             sheet: staff work the phone with both in view. The row stays
             selected until the last of the two has closed. */
          if (sheet?.id === id) {
            setSheet(null);
            setClosedByKey(instant);
          } else {
            setSheet({ id, instant });
            setClosedByKey(false);
          }
          setSelectedId(id);
        }}
        onSettled={markSettled}
        note={closedTailCut(active, closedCapped) ? <ClosedTailNote /> : null}
        empty={
          <FilterEmptyState
            lines={lines}
            active={active}
            nowMs={nowMs}
            testIdPrefix="home"
            onShowAll={() => {
              setParam("status", null);
            }}
            onClear={clearFilters}
          />
        }
      />

      <FullRecordSheet
        line={sheetLine}
        instant={sheet?.instant ?? closedByKey}
        onOpenChange={(open) => {
          if (!open) setSheet(null);
        }}
        onClosed={() => {
          /* The card, if still open, keeps its row. */
          setSelectedId(openRowId);
        }}
      />
    </>
  );
}
