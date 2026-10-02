import type { Popover as PopoverPrimitive } from "@base-ui/react/popover";
import type { PointerEvent } from "react";

import { DAY_POPOVER } from "./sheet-coexistence";

/* Hover intent for the booking month's one day popover (issue #344), the
   way a macOS menu aims at its submenu: the popover stands beside the
   card, so the pointer on its way there crosses other days, and those
   days must not take it.

   - Entering another day while the popover is open does not move it;
     resting there for REST_DELAY does.
   - Leaving a day for anywhere but a day or the popover closes it after
     LEAVE_DELAY, unless the pointer keeps moving inside the triangle from
     where it left to the popover's near edge. Leaving the popover the
     same way closes it too.
   - Base UI still opens a closed month on rest and keeps the open day and
     the popover. Its own switching is declined here: it moves the popover
     the instant the pointer touches another day, and once the pointer has
     crossed one its hover state, shared by every day on the handle, no
     longer closes anything — so these leaves are the close.
   - A popover a click opened stays until a press outside, as Base UI
     keeps it; touch and the keyboard are left to Base UI and the
     calendar. */

/** How long a pointer rests on a day before its popover opens or moves to it. */
export const REST_DELAY = 250;
/** How long the popover outlasts a pointer that left for elsewhere. */
export const LEAVE_DELAY = 150;

/* The triangle's apex sits this far behind the leave point, so a hand
   that wobbles as it sets off still counts as heading for the popover. */
const APEX_SLACK = 8;

type Details = PopoverPrimitive.Root.ChangeEventDetails;
type Point = readonly [number, number];

function side(a: Point, b: Point, p: Point): number {
  return (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);
}

function inTriangle(p: Point, a: Point, b: Point, c: Point): boolean {
  const ab = side(a, b, p);
  const bc = side(b, c, p);
  const ca = side(c, a, p);
  return (ab >= 0 && bc >= 0 && ca >= 0) || (ab <= 0 && bc <= 0 && ca <= 0);
}

function inRect(p: Point, rect: DOMRectReadOnly): boolean {
  return p[0] >= rect.left && p[0] <= rect.right && p[1] >= rect.top && p[1] <= rect.bottom;
}

function overPopup(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest(DAY_POPOVER) !== null;
}

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React pointer events carry DOM member types that cannot be made readonly
function isTouch(event: PointerEvent): boolean {
  return event.pointerType === "touch";
}

export function createDayAim(
  moveTo: (id: string) => void,
  close: () => void,
  isOpen: () => boolean,
) {
  /* The id of the day the popover belongs to, kept after it closes so
     Base UI's re-entry during the close can be told from a crossing. An
     id, not the element: picking a day redraws its button. */
  let active: string | null = null;
  /* The enabled day under the pointer, and the one it is resting on. */
  let hovered: Element | null = null;
  let resting: HTMLElement | null = null;
  /* A click opened it: it stays until a press outside. */
  let sticky = false;
  let restTimer: number | undefined;
  let leaveTimer: number | undefined;
  let stopTracking: (() => void) | null = null;

  function clearRest() {
    window.clearTimeout(restTimer);
    resting = null;
  }

  function clearLeave() {
    window.clearTimeout(leaveTimer);
    stopTracking?.();
    stopTracking = null;
  }

  function closeSoon() {
    window.clearTimeout(leaveTimer);
    leaveTimer = window.setTimeout(() => {
      clearLeave();
      if (isOpen()) close();
    }, LEAVE_DELAY);
  }

  /* Closes unless the pointer keeps heading for the popover from `from`. */
  function track(from: Point) {
    clearLeave();
    closeSoon();
    const popup = document.querySelector(DAY_POPOVER)?.getBoundingClientRect();
    if (popup === undefined) return;
    const toRight = popup.left >= from[0];
    const nearX = toRight ? popup.left : popup.right;
    const apex: Point = [from[0] + (toRight ? -APEX_SLACK : APEX_SLACK), from[1]];
    const top: Point = [nearX, popup.top];
    const bottom: Point = [nearX, popup.bottom];
    // oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- DOM pointer events carry platform member types that cannot be made readonly
    const onMove = (event: globalThis.PointerEvent) => {
      const point: Point = [event.clientX, event.clientY];
      if (inRect(point, popup)) {
        clearLeave();
        return;
      }
      if (inTriangle(point, apex, top, bottom)) closeSoon();
    };
    document.addEventListener("pointermove", onMove);
    stopTracking = () => {
      document.removeEventListener("pointermove", onMove);
    };
  }

  // oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React pointer events carry DOM member types that cannot be made readonly
  function rest(event: PointerEvent<HTMLElement>, entering: boolean) {
    if (isTouch(event)) return;
    const day = event.currentTarget;
    hovered = day;
    clearLeave();
    if (!isOpen() || day.id === active) {
      clearRest();
      return;
    }
    const still = event.movementX ** 2 + event.movementY ** 2 < 2;
    if (!entering && resting === day && still) return;
    window.clearTimeout(restTimer);
    resting = day;
    restTimer = window.setTimeout(() => {
      resting = null;
      if (day.isConnected) moveTo(day.id);
    }, REST_DELAY);
  }

  return {
    /** The Root's onOpenChange, before anything else: declines Base UI's
        instant switch to a day the pointer is only crossing, and a hover
        close while the pointer is on a day. */
    // oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- Base UI event details and DOM nodes carry platform member types that cannot be made readonly
    openChange: (open: boolean, details: Details) => {
      if (details.reason === "trigger-hover") {
        const crossing =
          open &&
          details.trigger?.id !== active &&
          (isOpen() || details.event.type === "mouseenter");
        if (crossing || (!open && hovered?.isConnected === true)) {
          details.cancel();
          return;
        }
      }
      if (open) {
        const id = details.trigger?.id ?? active;
        /* Reopening the open day keeps a click's hold on it. */
        sticky = details.reason === "trigger-press" || (sticky && isOpen() && id === active);
        active = id;
      }
      clearRest();
      clearLeave();
    },
    // oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React pointer events carry DOM member types that cannot be made readonly
    dayEnter: (event: PointerEvent<HTMLElement>) => {
      rest(event, true);
    },
    // oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React pointer events carry DOM member types that cannot be made readonly
    dayMove: (event: PointerEvent<HTMLElement>) => {
      rest(event, false);
    },
    // oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React pointer events carry DOM member types that cannot be made readonly
    dayLeave: (event: PointerEvent<HTMLElement>) => {
      if (isTouch(event)) return;
      const day = event.currentTarget;
      if (hovered === day) hovered = null;
      if (resting === day) clearRest();
      /* The open day's own leave is Base UI's safe polygon. */
      if (!isOpen() || sticky || day.id === active || overPopup(event.relatedTarget)) return;
      track([event.clientX, event.clientY]);
    },
    popupEnter: () => {
      clearLeave();
    },
    // oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React pointer events carry DOM member types that cannot be made readonly
    popupLeave: (event: PointerEvent<HTMLElement>) => {
      if (isTouch(event) || !isOpen() || sticky || overPopup(event.relatedTarget)) return;
      /* Onto a day, the day decides: its rest moves the popover. */
      closeSoon();
    },
    dispose: () => {
      clearRest();
      clearLeave();
    },
  };
}

export type DayAim = ReturnType<typeof createDayAim>;
