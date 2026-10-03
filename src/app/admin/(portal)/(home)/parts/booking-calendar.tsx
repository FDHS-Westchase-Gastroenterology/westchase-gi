"use client";

import { createContext, use, useEffect, useMemo, useRef } from "react";
import type { FocusEvent, KeyboardEvent } from "react";
import { getDefaultClassNames } from "react-day-picker";
import type { DayButtonProps } from "react-day-picker";

import { dayAccessibleName, dayIsOpen, dayOf } from "@/app/admin/(portal)/(home)/card-booking-days";
import type { TakenTime } from "@/app/admin/(portal)/(home)/card-booking-days";
import { DAY_POPOVER } from "@/app/admin/(portal)/(home)/sheet-coexistence";
import type { CardMonthStatus } from "@/app/admin/(portal)/(home)/use-card-month";
import { Calendar } from "@/components/stock/calendar";
import { Popover, PopoverTrigger } from "@/components/ui/popover";
import type { MonthAvailability } from "@/lib/portal/scheduling/read-contracts";

import { DayPopup } from "./booking-day-popover";
import type { DayPopover, DayPopupActions } from "./booking-day-popover";

/* The record card's month when a linked patient is being booked (issue
   #344; Figma Ypf9ohpRcGWF5C9T9bSvWW, sections 09d–09f). Every day with an
   open start wears a mint disc; a day not read yet looks exactly like a
   day with nothing open, so the month never shows a spinner. A day's
   popover stands beside the card with its arrow on the day's row, never
   over the month (HIG Popovers: the arrow points at its source, and it
   does not cover it):

   - A pointer resting on a day opens it, and resting on another day moves
     it there; crossing days on the way to the popover leaves it where it
     is, and leaving for elsewhere closes it (ui/popover's hover intent).
   - Keyboard focus on a day opens it at once, with no transition, and it
     follows focus through the grid; Tab moves into its times, Escape
     closes it and leaves focus on the day.
   - A tap opens it; the day's hit area is 44px round a 34px disc.

   One popover serves every day through a handle, so there is never more
   than one open (parts/booking-day-popover.tsx). */

/* What the custom day button needs from the calendar that renders it.
   DayPicker owns the button's props; a context carries the rest, so the
   component is defined once rather than per render. */
interface DayContext {
  readonly availability: MonthAvailability | null;
  readonly popover: DayPopover;
  readonly locked: boolean;
}

const BookingDayContext = createContext<DayContext | null>(null);

function dateToDay(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function parseDay(day: string): Date {
  return new Date(Number(day.slice(0, 4)), Number(day.slice(5, 7)) - 1, Number(day.slice(8, 10)));
}

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- DayPicker passes DOM button props that cannot be made readonly
function BookingDayButton({ day, modifiers, ...props }: DayButtonProps) {
  const context = use(BookingDayContext);
  const ref = useRef<HTMLButtonElement>(null);
  /* DayPicker moves focus by marking a day focused; the button takes it. */
  useEffect(() => {
    if (modifiers.focused) ref.current?.focus();
  }, [modifiers.focused]);

  const date = dateToDay(day.date);
  const read = context === null ? null : dayOf(context.availability, date);
  const name = dayAccessibleName(date, read);
  const selected = modifiers.selected;

  /* Days before today, other months' days and a locked card are inert:
     a plain disabled button, no popover. */
  if (context === null || modifiers.disabled || modifiers.outside) {
    return (
      <button ref={ref} type="button" {...props} aria-label={name}>
        <span className="wgi-day-number">{props.children}</span>
      </button>
    );
  }

  const { popover } = context;
  const id = popover.idFor(date);
  const { onFocus, onKeyDown, onClick, children, ...rest } = props;

  return (
    <PopoverTrigger
      ref={ref}
      handle={popover.handle}
      payload={{ date }}
      id={id}
      {...rest}
      {...popover.intent.triggerProps}
      aria-label={name}
      data-open-times={dayIsOpen(read) || undefined}
      data-selected-single={selected || undefined}
      // oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React focus events carry DOM member types that cannot be made readonly
      onFocus={(event: FocusEvent<HTMLButtonElement>) => {
        onFocus?.(event);
        if (event.currentTarget.matches(":focus-visible")) popover.openNow(date);
      }}
      onKeyDown={(event: KeyboardEvent<HTMLButtonElement>) => {
        if (event.key === "Escape" && popover.handle.isOpen) {
          /* The popover goes; the day keeps focus and the card stays. */
          event.stopPropagation();
          popover.close();
          return;
        }
        onKeyDown?.(event);
      }}
      onClick={(event) => {
        onClick?.(event);
        /* Enter or Space picks the day and keeps its popover up; the
           trigger's own toggle would close it under the keyboard. */
        if (event.detail === 0 && popover.handle.isOpen) event.preventBaseUIHandler();
      }}
    >
      <span className="wgi-day-number">{children}</span>
    </PopoverTrigger>
  );
}

const BOOKING_COMPONENTS = { DayButton: BookingDayButton };
const TODAY_CLASS = { today: getDefaultClassNames().today };

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- the popover handle and the actions carry Base UI and callback members that cannot be made readonly
export function BookingCalendar({
  month,
  day,
  today,
  last,
  availability,
  status,
  taken,
  locked,
  popover,
  onMonth,
  onDay,
  actions,
}: Readonly<{
  /** YYYY-MM on screen. */
  month: string;
  /** The picked day, or "". */
  day: string;
  /** Practice-local today and the last bookable day (YYYY-MM-DD). */
  today: string;
  last: string;
  availability: MonthAvailability | null;
  status: CardMonthStatus;
  taken: TakenTime | null;
  locked: boolean;
  popover: DayPopover;
  onMonth: (month: string) => void;
  onDay: (day: string) => void;
  actions: DayPopupActions;
}>) {
  const shown = parseDay(`${month}-01`);
  const first = parseDay(today);
  const end = parseDay(last);
  const context = useMemo(
    () => ({ availability, popover, locked }),
    [availability, popover, locked],
  );

  /* Focus leaving the month for anywhere but the popover closes a popover
     that focus opened. */
  // oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React focus events carry DOM member types that cannot be made readonly
  function onBlur(event: FocusEvent<HTMLElement>) {
    if (!popover.intent.keyed || !popover.handle.isOpen) return;
    const next = event.relatedTarget;
    if (
      next instanceof Element &&
      (event.currentTarget.contains(next) || next.closest(DAY_POPOVER) !== null)
    )
      return;
    popover.close();
  }

  return (
    <BookingDayContext value={context}>
      <div className="wgi-booking-month" onBlur={onBlur}>
        <Calendar
          className="wgi-editor-cal wgi-booking-cal"
          classNames={TODAY_CLASS}
          components={BOOKING_COMPONENTS}
          mode="single"
          required
          fixedWeeks
          numberOfMonths={1}
          month={shown}
          onMonthChange={(next) => {
            popover.close();
            onMonth(dateToDay(next).slice(0, 7));
          }}
          startMonth={first}
          endMonth={end}
          disabled={
            locked
              ? true
              : [
                  { before: first, after: end },
                  (date: Date) => date.getMonth() !== shown.getMonth(),
                ]
          }
          selected={day === "" ? undefined : parseDay(day)}
          onSelect={(date) => {
            onDay(dateToDay(date));
          }}
        />
      </div>
      <Popover handle={popover.handle} onOpenChange={popover.intent.onOpenChange}>
        {({ payload }) =>
          payload === undefined ? null : (
            <DayPopup
              date={payload.date}
              availability={availability}
              status={status}
              taken={taken}
              popover={popover}
              actions={actions}
            />
          )
        }
      </Popover>
    </BookingDayContext>
  );
}
