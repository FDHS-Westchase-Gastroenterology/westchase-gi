import type { PopoverPositionerProps } from "@base-ui/react/popover";
import { useEffect, useRef, useState } from "react";
import type { ComponentProps, PointerEvent as ReactPointerEvent, RefObject } from "react";

import { laneFor, listGutter, panelBase, SIDEBAR_LAYOUT } from "./panel-lane";
import type { Offset } from "./panel-lane";
import { SHEET } from "./sheet-coexistence";

/* The card's detachable mode (Apple HIG Popovers on macOS — a popover
   dragged by its edge becomes a freestanding panel — and Panels, the
   floating inspector). A press on the head that travels past a small
   threshold detaches the card: the anchor freezes on the row's rect of
   that moment, so the panel no longer follows the row when the list or
   the page scrolls, and the popup then tracks the pointer 1:1. The drag
   writes `translate`, never `transform` — transform is what the entrance
   transition animates and it stays untouched — with no momentum on
   release, because a reposition drag is damping 1.0, not a flick
   surface. While detached the card is a panel, not a popover: the blur
   lifts, and outside presses and focus moves no longer dismiss it
   (sheet-coexistence.ts).

   The panel keeps to its lane (panel-lane.ts): the viewport, and with the
   full-record sheet open, the space left of it. The viewport's edges are
   hard stops; the sheet's edge gives with rising resistance — the sheet
   grip's rubber band — and the panel eases back into the lane on release,
   so the wall reads as "nothing more here" rather than a frozen card.
   When the sheet claims the space the panel stands in, the panel yields:
   on the sheet's arrival it slides aside on the sheet's own beat, so the
   two move as one change; while the sheet's width animates or staff drag
   its grip, the panel is pushed frame by frame; a window resize re-clamps
   it at once. A grab during a yield or a settle starts from where the
   panel is on screen. Below the sidebar breakpoint none of this engages —
   the head's pointerdown checks the layout at event time, so a window
   crossed over the breakpoint mid-session changes nothing already open. */

/* Far enough to read as a grab, small enough that the card never visibly
   lags the pointer. */
const DRAG_THRESHOLD_PX = 6;

/* Apple's rubber band, the sheet grip's constant: the further past the
   sheet's edge, the less the panel follows. The band's dimension is its
   limit — the pull approaches it and never reaches it — so the panel's
   is the list gutter: resistance spends the gap the lane keeps, and the
   panel never touches the sheet, let alone covers it. */
const BAND_CONSTANT = 0.55;
function rubberband(overshoot: number, dimension: number): number {
  return (overshoot * dimension * BAND_CONSTANT) / (dimension + BAND_CONSTANT * overshoot);
}

/* How a programmatic move travels: "settle" eases the band home on the
   base beat, "yield" rides the sheet's arrival on the sheet beat, and
   "instant" follows a width that is already moving, or a window resize. */
type Travel = "settle" | "yield" | "instant";

/* Moves the panel to `next`, on the travel's transition when it has one:
   the attribute names the beat for home.css, and it clears when the
   translate lands — or on a fallback, for a transition that never ran
   (reduced motion drops the travel). The offset and the stand-down are
   the hook's refs, so a grab can pick the panel up mid-travel. */
function travelTo(
  popup: HTMLElement,
  next: Offset,
  travel: Travel,
  // oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React refs are mutable by design
  refs: { offset: RefObject<Offset>; cleanup: RefObject<(() => void) | null> },
): void {
  refs.cleanup.current?.();
  refs.offset.current = next;
  if (travel !== "instant") {
    const attribute = travel === "settle" ? "settling" : "yielding";
    popup.dataset[attribute] = "true";
    const clear = () => {
      delete popup.dataset[attribute];
      popup.removeEventListener("transitionend", onEnd);
      window.clearTimeout(fallback);
      if (refs.cleanup.current === clear) refs.cleanup.current = null;
    };
    // oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- DOM event objects carry platform member types that cannot be made readonly
    const onEnd = (endEvent: TransitionEvent) => {
      if (endEvent.target === popup && endEvent.propertyName === "translate") clear();
    };
    popup.addEventListener("transitionend", onEnd);
    const fallback = window.setTimeout(clear, 600);
    refs.cleanup.current = clear;
  }
  popup.style.translate = `${next.x}px ${next.y}px`;
}

type CardAnchor = PopoverPositionerProps["anchor"];

interface CardDetach {
  /** The card is a panel right now. */
  readonly detached: boolean;
  /** The frozen anchor while detached (a Base UI VirtualElement), else
      null — the row ref keeps anchoring the attached card. */
  readonly anchor: CardAnchor;
  /** Spread on the card's head: the grab surface. */
  readonly handleProps: Pick<ComponentProps<"div">, "onPointerDown">;
  /** Spread on the card's popup: the element the drag translates and the
      attributes the paint reads. */
  readonly popupProps: {
    readonly ref: RefObject<HTMLDivElement | null>;
    readonly "data-detached": true | undefined;
    readonly "data-dragging": true | undefined;
  };
}

export function useCardDetach({
  open,
  sheetOpen,
  row,
  onDetachChange,
}: {
  /** The card's open state: a close for any reason reattaches. */
  readonly open: boolean;
  /** The full-record sheet is open. It always shows the open card's
      record (home-dashboard.tsx retargets it), so this is the row's own
      `fullOpen`. */
  readonly sheetOpen: boolean;
  /** The row the card anchors to, frozen into a virtual element on detach. */
  readonly row: RefObject<HTMLTableRowElement | null>;
  /** Reports the panel state up to the list, which lifts the blur. */
  readonly onDetachChange: (detached: boolean) => void;
}): CardDetach {
  const [detached, setDetached] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [anchor, setAnchor] = useState<CardAnchor>(null);
  const popupRef = useRef<HTMLDivElement | null>(null);
  /* The panel's translate, so a second grab continues from where it was
     left rather than snapping back. */
  const offsetRef = useRef<Offset>({ x: 0, y: 0 });
  /* A pointer holds the panel: the lane's yields wait for it to let go. */
  const heldRef = useRef(false);
  /* Stands down a settle or a yield in flight, so a grab — or the next
     move — takes the panel from where it is. */
  const travelCleanup = useRef<(() => void) | null>(null);

  /* A close reattaches: the next open of this row's card starts it back
     on the row. The state comes down here in render, the sanctioned place
     to adjust on a prop change; the outside-world work — the popup's
     inline translate, the drag's remembered offset — stays an effect. The
     popup's own node may already be gone then — the style write is
     skipped either way. The list clears its panel flag itself: every
     close passes through its open handler, and a detached row that left
     the list is stale (line-list.tsx). */
  const [wasOpen, setWasOpen] = useState(open);
  if (wasOpen !== open) {
    setWasOpen(open);
    if (!open) {
      setDetached(false);
      setDragging(false);
      setAnchor(null);
    }
  }

  useEffect(() => {
    if (open) return;
    travelCleanup.current?.();
    offsetRef.current = { x: 0, y: 0 };
    if (popupRef.current !== null) popupRef.current.style.translate = "";
  }, [open]);

  /* The panel yields to the sheet. Keyed on the two states that make the
     sheet a neighbour: while both hold, the sheet's box is observed — its
     first report is its arrival, which the panel meets on the sheet's
     beat (or at once, when the sheet opened without motion); every later
     report is a width already in motion, a refit's transition or the
     grip, which the panel follows frame by frame. A window resize
     re-clamps against the viewport whether or not a sheet is open. */
  useEffect(() => {
    if (!detached) return undefined;
    const popup = popupRef.current;
    if (popup === null) return undefined;

    const clamp = (travel: Travel) => {
      if (heldRef.current) return;
      const lane = laneFor(panelBase(popup));
      const { x, y } = offsetRef.current;
      const next = {
        x: Math.min(lane.maxX, Math.max(lane.minX, x)),
        y: Math.min(lane.maxY, Math.max(lane.minY, y)),
      };
      if (Math.abs(next.x - x) < 0.5 && Math.abs(next.y - y) < 0.5) return;
      travelTo(popup, next, travel, { offset: offsetRef, cleanup: travelCleanup });
    };

    let resizeFrame = 0;
    const onResize = () => {
      if (resizeFrame !== 0) return;
      resizeFrame = requestAnimationFrame(() => {
        resizeFrame = 0;
        clamp("instant");
      });
    };
    window.addEventListener("resize", onResize);

    let observer: ResizeObserver | null = null;
    let findFrame = 0;
    if (sheetOpen) {
      /* The sheet is portaled in the same commit that raised the flag;
         give it a frame or two to be in the document. */
      let tries = 0;
      const find = () => {
        findFrame = 0;
        const sheet = document.querySelector<HTMLElement>(`${SHEET}[data-open]`);
        if (sheet === null) {
          tries += 1;
          if (tries < 5) findFrame = requestAnimationFrame(find);
          return;
        }
        let arrived = false;
        observer = new ResizeObserver(() => {
          clamp(arrived || sheet.hasAttribute("data-instant") ? "instant" : "yield");
          arrived = true;
        });
        observer.observe(sheet);
      };
      findFrame = requestAnimationFrame(find);
    }

    return () => {
      window.removeEventListener("resize", onResize);
      if (resizeFrame !== 0) cancelAnimationFrame(resizeFrame);
      if (findFrame !== 0) cancelAnimationFrame(findFrame);
      observer?.disconnect();
    };
  }, [detached, sheetOpen]);

  // oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React event objects carry framework member types that cannot be made readonly
  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>): void {
    if (event.button !== 0) return;
    if (!window.matchMedia(SIDEBAR_LAYOUT).matches) return;
    const { target, currentTarget: handle } = event;
    /* A press on a control of the head — the close button — is that
       control's, not a grab. */
    if (target instanceof Element && target.closest("a, button") !== null) return;
    const popup = popupRef.current;
    const rowElement = row.current;
    if (popup === null || rowElement === null) return;
    event.preventDefault();
    /* Capture keeps the drag alive off the head — the same reason the
       sheet's grip captures. */
    handle.setPointerCapture(event.pointerId);
    const pointerId = event.pointerId;
    const startX = event.clientX;
    const startY = event.clientY;
    /* A grab during a settle or a yield starts where the panel is on
       screen, not where it was headed: pin the live translate before the
       travel stands down, or the first move jumps to its target. */
    if (travelCleanup.current !== null) {
      const [x = 0, y = 0] = getComputedStyle(popup)
        .translate.split(" ")
        .map((part) => Number.parseFloat(part));
      offsetRef.current = { x, y };
      popup.style.translate = `${x}px ${y}px`;
      travelCleanup.current();
    }
    heldRef.current = true;
    const origin = offsetRef.current;
    /* An attached card becomes a panel only past the threshold — the
       press might be a read, not a grab. A panel's head is grab only, so
       a re-drag tracks from the first move. */
    let live = detached;
    /* The un-translated box, measured once per drag: the frozen anchor
       holds it still for the drag's life. */
    let base: DOMRect | null = null;

    // oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- DOM event objects carry platform member types that cannot be made readonly
    const move = (moveEvent: PointerEvent) => {
      if (moveEvent.pointerId !== pointerId) return;
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;
      if (!live) {
        if (Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return;
        live = true;
        /* The anchor freezes on the row's rect of this moment — a virtual
           element in Base UI's terms — so the panel stays put while the
           row scrolls or the sheet refits beside it. */
        const frozen = rowElement.getBoundingClientRect();
        setAnchor({ getBoundingClientRect: () => frozen });
        setDetached(true);
        onDetachChange(true);
      }
      setDragging(true);
      base ??= panelBase(popup);
      /* The lane is read on every move — one layout read — so it can
         never go stale under the pointer. */
      const lane = laneFor(base);
      const wantedX = origin.x + dx;
      const x =
        lane.walled && wantedX > lane.maxX
          ? lane.maxX + rubberband(wantedX - lane.maxX, listGutter())
          : Math.min(lane.maxX, Math.max(lane.minX, wantedX));
      const y = Math.min(lane.maxY, Math.max(lane.minY, origin.y + dy));
      offsetRef.current = { x, y };
      popup.style.translate = `${x}px ${y}px`;
    };

    // oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- DOM event objects carry platform member types that cannot be made readonly
    const up = (upEvent: PointerEvent) => {
      if (upEvent.pointerId !== pointerId) return;
      if (handle.hasPointerCapture(pointerId)) handle.releasePointerCapture(pointerId);
      handle.removeEventListener("pointermove", move);
      handle.removeEventListener("pointerup", up);
      handle.removeEventListener("pointercancel", up);
      heldRef.current = false;
      setDragging(false);
      /* Let go past the sheet's edge: the band eases home. */
      if (base === null) return;
      const { maxX } = laneFor(base);
      const { x, y } = offsetRef.current;
      if (x > maxX)
        travelTo(popup, { x: maxX, y }, "settle", {
          offset: offsetRef,
          cleanup: travelCleanup,
        });
    };

    handle.addEventListener("pointermove", move);
    handle.addEventListener("pointerup", up);
    handle.addEventListener("pointercancel", up);
    if (live) setDragging(true);
  }

  return {
    detached,
    anchor,
    handleProps: { onPointerDown },
    popupProps: {
      ref: popupRef,
      "data-detached": detached || undefined,
      "data-dragging": dragging || undefined,
    },
  };
}
