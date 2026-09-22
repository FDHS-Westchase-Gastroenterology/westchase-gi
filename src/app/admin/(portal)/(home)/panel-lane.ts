import { SHEET } from "./sheet-coexistence";

/* The lane a detached record card may occupy, and the measures the panel
   and the full-record sheet share to stay out of each other's way. The
   sheet is the record's inspector along the right edge; the panel is a
   freestanding companion (HIG Panels) that never slides under it and is
   never dragged over it. With no sheet the lane is the whole viewport,
   less a small margin; with one open it ends one list gutter short of the
   sheet's left edge — the gap the list keeps — so the two read as
   neighbours rather than a stack. When the sheet claims the space the
   panel stands in (it opens, a refit widens it, staff drag its grip), the
   panel yields leftward, the way a window yields to a screen edge; when
   the sheet leaves, the panel stays where it was put. Only where the
   viewport is too narrow for both does the panel overlap the sheet — it
   yields no further than the nav's edge — and then it stays on top
   (home.css raises its layer). */

/** The layout with the sidebar as a column: the only one where the card
    detaches and the sheet runs beside it. */
export const SIDEBAR_LAYOUT = "(min-width: 60rem)";

/** A translate, in pixels. */
export interface Offset {
  readonly x: number;
  readonly y: number;
}

/** The panel always keeps this much space to the viewport's edges. */
export const VIEWPORT_MARGIN_PX = 8;

/** The home list's gutter in pixels, read off the home root because the
    card and the sheet are portaled to body and cannot inherit it. */
export function listGutter(): number {
  const home = document.querySelector(".wgi-home");
  if (home === null) return 0;
  const rem = Number.parseFloat(getComputedStyle(document.documentElement).fontSize);
  const gutterRem = Number.parseFloat(getComputedStyle(home).getPropertyValue("--wgi-gutter"));
  return Number.isFinite(gutterRem) ? gutterRem * rem : 0;
}

/** The sidebar's right edge on the sidebar layout, else 0. */
export function sidebarWall(): number {
  const side = document.querySelector(".portal-sidebar")?.getBoundingClientRect();
  return side !== undefined && side.width < window.innerWidth ? side.right : 0;
}

/** The translate the panel holds — the target, not a frame of a yield in
    flight — read back from its inline style. */
export function panelOffset(popup: HTMLElement): Offset {
  const [x = 0, y = 0] = popup.style.translate.split(" ").map((part) => Number.parseFloat(part));
  return { x: Number.isFinite(x) ? x : 0, y: Number.isFinite(y) ? y : 0 };
}

/** The panel's box with no translate: the positioner's, which the frozen
    anchor holds still and which carries neither the drag's translate nor
    the entry's scale. */
export function panelBase(popup: HTMLElement): DOMRect {
  return (popup.parentElement ?? popup).getBoundingClientRect();
}

/** The open sheet's left edge, where the lane ends, or null with no sheet
    to clear. The layout box, not the painted one: while the sheet slides
    in, the panel yields to where it is arriving, not to a frame of it. */
function sheetEdge(): number | null {
  if (!window.matchMedia(SIDEBAR_LAYOUT).matches) return null;
  const sheet = document.querySelector<HTMLElement>(`${SHEET}[data-open]`);
  return sheet === null ? null : sheet.offsetLeft;
}

interface Lane {
  /** The translate range that keeps the panel inside the lane. */
  readonly minX: number;
  readonly maxX: number;
  readonly minY: number;
  readonly maxY: number;
  /** True when maxX is the sheet, a soft wall; the viewport's edges are hard. */
  readonly walled: boolean;
}

/** The translate range for a panel whose un-translated box is `base`. */
// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- DOM geometry carries platform member types that cannot be made readonly
export function laneFor(base: DOMRect): Lane {
  const minX = VIEWPORT_MARGIN_PX - base.left;
  const minY = VIEWPORT_MARGIN_PX - base.top;
  const maxY = Math.max(minY, window.innerHeight - VIEWPORT_MARGIN_PX - base.bottom);
  const screenMax = Math.max(minX, window.innerWidth - VIEWPORT_MARGIN_PX - base.right);
  const edge = sheetEdge();
  if (edge === null) return { minX, maxX: screenMax, minY, maxY, walled: false };
  /* The sheet pushes the panel no further than the nav's edge: past that,
     too narrow for both, the panel overlaps the sheet and stays on top
     rather than covering the nav. Staff may still drag it over the nav. */
  const gutter = listGutter();
  const floorX = Math.max(minX, sidebarWall() + gutter - base.left);
  const wallX = Math.max(floorX, edge - gutter - base.right);
  return { minX, maxX: Math.min(screenMax, wallX), minY, maxY, walled: wallX < screenMax };
}

/** How wide the sheet may open beside a detached panel: as wide as the
    panel can make room by yielding — to the sidebar's wall plus a gutter,
    or where the panel already is when staff put it further left — so the
    sheet never pushes the panel over the nav. */
export function roomBesidePanel(popup: HTMLElement): number {
  const gutter = listGutter();
  const left = panelBase(popup).left + panelOffset(popup).x;
  const yieldLeft = Math.max(VIEWPORT_MARGIN_PX, Math.min(left, sidebarWall() + gutter));
  return window.innerWidth - yieldLeft - popup.offsetWidth - gutter;
}
