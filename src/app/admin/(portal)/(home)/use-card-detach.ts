import type { PopoverPositionerProps } from "@base-ui/react/popover";
import { useEffect, useRef, useState } from "react";
import type { ComponentProps, PointerEvent as ReactPointerEvent, RefObject } from "react";

/* The card's detachable mode (Apple HIG Popovers on macOS — a popover
   dragged by its edge becomes a freestanding panel — and Panels, the
   floating inspector). A press on the head that travels past a small
   threshold detaches the card: the anchor freezes on the row's rect of
   that moment, so the panel no longer follows the row when the list or
   the page scrolls, and the popup then tracks the pointer 1:1. The drag
   writes `translate`, never `transform` — transform is what the entrance
   transition animates and it stays untouched — with no easing and no
   momentum on release, because a reposition drag is damping 1.0, not a
   flick surface. While detached the card is a panel, not a popover: the
   blur lifts, outside presses and focus moves no longer dismiss it
   (sheet-coexistence.ts), the sheet stops treating it as a wall
   (full-record-sheet-geometry.ts), and the head grows a close button.
   Below the sidebar breakpoint none of this engages — the head's
   pointerdown checks the layout at event time, so a window crossed over
   the breakpoint mid-session changes nothing already open. */

/* Far enough to read as a grab, small enough that the card never visibly
   lags the pointer. */
const DRAG_THRESHOLD_PX = 6;
/* The panel may not be pushed off screen: it always keeps this much of
   itself inside the viewport on every side. */
const VIEWPORT_MARGIN_PX = 8;
/* The layout where the card can be a panel: the sidebar layout, where the
   sheet also runs beside it. */
const SIDEBAR_LAYOUT = "(min-width: 60rem)";

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
  row,
  onDetachChange,
}: {
  /** The card's open state: a close for any reason reattaches. */
  readonly open: boolean;
  /** The row the card anchors to, frozen into a virtual element on detach. */
  readonly row: RefObject<HTMLTableRowElement | null>;
  /** Reports the panel state up to the list, which lifts the blur. */
  readonly onDetachChange: (detached: boolean) => void;
}): CardDetach {
  const [detached, setDetached] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [anchor, setAnchor] = useState<CardAnchor>(null);
  const popupRef = useRef<HTMLDivElement | null>(null);
  /* The drag's accumulated translate, so a second grab on the panel
     continues from where it was left rather than snapping back. */
  const offsetRef = useRef({ x: 0, y: 0 });

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
    offsetRef.current = { x: 0, y: 0 };
    if (popupRef.current !== null) popupRef.current.style.translate = "";
  }, [open]);

  // oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React event objects carry framework member types that cannot be made readonly
  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>): void {
    if (event.button !== 0) return;
    if (!window.matchMedia(SIDEBAR_LAYOUT).matches) return;
    const { target, currentTarget: handle } = event;
    /* A press on a control of the head — the panel's close button — is
       that control's, not a grab. */
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
    const origin = { ...offsetRef.current };
    /* An attached card becomes a panel only past the threshold — the
       press might be a read, not a grab. A panel's head is grab only, so
       a re-drag tracks from the first move. */
    let live = detached;
    let bounds: { minX: number; maxX: number; minY: number; maxY: number } | null = null;

    /* The translate range that keeps the popup's box inside the viewport
       margin, measured once per drag against its un-translated box: the
       frozen anchor holds that box still for the life of the drag. */
    const boundsFor = () => {
      const rect = popup.getBoundingClientRect();
      return {
        minX: VIEWPORT_MARGIN_PX - rect.left + origin.x,
        maxX: window.innerWidth - VIEWPORT_MARGIN_PX - rect.right + origin.x,
        minY: VIEWPORT_MARGIN_PX - rect.top + origin.y,
        maxY: window.innerHeight - VIEWPORT_MARGIN_PX - rect.bottom + origin.y,
      };
    };

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
      bounds ??= boundsFor();
      const x = Math.min(bounds.maxX, Math.max(bounds.minX, origin.x + dx));
      const y = Math.min(bounds.maxY, Math.max(bounds.minY, origin.y + dy));
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
      setDragging(false);
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
