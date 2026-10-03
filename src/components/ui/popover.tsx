"use client";

import { Popover as PopoverPrimitive } from "@base-ui/react/popover";
import { cva } from "class-variance-authority";
import type { VariantProps } from "class-variance-authority";
import { cn } from "cn";
import { createContext, use, useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent, RefObject } from "react";

/*
 * A popover: a panel read or used beside the control that opened it — the
 * Schedule's keyboard shortcuts list (issue #351), the staff home's filter
 * editors and record card, the booking month's day, the month's day
 * preview and the week's appointment card (issue #360). Adapted from the
 * shadcn Popover (src/components/stock/popover.tsx) on the same Base UI
 * parts. The registry's Header and Description parts have no product
 * consumer yet and are left out; this adoption adds Close and Arrow, a
 * container context, hover intent, and passes the positioner's placement
 * and collision options through, because each surface knows where it
 * stands. A list of commands is a menu, and a label is a tooltip
 * (design-system/overlays.md).
 *
 * Paint is an axis:
 * - `paper` (default): white on a 1px line edge, 16px corners and the
 *   popover shadow, in body ink.
 * - `card`: the staff home's card (Figma 76:1005): 8px corners, a hairline
 *   in the list rule, the list surface and its lift, each read through the
 *   surface's --wgi-* paint when one is in scope. A consumer's own class
 *   restates width, corners, inset or shadow where its frame differs.
 * Width and inset belong to the consumer, which knows its content.
 *
 * Motion is its own axis (design-system/components.md "Component API
 * rules"). `wgi` (default): the popover temperament — grows from the
 * trigger at scale(0.95) with opacity on the staff home's base beat and
 * leaves on the fast one, both on --motion-standard; Base UI's
 * data-instant (a keyboard open, a dismissal) skips it. `none` is for a
 * popover opened by a shortcut key or by focus, which appears and leaves
 * at once. Reduced motion: no travel, and the cross-fade registered in
 * globals.css.
 *
 * The positioner is a box at the anchor, not a surface: a card dragged
 * into a panel (use-card-detach.ts) leaves it behind, and what is under
 * that empty box must still take the press. The popup takes its own.
 */
const popoverVariants = cva(["outline-none pointer-events-auto"], {
  variants: {
    paint: {
      paper: "rounded-[16px] border border-slate-200 bg-white text-body shadow-popover",
      card: [
        "rounded-[8px] border border-(--wgi-rule,var(--color-line-2))",
        "bg-(--wgi-surface,var(--portal-surface)) text-body",
        "shadow-(--wgi-card-shadow,var(--shadow-popover))",
      ],
    },
    motion: {
      wgi: [
        /* The transform property, not Tailwind's `scale`: a surface that
           restates its transition (the record card yielding to the sheet)
           names transform, and the card's drag writes only translate. */
        "origin-(--transform-origin) transition-[transform,opacity]",
        "duration-(--motion-base-duration) ease-(--motion-standard)",
        "data-starting-style:[transform:scale(0.95)] data-starting-style:opacity-0",
        "data-ending-style:[transform:scale(0.95)] data-ending-style:opacity-0",
        "data-ending-style:duration-(--motion-fast-duration)",
        "motion-reduce:data-starting-style:[transform:none]",
        "motion-reduce:data-ending-style:[transform:none]",
        "data-instant:duration-0",
      ],
      none: "",
    },
  },
  defaultVariants: {
    paint: "paper",
    motion: "wgi",
  },
});

/* Where a popover portals to: the body, unless an ancestor provides an
   element. Inside a modal dialog the body is inert behind `showModal()`
   and sits below the top layer, so a dialog hands itself down (the Print
   sheet) and the popovers inside it portal there instead. */
const PopoverContainer = createContext<RefObject<HTMLElement | null> | null>(null);

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React props carry framework member types that cannot be made readonly
function Popover<Payload = unknown>(props: PopoverPrimitive.Root.Props<Payload>) {
  return <PopoverPrimitive.Root data-slot="popover" {...props} />;
}

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React props carry framework member types that cannot be made readonly
function PopoverTrigger<Payload = unknown>(props: PopoverPrimitive.Trigger.Props<Payload>) {
  return <PopoverPrimitive.Trigger data-slot="popover-trigger" {...props} />;
}

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React props carry framework member types that cannot be made readonly
function PopoverContent({
  className,
  positionerClassName,
  paint = "paper",
  motion = "wgi",
  align = "center",
  alignOffset = 0,
  side = "bottom",
  sideOffset = 8,
  anchor,
  arrowPadding,
  collisionPadding = 12,
  collisionAvoidance,
  ...props
}: PopoverPrimitive.Popup.Props &
  VariantProps<typeof popoverVariants> &
  Pick<
    PopoverPrimitive.Positioner.Props,
    | "align"
    | "alignOffset"
    | "side"
    | "sideOffset"
    | "anchor"
    | "arrowPadding"
    | "collisionPadding"
    | "collisionAvoidance"
  > & {
    /** The positioner's own class: its layer when it must rise above a sheet. */
    positionerClassName?: string;
  }) {
  const container = use(PopoverContainer);
  return (
    <PopoverPrimitive.Portal container={container ?? undefined}>
      <PopoverPrimitive.Positioner
        data-slot="popover-positioner"
        align={align}
        alignOffset={alignOffset}
        side={side}
        sideOffset={sideOffset}
        anchor={anchor}
        arrowPadding={arrowPadding}
        collisionPadding={collisionPadding}
        collisionAvoidance={collisionAvoidance}
        className={cn("pointer-events-none isolate z-50", positionerClassName)}
      >
        <PopoverPrimitive.Popup
          data-slot="popover-content"
          data-paint={paint}
          data-motion={motion}
          className={cn(popoverVariants({ paint, motion }), className)}
          {...props}
        />
      </PopoverPrimitive.Positioner>
    </PopoverPrimitive.Portal>
  );
}

/* The arrow points at the source; its shape and edge belong to the
   consumer's frame, which draws it beside the popup's own hairline. */
// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React props carry framework member types that cannot be made readonly
function PopoverArrow(props: PopoverPrimitive.Arrow.Props) {
  return <PopoverPrimitive.Arrow data-slot="popover-arrow" {...props} />;
}

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React props carry framework member types that cannot be made readonly
function PopoverTitle({ className, ...props }: PopoverPrimitive.Title.Props) {
  return (
    <PopoverPrimitive.Title
      data-slot="popover-title"
      className={cn("m-0 font-sans text-[1rem] leading-[22px] font-bold text-ink", className)}
      {...props}
    />
  );
}

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React props carry framework member types that cannot be made readonly
function PopoverClose(props: PopoverPrimitive.Close.Props) {
  return <PopoverPrimitive.Close data-slot="popover-close" {...props} />;
}

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

export {
  createPopoverHandle,
  Popover,
  PopoverArrow,
  PopoverClose,
  PopoverContainer,
  PopoverContent,
  PopoverTitle,
  POPOVER_SHIFT_ONLY,
  PopoverTrigger,
  usePopoverHoverIntent,
};
export type { ChangeDetails as PopoverChangeDetails, PopoverAnchor, PopoverHandle, PopoverIntent };
