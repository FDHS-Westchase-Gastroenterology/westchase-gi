"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { recordHref } from "@/app/admin/(portal)/record-address";
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
  /* The full-record sheet's line is in the address, `?request=<id>`
     (record-address.ts), so a reload, Back, or a pasted link reopens it.
     The dashboard keeps whether the keyboard opened it (a keyboard-initiated
     open shows the sheet without motion); a sheet the address opened on
     arrival is already there, so it shows at once too. */
  const sheetId = useSearchParams().get("request");
  const [sheetInstant, setSheetInstant] = useState(true);
  /* A toggle-close from the card's footer carries no Base UI change
     details for the sheet to read, so the dashboard remembers whether the
     key — not the pointer — asked for it; the exit is then instant. */
  const [closedByKey, setClosedByKey] = useState(false);
  /* The record being worked on: the row whose card is open, or whose full
     record is open — held through the sheet's closing transition,
     independent of hover, keyboard focus, and of whether the card closed
     before the sheet did. */
  const [selectedId, setSelectedId] = useState(sheetId);
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

  const sheetLine = sheetId === null ? null : (lines.find((line) => line.id === sheetId) ?? null);
  const missing = sheetId !== null && sheetLine === null;

  /* An address naming a request that is not on Home, from an old link or a
     request since removed, opens nothing and says so. */
  useEffect(() => {
    if (!missing) return;
    toast("That record couldn't be opened.", { id: "record-missing" });
    window.history.replaceState(null, "", recordHref("request", null));
  }, [missing]);

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
        sheetId={sheetId}
        selectedId={selectedId}
        settledId={settledId}
        onOpenRow={(id) => {
          setOpenRowId(id);
          if (id !== null) {
            setSelectedId(id);
            /* The sheet follows the most recently opened card: another
               row's card retargets an open sheet to that record without
               re-entering (plans/full-record-sheet-decisions.md, Phase 0). */
            if (sheetId !== null && sheetId !== id) {
              window.history.replaceState(null, "", recordHref("request", id));
            }
          } else if (sheetId === null) {
            setSelectedId(null);
          }
        }}
        onOpenFull={(id, instant) => {
          /* The card's footer is the sheet's toggle — "Open full record",
             then "Hide full record" — and the card stays open beside the
             sheet: staff work the phone with both in view. The row stays
             selected until the last of the two has closed. */
          if (sheetId === id) {
            window.history.replaceState(null, "", recordHref("request", null));
            setClosedByKey(instant);
          } else {
            if (sheetId === null) window.history.pushState(null, "", recordHref("request", id));
            else window.history.replaceState(null, "", recordHref("request", id));
            setSheetInstant(instant);
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
        instant={sheetId === null ? closedByKey : sheetInstant}
        onOpenChange={(open) => {
          if (!open) window.history.replaceState(null, "", recordHref("request", null));
        }}
        onClosed={() => {
          /* The card, if still open, keeps its row. */
          setSelectedId(openRowId);
        }}
      />
    </>
  );
}
