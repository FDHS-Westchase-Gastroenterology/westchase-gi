"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type { ReactNode } from "react";

import { Card, CardContent, CardFooter } from "@/components/ui/card";
import {
  ScrollArea,
  ScrollAreaThumb,
  ScrollAreaViewport,
  ScrollBar,
} from "@/components/ui/scroll-area";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { requestCount } from "./home-line";
import type { HomeLine } from "./home-line";
import { LineRow } from "./line-row";

/* The request list (issue #282): one thin floating surface — column labels,
   rows, the inset scrollbar and a count footer — whose rows scroll inside it
   while the header, actions and filters stay put. The surface is the Card
   recipe; the columns are the Table recipe under a sticky header; the
   scrolling element is the ScrollArea viewport, named and focusable, so the
   wheel, the keyboard and the thumb all move the same box. Geometry and paint
   live in home.css under `.wgi-list*` and `.appt-*`.

   Under an open record card the surface is blurred and inert (Figma node
   76:781, the surface's softening): every element on it but the anchor
   row — the column labels, the other rows, the footer, the scroll rail —
   takes a blur as its own paint, and the body answers no presses, so a
   press anywhere on it is the outside press that closes the card (HIG
   Popovers) and the rail cannot be dragged. Nothing is tinted, because
   dimming means modal; the blur alone softens. Nothing is measured
   either: the card's data-veiled flag is the whole mechanism, and the
   open row stays sharp because the blur is never painted on it — a
   popover should not cover the element that revealed it. A card dragged
   into a panel lifts the blur (use-card-detach.ts): the panel floats
   free of the list, so the list is no longer "under" it. */

interface LineListProps {
  readonly lines: readonly Readonly<HomeLine>[];
  /** Changes when a committed filter changes: the new result set starts at the top. */
  readonly resetKey: string;
  readonly openRowId: string | null;
  /** The record whose full-record sheet is open, when one is — the open
      card for it turns its footer into the sheet's toggle. */
  readonly sheetId: string | null;
  /** The record being worked on (home-dashboard.tsx): its row keeps the deeper mint. */
  readonly selectedId: string | null;
  readonly settledId: string | null;
  readonly onOpenRow: (id: string | null) => void;
  readonly onOpenFull: (id: string, instant: boolean) => void;
  readonly onSettled: (id: string) => void;
  /** Shown inside the surface when there are no rows to show. */
  readonly empty: ReactNode;
  /** A note under the count, when the closed tail was capped. */
  readonly note?: ReactNode;
}

/** The first and last row fully inside the viewport, below the sticky header, 1-based. */
// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- DOM nodes carry platform member types that cannot be made readonly
function visibleRange(viewport: HTMLElement, table: HTMLTableElement): readonly [number, number] {
  const rows = table.querySelectorAll<HTMLTableRowElement>("tbody > tr");
  const bounds = viewport.getBoundingClientRect();
  const top = bounds.top + (table.tHead?.offsetHeight ?? 0) - 1;
  const bottom = bounds.bottom + 1;
  let first = 0;
  let last = 0;
  let overlapping = 0;
  rows.forEach((row, index) => {
    const rect = row.getBoundingClientRect();
    if (rect.bottom > top && rect.top < bottom && overlapping === 0) overlapping = index + 1;
    if (rect.top < top || rect.bottom > bottom) return;
    if (first === 0) first = index + 1;
    last = index + 1;
  });
  if (first === 0) return [overlapping, overlapping];
  return [first, last];
}

/** True on a touch screen, where the row's phone number is a dial. False on
   the server and through hydration, so the first paint is the desktop text. */
function useCoarsePointer(): boolean {
  const subscribe = useCallback((onChange: () => void) => {
    const media = window.matchMedia("(pointer: coarse)");
    media.addEventListener("change", onChange);
    return () => {
      media.removeEventListener("change", onChange);
    };
  }, []);
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia("(pointer: coarse)").matches,
    () => false,
  );
}

export function LineList({
  lines,
  resetKey,
  openRowId,
  sheetId,
  selectedId,
  settledId,
  onOpenRow,
  onOpenFull,
  onSettled,
  empty,
  note,
}: LineListProps) {
  const dial = useCoarsePointer();
  const viewportRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLTableElement>(null);
  const rangeRef = useRef<HTMLSpanElement>(null);
  const count = lines.length;

  /* The open card's panel state, reported up from its row: a detached card
     floats free of the list, so the blur lifts while it is one. The flag
     resets when the open row changes — another row's card starts attached
     — and a render-phase reset keeps it in step without a painted frame
     in the wrong state. */
  const [detached, setDetached] = useState(false);
  const [detachedRow, setDetachedRow] = useState(openRowId);
  if (detachedRow !== openRowId) {
    setDetachedRow(openRowId);
    setDetached(false);
  }
  /* A committed filter change can hide the open row without its card
     ever closing, and a detached flag for a row that is not rendered is
     stale — the same row coming back opens attached. */
  if (detached && openRowId !== null && !lines.some((line) => line.id === openRowId)) {
    setDetached(false);
  }
  const veiled = openRowId !== null && !detached;

  /* The footer's range is written straight to its text node from the scroll
     listener — no React render per scroll frame, and no announcement, since
     the node is not live. It changes only at row boundaries, because the
     text is compared before it is written. */
  useEffect(() => {
    const viewport = viewportRef.current;
    const table = tableRef.current;
    const output = rangeRef.current;
    if (viewport === null || table === null || output === null) return undefined;
    let frame = 0;
    const write = () => {
      frame = 0;
      const [first, last] = visibleRange(viewport, table);
      const text = `${first}–${last} of ${count}`;
      if (output.textContent !== text) output.textContent = text;
    };
    const schedule = () => {
      if (frame === 0) frame = requestAnimationFrame(write);
    };
    write();
    viewport.addEventListener("scroll", schedule, { passive: true });
    const observer = new ResizeObserver(schedule);
    observer.observe(viewport);
    return () => {
      viewport.removeEventListener("scroll", schedule);
      observer.disconnect();
      if (frame !== 0) cancelAnimationFrame(frame);
    };
  }, [count]);

  /* A committed filter change starts the new result set at the top of the
     surface; the page does not move and focus stays where it was. The key is
     compared, not a mounted flag: Strict Mode runs a mount effect twice, and
     a flag would reset a scroll made before hydration on the second pass. */
  const appliedKey = useRef(resetKey);
  useLayoutEffect(() => {
    if (appliedKey.current === resetKey) return;
    appliedKey.current = resetKey;
    const viewport = viewportRef.current;
    if (viewport !== null) viewport.scrollTop = 0;
  }, [resetKey]);

  return (
    <Card
      className="wgi-list-card"
      data-testid="home-list-surface"
      data-veiled={veiled || undefined}
    >
      <CardContent className="wgi-list-body">
        {count === 0 ? (
          empty
        ) : (
          <ScrollArea className="wgi-list-scroll">
            <ScrollAreaViewport
              ref={viewportRef}
              // react-doctor-disable-next-line react-doctor/prefer-tag-over-role -- the scrolling box is a landmark region so its name and its keyboard focus reach assistive tech; no HTML element pairs a region with a scroll container
              role="region"
              aria-label="Appointment requests"
              tabIndex={0}
              className="wgi-list-viewport"
            >
              <Table
                ref={tableRef}
                data-line-list="true"
                data-testid="home-line-list"
                className="wgi-list-table"
              >
                <TableHeader className="wgi-list-head">
                  <TableRow>
                    <TableHead data-cell="patient">Patient</TableHead>
                    <TableHead data-cell="phone">Phone</TableHead>
                    <TableHead data-cell="status">Status</TableHead>
                    <TableHead data-cell="pref">Preferences</TableHead>
                    <TableHead data-cell="received">Received</TableHead>
                    <TableHead data-cell="open">
                      <span className="sr-only">Open</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines.map((line) => (
                    <LineRow
                      key={line.id}
                      line={line}
                      dial={dial}
                      open={openRowId === line.id}
                      fullOpen={sheetId === line.id}
                      selected={selectedId === line.id}
                      settled={settledId === line.id}
                      onOpenChange={(open) => {
                        /* Every close comes through here — the row's
                           click, the chevron's outside press, the panel's
                           own close — so the panel flag clears with it. */
                        setDetached(false);
                        onOpenRow(open ? line.id : null);
                      }}
                      onOpenFull={(instant) => {
                        onOpenFull(line.id, instant);
                      }}
                      onSettled={onSettled}
                      onDetachChange={setDetached}
                    />
                  ))}
                </TableBody>
              </Table>
            </ScrollAreaViewport>
            <ScrollBar className="wgi-list-rail" aria-hidden="true">
              <ScrollAreaThumb className="wgi-list-thumb" />
            </ScrollBar>
          </ScrollArea>
        )}
      </CardContent>
      {count === 0 ? null : (
        <CardFooter className="wgi-list-foot">
          <span className="wgi-list-count" data-testid="home-list-count">
            {requestCount(count)}
          </span>
          {note}
          <span className="wgi-list-range" data-testid="home-list-range" ref={rangeRef} />
        </CardFooter>
      )}
    </Card>
  );
}
