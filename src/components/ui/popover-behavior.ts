"use client";

import { Popover as PopoverPrimitive } from "@base-ui/react/popover";
import { createContext, useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent, RefObject } from "react";

/* What ui/popover's parts share that is not a part: the container a
   popover portals to, the shift-only collision preset, the handle that
   lets many detached triggers serve one popover, and hover intent. Kept
   beside the recipe so popover.tsx exports only components. */

/* Where a popover portals to: the body, unless an ancestor provides an
   element. Inside a modal dialog the body is inert behind `showModal()`
   and sits below the top layer, so a dialog hands itself down (the Print
   sheet) and the popovers inside it portal there instead. */
const PopoverContainer = createContext<RefObject<HTMLElement | null> | null>(null);

/* A popover only as big as its contents: it shifts into the viewport when
   it overflows, never flips its side and never shrinks, and the
   perpendicular fallback stays off (the staff home's card and editors). */
const POPOVER_SHIFT_ONLY = {
  side: "shift",
  align: "shift",
  fallbackAxisSide: "none",
} as const satisfies PopoverPrimitive.Positioner.Props["collisionAvoidance"];

/** A handle shared by detached triggers, so one popover serves many. */
function createPopoverHandle<Payload>() {
  return PopoverPrimitive.createHandle<Payload>();
}

type PopoverHandle<Payload> = ReturnType<typeof createPopoverHandle<Payload>>;
type ChangeDetails = PopoverPrimitive.Root.ChangeEventDetails;
type PopoverAnchor = PopoverPrimitive.Positioner.Props["anchor"];

/* ---------- Hover intent ----------

   One popover served by many triggers (the days of a month) is opened by
   a pointer resting on a trigger, by focus, or by a press. The parameters:

   - `rest`: how long a pointer rests on a trigger before it opens.
   - `leave`: how long the popover outlasts a pointer that left.
   - `warm`: once one is open, or closed within this grace, the next
     trigger opens at once, so sweeping across a week is one gesture.
   - `triangle`: for a popover that stands away from its triggers (beside
     a card), the way a macOS menu aims at its submenu. Crossing other
     triggers on the way does not move it; resting `rest` on one does.
     Leaving a trigger for anywhere but a trigger or the popover closes
     it after `leave`, unless the pointer keeps moving inside the triangle
     from where it left to the popup's near edge; leaving the popup the
     same way closes it too. Base UI's own switching is declined: it moves
     the popover the instant the pointer touches another trigger, and once
     the pointer has crossed one its hover state, shared by every trigger
     on the handle, no longer closes anything — so these leaves are the
     close. A popover a press opened stays until a press outside.

   Opened by focus or a shortcut (`openNow`), the popover is `keyed`: it
   appears and leaves at once (motion="none"), and a pointer taking over
   restores the motion. Touch and the keyboard are left to Base UI. */

interface HoverIntent {
  readonly rest: number;
  readonly leave?: number;
  readonly warm?: number;
  readonly triangle?: boolean;
}

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React pointer events carry DOM member types that cannot be made readonly
type PointerHandler = (event: PointerEvent<HTMLElement>) => void;

/** What hover intent spreads on each trigger. */
interface IntentTriggerProps {
  openOnHover: true;
  delay: number;
  closeDelay: number;
  onPointerEnter?: PointerHandler;
  onPointerMove?: PointerHandler;
  onPointerLeave?: PointerHandler;
}

/** What the triangle spreads on the popup. */
interface IntentPopupProps {
  ref?: (element: HTMLElement | null) => void;
  onPointerEnter?: () => void;
  onPointerLeave?: PointerHandler;
}

/* The triangle's apex sits this far behind the leave point, so a hand
   that wobbles as it sets off still counts as heading for the popover. */
const APEX_SLACK = 8;

type Point = readonly [number, number];

function edgeSide(a: Point, b: Point, p: Point): number {
  return (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);
}

function inTriangle(p: Point, a: Point, b: Point, c: Point): boolean {
  const ab = edgeSide(a, b, p);
  const bc = edgeSide(b, c, p);
  const ca = edgeSide(c, a, p);
  return (ab >= 0 && bc >= 0 && ca >= 0) || (ab <= 0 && bc <= 0 && ca <= 0);
}

function inRect(p: Point, rect: DOMRectReadOnly): boolean {
  return p[0] >= rect.left && p[0] <= rect.right && p[1] >= rect.top && p[1] <= rect.bottom;
}

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React pointer events carry DOM member types that cannot be made readonly
function isTouch(event: PointerEvent): boolean {
  return event.pointerType === "touch";
}

function createAim<Payload>(
  // oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- the popover handle carries Base UI members that cannot be made readonly
  handle: PopoverHandle<Payload>,
  leaveDelay: number,
  restDelay: number,
) {
  /* The id of the trigger the popover belongs to, kept after it closes so
     Base UI's re-entry during the close can be told from a crossing. An
     id, not the element: a trigger may redraw. */
  let active: string | null = null;
  /* The trigger under the pointer, and the one it is resting on. */
  let hovered: Element | null = null;
  let resting: HTMLElement | null = null;
  /* A press opened it: it stays until a press outside. */
  let sticky = false;
  let popup: HTMLElement | null = null;
  let restTimer: number | undefined;
  let leaveTimer: number | undefined;
  let stopTracking: (() => void) | null = null;
  let onMove: ((id: string) => void) | null = null;

  const overPopup = (target: EventTarget | null) =>
    target instanceof Node && popup?.contains(target) === true;

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
      if (handle.isOpen) handle.close();
    }, leaveDelay);
  }

  /* Closes unless the pointer keeps heading for the popup from `from`. */
  function track(from: Point) {
    clearLeave();
    closeSoon();
    const rect = popup?.getBoundingClientRect();
    if (rect === undefined) return;
    const toRight = rect.left >= from[0];
    const nearX = toRight ? rect.left : rect.right;
    const apex: Point = [from[0] + (toRight ? -APEX_SLACK : APEX_SLACK), from[1]];
    const top: Point = [nearX, rect.top];
    const bottom: Point = [nearX, rect.bottom];
    // oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- DOM pointer events carry platform member types that cannot be made readonly
    const move = (event: globalThis.PointerEvent) => {
      const point: Point = [event.clientX, event.clientY];
      if (inRect(point, rect)) {
        clearLeave();
        return;
      }
      if (inTriangle(point, apex, top, bottom)) closeSoon();
    };
    document.addEventListener("pointermove", move);
    stopTracking = () => {
      document.removeEventListener("pointermove", move);
    };
  }

  // oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React pointer events carry DOM member types that cannot be made readonly
  function rest(event: PointerEvent<HTMLElement>, entering: boolean) {
    if (isTouch(event)) return;
    const trigger = event.currentTarget;
    hovered = trigger;
    clearLeave();
    if (!handle.isOpen || trigger.id === active) {
      clearRest();
      return;
    }
    const still = event.movementX ** 2 + event.movementY ** 2 < 2;
    if (!entering && resting === trigger && still) return;
    window.clearTimeout(restTimer);
    resting = trigger;
    restTimer = window.setTimeout(() => {
      resting = null;
      if (!trigger.isConnected) return;
      onMove?.(trigger.id);
      handle.open(trigger.id);
    }, restDelay);
  }

  return {
    setOnMove: (callback: (id: string) => void) => {
      onMove = callback;
    },
    setPopup: (element: HTMLElement | null) => {
      popup = element;
    },
    // oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- Base UI event details carry platform member types that cannot be made readonly
    openChange: (open: boolean, details: ChangeDetails) => {
      if (details.reason === "trigger-hover") {
        const crossing =
          open &&
          details.trigger?.id !== active &&
          (handle.isOpen || details.event.type === "mouseenter");
        if (crossing || (!open && hovered?.isConnected === true)) {
          details.cancel();
          return;
        }
      }
      if (open) {
        const id = details.trigger?.id ?? active;
        /* Reopening the open trigger keeps a press's hold on it. */
        sticky = details.reason === "trigger-press" || (sticky && handle.isOpen && id === active);
        active = id;
      }
      clearRest();
      clearLeave();
    },
    // oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React pointer events carry DOM member types that cannot be made readonly
    triggerEnter: (event: PointerEvent<HTMLElement>) => {
      rest(event, true);
    },
    // oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React pointer events carry DOM member types that cannot be made readonly
    triggerMove: (event: PointerEvent<HTMLElement>) => {
      rest(event, false);
    },
    // oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React pointer events carry DOM member types that cannot be made readonly
    triggerLeave: (event: PointerEvent<HTMLElement>) => {
      if (isTouch(event)) return;
      const trigger = event.currentTarget;
      if (hovered === trigger) hovered = null;
      if (resting === trigger) clearRest();
      /* The open trigger's own leave is Base UI's safe polygon. */
      if (!handle.isOpen || sticky || trigger.id === active || overPopup(event.relatedTarget))
        return;
      track([event.clientX, event.clientY]);
    },
    popupEnter: () => {
      clearLeave();
    },
    // oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React pointer events carry DOM member types that cannot be made readonly
    popupLeave: (event: PointerEvent<HTMLElement>) => {
      if (isTouch(event) || !handle.isOpen || sticky || overPopup(event.relatedTarget)) return;
      /* Onto a trigger, the trigger decides: its rest moves the popover. */
      closeSoon();
    },
    dispose: () => {
      clearRest();
      clearLeave();
    },
  };
}

/**
 * Hover intent, focus and keyboard opening for one popover served by many
 * detached triggers. Spread `triggerProps` on each trigger and
 * `popupProps` on the content, give the content `motion={keyed ? "none" :
 * "wgi"}`, and call `onOpenChange` first in the Root's handler.
 */
function usePopoverHoverIntent<Payload>(
  // oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- the popover handle carries Base UI members that cannot be made readonly
  handle: PopoverHandle<Payload>,
  { rest, leave = 0, warm = 0, triangle = false }: HoverIntent,
) {
  const [keyed, setKeyed] = useState(false);
  const [isWarm, setWarm] = useState(false);
  const cool = useRef<number | undefined>(undefined);
  const [aim] = useState(() => (triangle ? createAim(handle, leave, rest) : null));

  useEffect(() => {
    aim?.setOnMove(() => {
      setKeyed(false);
    });
    return () => {
      aim?.dispose();
      window.clearTimeout(cool.current);
    };
  }, [aim]);

  return useMemo(() => {
    const triggerProps: IntentTriggerProps = {
      openOnHover: true,
      delay: isWarm ? 0 : rest,
      closeDelay: leave,
    };
    const popupProps: IntentPopupProps = {};
    if (aim !== null) {
      triggerProps.onPointerEnter = aim.triggerEnter;
      triggerProps.onPointerMove = aim.triggerMove;
      triggerProps.onPointerLeave = aim.triggerLeave;
      popupProps.ref = aim.setPopup;
      popupProps.onPointerEnter = aim.popupEnter;
      popupProps.onPointerLeave = aim.popupLeave;
    }
    return {
      /** Opened by focus or a shortcut: no transition. */
      keyed,
      /** Opens a trigger's popover at once, as the keyboard does. */
      openNow: (id: string) => {
        if (document.getElementById(id) === null) return;
        setKeyed(true);
        handle.open(id);
      },
      close: () => {
        handle.close();
      },
      /** The Root's onOpenChange, before the consumer's own. */
      // oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- Base UI event details carry platform member types that cannot be made readonly
      onOpenChange: (open: boolean, details: ChangeDetails) => {
        aim?.openChange(open, details);
        if (details.isCanceled) return;
        window.clearTimeout(cool.current);
        if (open) {
          /* A pointer or a press took over: the next open animates. */
          if (details.reason !== "imperative-action") setKeyed(false);
          if (warm > 0) setWarm(true);
          return;
        }
        if (warm > 0)
          cool.current = window.setTimeout(() => {
            setWarm(false);
          }, warm);
      },
      triggerProps,
      popupProps,
    };
  }, [aim, handle, isWarm, keyed, leave, rest, warm]);
}

type PopoverIntent = ReturnType<typeof usePopoverHoverIntent>;

export { createPopoverHandle, PopoverContainer, POPOVER_SHIFT_ONLY, usePopoverHoverIntent };
export type { ChangeDetails as PopoverChangeDetails, PopoverAnchor, PopoverHandle, PopoverIntent };
