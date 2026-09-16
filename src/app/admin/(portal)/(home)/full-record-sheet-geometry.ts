import { useCallback, useRef } from "react";

import { CARD_BUTTON, OPEN_CARD } from "./sheet-coexistence";

/* The sheet panel's box: how wide it may be, where it opens, how it gives
   past its ends, and where its arrival scales from. It is the sheet's own
   concern rather than a recipe's, because the numbers come from measuring
   the live layout — the sidebar's wall, the card beside it, the bleed
   home.css authors past the viewport edge. */

const MIN_WIDTH_PX = 384;
const KEY_STEP_PX = 32;
/** The widest the sheet goes when nothing walls it: a sliver of page stays. */
const VIEWPORT_SHARE = 0.94;
/** The layout with the sidebar as a column, where the sheet sits beside the card. */
const SIDEBAR_LAYOUT = "(min-width: 60rem)";

/* The bounds of a resize, in the sheet's own box width. That box carries
   the off-screen bleed home.css authors past the viewport edge (so the
   arrival's scale and overshoot never open a gap there), measured here
   rather than repeated as a constant. The measure is the layout box, not
   the painted one: on its first frame the popup still wears the arrival
   scale, and a bound read off a transformed rect would drift by it. On
   the wide layout the sidebar is a fixed column above the sheet, so the
   wall is its right edge; below that breakpoint the sidebar is a bottom
   bar and the sheet keeps the viewport share. */
interface SheetBounds {
  readonly min: number;
  readonly max: number;
  readonly bleed: number;
}

function boundsFor(sheet: HTMLElement): SheetBounds {
  const bleed = Math.max(0, sheet.offsetLeft + sheet.offsetWidth - window.innerWidth);
  const side = document.querySelector(".portal-sidebar")?.getBoundingClientRect();
  const wall = side !== undefined && side.width < window.innerWidth ? side.right : 0;
  const widest = Math.min(window.innerWidth * VIEWPORT_SHARE, window.innerWidth - wall);
  return { min: MIN_WIDTH_PX + bleed, max: Math.max(MIN_WIDTH_PX, widest) + bleed, bleed };
}

/* Apple's rubber band: the further past the bound, the less the sheet
   follows, so it slows before it stops instead of freezing. */
function rubberband(overshoot: number, dimension: number, constant = 0.55): number {
  return (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot));
}

/* The room beside the open card on the sidebar layout: from the card's
   right edge to the viewport edge, less one list gutter, so the sheet
   clears the card by the gap the list keeps (Phase 0.5). Null when there
   is no card to clear or the layout is the narrow one, where nothing is
   clamped. The gutter is read off the home root because the sheet is
   portaled to body and cannot inherit it. */
function cardClearance(): number | null {
  if (!window.matchMedia(SIDEBAR_LAYOUT).matches) return null;
  const card = document.querySelector(OPEN_CARD);
  const home = document.querySelector(".wgi-home");
  if (card === null || home === null) return null;
  const rem = Number.parseFloat(getComputedStyle(document.documentElement).fontSize);
  const gutterRem = Number.parseFloat(getComputedStyle(home).getPropertyValue("--wgi-gutter"));
  const gutter = Number.isFinite(gutterRem) ? gutterRem * rem : 0;
  return window.innerWidth - card.getBoundingClientRect().right - gutter;
}

/* The width the sheet opens at: the remembered width, else the authored
   one, inside the bounds — and beside an open card no wider than the room
   that clears it, never below the minimum. Staff may still drag or key it
   wider over the card afterwards. The style is written only when it
   changes something, so the authored width stays the stylesheet's. */
function fit(sheet: HTMLElement, remembered: number | null): void {
  sheet.style.width = "";
  const authored = sheet.offsetWidth;
  const { min, max, bleed } = boundsFor(sheet);
  const room = cardClearance();
  const ceiling = room === null ? max : Math.max(min, Math.min(max, room + bleed));
  const width = Math.min(ceiling, Math.max(min, remembered ?? authored));
  if (width !== authored) sheet.style.width = `${width}px`;
}

/* The point the sheet scales from: the centre of the card's "Open full
   record" button (the card itself if the button is not there), in the
   sheet's own box, since a transform-origin is measured from its element's
   top-left corner. The layout box, not the painted one, for the same
   reason as the bounds. The card ends left of the sheet, so the x clamps
   to the sheet's left edge and the y is the button's height on the sheet.
   With no card open the properties are cleared and home.css's fallback
   applies: the left edge, centred. */
function setOrigin(sheet: HTMLElement): void {
  const source = document.querySelector(CARD_BUTTON) ?? document.querySelector(OPEN_CARD);
  if (source === null) {
    sheet.style.removeProperty("--wgi-sheet-origin-x");
    sheet.style.removeProperty("--wgi-sheet-origin-y");
    return;
  }
  const rect = source.getBoundingClientRect();
  const x = rect.left + rect.width / 2 - sheet.offsetLeft;
  const y = rect.top + rect.height / 2 - sheet.offsetTop;
  sheet.style.setProperty(
    "--wgi-sheet-origin-x",
    `${Math.min(sheet.offsetWidth, Math.max(0, x))}px`,
  );
  sheet.style.setProperty(
    "--wgi-sheet-origin-y",
    `${Math.min(sheet.offsetHeight, Math.max(0, y))}px`,
  );
}

/** The panel's box and the two ways staff change it: a drag on the grip, and
    the arrow keys on the same grip. The width they settle on is remembered
    for the next record they open. */
export function useSheetResize() {
  const remembered = useRef<number | null>(null);
  const popup = useRef<HTMLDivElement | null>(null);

  /* Fit first, then aim: the sheet is anchored to the right edge, so its
     left edge — the origin's reference — moves with the width. */
  const refit = useCallback((node: HTMLElement | null) => {
    if (node === null) return;
    fit(node, remembered.current);
    setOrigin(node);
  }, []);

  /* Stable, so React runs it once per mount: the popup remounts on every
     open, and the width staff chose last time comes back clamped to the
     bounds of this viewport and the room beside the open card. */
  const mount = useCallback(
    // oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- DOM nodes carry platform member types that cannot be made readonly
    (node: HTMLDivElement | null) => {
      popup.current = node;
      refit(node);
    },
    [refit],
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
    const startWidth = sheet.getBoundingClientRect().width;
    const { min, max } = boundsFor(sheet);
    /* 1:1 with the pointer: nothing eases while a finger is on it. */
    sheet.style.transition = "none";

    // oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- DOM event objects carry platform member types that cannot be made readonly
    const move = (moveEvent: PointerEvent) => {
      if (moveEvent.pointerId !== pointerId) return;
      const wanted = startWidth - (moveEvent.clientX - startX);
      const width = Math.min(max, Math.max(min, wanted));
      sheet.style.width = `${width}px`;
      remembered.current = width;
      /* Past the narrow end the sheet slides toward the edge with rising
         resistance. The wide end is the sidebar: a wall, so a hard stop. */
      const past = min - wanted;
      sheet.style.transform = past > 0 ? `translateX(${rubberband(past, min)}px)` : "";
    };
    // oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- DOM event objects carry platform member types that cannot be made readonly
    const up = (upEvent: PointerEvent) => {
      if (upEvent.pointerId !== pointerId) return;
      delete grip.dataset.dragging;
      /* Let go together, so the rubber band springs home on the sheet's own
         arrival temperament. */
      sheet.style.transition = "";
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
