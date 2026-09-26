"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { filterByKey, filterPills, isDefaultView, withoutPill } from "@/lib/portal/filters";
import type { ActiveFilter, FilterKey, FilterPill } from "@/lib/portal/filters";
import { useActiveFilters } from "@/lib/portal/filters/use-filter-param";

import { FilterBar } from "./filter-bar";
import { FullRecordSheet } from "./full-record-sheet";
import {
  applyFilters,
  emptyStateMessage,
  requestCount,
  suggestFilters,
  suggestionId,
  suggestionRaw,
} from "./home-line";
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

  /* Pills the user removed, in removal order. A removed pill returns to the
     bar as a ghost at the end, so the eye finds it where it went, and it is
     the one kind of ghost allowed to widen or swap the rows rather than
     narrow them; the ranking in `suggestFilters` owns everything else. */
  const [demoted, setDemoted] = useState<readonly ActiveFilter[]>([]);

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
        note={
          showClosedNote ? (
            <span className="wgi-list-note">
              Showing the latest closed requests —{" "}
              <Link href="/admin/requests?status=closed">older ones live in Requests</Link>.
            </span>
          ) : null
        }
        empty={
          lines.length === 0 ? (
            <div className="wgi-empty" data-testid="sheet-empty">
              <h2>No requests yet.</h2>
              <p>
                A website request lands here the moment a patient submits the form, and a contacted
                request comes back on the day staff set for it.
              </p>
            </div>
          ) : isDefaultView(active) ? (
            /* The list as it opens holds the work due now; an empty one is
               a caught-up desk, not a filter to debug. */
            <div className="wgi-empty" data-testid="home-caught-up">
              <h2>Nothing to call right now.</h2>
              <p>
                No new requests and no calls due. {requestCount(lines.length)} wait on a later date
                or are already handled.
              </p>
              <button
                type="button"
                className="wgi-empty-clear"
                onClick={() => {
                  setParam("status", null);
                }}
              >
                Show all requests
              </button>
            </div>
          ) : (
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
          )
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
