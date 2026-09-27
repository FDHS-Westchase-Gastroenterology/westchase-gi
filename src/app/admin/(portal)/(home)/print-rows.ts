"use client";

import { useEffect, useMemo, useState } from "react";

import { fast } from "@/lib/motion";
import { PRINT_ID_LIMIT } from "@/lib/portal/print-selection";

import type { HomeLine } from "./home-line";

type Line = Readonly<HomeLine>;

/* Print takes at least one request and no more than the route reads at once. */
export function isPrintable(chosen: number): boolean {
  return chosen > 0 && chosen <= PRINT_ID_LIMIT;
}

/* Oldest first: the order the pages come out of the printer. */
export function oldestFirst(a: Line, b: Line): number {
  return a.createdAtMs - b.createdAtMs || a.id.localeCompare(b.id);
}

/* Rows on a filter change: arrivals fade in and leavers fade out on the
   fast beat while the table reflows without travel, like Home's list. A
   leaver keeps its place in the order until its fade is done. */
interface Shown {
  readonly rows: readonly Line[];
  readonly arriving: ReadonlySet<string>;
  readonly leaving: readonly Line[];
}

const LEAVE_MS = (fast.duration ?? 0) * 1000;

interface ShownRows {
  /** Listed rows and leavers together, oldest first. */
  readonly display: readonly Line[];
  readonly arriving: ReadonlySet<string>;
  readonly leaving: ReadonlySet<string>;
}

export function useShownRows(rows: readonly Line[]): ShownRows {
  const [shown, setShown] = useState<Shown>({ rows, arriving: new Set(), leaving: [] });
  if (shown.rows !== rows) {
    const next = new Set(rows.map((line) => line.id));
    const before = new Set(shown.rows.map((line) => line.id));
    const gone = new Map<string, Line>();
    for (const line of [...shown.leaving, ...shown.rows]) {
      if (!next.has(line.id)) gone.set(line.id, line);
    }
    setShown({
      rows,
      arriving: new Set(rows.filter((line) => !before.has(line.id)).map((line) => line.id)),
      leaving: [...gone.values()],
    });
  }

  const hasLeavers = shown.leaving.length > 0;
  useEffect(() => {
    if (!hasLeavers) return undefined;
    const timer = setTimeout(() => {
      setShown((current) => ({ ...current, leaving: [] }));
    }, LEAVE_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [hasLeavers, shown.rows]);

  const display = useMemo(
    () => [...shown.rows, ...shown.leaving].toSorted(oldestFirst),
    [shown.rows, shown.leaving],
  );
  const leaving = useMemo(() => new Set(shown.leaving.map((line) => line.id)), [shown.leaving]);
  return { display, arriving: shown.arriving, leaving };
}

/** How many chosen rows print before this one: the page a left-out row
    would take if it were put back. */
export function chosenBefore(chosen: readonly Line[], line: Line): number {
  return chosen.filter((other) => oldestFirst(other, line) < 0).length;
}
