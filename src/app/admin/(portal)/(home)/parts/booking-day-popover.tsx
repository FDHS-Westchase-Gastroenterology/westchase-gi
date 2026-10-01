"use client";

import { Popover } from "@base-ui/react/popover";
import { useId, useMemo, useState } from "react";

import {
  closedReasons,
  dayOf,
  daySubtitle,
  fullyBooked,
  longDay,
  nearestOpen,
  openBlocks,
} from "@/app/admin/(portal)/(home)/card-booking-days";
import type { OpenBlock, TakenTime } from "@/app/admin/(portal)/(home)/card-booking-days";
import { clockLabel } from "@/app/admin/(portal)/(home)/record-card-time";
import type { CardMonthStatus } from "@/app/admin/(portal)/(home)/use-card-month";
import type {
  MonthAvailability,
  MonthAvailabilityDay,
} from "@/lib/portal/scheduling/read-contracts";

/* The booking month's day popover (issue #344; Figma 09d, 09e): the open
   starts per provider for one day, why a closed day is closed, a start
   lost to someone else struck beside the nearest one still open, and
   "Enter a time…" for a start the month does not offer. One popover serves
   every day through a handle (parts/booking-calendar.tsx), so there is
   never more than one open; its payload is the day, and what it lists is
   read from the month at render, so a re-read redraws it in place. */

/** A day popover's payload: the practice-local day. */
interface DayPayload {
  readonly date: string;
}

const CARD_SURFACE = ".wgi-record-card";

/* The handle lives with the card, so a start lost to someone else can
   reopen its day's popover from the booking's own outcome. */
export function useDayPopover() {
  const baseId = useId();
  const [handle] = useState(() => Popover.createHandle<DayPayload>());
  /* The keyboard opened it: no transition, and it follows focus. */
  const [keyboard, setKeyboard] = useState(false);
  return useMemo(() => {
    const idFor = (date: string) => `${baseId}-day-${date}`;
    return {
      handle,
      keyboard,
      setKeyboard,
      idFor,
      /** Opens a day's popover at once, as if the keyboard had. A day that
         is not a trigger on screen (another month, a locked card) has no
         popover to open. */
      openNow: (date: string) => {
        if (document.getElementById(idFor(date)) === null) return;
        setKeyboard(true);
        handle.open(idFor(date));
      },
      close: () => {
        handle.close();
      },
    };
  }, [baseId, handle, keyboard]);
}

export type DayPopover = ReturnType<typeof useDayPopover>;

/* The popover's anchor: the card's full width at the day's row, so it
   stands clear of the month on either side with its arrow level with the
   row. Read on every positioning pass, it follows the card when dragged. */
function useAnchor(triggerId: string) {
  return useMemo(
    () =>
      function anchor() {
        const trigger = document.getElementById(triggerId);
        if (trigger === null) return null;
        return {
          contextElement: trigger,
          getBoundingClientRect: () => {
            const row = trigger.getBoundingClientRect();
            const card = trigger.closest(CARD_SURFACE)?.getBoundingClientRect();
            return card === undefined
              ? row
              : new DOMRect(card.left, row.top, card.width, row.height);
          },
        };
      },
    [triggerId],
  );
}

export interface DayPopupActions {
  /** A start from the popover: the day, the provider and office, the time. */
  readonly onPickOpen: (
    pick: Readonly<{ day: string; providerId: string; locationId: string; time: string }>,
  ) => void;
  /** Enter a time…: the provider and time row for this day. */
  readonly onSqueeze: (day: string) => void;
}

/* One provider's open starts at one office, three to a row; a start lost
   to someone else stays struck in place with the nearest one offered. */
// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- the popover handle and the actions carry Base UI and callback members that cannot be made readonly
function DayBlock({
  date,
  block,
  nearest,
  nearestName,
  popover,
  actions,
}: Readonly<{
  date: string;
  block: OpenBlock;
  nearest: ReturnType<typeof nearestOpen>;
  nearestName: string;
  popover: DayPopover;
  actions: DayPopupActions;
}>) {
  const lost = block.times.some((time) => time.taken);
  return (
    <section className="wgi-day-block">
      <p className="wgi-day-provider">
        <b>{block.providerName}</b>
        <span>{block.locationName}</span>
      </p>
      <ul className="wgi-day-times" aria-label={`${block.providerName}, ${block.locationName}`}>
        {block.times.map((start) => (
          <li key={start.time}>
            <button
              type="button"
              className="wgi-day-time"
              data-taken={start.taken || undefined}
              disabled={start.taken}
              aria-label={
                start.taken ? `${clockLabel(start.time)}, booked a moment ago` : undefined
              }
              onClick={() => {
                actions.onPickOpen({
                  day: date,
                  providerId: block.providerId,
                  locationId: block.locationId,
                  time: start.time,
                });
                popover.close();
              }}
            >
              {clockLabel(start.time)}
            </button>
          </li>
        ))}
      </ul>
      {lost ? (
        <div className="wgi-day-lost">
          <p className="wgi-day-taken">Booked a moment ago.</p>
          {nearest === null ? null : (
            <button
              type="button"
              className="wgi-day-use"
              onClick={() => {
                actions.onPickOpen({ day: date, ...nearest });
                popover.close();
              }}
            >
              Use {clockLabel(nearest.time)}
              {nearestName === "" ? null : ` with ${nearestName}`}
            </button>
          )}
        </div>
      ) : null}
    </section>
  );
}

/* The day's open starts by provider, or, with none, why each provider has
   none. A start lost to someone else offers the nearest one left. */
// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- the popover handle and the actions carry Base UI and callback members that cannot be made readonly
function DayBody({
  date,
  read,
  blocks,
  availability,
  taken,
  popover,
  actions,
}: Readonly<{
  date: string;
  read: MonthAvailabilityDay;
  blocks: readonly OpenBlock[];
  availability: MonthAvailability | null;
  taken: TakenTime | null;
  popover: DayPopover;
  actions: DayPopupActions;
}>) {
  if (blocks.length === 0) {
    const reasons = closedReasons(read);
    if (reasons.length === 0) return null;
    return (
      <div className="wgi-day-body">
        <ul className="wgi-day-reasons">
          {reasons.map((line) => (
            <li key={line.providerId}>
              <span>{line.name}</span>
              <span className="wgi-day-reason">{line.reason}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  }
  const nearest = taken?.day === date ? nearestOpen(read, taken) : null;
  const nearestName =
    nearest === null || nearest.providerId === taken?.providerId
      ? ""
      : (availability?.providers.find((provider) => provider.id === nearest.providerId)?.name ??
        "");
  const full = fullyBooked(read);
  return (
    <div className="wgi-day-body">
      {blocks.map((block) => (
        <DayBlock
          key={`${block.providerId}:${block.locationId}`}
          date={date}
          block={block}
          nearest={nearest}
          nearestName={nearestName}
          popover={popover}
          actions={actions}
        />
      ))}
      {full.length === 0 ? null : <p className="wgi-day-full">Fully booked: {full.join(", ")}</p>}
    </div>
  );
}

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- the popover handle and the actions carry Base UI and callback members that cannot be made readonly
export function DayPopup({
  date,
  availability,
  status,
  taken,
  popover,
  actions,
}: Readonly<{
  date: string;
  availability: MonthAvailability | null;
  status: CardMonthStatus;
  taken: TakenTime | null;
  popover: DayPopover;
  actions: DayPopupActions;
}>) {
  const anchor = useAnchor(popover.idFor(date));
  const read = dayOf(availability, date);
  const blocks = read === null ? [] : openBlocks(read, taken);

  return (
    <Popover.Portal>
      <Popover.Positioner
        anchor={anchor}
        side="right"
        align="center"
        sideOffset={12}
        collisionPadding={12}
        arrowPadding={14}
        collisionAvoidance={{ side: "flip", align: "shift", fallbackAxisSide: "none" }}
        className="wgi-day-positioner"
      >
        {/* The day keeps focus: Tab is the way in (BookingDayButton). */}
        <Popover.Popup
          className="wgi-popover wgi-day-popover"
          initialFocus={false}
          data-keyboard={popover.keyboard || undefined}
        >
          <Popover.Arrow className="wgi-history-arrow wgi-day-arrow" />
          <div className="wgi-day-head">
            <Popover.Title className="wgi-day-title">{longDay(date)}</Popover.Title>
            <p className="wgi-day-sub">{daySubtitle(read, blocks.length, status)}</p>
          </div>
          {read === null ? null : (
            <DayBody
              date={date}
              read={read}
              blocks={blocks}
              availability={availability}
              taken={taken}
              popover={popover}
              actions={actions}
            />
          )}
          <div className="wgi-day-foot">
            <button
              type="button"
              className="wgi-day-enter"
              onClick={() => {
                actions.onSqueeze(date);
                popover.close();
              }}
            >
              Enter a time…
            </button>
          </div>
        </Popover.Popup>
      </Popover.Positioner>
    </Popover.Portal>
  );
}
