"use client";

import { useEffect, useRef, useState } from "react";
import { getDefaultClassNames } from "react-day-picker";
import type { DateRange } from "react-day-picker";

import { Calendar } from "@/components/stock/calendar";

/* Fresh conversion of the stock registry Calendar for the Received editor's
   custom range: one month in range mode, speaking the editor's own day
   strings (YYYY-MM-DD, practice-local) in and out so the editor never holds
   a browser-zone Date. Paint is the stock calendar's, repainted through the
   portal bridge tokens; the popup it sits in is already `data-slot=
   popover-content`, so the grid's own background drops away.

   The grid is the whole popover while it shows (filter-bar: the Vercel
   model), so it takes the editor's width and, on mount, the keyboard — the
   picked start or today is the focused day. DayPicker's `autoFocus` marks
   that day and gives it tabindex=0, but the stock DayButton never attaches
   the ref its focus effect uses, so the frame-later focus below does the
   actual focusing (the editor parks focus on the popup before the swap so
   the popover's focus manager has nothing to re-home in between). */

function parseDay(day: string): Date {
  const year = Number(day.slice(0, 4));
  const month = Number(day.slice(5, 7));
  const date = Number(day.slice(8, 10));
  return new Date(year, month - 1, date);
}

function dayToDate(day: string): Date | undefined {
  return day === "" ? undefined : parseDay(day);
}

function dateToDay(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export function HomeRangeCalendar({
  from,
  to,
  fallbackMonth,
  onChange,
}: Readonly<{
  from: string;
  to: string;
  /** The day whose month opens when nothing is picked yet. */
  fallbackMonth: string;
  onChange: (from: string, to: string) => void;
}>) {
  const selected: DateRange | undefined =
    from === "" ? undefined : { from: dayToDate(from), to: dayToDate(to) };
  const shell = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      shell.current?.querySelector<HTMLElement>('button[tabindex="0"]')?.focus();
    });
    return () => {
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div ref={shell}>
      <Calendar
        // react-doctor-disable-next-line react-doctor/no-autofocus -- the calendar replaces the list the user just clicked in; focus moves to the picked day (or today) inside the open popover, not on page load
        autoFocus
        className="wgi-editor-cal"
        mode="range"
        numberOfMonths={1}
        defaultMonth={dayToDate(from) ?? dayToDate(fallbackMonth)}
        selected={selected}
        onSelect={(range) => {
          onChange(
            range?.from === undefined ? "" : dateToDay(range.from),
            range?.to === undefined ? "" : dateToDay(range.to),
          );
        }}
      />
    </div>
  );
}

/* The same registry Calendar in single-day mode for the record card: the
   day a decision comes back on. No autoFocus — focus stays on the answer
   the staff member just picked — and `required`, because a return day is
   never optional. `fixedWeeks` keeps every month six rows tall, so the
   card is the same height whatever month is showing. The grid opens
   blank: no day is presumed, and today loses the stock calendar's tint
   (its `rdp-today` marker stays for assistive tech), so the only shaded
   cell is the one staff clicked. The month follows a picked day (an
   outside day at the grid's edge opens its month) and otherwise stays
   where staff navigated it; that sync is a during-render derivation, not
   an effect. */
export function HomeDayCalendar({
  day,
  min,
  max,
  disabled,
  onChange,
}: Readonly<{
  day: string;
  /** Inclusive practice-local bounds (YYYY-MM-DD); days outside are disabled. */
  min: string;
  max: string;
  disabled: boolean;
  onChange: (day: string) => void;
}>) {
  const selected = dayToDate(day);
  const first = parseDay(min);
  const last = parseDay(max);
  const [month, setMonth] = useState(() => selected ?? first);
  const [followedDay, setFollowedDay] = useState(day);
  if (day !== followedDay) {
    setFollowedDay(day);
    if (selected !== undefined) setMonth(selected);
  }

  return (
    <Calendar
      className="wgi-editor-cal"
      classNames={{ today: getDefaultClassNames().today }}
      mode="single"
      required
      fixedWeeks
      numberOfMonths={1}
      month={month}
      onMonthChange={setMonth}
      startMonth={first}
      endMonth={last}
      disabled={disabled ? true : { before: first, after: last }}
      selected={selected}
      onSelect={(date) => {
        onChange(dateToDay(date));
      }}
    />
  );
}
