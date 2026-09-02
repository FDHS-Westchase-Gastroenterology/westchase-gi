"use client";

import type { DateRange } from "react-day-picker";

import { Calendar } from "@/components/stock/calendar";

/* Fresh conversion of the stock registry Calendar for the Received editor's
   custom range: one month in range mode, speaking the editor's own day
   strings (YYYY-MM-DD, practice-local) in and out so the editor never holds
   a browser-zone Date. Paint is the stock calendar's, repainted through the
   portal bridge tokens; the popup it sits in is already `data-slot=
   popover-content`, so the grid's own background drops away. */

function dayToDate(day: string): Date | undefined {
  if (day === "") return undefined;
  const year = Number(day.slice(0, 4));
  const month = Number(day.slice(5, 7));
  const date = Number(day.slice(8, 10));
  return new Date(year, month - 1, date);
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
  return (
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
  );
}
