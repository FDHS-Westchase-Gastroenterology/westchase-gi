"use client";

import { animate } from "motion/react";
import { useCallback, useRef } from "react";

import { arrive, projectMomentum, rubberband } from "@/lib/motion";

/* The full-record sheet's resize gesture, on its own so the physics can be
   read and reviewed without the record it frames. Everything here is
   apple-design's drag contract: 1:1 tracking from the grab offset, pointer
   capture so the drag survives leaving the strip, progressive resistance at
   both bounds, momentum projection at release, and a settle that any second
   grab can interrupt where it stands. Every curve and duration is the
   registry's (src/lib/motion.ts). */

const MIN_WIDTH_PX = 384;
const KEY_STEP_PX = 32;

const VIEWPORT_SHARE = 0.94;

/* Only the last breath of the gesture decides the release velocity: a drag
   that stalls against the bezel for a moment before the finger lifts has
   stopped, whatever it was doing 300ms ago. */
const VELOCITY_WINDOW_MS = 90;

/* Include the off-screen bleed. Layout measurements exclude the entrance
   transform, which would otherwise shift the resize bounds. */
interface SheetBounds {
  readonly min: number;
  readonly max: number;
  /** Stage left past `max` before the sheet reaches the sidebar's edge. */
  readonly headroom: number;
}

function boundsFor(sheet: HTMLElement): SheetBounds {
  const bleed = Math.max(0, sheet.offsetLeft + sheet.offsetWidth - window.innerWidth);
  const side = document.querySelector(".portal-sidebar")?.getBoundingClientRect();
  const wall = side !== undefined && side.width < window.innerWidth ? side.right : 0;
  const stage = window.innerWidth - wall;
  const widest = Math.max(MIN_WIDTH_PX, Math.min(window.innerWidth * VIEWPORT_SHARE, stage));
  return { min: MIN_WIDTH_PX + bleed, max: widest + bleed, headroom: Math.max(0, stage - widest) };
}

/* Resistance where the give can be seen; a stop where an object is.
   Dragging right narrows the sheet and uncovers the list behind it, so the
   narrow bound bands over the sheet's own narrowest width and every pixel of
   that band is on screen (apple-design §9). Dragging left runs the sheet into
   the sidebar, which paints over it: banding there slid the panel — and the
   grip the hand was holding — under an opaque object, which is not resistance
   but a disappearance. So the wide bound gives the stage that is actually
   left, which with the sidebar flush against it is none. */
function resist(wanted: number, bounds: Readonly<SheetBounds>): number {
  if (wanted < bounds.min) return bounds.min - rubberband(bounds.min - wanted, MIN_WIDTH_PX);
  if (wanted > bounds.max) return bounds.max + rubberband(wanted - bounds.max, bounds.headroom);
  return wanted;
}

interface Sample {
  readonly x: number;
  readonly t: number;
}

/* Pixels of width per second at the moment of release: the pointer's own
   speed, sign-flipped because dragging left widens. Measured across the
   whole surviving window rather than the last pair of events, so one stray
   frame cannot claim the sheet was flung. */
function releaseVelocity(trail: readonly Sample[]): number {
  const last = trail.at(-1);
  const first = trail.at(0);
  if (last === undefined || first === undefined) return 0;
  const elapsed = last.t - first.t;
  if (elapsed <= 0) return 0;
  return ((first.x - last.x) / elapsed) * 1000;
}

export function useSheetResize() {
  const remembered = useRef<number | null>(null);
  const popup = useRef<HTMLDivElement | null>(null);
  /* The settle in flight, so a second grab can stop it where it is instead
     of fighting it (apple-design §3). */
  const settling = useRef<(() => void) | null>(null);

  // Restore the last width within the current viewport bounds on each open.
  // oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- DOM nodes carry platform member types that cannot be made readonly
  const mount = useCallback((node: HTMLDivElement | null) => {
    popup.current = node;
    if (node === null) {
      settling.current?.();
      return;
    }
    if (remembered.current === null) return;
    const { min, max } = boundsFor(node);
    node.style.width = `${Math.min(max, Math.max(min, remembered.current))}px`;
  }, []);

  /* The end of the gesture. The width the sheet is left at is where the
     flick was going, not where the finger stopped (apple-design §6), and
     the spring that carries it there starts at the finger's own speed
     (§5), so there is no seam between dragging and settling. */
  function settle(
    sheet: HTMLElement,
    from: number,
    velocity: number,
    bounds: Readonly<SheetBounds>,
  ) {
    const projected = from + projectMomentum(velocity);
    const to = Math.min(bounds.max, Math.max(bounds.min, projected));
    remembered.current = to;

    const release = () => {
      /* The sheet goes back to being sized by CSS, and to the enter and exit
         transition it owns; nothing the drag wrote outlives the drag. */
      sheet.style.maxWidth = "";
      sheet.style.transition = "";
      settling.current = null;
    };
    const land = () => {
      sheet.style.width = `${to}px`;
      release();
    };

    /* Reduced motion keeps the outcome and drops the travel: the sheet is
       already the width the hand left it, so the last few pixels arrive
       without a journey (DESIGN.md "Reduced motion"). */
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || from === to) {
      land();
      return;
    }

    const settled = animate(from, to, {
      ...arrive,
      velocity,
      onUpdate: (value: number) => {
        sheet.style.width = `${value}px`;
      },
      onComplete: land,
    });
    settling.current = () => {
      settled.stop();
      release();
    };
  }

  // oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- DOM event objects carry platform member types that cannot be made readonly
  function beginResize(event: React.PointerEvent<HTMLButtonElement>): void {
    const grip = event.currentTarget;
    if (grip.dataset.dragging === "true") return; // One pointer owns the drag
    const sheet = grip.closest<HTMLElement>('[data-slot="sheet-content"]');
    if (sheet === null) return;
    event.preventDefault();

    /* Interruption: a settle still running is stopped where it is on screen,
       and the drag begins from that width — never from the one it was
       heading for, which is what makes an interrupted spring jump. */
    settling.current?.();

    const pointerId = event.pointerId;
    grip.setPointerCapture(pointerId);
    grip.dataset.dragging = "true";

    const bounds = boundsFor(sheet);
    const startWidth = sheet.getBoundingClientRect().width;
    const startX = event.clientX;
    /* The drag owns the width outright: no transition to lag behind the
       pointer, and no max-width to swallow the resistance past the wide
       bound. Both are handed back when the sheet settles. */
    sheet.style.transition = "none";
    sheet.style.maxWidth = "none";

    let width = startWidth;
    let frame = 0;
    /* Where the gesture is measured from. It is the grab point until the
       sheet meets something that will not move, and the wall from then on. */
    let anchorX = startX;
    let anchorWidth = startWidth;
    const trail: Sample[] = [{ x: startX, t: event.timeStamp }];

    const paint = () => {
      frame = 0;
      sheet.style.width = `${width}px`;
    };

    // oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- DOM event objects carry platform member types that cannot be made readonly
    const move = (moveEvent: PointerEvent) => {
      if (moveEvent.pointerId !== pointerId) return;
      const wanted = anchorWidth - (moveEvent.clientX - anchorX);
      width = resist(wanted, bounds);
      /* At a bound with no stage to give, the sheet stops but the hand does
         not, and the travel it spends there is travel it has to spend again
         before the sheet moves at all — which is the "stuck" the sheet was
         accused of. Re-anchoring the gesture at the wall each frame keeps
         the way back 1:1 from its first pixel. */
      if (wanted > bounds.max && width <= bounds.max) {
        anchorX = moveEvent.clientX;
        anchorWidth = width;
      }
      trail.push({ x: moveEvent.clientX, t: moveEvent.timeStamp });
      while (trail.length > 2 && moveEvent.timeStamp - (trail[0]?.t ?? 0) > VELOCITY_WINDOW_MS) {
        trail.shift();
      }
      /* One write per frame. A fast drag delivers pointer events faster than
         the display refreshes, and writing width on every one of them is the
         lag the gesture was accused of (apple-design §11). */
      if (frame === 0) frame = requestAnimationFrame(paint);
    };

    const finish = () => {
      if (frame !== 0) cancelAnimationFrame(frame);
      frame = 0;
      grip.removeEventListener("pointermove", move);
      grip.removeEventListener("pointerup", finish);
      grip.removeEventListener("pointercancel", finish);
      grip.removeEventListener("lostpointercapture", finish);
      /* Release the capture whatever ended the drag. Leaving it held is what
         left the cursor stuck to the bezel after a toss off-screen. */
      if (grip.hasPointerCapture(pointerId)) grip.releasePointerCapture(pointerId);
      delete grip.dataset.dragging;
      settle(sheet, width, releaseVelocity(trail), bounds);
    };

    grip.addEventListener("pointermove", move);
    grip.addEventListener("pointerup", finish);
    grip.addEventListener("pointercancel", finish);
    grip.addEventListener("lostpointercapture", finish);
  }

  function resizeByKey(event: React.KeyboardEvent<HTMLButtonElement>): void {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    const sheet = event.currentTarget.closest<HTMLElement>('[data-slot="sheet-content"]');
    if (sheet === null) return;
    event.preventDefault();
    /* A key press is a new instruction: it stops whatever the pointer's
       flick was still doing and steps from where the sheet is now. */
    settling.current?.();
    const { min, max } = boundsFor(sheet);
    const step = event.key === "ArrowLeft" ? KEY_STEP_PX : -KEY_STEP_PX; // Left widens: the sheet grows across
    const width = Math.min(max, Math.max(min, sheet.getBoundingClientRect().width + step));
    sheet.style.width = `${width}px`;
    remembered.current = width;
  }

  return { popup, mount, beginResize, resizeByKey };
}
