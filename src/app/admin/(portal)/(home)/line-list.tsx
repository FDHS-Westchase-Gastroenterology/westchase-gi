"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useSyncExternalStore } from "react";
import type { MouseEvent as ReactMouseEvent, ReactNode } from "react";

import { Card, CardContent, CardFooter } from "@/components/ui/card";
import {
  ScrollArea,
  ScrollAreaThumb,
  ScrollAreaViewport,
  ScrollBar,
} from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { requestCount } from "./home-line";
import type { HomeLine } from "./home-line";
import { LineStatusBadge } from "./parts/badge";
import { ChevronGlyph, PhoneGlyph } from "./parts/glyphs";
import { HomePopover, HomePopoverContent, HomePopoverTrigger } from "./parts/popover";
import { RecordCard } from "./record-card";

/* The request list (issue #282): one thin floating surface — column labels,
   rows, the inset scrollbar and a count footer — whose rows scroll inside it
   while the header, actions and filters stay put. The surface is the Card
   recipe; the columns are the Table recipe under a sticky header; the
   scrolling element is the ScrollArea viewport, named and focusable, so the
   wheel, the keyboard and the thumb all move the same box. Geometry and paint
   live in home.css under `.wgi-list*` and `.appt-*`. */

interface LineListProps {
  readonly lines: readonly Readonly<HomeLine>[];
  /** Changes when a committed filter changes: the new result set starts at the top. */
  readonly resetKey: string;
  readonly openRowId: string | null;
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
    <Card className="wgi-list-card" data-testid="home-list-surface">
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
                      settled={settledId === line.id}
                      onOpenChange={(open) => {
                        onOpenRow(open ? line.id : null);
                      }}
                      onOpenFull={(instant) => {
                        onOpenFull(line.id, instant);
                      }}
                      onSettled={onSettled}
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

function stop(event: Readonly<{ stopPropagation: () => void }>): void {
  event.stopPropagation();
}

/** True when the click landed on a control of its own — a link or a button. */
function onControl(event: ReactMouseEvent<HTMLTableRowElement>): boolean {
  return event.target instanceof Element && event.target.closest("a, button") !== null;
}

/** True when the click ends a text selection inside the row: staff copying
   a phone number, not opening the record. */
// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- DOM nodes carry platform member types that cannot be made readonly
function selecting(row: HTMLTableRowElement): boolean {
  const selection = window.getSelection();
  return selection !== null && !selection.isCollapsed && selection.containsNode(row, true);
}

function LineRow({
  line,
  dial,
  open,
  settled,
  onOpenChange,
  onOpenFull,
  onSettled,
}: Readonly<{
  line: Readonly<HomeLine>;
  /** Render the phone as a dial link (touch) or as copyable text (desktop). */
  dial: boolean;
  open: boolean;
  settled: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenFull: (instant: boolean) => void;
  onSettled: (id: string) => void;
}>) {
  const rowRef = useRef<HTMLTableRowElement>(null);
  /* Staff work at a desk with a phone in hand: the number is text to read
     and copy (one click selects all of it), not a link that would open a
     softphone. On a touch screen it is a dial. The record card keeps its own
     call link either way. */
  const phone = dial ? (
    <a
      href={line.tel}
      className="appt-phone"
      aria-label={`Call ${line.name} at ${line.phoneDisplay}`}
      data-ui-redact="patient-contact"
      onClick={stop}
      onMouseDown={stop}
      onPointerDown={stop}
    >
      <PhoneGlyph size={18} />
      {line.phoneDisplay}
    </a>
  ) : (
    <span className="appt-phone" data-ui-redact="patient-contact">
      <PhoneGlyph size={18} />
      {line.phoneDisplay}
    </span>
  );
  return (
    <TableRow
      ref={rowRef}
      data-row={line.id}
      data-open={open || undefined}
      data-settled={settled || undefined}
      className="wgi-list-row"
      onClick={(event) => {
        /* The whole row opens the record; its phone link stays a dial, its
           chevron is the trigger itself, and a click that selected text
           (the phone number, to copy) is a selection, not an open. */
        if (onControl(event) || selecting(event.currentTarget)) return;
        onOpenChange(!open);
      }}
    >
      <TableCell data-cell="patient">
        <span className="appt-name" data-ui-redact="patient-name">
          {line.name}
        </span>
        <span className="appt-phone-stack">{phone}</span>
      </TableCell>
      <TableCell data-cell="phone">{phone}</TableCell>
      <TableCell data-cell="status">
        <span className="appt-status">
          <span data-col="status">
            <LineStatusBadge status={line.status} />
          </span>
        </span>
      </TableCell>
      <TableCell data-cell="pref">
        <span data-col="pref">{line.pref}</span>
      </TableCell>
      <TableCell data-cell="received">
        {/* An overdue line carries no second badge: its age turns the attention
            ink and bold (D4, 2026-09-13), and the word stays for a screen reader. */}
        <span
          data-col="received"
          data-overdue={line.stamp === null ? undefined : true}
          title={`Received ${line.receivedFull}`}
        >
          {line.receivedRel}
          {line.stamp === null ? null : <span className="sr-only">, {line.stamp}</span>}
        </span>
      </TableCell>
      <TableCell data-cell="open">
        {/* The popover lives in the row's last cell, not around the row: its
            portal leaves focus-guard spans beside the trigger, and a span is
            valid inside a cell where it is not inside a table body. The card
            still anchors to the whole row. */}
        <HomePopover
          open={open}
          onOpenChange={(next, details) => {
            /* A press on the open row is the row's own toggle (the click
               above closes it); Base UI would otherwise close on the
               pointerdown and the click would reopen it. */
            if (
              !next &&
              details.reason === "outside-press" &&
              details.event.target instanceof Node &&
              rowRef.current?.contains(details.event.target) === true
            ) {
              details.cancel();
              return;
            }
            onOpenChange(next);
          }}
        >
          <HomePopoverTrigger
            className="appt-line-trigger"
            aria-label={`Open request for ${line.name}`}
          >
            <ChevronGlyph size={18} />
          </HomePopoverTrigger>
          <HomePopoverContent
            className="wgi-record-card"
            anchor={rowRef}
            side="bottom"
            align="start"
            sideOffset={8}
          >
            <RecordCard
              line={line}
              onClose={() => {
                onOpenChange(false);
              }}
              onOpenFull={onOpenFull}
              onSettled={onSettled}
            />
          </HomePopoverContent>
        </HomePopover>
      </TableCell>
    </TableRow>
  );
}
