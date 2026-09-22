import { useCallback, useRef } from "react";

import { listGutter, roomBesidePanel, SIDEBAR_LAYOUT, sidebarWall } from "./panel-lane";
import { OPEN_CARD } from "./sheet-coexistence";

/* The sheet panel's box: how wide it may be, where it opens, and how it
   gives past its ends. It is the sheet's own concern rather than a recipe's,
   because the numbers come from measuring the live layout — the sidebar's
   wall, the card beside it, the bleed home.css authors past the viewport
   edge. */

const MIN_WIDTH_PX = 384;
const KEY_STEP_PX = 32;
/** The widest the sheet goes when nothing walls it: a sliver of page stays. */
const VIEWPORT_SHARE = 0.94;

/* The bounds of a resize, in the sheet's own box width. That box carries
   the off-screen bleed home.css authors past the viewport edge (so the
   rubber band's translate never opens a gap there), measured here rather
   than repeated as a constant. The measure is the layout box, not the
   painted one: on its first frame the popup is still sliding in, and a
   bound read off a transformed rect would drift by it. On the wide layout
   there are two walls: the sidebar's right edge, and the open card —
   the card is never covered, so the sheet stops one list gutter short of
   it, or of where a detached panel can yield to. Below that breakpoint the sidebar is a bottom bar and the sheet
   keeps the viewport share. */
interface SheetBounds {
  readonly min: number;
  readonly max: number;
  readonly bleed: number;
}

function boundsFor(sheet: HTMLElement): SheetBounds {
  const bleed = Math.max(0, sheet.offsetLeft + sheet.offsetWidth - window.innerWidth);
  const wall = sidebarWall();
  const widest = Math.min(
    window.innerWidth * VIEWPORT_SHARE,
    window.innerWidth - wall,
    cardClearance() ?? Number.POSITIVE_INFINITY,
  );
  return { min: MIN_WIDTH_PX + bleed, max: Math.max(MIN_WIDTH_PX, widest) + bleed, bleed };
}

/* Apple's rubber band: the further past the bound, the less the sheet
   follows, so it slows before it stops instead of freezing. */
const BAND_CONSTANT = 0.55;
function rubberband(overshoot: number, dimension: number): number {
  return (
    (overshoot * dimension * BAND_CONSTANT) / (dimension + BAND_CONSTANT * Math.abs(overshoot))
  );
}

/* The room beside the open card on the sidebar layout: from the card's
   right edge to the viewport edge, less one list gutter, so the sheet
   clears the card by the gap the list keeps. A detached panel is a wall
   that gives: it yields leftward as the sheet widens (panel-lane.ts), so
   its room is what it can make — never so much that it would be pushed
   over the nav. Null when there is no card to clear, or the layout is the
   narrow one, where nothing is clamped. The attached card's edge is read
   on the positioner, not the popup: the popup's entry scale bends its
   painted edge in for a beat, and a retarget's refit lands inside that
   beat — the layout box again, as in boundsFor. */
function cardClearance(): number | null {
  if (!window.matchMedia(SIDEBAR_LAYOUT).matches) return null;
  const card = document.querySelector<HTMLElement>(OPEN_CARD);
  if (card === null || document.querySelector(".wgi-home") === null) return null;
  if (card.hasAttribute("data-detached")) return roomBesidePanel(card);
  const right = (card.parentElement ?? card).getBoundingClientRect().right;
  return window.innerWidth - right - listGutter();
}

/* The width the sheet should hold: the remembered width, else the
   authored one, clamped into the bounds — beside an open card never wider
   than the room that clears it, and never below the minimum, where the
   sheet may overlap the card, which stays on top. The inline style is
   cleared to measure the authored width; the caller decides what to write
   back, so a target that is the authored width stays the stylesheet's. */
function fit(sheet: HTMLElement, remembered: number | null): number {
  sheet.style.width = "";
  const authored = sheet.offsetWidth;
  const { min, max } = boundsFor(sheet);
  return Math.min(max, Math.max(min, remembered ?? authored));
}

/** The panel's box and the two ways staff change it: a drag on the grip, and
    the arrow keys on the same grip. The width they settle on is remembered
    for the next record they open. */
export function useSheetResize() {
  const remembered = useRef<number | null>(null);
  const popup = useRef<HTMLDivElement | null>(null);
  const resizeFrame = useRef(0);
  /* The listener and fallback a data-fitting or data-settling run left
     armed, so a grab — or a second refit — can stand them down rather than
     leave a stale timeout free to clear a newer run's flag. */
  const fitCleanup = useRef<(() => void) | null>(null);
  const settleCleanup = useRef<(() => void) | null>(null);

  /* The bounds moved under an open sheet — a retarget to another record, a
     card arriving beside it, the window resizing: clamp the width again,
     letting the change animate on the base beat (data-fitting, the one case
     a programmatic width moves on a transition). During a drag the gesture
     owns the bounds it captured, so a refit waits for the next grab. */
  const refit = useCallback((node: HTMLElement | null) => {
    if (node === null || node.dataset.dragging === "true") return;
    const before = node.offsetWidth;
    const width = fit(node, remembered.current);
    /* The measure ran with the inline width cleared; put back what was
       on screen before anything else. Under a pixel nothing moved — a
       retarget between same-size cards must not animate. */
    node.style.width = `${before}px`;
    if (Math.abs(width - before) < 1) return;
    /* Commit `before` as the transition's start: the read flushes the
       write, or the before-change style is the authored width fit() left
       behind and the transition jumps there first. */
    void node.offsetWidth;
    fitCleanup.current?.();
    node.dataset.fitting = "true";
    const clearFit = () => {
      delete node.dataset.fitting;
      node.removeEventListener("transitionend", onFitEnd);
      window.clearTimeout(fitFallback);
      if (fitCleanup.current === clearFit) fitCleanup.current = null;
    };
    // oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- DOM event objects carry platform member types that cannot be made readonly
    const onFitEnd = (endEvent: TransitionEvent) => {
      if (endEvent.propertyName === "width") clearFit();
    };
    node.addEventListener("transitionend", onFitEnd);
    const fitFallback = window.setTimeout(clearFit, 300);
    fitCleanup.current = clearFit;
    node.style.width = `${width}px`;
  }, []);

  /* A viewport resize moves both walls; re-clamp on the frame while the
     popup is mounted. */
  const onWindowResize = useCallback(() => {
    if (resizeFrame.current !== 0) return;
    resizeFrame.current = requestAnimationFrame(() => {
      resizeFrame.current = 0;
      refit(popup.current);
    });
  }, [refit]);

  /* Stable, so React runs it once per mount: the popup remounts on every
     open, and the width staff chose last time comes back clamped to the
     bounds of this viewport and the walls beside it. The mount fit does
     not animate — the sheet is arriving. */
  const mount = useCallback(
    // oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- DOM nodes carry platform member types that cannot be made readonly
    (node: HTMLDivElement | null) => {
      if (node === null) {
        window.removeEventListener("resize", onWindowResize);
        if (resizeFrame.current !== 0) {
          cancelAnimationFrame(resizeFrame.current);
          resizeFrame.current = 0;
        }
        fitCleanup.current?.();
        settleCleanup.current?.();
        popup.current = null;
        return;
      }
      if (popup.current === null) window.addEventListener("resize", onWindowResize);
      popup.current = node;
      const width = fit(node, remembered.current);
      if (width !== node.offsetWidth) node.style.width = `${width}px`;
    },
    [onWindowResize],
  );

  // oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- DOM event objects carry platform member types that cannot be made readonly
  function beginResize(event: React.PointerEvent<HTMLButtonElement>): void {
    const grip = event.currentTarget;
    if (grip.dataset.dragging === "true") return; // One pointer owns the drag
    const sheet = grip.closest<HTMLElement>('[data-slot="sheet-content"]');
    if (sheet === null) return;
    event.preventDefault();
    grip.setPointerCapture(event.pointerId);
    grip.dataset.dragging = "true";
    const pointerId = event.pointerId;
    const startX = event.clientX;
    const { min, max } = boundsFor(sheet);
    /* A grab while a fit or the band's settle is still running starts
       where the sheet is, not where either was headed: pin the painted
       width and transform before the drag kills the transitions, or the
       first move snaps to the transition's target. For the band, run the
       transform back through its inverse so the pull continues instead of
       jumping. */
    const shift =
      sheet.dataset.settling === "true"
        ? new DOMMatrixReadOnly(getComputedStyle(sheet).transform).e
        : 0;
    let startWidth = sheet.getBoundingClientRect().width;
    sheet.style.width = `${startWidth}px`;
    fitCleanup.current?.();
    if (shift > 0) {
      sheet.style.transform = `translateX(${shift}px)`;
      startWidth = min - (shift * min) / (BAND_CONSTANT * (min - shift));
    }
    settleCleanup.current?.();
    delete sheet.dataset.settling;
    /* 1:1 with the pointer: nothing eases while a finger is on it. */
    sheet.dataset.dragging = "true";

    // oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- DOM event objects carry platform member types that cannot be made readonly
    const move = (moveEvent: PointerEvent) => {
      if (moveEvent.pointerId !== pointerId) return;
      const wanted = startWidth - (moveEvent.clientX - startX);
      const width = Math.min(max, Math.max(min, wanted));
      sheet.style.width = `${width}px`;
      remembered.current = width;
      /* Past the narrow end the sheet slides toward the edge with rising
         resistance. The wide end is the nearer wall — the sidebar, or the
         open card — so a hard stop. */
      const past = min - wanted;
      sheet.style.transform = past > 0 ? `translateX(${rubberband(past, min)}px)` : "";
    };
    // oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- DOM event objects carry platform member types that cannot be made readonly
    const up = (upEvent: PointerEvent) => {
      if (upEvent.pointerId !== pointerId) return;
      delete grip.dataset.dragging;
      delete sheet.dataset.dragging;
      /* Let go together, so the rubber band eases home on the sheet's own
         transition — on the base beat, not the sheet's slower arrival. */
      if (sheet.style.transform !== "") {
        sheet.dataset.settling = "true";
        const clearSettle = () => {
          delete sheet.dataset.settling;
          sheet.removeEventListener("transitionend", settleEnd);
          window.clearTimeout(settleFallback);
          if (settleCleanup.current === clearSettle) settleCleanup.current = null;
        };
        // oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- DOM event objects carry platform member types that cannot be made readonly
        const settleEnd = (endEvent: TransitionEvent) => {
          if (endEvent.propertyName === "transform") clearSettle();
        };
        sheet.addEventListener("transitionend", settleEnd);
        const settleFallback = window.setTimeout(clearSettle, 300);
        settleCleanup.current = clearSettle;
      }
      sheet.style.transform = "";
      grip.removeEventListener("pointermove", move);
      grip.removeEventListener("pointerup", up);
      grip.removeEventListener("pointercancel", up);
    };
    grip.addEventListener("pointermove", move);
    grip.addEventListener("pointerup", up);
    grip.addEventListener("pointercancel", up);
  }

  function resizeByKey(event: React.KeyboardEvent<HTMLButtonElement>): void {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    const sheet = event.currentTarget.closest<HTMLElement>('[data-slot="sheet-content"]');
    if (sheet === null) return;
    event.preventDefault();
    const { min, max } = boundsFor(sheet);
    const step = event.key === "ArrowLeft" ? KEY_STEP_PX : -KEY_STEP_PX; // Left widens: the sheet grows across
    const width = Math.min(max, Math.max(min, sheet.getBoundingClientRect().width + step));
    sheet.style.width = `${width}px`;
    remembered.current = width;
  }

  return { popup, mount, refit, beginResize, resizeByKey };
}
