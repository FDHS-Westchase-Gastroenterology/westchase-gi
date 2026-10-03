"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { ComponentType, FocusEvent, KeyboardEvent, ReactNode, SVGProps } from "react";

import type {
  HistoryDay,
  HistoryIcon,
  HistoryRow,
} from "@/app/admin/(portal)/requests/record-sections";
import {
  Archive,
  CalendarCheck,
  CircleAlert,
  MessageSquareText,
  Phone,
  PhoneMissed,
  RotateCcw,
  Undo2,
  Voicemail,
} from "@/components/icons";
import {
  createPopoverHandle,
  Popover,
  PopoverArrow,
  PopoverContent,
  PopoverTitle,
  PopoverTrigger,
  usePopoverHoverIntent,
} from "@/components/ui/popover";
import {
  ScrollArea,
  ScrollAreaThumb,
  ScrollAreaViewport,
  ScrollBar,
} from "@/components/ui/scroll-area";

import { CARD } from "./sheet-coexistence";

/* The sheet's history (Figma Ypf9ohpRcGWF5C9T9bSvWW, section 04): a
   line per event (a note, up to two) under sticky practice-local days,
   weighted by what it says, the icons joined by a
   rail, and the sheet's only scroll region while the tab has room for it
   (full-record-sheet-body.tsx decides). A row's full detail is a popover
   beside the sheet, its arrow on the row (HIG Popovers: the arrow points
   at its source, and it never covers the source):

   - A pointer resting on a row opens it after a short delay; once one is
     open, or just closed, the next row opens at once, so reading down the
     list is one gesture. The safe triangle keeps it open while the pointer
     travels from the row to the popover.
   - Keyboard focus on a row opens it too, and it follows focus from row
     to row; the row keeps focus (the popover takes none), so the arrow
     keys and Tab stay the list's.
   - A click pins it, the way the popover's own trigger does; an outside
     press, Escape, or a second click closes it.

   One popover serves every row through a handle, so there is never more
   than one open (HIG Popovers). */

const ICONS = {
  "no-answer": PhoneMissed,
  voicemail: Voicemail,
  reached: Phone,
  note: MessageSquareText,
  closed: Archive,
  booked: CalendarCheck,
  undo: Undo2,
  reopened: RotateCcw,
  alert: CircleAlert,
  dot: null,
} as const satisfies Record<HistoryIcon, ComponentType<SVGProps<SVGSVGElement>> | null>;

function RowIcon({ icon }: Readonly<{ icon: HistoryIcon }>) {
  const Glyph = ICONS[icon];
  return (
    <span className="wgi-history-icon" aria-hidden="true">
      {Glyph === null ? <i className="wgi-history-dot" /> : <Glyph width={14} height={14} />}
    </span>
  );
}

/** A row's popover payload: the row and the id of the button it opened from. */
interface Opened {
  readonly row: HistoryRow;
  readonly triggerId: string;
}

/* How long a pointer rests on a row before its popover opens, and how long
   after one closes the next still opens at once. */
const ROW_INTENT = { rest: 400, warm: 300 } as const;
/* The popover sits beside the sheet only when the room to the sheet's
   left holds it; narrower, it drops below its row. */
const SIDE_ROOM = 332;

const SHEET_SURFACE = ".wgi-sheet-surface";
/* Beside the sheet it stays on the left and shifts along it; below its
   row it may flip above. */
const HISTORY_LEFT = { side: "none", align: "shift", fallbackAxisSide: "none" } as const;
const HISTORY_BELOW = { side: "flip", align: "shift", fallbackAxisSide: "none" } as const;

/* The popover's anchor: the sheet's left edge at the row's height, so the
   popover stands clear of the sheet with its arrow level with the row.
   The rect is read on every positioning pass, so it follows the row as the
   history scrolls and the sheet as it is resized. */
function useAnchor(triggerId: string) {
  return useMemo(() => {
    const trigger = () => document.getElementById(triggerId);
    const beside =
      (trigger()?.closest(SHEET_SURFACE)?.getBoundingClientRect().left ?? 0) >= SIDE_ROOM;
    if (!beside) return { side: "bottom" as const, anchor: trigger };
    return {
      side: "left" as const,
      anchor: () => {
        const row = trigger();
        if (row === null) return null;
        return {
          contextElement: row,
          getBoundingClientRect: () => {
            const rowRect = row.getBoundingClientRect();
            const left = row.closest(SHEET_SURFACE)?.getBoundingClientRect().left ?? rowRect.left;
            return new DOMRect(left, rowRect.top, 0, rowRect.height);
          },
        };
      },
    };
  }, [triggerId]);
}

function HistoryPopup({ opened }: Readonly<{ opened: Opened }>) {
  const { row, triggerId } = opened;
  const { side, anchor } = useAnchor(triggerId);
  const { detail } = row;
  return (
    /* The row keeps focus: the popover is read, not worked in, and focus
       staying on the list keeps its keys the list's. */
    <PopoverContent
      className="wgi-history-popover"
      positionerClassName="wgi-history-positioner"
      paint="card"
      anchor={anchor}
      side={side}
      align="center"
      sideOffset={12}
      collisionPadding={12}
      arrowPadding={14}
      collisionAvoidance={side === "left" ? HISTORY_LEFT : HISTORY_BELOW}
      initialFocus={false}
    >
      <PopoverArrow className="wgi-history-arrow" />
      <PopoverTitle className="wgi-history-heading">
        <RowIcon icon={row.icon} />
        {detail.heading}
      </PopoverTitle>
      {detail.byline === null ? null : <p className="wgi-history-byline">{detail.byline}</p>}
      {detail.body === null ? null : detail.note ? (
        /* A long note scrolls inside the popover and stops there; the
           history behind it does not move. */
        <div
          className="wgi-history-note"
          tabIndex={0}
          role="region"
          aria-label="Note text"
          data-ui-redact="staff-note"
        >
          {detail.body}
        </div>
      ) : (
        <p className="wgi-history-body">{detail.body}</p>
      )}
      {detail.facts.length === 0 ? null : (
        <dl className="wgi-history-facts">
          {detail.facts.map((fact) => (
            <div key={fact.key}>
              <dt>{fact.key}</dt>
              <dd>{fact.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </PopoverContent>
  );
}

function RowText({ row }: Readonly<{ row: HistoryRow }>) {
  const bold = row.emphasis === "strong" || row.emphasis === "attention";
  const lead: ReactNode = bold ? <b>{row.lead}</b> : row.lead;
  return (
    <span className="wgi-history-text">
      <span
        className="wgi-history-words"
        data-ui-redact={row.icon === "note" ? "staff-note" : undefined}
      >
        {lead}
        {row.rest}
      </span>
      {row.undone ? <span className="wgi-history-undone-note"> · later undone</span> : null}
    </span>
  );
}

export function RecordHistory({
  days,
  rowCount,
}: Readonly<{ days: readonly HistoryDay[]; rowCount: number }>) {
  const baseId = useId();
  const [handle] = useState(() => createPopoverHandle<Opened>());
  /* Rest, and warmth: once one is open, or closed within the grace, the
     next row opens without the rest delay. */
  const intent = usePopoverHoverIntent(handle, ROW_INTENT);
  /* The popover follows focus only while focus opened it; a pinned or
     hovered one is left to its own dismissal. */
  const byFocus = useRef(false);
  const labelId = `${baseId}-label`;

  /* Escape closes the popover first, wherever focus is but the card: the
     card keeps its own key. The sheet declines the same press while the
     popover is up (sheet-coexistence.ts), so the next Escape is the
     sheet's. Heard in the capture phase: the sheet stops the key on its
     way up. */
  useEffect(() => {
    const onEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Escape" || !handle.isOpen) return;
      if (document.activeElement?.closest(CARD) != null) return;
      handle.close();
    };
    document.addEventListener("keydown", onEscape, true);
    return () => {
      document.removeEventListener("keydown", onEscape, true);
    };
  }, [handle]);

  function openFor(triggerId: string) {
    byFocus.current = true;
    handle.open(triggerId);
  }

  // oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React events carry DOM member types that cannot be made readonly
  function onFocus(event: FocusEvent<HTMLButtonElement>) {
    if (event.currentTarget.matches(":focus-visible")) openFor(event.currentTarget.id);
  }

  /* Focus leaving the list for anywhere but the popover closes a popover
     that focus opened. */
  // oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React events carry DOM member types that cannot be made readonly
  function onBlur(event: FocusEvent<HTMLElement>) {
    const next = event.relatedTarget;
    if (!byFocus.current || !handle.isOpen) return;
    if (
      next instanceof Element &&
      (event.currentTarget.contains(next) || next.closest(".wgi-history-popover") !== null)
    )
      return;
    handle.close();
  }

  /* Escape closes the popover and stops there, so the sheet stays: the
     surface holding focus hears the key first (sheet-coexistence.ts). */
  function onKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "Escape" && handle.isOpen) {
      event.stopPropagation();
      handle.close();
    }
  }

  return (
    <section className="wgi-history" aria-labelledby={labelId}>
      <h3 id={labelId} className="wgi-sheet-label">
        History · {rowCount}
      </h3>
      {rowCount === 0 ? (
        <p className="wgi-sheet-empty">Nothing recorded yet.</p>
      ) : (
        <ScrollArea className="wgi-history-scroll">
          <ScrollAreaViewport
            className="wgi-history-viewport"
            role="region"
            aria-labelledby={labelId}
            tabIndex={0}
          >
            <div className="wgi-history-days" onBlur={onBlur} onKeyDown={onKeyDown}>
              {days.map((day) => (
                <div key={day.key} className="wgi-history-day">
                  <h4 className="wgi-history-date">{day.label}</h4>
                  <ul className="wgi-history-rows">
                    {day.rows.map((row) => {
                      const id = `${baseId}-${row.id}`;
                      return (
                        <li key={row.id}>
                          <PopoverTrigger
                            handle={handle}
                            payload={{ row, triggerId: id }}
                            id={id}
                            {...intent.triggerProps}
                            className="wgi-history-row"
                            data-emphasis={row.emphasis}
                            data-note={row.detail.note || undefined}
                            data-undone={row.undone || undefined}
                            onFocus={onFocus}
                          >
                            <RowIcon icon={row.icon} />
                            <RowText row={row} />
                          </PopoverTrigger>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          </ScrollAreaViewport>
          <ScrollBar className="wgi-history-bar">
            <ScrollAreaThumb className="wgi-history-thumb" />
          </ScrollBar>
        </ScrollArea>
      )}
      <Popover
        handle={handle}
        onOpenChange={(open, details) => {
          intent.onOpenChange(open, details);
          if (!open || details.reason !== "imperative-action") byFocus.current = false;
        }}
      >
        {({ payload }) => (payload === undefined ? null : <HistoryPopup opened={payload} />)}
      </Popover>
    </section>
  );
}
