"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  createContext,
  use,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  CSSProperties,
  FocusEvent,
  KeyboardEvent,
  MouseEvent,
  ReactNode,
  RefObject,
} from "react";
import type { DayProps, MonthGridProps } from "react-day-picker";

import { ChevronLeft, ChevronRight } from "@/components/icons";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverTrigger } from "@/components/ui/popover";
import { createPopoverHandle, usePopoverHoverIntent } from "@/components/ui/popover-behavior";
import type { PopoverHandle } from "@/components/ui/popover-behavior";

import { CellBody, DayPreviewPopup, Legend } from "./month-day-preview";
import type { DayPreview, ScheduleCell, ScheduleMonth } from "./schedule-model";
import { ScheduleArrow, ScheduleToolsWithShortcuts } from "./schedule-toolbar";
import { dayHref, weekHref, weekStartOf } from "./week-calendar";

/* The Schedule's month view (Figma Ypf9ohpRcGWF5C9T9bSvWW, section 08, S1;
   the day preview is H1, node 656:8201). Every practice day says how many
   visits it still has open, tinted deeper as it fills; past days say how
   many patients were seen, closed days are outlined and say nothing else.

   The month is ui/calendar: DayPicker lays the month out in weeks and
   each day is the model's own cell (closed, past, future or outside the
   month), so the grid, its rows and its cells are this view's markup.
   It is one grid with one tab stop: the arrow keys move a day or a week,
   Home and End go to the month's first and last day, and Page Up and
   Page Down open the month before or after with the same day focused
   (the last day when it is shorter). A future day
   previews its providers in a popover beside it (HIG Popovers: the arrow
   points at its source and it never covers it):

   - A pointer resting on a day opens it after a short delay; once one is
     open, or just closed, the next day opens at once, so sweeping across
     a week is one gesture.
   - Keyboard focus on a day opens it at once and it follows focus; the
     day keeps focus (the popover holds nothing to press), and Escape
     closes it without moving focus.
   - A click on a day, or Return or Space on the focused one, opens it in
     the day view (issue #351); the preview's "Open day" does the same
     for a pointer resting there.

   One popover serves every day through a handle, so there is never more
   than one open. */

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
const PREVIEW_INTENT = { rest: 400, warm: 300 } as const;

const DAY_MS = 86_400_000;

function addDays(date: string, days: number): string {
  return new Date(Date.parse(`${date}T12:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);
}

function monthHref(month: string): string {
  return `/admin/schedule?month=${month}`;
}

/* The same day of the month in another month, or its last day. */
function sameDayIn(month: string, date: string): string {
  const year = Number(month.slice(0, 4));
  const index = Number(month.slice(5, 7));
  const length = new Date(Date.UTC(year, index, 0)).getUTCDate();
  const day = Math.min(Number(date.slice(8, 10)), length);
  return `${month}-${String(day).padStart(2, "0")}`;
}

/* The day Page Up or Page Down asked for. The loading boundary can mount
   a fresh view for the new month, so it outlives the one that asked. */
let pageFocus: string | null = null;

/* What the grid, its rows and its days need from the view that renders
   them. DayPicker owns their props; a context carries the rest, so the
   parts are defined once rather than per render. The grid's keys, focus
   and presses reach the view's latest handlers through a ref, so the
   value changes only when what the days show does. */
interface MonthContext {
  readonly view: ScheduleMonth;
  readonly titleId: string;
  readonly active: string;
  readonly cells: ReadonlyMap<string, ScheduleCell>;
  readonly handle: PopoverHandle<DayPreview>;
  readonly triggerProps: ReturnType<typeof usePopoverHoverIntent<DayPreview>>["triggerProps"];
  readonly baseId: string;
  readonly handlers: RefObject<GridHandlers | null>;
}

interface GridHandlers {
  readonly onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
  // oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React events carry DOM member types that cannot be made readonly
  readonly onFocus: (event: FocusEvent<HTMLDivElement>) => void;
  // oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React events carry DOM member types that cannot be made readonly
  readonly onBlur: (event: FocusEvent<HTMLDivElement>) => void;
  readonly onClick: (event: MouseEvent<HTMLDivElement>) => void;
}

const MonthGridContext = createContext<MonthContext | null>(null);

function useMonth(): MonthContext {
  const context = use(MonthGridContext);
  if (context === null) throw new Error("The month's parts render inside ScheduleMonthView.");
  return context;
}

function Passthrough({ children }: Readonly<{ children?: ReactNode }>) {
  return <>{children}</>;
}

/* The header above names the month; DayPicker's caption would say it
   again, and announce it. */
function NoCaption() {
  return <></>;
}

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- DayPicker passes DOM table props that cannot be made readonly
function MonthGrid({ children }: MonthGridProps) {
  const month = useMonth();
  return (
    <div
      role="grid"
      data-slot="calendar"
      aria-labelledby={month.titleId}
      aria-readonly="true"
      className="wgi-schedule-grid"
      onKeyDown={(event) => month.handlers.current?.onKeyDown(event)}
      onFocus={(event) => month.handlers.current?.onFocus(event)}
      onBlur={(event) => month.handlers.current?.onBlur(event)}
      onClick={(event) => month.handlers.current?.onClick(event)}
    >
      {children}
    </div>
  );
}

function Weekdays() {
  const { view } = useMonth();
  return (
    <div role="row" className="wgi-schedule-weekdays">
      {view.columns.map((column, index) => (
        <div key={column.label} role="columnheader" aria-label={WEEKDAY_NAMES[index]}>
          {column.label}
        </div>
      ))}
    </div>
  );
}

function Week({ children }: Readonly<{ children?: ReactNode }>) {
  return (
    <div role="row" className="wgi-schedule-week">
      {children}
    </div>
  );
}

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- DayPicker passes the day and DOM props that cannot be made readonly
function Day({ day }: DayProps) {
  const month = useMonth();
  const cell = day.outside ? undefined : month.cells.get(day.isoDate);
  if (cell === undefined || cell.kind === "blank")
    return (
      <div role="gridcell" aria-label="Outside this month" className="wgi-day" data-kind="blank" />
    );
  const narrow = month.view.columns[day.date.getDay()]?.narrow ?? false;
  const shared = {
    id: `${month.baseId}-${cell.date}`,
    tabIndex: cell.date === month.active ? 0 : -1,
    "aria-label": cell.label,
    "aria-current": cell.today ? ("date" as const) : undefined,
    className: "wgi-day",
    "data-kind": cell.kind,
    "data-narrow": narrow || undefined,
  };
  if (cell.kind !== "future")
    return (
      <div role="gridcell" {...shared} data-day={cell.date}>
        <CellBody cell={cell} narrow={narrow} />
      </div>
    );
  return (
    <PopoverTrigger
      role="gridcell"
      {...shared}
      {...month.triggerProps}
      handle={month.handle}
      payload={cell.preview}
      nativeButton={false}
      render={<div />}
      data-tone={cell.tone}
      data-day={cell.date}
      /* A press opens the day (the view's handler); the preview is hover's. */
      onClick={(event: MouseEvent<HTMLElement> & { preventBaseUIHandler: () => void }) => {
        event.preventBaseUIHandler();
      }}
    >
      <CellBody cell={cell} narrow={narrow} />
    </PopoverTrigger>
  );
}

const MONTH_COMPONENTS = {
  Root: Passthrough,
  Months: Passthrough,
  Month: Passthrough,
  MonthCaption: NoCaption,
  MonthGrid,
  Weekdays,
  Weeks: Passthrough,
  Week,
  Day,
};

function monthStart(month: string): Date {
  return new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)) - 1, 1);
}

export function ScheduleMonthView({ view }: Readonly<{ view: ScheduleMonth }>) {
  const router = useRouter();
  const baseId = useId();
  const titleId = `${baseId}-title`;
  const cellId = (date: string) => `${baseId}-${date}`;
  const days = view.weeks.flat().filter((cell) => cell.kind !== "blank");
  const firstDay = days[0]?.date ?? "";
  const lastDay = days.at(-1)?.date ?? "";
  /* Where D and W go: today in this month, else its first day with hours. */
  const anchor = days.some((cell) => cell.today)
    ? null
    : (days.find((cell) => cell.kind !== "closed")?.date ?? null);
  const home = days.find((cell) => cell.today)?.date ?? firstDay;
  const [active, setActive] = useState(() => pageFocus ?? home);
  /* A view that stays mounted across months keeps its last day; one not
     in this month gives the tab stop back to today or the first day. */
  const current = days.some((cell) => cell.date === active) ? active : home;
  const [handle] = useState(() => createPopoverHandle<DayPreview>());
  /* Rest, warmth, and keyed opens that appear and leave at once. */
  const intent = usePopoverHoverIntent(handle, PREVIEW_INTENT);
  /* The preview follows focus only while focus opened it; a hovered one
     is left to its own dismissal. */
  const byFocus = useRef(false);

  const columns: CSSProperties & Record<`--${string}`, string> = {
    "--schedule-columns": view.columns
      .map((column) => (column.narrow ? "4rem" : "minmax(0, 1fr)"))
      .join(" "),
  };

  /* The day Page Up or Page Down asked for takes focus once its month is
     on screen. */
  useEffect(() => {
    const target = pageFocus;
    if (target === null || !target.startsWith(view.month)) return;
    pageFocus = null;
    document.getElementById(`${baseId}-${target}`)?.focus();
  }, [baseId, view.month]);

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
      moveTo(addDays(current, step));
    } else if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      moveTo(event.key === "Home" ? firstDay : lastDay);
    } else if (event.key === "PageUp" || event.key === "PageDown") {
      event.preventDefault();
      const month = event.key === "PageUp" ? view.previous : view.next;
      if (month === null) return;
      if (handle.isOpen) handle.close();
      const target = sameDayIn(month, current);
      pageFocus = target;
      setActive(target);
      router.push(monthHref(month), { scroll: false });
    } else if (
      (event.key === "Enter" || event.key === " ") &&
      event.target instanceof HTMLElement &&
      event.target.id === cellId(current)
    ) {
      event.preventDefault();
      router.push(dayHref(current));
    }
  }

  /* The day a focus or press event came from, if any. */
  function dayOf(target: EventTarget): HTMLElement | null {
    if (!(target instanceof Element)) return null;
    return target.closest<HTMLElement>(".wgi-day[data-day]");
  }

  /* Focus on a future day opens its preview at once; focus on any other
     day closes one that focus opened. */
  // oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React events carry DOM member types that cannot be made readonly
  function onDayFocus(event: FocusEvent<HTMLDivElement>) {
    const day = dayOf(event.target);
    if (day?.dataset.day === undefined) return;
    setActive(day.dataset.day);
    if (day.dataset.kind === "future" && day.matches(":focus-visible")) {
      byFocus.current = true;
      intent.openNow(day.id);
    } else if (byFocus.current && handle.isOpen) handle.close();
  }

  function onDayClick(event: MouseEvent<HTMLDivElement>) {
    const date = dayOf(event.target)?.dataset.day;
    if (date !== undefined) router.push(dayHref(date));
  }

  // oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React events carry DOM member types that cannot be made readonly
  function onGridBlur(event: FocusEvent<HTMLDivElement>) {
    const next = event.relatedTarget;
    if (!byFocus.current || !handle.isOpen) return;
    if (next instanceof Element && event.currentTarget.contains(next)) return;
    handle.close();
  }

  const handlers = useRef<GridHandlers>(null);
  useLayoutEffect(() => {
    handlers.current = {
      onKeyDown: onGridKeyDown,
      onFocus: onDayFocus,
      onBlur: onGridBlur,
      onClick: onDayClick,
    };
  });
  const triggerProps = intent.triggerProps;
  const context = useMemo<MonthContext>(
    () => ({
      view,
      titleId,
      active: current,
      cells: new Map(
        view.weeks.flat().flatMap((cell) => (cell.kind === "blank" ? [] : [[cell.date, cell]])),
      ),
      handle,
      triggerProps,
      baseId,
      handlers,
    }),
    [view, titleId, current, handle, triggerProps, baseId],
  );

  return (
    <section className="wgi-schedule" aria-labelledby={titleId}>
      <header className="wgi-schedule-head">
        <div className="wgi-schedule-nav">
          <h1 id={titleId} className="wgi-schedule-title">
            {view.title}
          </h1>
          <div className="wgi-schedule-arrows">
            <ScheduleArrow
              href={view.previous === null ? null : monthHref(view.previous)}
              label="Previous month"
            >
              <ChevronLeft width={20} height={20} />
            </ScheduleArrow>
            <ScheduleArrow
              href={view.next === null ? null : monthHref(view.next)}
              label="Next month"
            >
              <ChevronRight width={20} height={20} />
            </ScheduleArrow>
          </div>
          <Link href="/admin/schedule" className="wgi-schedule-today">
            Today
          </Link>
        </div>
        <ScheduleToolsWithShortcuts
          value="month"
          targets={{
            today: "/admin/schedule",
            next: view.next === null ? null : monthHref(view.next),
            previous: view.previous === null ? null : monthHref(view.previous),
            day: dayHref(anchor),
            week: weekHref(anchor === null ? null : weekStartOf(anchor), []),
            month: null,
          }}
        />
      </header>
      <div className="wgi-schedule-surface" style={columns}>
        <MonthGridContext value={context}>
          <Calendar
            components={MONTH_COMPONENTS}
            month={monthStart(view.month)}
            hideNavigation
            showOutsideDays={false}
            weekStartsOn={0}
          />
        </MonthGridContext>
        <Legend />
      </div>
      <Popover
        handle={handle}
        onOpenChange={(open, details) => {
          intent.onOpenChange(open, details);
          if (!open || details.reason !== "imperative-action") byFocus.current = false;
        }}
      >
        {({ payload }) =>
          payload === undefined ? null : <DayPreviewPopup preview={payload} keyed={intent.keyed} />
        }
      </Popover>
    </section>
  );
}
