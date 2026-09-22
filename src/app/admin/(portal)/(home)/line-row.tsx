"use client";

import { useRef, useState } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";

import { TableCell, TableRow } from "@/components/ui/table";

import type { HomeLine } from "./home-line";
import { LineStatusBadge } from "./parts/badge";
import { ChevronGlyph, PhoneGlyph } from "./parts/glyphs";
import { HomePopover, HomePopoverContent, HomePopoverTrigger } from "./parts/popover";
import { RecordCard } from "./record-card";
import { cardStaysOpen } from "./sheet-coexistence";
import { useCardDetach } from "./use-card-detach";

/* One request line and the record card it opens. The whole row is the
   target — its phone number stays a dial on touch and copyable text on a
   desk, its chevron is the keyboard's way in — and the card anchors to
   the row while the trigger is only the chevron. The row picks the side
   the card opens on (the roomier of above and below, ties below); the
   positioner only shifts the card into view, never flips and never
   shrinks it, so a row in the middle of the screen still gets the whole
   card. Dragged by its head, the card detaches into a panel
   (use-card-detach.ts). */

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

/** The side with more room below or above the row, ties going below. */
// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- DOM nodes carry platform member types that cannot be made readonly
function preferredSide(row: HTMLTableRowElement | null): "top" | "bottom" {
  if (row === null) return "bottom";
  const rect = row.getBoundingClientRect();
  return window.innerHeight - rect.bottom >= rect.top ? "bottom" : "top";
}

export function LineRow({
  line,
  dial,
  open,
  fullOpen,
  selected,
  settled,
  onOpenChange,
  onOpenFull,
  onSettled,
  onDetachChange,
}: Readonly<{
  line: Readonly<HomeLine>;
  /** Render the phone as a dial link (touch) or as copyable text (desktop). */
  dial: boolean;
  open: boolean;
  /** This row's full-record sheet is open beside the card. */
  fullOpen: boolean;
  selected: boolean;
  settled: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenFull: (instant: boolean) => void;
  onSettled: (id: string) => void;
  /** The card's panel state, up to the list's blur. */
  onDetachChange: (detached: boolean) => void;
}>) {
  const rowRef = useRef<HTMLTableRowElement>(null);
  const [side, setSide] = useState<"top" | "bottom">("bottom");
  const detach = useCardDetach({
    open,
    sheetOpen: fullOpen,
    row: rowRef,
    onDetachChange,
  });
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
      data-selected={selected || undefined}
      data-open={open || undefined}
      data-settled={settled || undefined}
      className="wgi-list-row"
      onClick={(event) => {
        /* The whole row opens the record; its phone link stays a dial, its
           chevron is the trigger itself, and a click that selected text
           (the phone number, to copy) is a selection, not an open. The card
           is portaled to body but still a React child of this row, so its
           clicks bubble here — the release that ends a drag of its head
           among them. Only a click on the row itself toggles the card. */
        if (!(event.target instanceof Node) || !event.currentTarget.contains(event.target)) return;
        if (onControl(event) || selecting(event.currentTarget)) return;
        if (!open) setSide(preferredSide(rowRef.current));
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
            still anchors to the whole row — or to the frozen rect the detach
            left behind, which keeps the panel still while the row scrolls. */}
        <HomePopover
          open={open}
          onOpenChange={(next, details) => {
            /* The card declines a close that belongs to a surface it shares
               the screen with — its own row, the save toast, or the
               full-record sheet beside it. A detached card is a panel: it
               declines every outside press and focus move. Escape is the
               card's only while the card holds focus; otherwise a mounted
               sheet takes it (sheet-coexistence.ts). */
            if (!next && cardStaysOpen(details, rowRef.current, detach.detached)) {
              details.cancel();
              return;
            }
            /* The chevron is a way to open the card too: the side is chosen
               at open time, whichever control asked. */
            if (next) setSide(preferredSide(rowRef.current));
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
            anchor={detach.anchor ?? rowRef}
            side={side}
            align="start"
            sideOffset={8}
            {...detach.popupProps}
          >
            <RecordCard
              line={line}
              fullOpen={fullOpen}
              dragHandleProps={detach.handleProps}
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
