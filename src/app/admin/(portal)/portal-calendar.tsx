"use client";

import type { KeyboardEvent } from "react";
import { useEffect, useId, useRef, useState } from "react";

import { ChevronLeft, ChevronRight } from "@/components/icons";

/* The portal's one calendar. Staff pick real days — a call-again day, an
 * appointment day — and a typed-out `<input type="date">` made that a fight
 * with a browser context menu. This is the day chosen by pointing at it: a
 * month of ruled paper in the Line's grammar (tabular numerals, hairlines,
 * navy ink for the chosen day, teal for the finger passing over one).
 *
 * It is a controlled component over ISO day strings, bounded by [min, max]
 * exactly as the inputs it replaces were, and it never resolves "today"
 * itself — the practice-local day arrives as a prop, so the calendar cannot
 * disagree with the domain about what day it is. Keyboard is whole: one tab
 * stop, arrows walk days, PageUp/PageDown walk months, Home/End walk the
 * week. Buttons inherit a surrounding fieldset's disabled state natively.
 */

const MONTH_LABEL = new Intl.DateTimeFormat("en-US", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

const DAY_LABEL = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

const WEEKDAYS = [
  { short: "Su", long: "Sunday" },
  { short: "Mo", long: "Monday" },
  { short: "Tu", long: "Tuesday" },
  { short: "We", long: "Wednesday" },
  { short: "Th", long: "Thursday" },
  { short: "Fr", long: "Friday" },
  { short: "Sa", long: "Saturday" },
] as const;

const DAY_MS = 86_400_000;

function dayMs(iso: string): number {
  return Date.parse(`${iso}T00:00:00Z`);
}

function shiftDay(iso: string, days: number): string {
  return new Date(dayMs(iso) + days * DAY_MS).toISOString().slice(0, 10);
}

/** "yyyy-mm" of an ISO day. */
function monthOf(iso: string): string {
  return iso.slice(0, 7);
}

function shiftMonth(month: string, by: number): string {
  const [year = 0, monthIndex = 1] = month.split("-").map(Number);
  const total = year * 12 + (monthIndex - 1) + by;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, "0")}`;
}

function daysInMonth(month: string): number {
  const [year = 0, monthIndex = 1] = month.split("-").map(Number);
  return new Date(Date.UTC(year, monthIndex, 0)).getUTCDate();
}

function dayOf(month: string, day: number): string {
  return `${month}-${String(day).padStart(2, "0")}`;
}

/** The month as rows of seven: ISO days padded with nulls at both edges. */
function monthGrid(month: string): readonly (readonly (string | null)[])[] {
  const lead = new Date(dayMs(dayOf(month, 1))).getUTCDay();
  const count = daysInMonth(month);
  const cells: (string | null)[] = [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length: count }, (_, i) => dayOf(month, i + 1)),
  ];
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

const KEY_STEPS = new Map([
  ["ArrowLeft", -1],
  ["ArrowRight", 1],
  ["ArrowUp", -7],
  ["ArrowDown", 7],
]);

export function PortalCalendar({
  value,
  min,
  max,
  today,
  label,
  testId,
  onSelect,
}: Readonly<{
  /** The chosen ISO day, or "" while nothing is chosen. */
  value: string;
  /** Inclusive ISO bounds, exactly as the date input it replaces was bounded. */
  min: string;
  max: string;
  /** The practice-local day, resolved by the caller's domain clock. */
  today: string;
  label: string;
  testId?: string;
  onSelect: (day: string) => void;
}>) {
  const monthId = useId();
  const gridRef = useRef<HTMLDivElement>(null);
  const pendingFocus = useRef(false);
  const [view, setView] = useState(() => monthOf(value === "" ? today : value));
  const [focusDay, setFocusDay] = useState<string | null>(null);
  const [pickedDay, setPickedDay] = useState<string | null>(null);
  /* Which way the month last turned, and only when a arrow button turned it.
     Keyboard month-jumps stay still: a key repeated all afternoon must never
     wait on motion. Null means "arrived, don't replay". */
  const [turn, setTurn] = useState<"prev" | "next" | null>(null);

  /* Adopt an outside change before paint: a reset ("") returns the view to
     the present; a restored value brings its own month back into view. */
  const [prevValue, setPrevValue] = useState(value);
  if (prevValue !== value) {
    setPrevValue(value);
    setView(monthOf(value === "" ? today : value));
    setFocusDay(null);
    setTurn(null);
  }

  useEffect(() => {
    if (!pendingFocus.current) return;
    pendingFocus.current = false;
    gridRef.current?.querySelector<HTMLButtonElement>(`[data-day="${focusDay ?? ""}"]`)?.focus();
  }, [focusDay, view]);

  const weeks = monthGrid(view);
  const inRange = (day: string) => day >= min && day <= max;
  const clamp = (day: string) => (day < min ? min : day > max ? max : day);

  /* One tab stop for the whole grid: the day focus last stood on, else the
     chosen day, else today, else the first day this month offers. */
  const inView = (day: string | null) => day !== null && monthOf(day) === view && inRange(day);
  const tabDay =
    [focusDay, value === "" ? null : value, today].find(inView) ??
    weeks.flat().find(inView) ??
    null;

  function moveFocus(day: string) {
    const next = clamp(day);
    setView(monthOf(next));
    setFocusDay(next);
    setTurn(null);
    pendingFocus.current = true;
  }

  function onGridKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const from = focusDay ?? tabDay;
    if (from === null) return;
    const step = KEY_STEPS.get(event.key);
    if (step !== undefined) {
      event.preventDefault();
      moveFocus(shiftDay(from, step));
      return;
    }
    if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      const weekday = new Date(dayMs(from)).getUTCDay();
      moveFocus(shiftDay(from, event.key === "Home" ? -weekday : 6 - weekday));
      return;
    }
    if (event.key === "PageUp" || event.key === "PageDown") {
      event.preventDefault();
      const month = shiftMonth(monthOf(from), event.key === "PageUp" ? -1 : 1);
      moveFocus(dayOf(month, Math.min(Number(from.slice(8)), daysInMonth(month))));
    }
  }

  function turnMonth(by: -1 | 1) {
    const month = shiftMonth(view, by);
    setView(month);
    setFocusDay(null);
    setTurn(by === 1 ? "next" : "prev");
  }

  return (
    <div className="portal-calendar" data-testid={testId}>
      <header className="portal-calendar-head">
        <p className="portal-calendar-month" id={monthId} aria-live="polite">
          {MONTH_LABEL.format(new Date(dayMs(dayOf(view, 1))))}
        </p>
        <div className="portal-calendar-nav">
          <button
            type="button"
            aria-label="Previous month"
            disabled={dayOf(view, 1) <= min}
            onClick={() => {
              turnMonth(-1);
            }}
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label="Next month"
            disabled={dayOf(view, daysInMonth(view)) >= max}
            onClick={() => {
              turnMonth(1);
            }}
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </header>
      <div
        ref={gridRef}
        role="grid"
        aria-label={label}
        aria-describedby={monthId}
        className="portal-calendar-grid"
        onKeyDown={onGridKeyDown}
      >
        <div role="rowgroup">
          <div role="row" className="portal-calendar-weekdays">
            {WEEKDAYS.map((weekday) => (
              <span key={weekday.short} role="columnheader" aria-label={weekday.long}>
                {weekday.short}
              </span>
            ))}
          </div>
        </div>
        {/* Keyed by the month so a turn replays: the weeks are what moved, and
            the ruled head they moved under holds still. */}
        <div role="rowgroup" key={view} className="portal-calendar-weeks" data-turn={turn}>
          {weeks.map((week) => (
            <div role="row" key={week.find((day) => day !== null)} className="portal-calendar-week">
              {week.map((day, blankIndex) =>
                day === null ? (
                  <span key={`blank-${blankIndex}`} role="gridcell" aria-hidden="true" />
                ) : (
                  <span key={day} role="gridcell" aria-selected={day === value}>
                    <button
                      type="button"
                      data-day={day}
                      data-selected={day === value || undefined}
                      tabIndex={day === tabDay ? 0 : -1}
                      disabled={!inRange(day)}
                      aria-label={DAY_LABEL.format(new Date(dayMs(day)))}
                      aria-current={day === today ? "date" : undefined}
                      className="portal-calendar-day"
                      data-picked={day === pickedDay || undefined}
                      onClick={() => {
                        setPickedDay(day);
                        onSelect(day);
                      }}
                    >
                      {Number(day.slice(8))}
                    </button>
                  </span>
                ),
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
