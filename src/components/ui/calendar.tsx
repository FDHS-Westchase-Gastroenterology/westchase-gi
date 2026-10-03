"use client";

import { cn } from "cn";
import { ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { ComponentProps } from "react";
import { DayPicker, getDefaultClassNames } from "react-day-picker";
import type { DateRange, DayButton } from "react-day-picker";

/*
 * A month of days to pick from: the staff home's Received range and the
 * record card's return day, the booking month (issue #344) and the
 * Schedule's month (issue #343), each adopted here by issue #360.
 * Adapted from the shadcn Calendar (src/components/stock/calendar.tsx) on
 * the same react-day-picker parts and class map. A consumer restyles it
 * through its own class on the root (`wgi-editor-cal` and the surfaces
 * that extend it in home.css) and replaces whole parts through
 * `components`, as the booking month's day and the Schedule's month do.
 *
 * Changes from the registry:
 * - The navigation and day buttons wear the stock button's ghost and icon
 *   classes directly rather than importing a button recipe, because the
 *   portal's ui/button carries its own type and motion and a calendar day
 *   is not one of its buttons. The `buttonVariant` prop goes with it.
 * - The day button is a plain `<button>` that keeps the ref its focus
 *   effect uses, so the day DayPicker marks focused takes focus. Its
 *   `data-day` is the ISO date rather than a locale string, so the server
 *   and the browser render the same markup.
 * - Motion names its properties: fill, ink, ring and the 1px press, at
 *   the micro duration on the exit curve (the registry ships
 *   `transition-all` on Tailwind's ease). A surface that restates it
 *   (the record card's and the booking month's days) keeps its own.
 * - CalendarRange and CalendarDay (formerly Home's parts/calendar.tsx)
 *   speak the portal's practice-local day strings (YYYY-MM-DD) in and
 *   out, so no consumer holds a browser-zone Date: the Received editor's
 *   range, the record card's return day and the week card's reschedule
 *   day (issue #345).
 */

const navButtonClasses = [
  "inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding",
  "outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
  "hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-50",
  "transition-[color,background-color,border-color,box-shadow,transform]",
  "duration-(--motion-micro-duration) ease-(--motion-exit) active:translate-y-px",
  "[&_svg]:pointer-events-none [&_svg]:shrink-0",
];

const dayButtonClasses = [
  ...navButtonClasses,
  "relative isolate z-10 flex aspect-square size-auto w-full min-w-(--cell-size) flex-col gap-1 border-0 text-sm leading-none font-normal whitespace-nowrap",
  "group-data-[focused=true]/day:relative group-data-[focused=true]/day:z-10 group-data-[focused=true]/day:border-ring group-data-[focused=true]/day:ring-[3px] group-data-[focused=true]/day:ring-ring/50",
  "data-[range-end=true]:rounded-(--cell-radius) data-[range-end=true]:rounded-r-(--cell-radius) data-[range-end=true]:bg-primary data-[range-end=true]:text-primary-foreground",
  "data-[range-middle=true]:rounded-none data-[range-middle=true]:bg-muted data-[range-middle=true]:text-foreground",
  "data-[range-start=true]:rounded-(--cell-radius) data-[range-start=true]:rounded-l-(--cell-radius) data-[range-start=true]:bg-primary data-[range-start=true]:text-primary-foreground",
  "data-[selected-single=true]:bg-primary data-[selected-single=true]:text-primary-foreground",
  "[&>span]:text-xs [&>span]:opacity-70",
];

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- DayPicker props carry Date and callback members that cannot be made readonly
function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = "label",
  locale,
  formatters,
  components,
  ...props
}: ComponentProps<typeof DayPicker>) {
  const defaultClassNames = getDefaultClassNames();

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn(
        "group/calendar bg-background p-2 [--cell-radius:var(--radius-md)] [--cell-size:--spacing(7)] in-data-[slot=card-content]:bg-transparent in-data-[slot=popover-content]:bg-transparent",
        String.raw`rtl:**:[.rdp-button\_next>svg]:rotate-180`,
        String.raw`rtl:**:[.rdp-button\_previous>svg]:rotate-180`,
        className,
      )}
      captionLayout={captionLayout}
      locale={locale}
      formatters={{
        formatMonthDropdown: (date) => date.toLocaleString(locale?.code, { month: "short" }),
        ...formatters,
      }}
      classNames={{
        root: cn("w-fit", defaultClassNames.root),
        months: cn("relative flex flex-col gap-4 md:flex-row", defaultClassNames.months),
        month: cn("flex w-full flex-col gap-4", defaultClassNames.month),
        nav: cn(
          "absolute inset-x-0 top-0 flex w-full items-center justify-between gap-1",
          defaultClassNames.nav,
        ),
        button_previous: cn(
          navButtonClasses,
          "size-(--cell-size) p-0 select-none aria-disabled:opacity-50",
          defaultClassNames.button_previous,
        ),
        button_next: cn(
          navButtonClasses,
          "size-(--cell-size) p-0 select-none aria-disabled:opacity-50",
          defaultClassNames.button_next,
        ),
        month_caption: cn(
          "flex h-(--cell-size) w-full items-center justify-center px-(--cell-size)",
          defaultClassNames.month_caption,
        ),
        dropdowns: cn(
          "flex h-(--cell-size) w-full items-center justify-center gap-1.5 text-sm font-medium",
          defaultClassNames.dropdowns,
        ),
        dropdown_root: cn("relative rounded-(--cell-radius)", defaultClassNames.dropdown_root),
        dropdown: cn("absolute inset-0 bg-popover opacity-0", defaultClassNames.dropdown),
        caption_label: cn(
          "font-medium select-none",
          captionLayout === "label"
            ? "text-sm"
            : "flex items-center gap-1 rounded-(--cell-radius) text-sm [&>svg]:size-3.5 [&>svg]:text-muted-foreground",
          defaultClassNames.caption_label,
        ),
        month_grid: cn("w-full border-collapse", defaultClassNames.month_grid),
        weekdays: cn("flex", defaultClassNames.weekdays),
        weekday: cn(
          "flex-1 rounded-(--cell-radius) text-[0.8rem] font-normal text-muted-foreground select-none",
          defaultClassNames.weekday,
        ),
        week: cn("mt-2 flex w-full", defaultClassNames.week),
        week_number_header: cn("w-(--cell-size) select-none", defaultClassNames.week_number_header),
        week_number: cn(
          "text-[0.8rem] text-muted-foreground select-none",
          defaultClassNames.week_number,
        ),
        day: cn(
          "group/day relative aspect-square h-full w-full rounded-(--cell-radius) p-0 text-center select-none [&:last-child[data-selected=true]_button]:rounded-r-(--cell-radius)",
          props.showWeekNumber === true
            ? "[&:nth-child(2)[data-selected=true]_button]:rounded-l-(--cell-radius)"
            : "[&:first-child[data-selected=true]_button]:rounded-l-(--cell-radius)",
          defaultClassNames.day,
        ),
        range_start: cn(
          "relative isolate z-0 rounded-l-(--cell-radius) bg-muted after:absolute after:inset-y-0 after:right-0 after:w-4 after:bg-muted",
          defaultClassNames.range_start,
        ),
        range_middle: cn("rounded-none", defaultClassNames.range_middle),
        range_end: cn(
          "relative isolate z-0 rounded-r-(--cell-radius) bg-muted after:absolute after:inset-y-0 after:left-0 after:w-4 after:bg-muted",
          defaultClassNames.range_end,
        ),
        today: cn(
          "rounded-(--cell-radius) bg-muted text-foreground data-[selected=true]:rounded-none",
          defaultClassNames.today,
        ),
        outside: cn(
          "text-muted-foreground aria-selected:text-muted-foreground",
          defaultClassNames.outside,
        ),
        disabled: cn("text-muted-foreground opacity-50", defaultClassNames.disabled),
        hidden: cn("invisible", defaultClassNames.hidden),
        ...classNames,
      }}
      components={{
        Root: ({ className: rootClassName, rootRef, ...rootProps }) => (
          <div data-slot="calendar" ref={rootRef} className={rootClassName} {...rootProps} />
        ),
        Chevron: ({ className: chevronClassName, orientation, ...chevronProps }) => {
          if (orientation === "left")
            return <ChevronLeftIcon className={cn("size-4", chevronClassName)} {...chevronProps} />;
          if (orientation === "right")
            return (
              <ChevronRightIcon className={cn("size-4", chevronClassName)} {...chevronProps} />
            );
          return <ChevronDownIcon className={cn("size-4", chevronClassName)} {...chevronProps} />;
        },
        DayButton: CalendarDayButton,
        WeekNumber: ({ children, ...weekProps }) => (
          <td {...weekProps}>
            <div className="flex size-(--cell-size) items-center justify-center text-center">
              {children}
            </div>
          </td>
        ),
        ...components,
      }}
      {...props}
    />
  );
}

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- DayPicker passes DOM button props that cannot be made readonly
function CalendarDayButton({
  className,
  day,
  modifiers,
  ...props
}: ComponentProps<typeof DayButton>) {
  const defaultClassNames = getDefaultClassNames();
  const ref = useRef<HTMLButtonElement>(null);
  /* DayPicker moves focus by marking a day focused; the button takes it. */
  useEffect(() => {
    if (modifiers.focused) ref.current?.focus();
  }, [modifiers.focused]);

  return (
    <button
      ref={ref}
      type="button"
      data-slot="calendar-day"
      data-day={day.isoDate}
      data-selected-single={
        modifiers.selected &&
        !modifiers.range_start &&
        !modifiers.range_end &&
        !modifiers.range_middle
      }
      data-range-start={modifiers.range_start}
      data-range-end={modifiers.range_end}
      data-range-middle={modifiers.range_middle}
      className={cn(dayButtonClasses, defaultClassNames.day, className)}
      {...props}
    />
  );
}

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

/* CalendarRange, for the Received editor's
   custom range: one month in range mode, speaking the editor's own day
   strings (YYYY-MM-DD, practice-local) in and out so the editor never holds
   a browser-zone Date. Paint is the stock calendar's, repainted through the
   portal bridge tokens; the popup it sits in is already `data-slot=
   popover-content`, so the grid's own background drops away.

   The grid is the whole popover while it shows (filter-bar: the Vercel
   model), so it takes the editor's width and, on mount, the keyboard — the
   picked start or today is the focused day. DayPicker's `autoFocus` marks
   that day and the recipe's day button takes focus (the editor parks focus
   on the popup before the swap so the popover's focus manager has nothing
   to re-home in between). */
function CalendarRange({
  className,
  from,
  to,
  fallbackMonth,
  onChange,
}: Readonly<{
  /** The surface's class on the root (Home's `wgi-editor-cal`). */
  className?: string;
  from: string;
  to: string;
  /** The day whose month opens when nothing is picked yet. */
  fallbackMonth: string;
  onChange: (from: string, to: string) => void;
}>) {
  const selected: DateRange | undefined =
    from === "" ? undefined : { from: dayToDate(from), to: dayToDate(to) };

  return (
    <div>
      <Calendar
        // react-doctor-disable-next-line react-doctor/no-autofocus -- the calendar replaces the list the user just clicked in; focus moves to the picked day (or today) inside the open popover, not on page load
        autoFocus
        className={className}
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

/* CalendarSpan, for a run of whole days taken off (issue #352, Figma St2:
   a provider's time off). One month in range mode, in the same day strings,
   with the behavior that frame asks for, which CalendarRange's editor does
   not want:
   - Click a start day, then an end day. The first click picks that one day
     and waits for the end; a click on or after it closes the run there; a
     click before it, or any click once the run is closed, starts over. One
     day alone is a valid run.
   - Or drag across the days: pressing a day and moving over others selects
     from the pressed day to the one under the pointer, either direction,
     and releasing ends it. The click that ends a drag is swallowed so it
     does not restart the run.
   - Days before `min` are disabled, and the month cannot page back past it.
   - Days in `off` (already taken) carry the `is-off` class on their cell, so
     the surface strikes them through; they stay pickable, because the
     server takes overlapping time off as one more row.
   Day buttons keep DayPicker's roving focus and Enter/Space, so the
   keyboard picks a run the click way. */
function CalendarSpan({
  className,
  from,
  to,
  min,
  off,
  onChange,
}: Readonly<{
  /** The surface's class on the root. */
  className?: string;
  /** The run's first and last days, or "" when nothing is picked. */
  from: string;
  to: string;
  /** The first day that can be picked (YYYY-MM-DD, practice-local). */
  min: string;
  /** Days already taken, struck through. */
  off: readonly string[];
  onChange: (from: string, to: string) => void;
}>) {
  const first = parseDay(min);
  const [open, setOpen] = useState(from !== "" && from === to);
  const press = useRef<{ anchor: string; dragged: boolean } | null>(null);
  const swallow = useRef(false);
  const selected: DateRange | undefined =
    from === "" ? undefined : { from: dayToDate(from), to: dayToDate(to) };

  function dayAt(target: EventTarget | null): string | null {
    if (!(target instanceof Element)) return null;
    const button = target.closest<HTMLButtonElement>("button[data-day]");
    if (button === null || button.disabled) return null;
    return button.dataset.day ?? null;
  }

  return (
    <div
      onPointerDown={(event) => {
        const day = event.button === 0 ? dayAt(event.target) : null;
        press.current = day === null ? null : { anchor: day, dragged: false };
      }}
      onPointerOver={(event) => {
        const held = press.current;
        const day = dayAt(event.target);
        if (held === null || day === null || (event.buttons & 1) === 0) return;
        if (day === held.anchor && !held.dragged) return;
        held.dragged = true;
        setOpen(false);
        onChange(day < held.anchor ? day : held.anchor, day < held.anchor ? held.anchor : day);
      }}
      onPointerUp={() => {
        swallow.current = press.current?.dragged === true;
        press.current = null;
      }}
      onClickCapture={(event) => {
        if (!swallow.current) return;
        swallow.current = false;
        event.preventDefault();
        event.stopPropagation();
      }}
    >
      <Calendar
        className={className}
        mode="range"
        numberOfMonths={1}
        defaultMonth={dayToDate(from) ?? first}
        startMonth={first}
        disabled={{ before: first }}
        modifiers={{ off: off.map((day) => parseDay(day)) }}
        modifiersClassNames={{ off: "is-off" }}
        selected={selected}
        onSelect={(_range, picked) => {
          const day = dateToDay(picked);
          if (open && from !== "" && day >= from) {
            setOpen(false);
            onChange(from, day);
          } else {
            setOpen(true);
            onChange(day, day);
          }
        }}
      />
    </div>
  );
}

/* The same Calendar in single-day mode: the record card's return day and
   the week card's reschedule day. No autoFocus — focus stays on the answer
   the staff member just picked — and `required`, because a return day is
   never optional. `fixedWeeks` keeps every month six rows tall, so the
   card is the same height whatever month is showing. The grid opens
   blank: no day is presumed, and today loses the stock calendar's tint
   (its `rdp-today` marker stays for assistive tech), so the only shaded
   cell is the one staff clicked. The month follows a picked day (an
   outside day at the grid's edge opens its month) and otherwise stays
   where staff navigated it; that sync is a during-render derivation, not
   an effect. */
function CalendarDay({
  className,
  day,
  min,
  max,
  disabled,
  onChange,
}: Readonly<{
  /** The surface's class on the root (Home's `wgi-editor-cal`). */
  className?: string;
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
      className={className}
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

export { Calendar, CalendarDay, CalendarDayButton, CalendarRange, CalendarSpan };
