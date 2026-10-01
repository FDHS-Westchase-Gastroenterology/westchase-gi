"use client";

import { Popover } from "@base-ui/react/popover";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import type { CSSProperties, FocusEvent, KeyboardEvent, MouseEvent, ReactNode } from "react";

import { ChevronLeft, ChevronRight, Search } from "@/components/icons";
import { SegmentedControl } from "@/components/ui/segmented-control";
import type { SegmentedControlOption } from "@/components/ui/segmented-control";

import { CellBody, DayPreviewPopup, Legend } from "./schedule-day";
import type { DayPreview, ScheduleCell, ScheduleMonth } from "./schedule-model";
import { weekHref } from "./week-calendar";

/* The Schedule's month view (Figma Ypf9ohpRcGWF5C9T9bSvWW, section 08, S1;
   the day preview is H1, node 656:8201). Every practice day says how many
   visits it still has open, tinted deeper as it fills; past days say how
   many patients were seen, closed days are outlined and say nothing else.

   The month is one grid with one tab stop: the arrow keys move a day or a
   week, Home and End go to the month's first and last day. A future day
   previews its providers in a popover beside it (HIG Popovers: the arrow
   points at its source and it never covers it):

   - A pointer resting on a day opens it after a short delay; once one is
     open, or just closed, the next day opens at once, so sweeping across
     a week is one gesture.
   - Keyboard focus on a day opens it at once and it follows focus; the
     day keeps focus (the popover holds nothing to press), and Escape
     closes it without moving focus.
   - A click does nothing yet: opening a day is a later view.

   One popover serves every day through a handle, so there is never more
   than one open. */

type View = "day" | "week" | "month";

const VIEW_OPTIONS: readonly SegmentedControlOption<View>[] = [
  { value: "day", label: "Day", disabledReason: "Coming soon" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
];

const WEEKDAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

/* How long a pointer rests on a day before its preview opens, and how
   long after one closes the next still opens at once. */
const REST_DELAY = 400;
const WARM_GRACE = 300;

const DAY_MS = 86_400_000;

function addDays(date: string, days: number): string {
  return new Date(Date.parse(`${date}T12:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);
}

function monthHref(month: string): string {
  return `/admin/schedule?month=${month}`;
}

function MonthArrow({
  month,
  label,
  children,
}: Readonly<{ month: string | null; label: string; children: ReactNode }>) {
  if (month === null)
    return (
      <button type="button" className="wgi-schedule-arrow" disabled aria-label={label}>
        {children}
      </button>
    );
  return (
    <Link href={monthHref(month)} className="wgi-schedule-arrow" aria-label={label}>
      {children}
    </Link>
  );
}

export function ScheduleMonthView({ view }: Readonly<{ view: ScheduleMonth }>) {
  const router = useRouter();
  const baseId = useId();
  const titleId = `${baseId}-title`;
  const cellId = (date: string) => `${baseId}-${date}`;
  const days = view.weeks.flat().filter((cell) => cell.kind !== "blank");
  const firstDay = days[0]?.date ?? "";
  const lastDay = days.at(-1)?.date ?? "";
  const [active, setActive] = useState(() => days.find((cell) => cell.today)?.date ?? firstDay);
  const [handle] = useState(() => Popover.createHandle<DayPreview>());
  /* Warm: a preview is open, or one closed within the grace — the next
     day opens without the rest delay. */
  const [warm, setWarm] = useState(false);
  const cool = useRef<number | undefined>(undefined);
  /* The preview follows focus only while focus opened it; a hovered one
     is left to its own dismissal. */
  const byFocus = useRef(false);
  /* Opened or moved from the keyboard: the preview appears and leaves at
     once (Base UI marks only its own keyboard paths data-instant, not
     handle.open). */
  const [keyed, setKeyed] = useState(false);

  useEffect(
    () => () => {
      window.clearTimeout(cool.current);
    },
    [],
  );

  const columns: CSSProperties & Record<`--${string}`, string> = {
    "--schedule-columns": view.columns
      .map((column) => (column.narrow ? "4rem" : "minmax(0, 1fr)"))
      .join(" "),
  };

  function moveTo(date: string) {
    if (date < firstDay || date > lastDay) return;
    setActive(date);
    document.getElementById(cellId(date))?.focus();
  }

  function onGridKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape" && handle.isOpen) {
      handle.close();
      return;
    }
    const step = {
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -7,
      ArrowDown: 7,
    }[event.key];
    if (step !== undefined) {
      event.preventDefault();
      moveTo(addDays(active, step));
    } else if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      moveTo(event.key === "Home" ? firstDay : lastDay);
    }
  }

  /* Focus on a future day opens its preview at once; focus on any other
     day closes one that focus opened. */
  // oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React events carry DOM member types that cannot be made readonly
  function onDayFocus(event: FocusEvent<HTMLElement>, cell: ScheduleCell) {
    if (cell.kind === "blank") return;
    setActive(cell.date);
    if (cell.kind === "future" && event.currentTarget.matches(":focus-visible")) {
      byFocus.current = true;
      setKeyed(true);
      handle.open(event.currentTarget.id);
    } else if (byFocus.current && handle.isOpen) handle.close();
  }

  // oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React events carry DOM member types that cannot be made readonly
  function onGridBlur(event: FocusEvent<HTMLDivElement>) {
    const next = event.relatedTarget;
    if (!byFocus.current || !handle.isOpen) return;
    if (next instanceof Element && event.currentTarget.contains(next)) return;
    handle.close();
  }

  function renderCell(cell: ScheduleCell, index: number) {
    const narrow = view.columns[index]?.narrow ?? false;
    if (cell.kind === "blank")
      return (
        <div
          key={cell.key}
          role="gridcell"
          aria-label="Outside this month"
          className="wgi-day"
          data-kind="blank"
        />
      );
    const shared = {
      id: cellId(cell.date),
      role: "gridcell",
      tabIndex: cell.date === active ? 0 : -1,
      "aria-label": cell.label,
      "aria-current": cell.today ? ("date" as const) : undefined,
      className: "wgi-day",
      "data-kind": cell.kind,
      "data-narrow": narrow || undefined,
    };
    if (cell.kind !== "future")
      return (
        <div
          key={cell.date}
          {...shared}
          onFocus={(event) => {
            onDayFocus(event, cell);
          }}
        >
          <CellBody cell={cell} narrow={narrow} />
        </div>
      );
    return (
      <Popover.Trigger
        key={cell.date}
        {...shared}
        handle={handle}
        payload={cell.preview}
        openOnHover
        delay={warm ? 0 : REST_DELAY}
        nativeButton={false}
        render={<div />}
        data-tone={cell.tone}
        onFocus={(event) => {
          onDayFocus(event, cell);
        }}
        onClick={(event: MouseEvent<HTMLElement> & { preventBaseUIHandler: () => void }) => {
          event.preventBaseUIHandler();
        }}
      >
        <CellBody cell={cell} narrow={narrow} />
      </Popover.Trigger>
    );
  }

  return (
    <section className="wgi-schedule" aria-labelledby={titleId}>
      <header className="wgi-schedule-head">
        <div className="wgi-schedule-nav">
          <h1 id={titleId} className="wgi-schedule-title">
            {view.title}
          </h1>
          <div className="wgi-schedule-arrows">
            <MonthArrow month={view.previous} label="Previous month">
              <ChevronLeft width={20} height={20} />
            </MonthArrow>
            <MonthArrow month={view.next} label="Next month">
              <ChevronRight width={20} height={20} />
            </MonthArrow>
          </div>
          <Link href="/admin/schedule" className="wgi-schedule-today">
            Today
          </Link>
        </div>
        <div className="wgi-schedule-tools">
          <label className="wgi-schedule-search">
            <Search width={18} height={18} />
            <input
              type="search"
              placeholder="Search patients"
              aria-label="Search patients"
              disabled
            />
          </label>
          <SegmentedControl<View>
            aria-label="View"
            paper="glass"
            options={VIEW_OPTIONS}
            value="month"
            onValueChange={(next) => {
              if (next === "week") router.push(weekHref(null, []));
            }}
            className="w-auto"
          />
        </div>
      </header>
      <div className="wgi-schedule-surface" style={columns}>
        <div
          role="grid"
          aria-labelledby={titleId}
          aria-readonly="true"
          className="wgi-schedule-grid"
          onKeyDown={onGridKeyDown}
          onBlur={onGridBlur}
        >
          <div role="row" className="wgi-schedule-weekdays">
            {view.columns.map((column, index) => (
              <div key={column.label} role="columnheader" aria-label={WEEKDAY_NAMES[index]}>
                {column.label}
              </div>
            ))}
          </div>
          {view.weeks.map((week, row) => (
            <div
              key={week.find((cell) => cell.kind !== "blank")?.date ?? row}
              role="row"
              className="wgi-schedule-week"
            >
              {week.map((cell, index) => renderCell(cell, index))}
            </div>
          ))}
        </div>
        <Legend />
      </div>
      <Popover.Root
        handle={handle}
        onOpenChange={(open, details) => {
          window.clearTimeout(cool.current);
          if (open) {
            if (details.reason !== "imperative-action") {
              byFocus.current = false;
              setKeyed(false);
            }
            setWarm(true);
            return;
          }
          byFocus.current = false;
          cool.current = window.setTimeout(() => {
            setWarm(false);
          }, WARM_GRACE);
        }}
      >
        {({ payload }) =>
          payload === undefined ? null : <DayPreviewPopup preview={payload} keyed={keyed} />
        }
      </Popover.Root>
    </section>
  );
}
