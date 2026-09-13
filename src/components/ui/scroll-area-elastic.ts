/*
 * The elastic thumb: the drawing that flexes when a scroll gesture pushes
 * past either end of the list and recoils when the push lets go
 * (issue #302). It belongs to the ScrollArea recipe because the thumb's
 * drawn layer is the recipe's own part; the values it uses come from
 * scroll-area-physics.ts and the registry's `recoil` spring.
 *
 * What it never does: it never writes `scrollTop`, never touches the
 * thumb Base UI measures and translates, never slows or snaps the rows.
 * Content keeps the platform's physics, including native overscroll where
 * the browser provides it (Safari rubber-bands `scrollTop` out of range,
 * and Base UI shortens the thumb for it); the moment `scrollTop` leaves
 * its range, this drawing stands down so one gesture gets one elastic
 * drawing. Chromium's touch overscroll stretch is compositor-only and
 * unobservable from script, so touch panning gets the platform's own
 * feedback and none of this.
 *
 * The drawing is `residual + squash(pressure)`: pressure is the attempted
 * travel past an end, in thumb coordinates, from the input that owns the
 * gesture (a captured thumb drag, or a wheel stream over the rows or the
 * rail); residual is whatever an earlier push left behind, carried by the
 * spring. Fresh pressure freezes the spring where it is and adds on top,
 * so a re-grab or a new notch mid-recoil redirects without a jump; the
 * end of pressure (release, the first inward crossing, wheel quiet, or the
 * content leaving the boundary) hands the drawn value and its own measured
 * velocity to the spring. A cancelled or lost pointer, a blurred window,
 * a resize, a thumb re-measure, reduced motion, or unmount clears it
 * outright.
 */

import { animate } from "motion/react";

import {
  WHEEL_QUIET,
  WIDEN_RATIO,
  clampDrawn,
  deformationVelocity,
  normalizeWheel,
  squash,
  toContent,
  toTrack,
  trimSamples,
  wheelExcess,
} from "@/components/ui/scroll-area-physics";
import type { Sample } from "@/components/ui/scroll-area-physics";
import { recoil } from "@/lib/motion";

/** Which end the drawing is anchored to: 1 past the end, -1 past the start. */
type Side = -1 | 1;

interface Flight {
  readonly stop: () => void;
}

/* Fractional `scrollTop` at a zoom level lands a hair short of the limit;
   within this many pixels the content counts as at its boundary. */
const EDGE = 1;

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

function cssLength(value: string): number {
  const parsed = Number.parseFloat(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

/**
 * Attaches the elastic drawing to a vertical rail. Returns the detach, or
 * nothing when the rail has no viewport sibling or no thumb ink to draw.
 */
export function attachElasticThumb(rail: HTMLElement): (() => void) | undefined {
  const viewport =
    rail.parentElement?.querySelector<HTMLElement>(':scope > [data-slot="scroll-area-viewport"]') ??
    null;
  const thumb = rail.querySelector<HTMLElement>('[data-slot="scroll-area-thumb"]');
  const ink = thumb?.querySelector<HTMLElement>('[data-slot="scroll-area-thumb-ink"]') ?? null;
  if (viewport === null || thumb === null || ink === null) return undefined;
  return bind(rail, viewport, thumb, ink);
}

function bind(
  rail: HTMLElement,
  viewport: HTMLElement,
  thumb: HTMLElement,
  ink: HTMLElement,
): () => void {
  const reduced = window.matchMedia(REDUCED_MOTION);

  let pointerId: number | null = null;
  let grabY = 0;
  /* Base UI's own drag origin: `scrollTop` when the thumb was grabbed,
     read on the first move before Base UI applies it. The origin is fixed
     for the drag, the way a native scrollbar's is, so the pointer retraces
     its overdrag before the thumb moves again; the drawing relaxes
     continuously during that retrace, which is the feedback that keeps the
     fixed origin from reading as frozen. */
  let startScrollTop: number | null = null;
  let side: Side = 1;
  let pressure = 0;
  let residual = 0;
  let drawn = 0;
  let samples: Sample[] = [];
  let flight: Flight | null = null;
  let quiet: number | null = null;
  let frame: number | null = null;
  let spare: number | null = null;

  /* The rail padding and thumb margin Base UI subtracts from the track. */
  function spareSpace(): number {
    if (spare === null) {
      const railStyle = getComputedStyle(rail);
      const thumbStyle = getComputedStyle(thumb);
      spare =
        cssLength(railStyle.paddingTop) +
        cssLength(railStyle.paddingBottom) +
        cssLength(thumbStyle.marginTop) +
        cssLength(thumbStyle.marginBottom);
    }
    return spare;
  }

  function maxOffset(): number {
    return rail.offsetHeight - thumb.offsetHeight - spareSpace();
  }

  function maxScrollTop(): number {
    return viewport.scrollHeight - viewport.clientHeight;
  }

  function outOfRange(): boolean {
    const top = viewport.scrollTop;
    return top < 0 || top > maxScrollTop();
  }

  function atBoundary(): boolean {
    const top = viewport.scrollTop;
    return side === 1 ? top >= maxScrollTop() - EDGE : top <= EDGE;
  }

  function paint(value: number, height: number): void {
    drawn = value;
    const now = performance.now();
    samples = trimSamples(samples, now);
    samples.push({ value, time: now });
    if (value === 0 || height <= 0) {
      ink.style.transform = "";
      ink.style.transformOrigin = "";
      ink.style.willChange = "";
      return;
    }
    const s = value / height;
    ink.style.transformOrigin = side === 1 ? "50% 100%" : "50% 0%";
    ink.style.transform = `scale(${String(1 + WIDEN_RATIO * s)}, ${String(1 - s)})`;
    /* The hint lasts as long as the deformation does: a thumb at rest is
       not about to move, and a layer kept for it is one the compositor
       holds for nothing. */
    ink.style.willChange = "transform";
  }

  function draw(): void {
    const height = thumb.offsetHeight;
    paint(clampDrawn(residual + squash(pressure, height), height), height);
  }

  function stopFlight(): void {
    if (flight === null) return;
    flight.stop();
    flight = null;
  }

  function clearQuiet(): void {
    if (quiet === null) return;
    window.clearTimeout(quiet);
    quiet = null;
  }

  function clearFrame(): void {
    if (frame === null) return;
    window.cancelAnimationFrame(frame);
    frame = null;
  }

  function neutral(): void {
    stopFlight();
    clearQuiet();
    clearFrame();
    pressure = 0;
    residual = 0;
    samples = [];
    paint(0, thumb.offsetHeight);
  }

  /* The spring carries the drawn value home from where it is and how fast
     it was already moving. `overtaken` outlives `stop()` because a stopped
     animation may still deliver the frame in flight. */
  function recoilFrom(velocity: number): void {
    stopFlight();
    if (residual === 0) {
      draw();
      return;
    }
    let overtaken = false;
    const controls = animate(residual, 0, {
      ...recoil,
      velocity,
      onUpdate: (value: number) => {
        if (overtaken) return;
        residual = value;
        draw();
      },
      onComplete: () => {
        if (overtaken) return;
        flight = null;
        residual = 0;
        draw();
      },
    });
    flight = {
      stop: () => {
        overtaken = true;
        controls.stop();
      },
    };
  }

  /* Pressure ends: whatever is drawn, and however fast it was changing,
     goes to the spring. */
  function letGo(): void {
    if (pressure === 0) return;
    pressure = 0;
    residual = drawn;
    recoilFrom(deformationVelocity(samples, drawn, performance.now()));
  }

  /* Pressure begins or continues on a side: the recovery freezes where it
     is and the push adds on top. A leftover from the other end has no
     physical continuation into this one and is dropped. */
  function press(next: Side, amount: number): void {
    stopFlight();
    if (side !== next) {
      side = next;
      residual = 0;
    }
    pressure = amount;
  }

  // oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- DOM nodes carry platform member types that cannot be made readonly
  function onPointerDown(event: PointerEvent): void {
    if (event.button !== 0 || pointerId !== null) return;
    pointerId = event.pointerId;
    grabY = event.clientY;
    startScrollTop = null;
  }

  function release(): void {
    pointerId = null;
    startScrollTop = null;
    letGo();
  }

  // oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- DOM nodes carry platform member types that cannot be made readonly
  function onPointerMove(event: PointerEvent): void {
    if (pointerId === null || event.pointerId !== pointerId) return;
    /* A release the element never saw shows up as a move with the primary
       button bit unset, the same test Base UI's root uses. */
    if (event.buttons % 2 === 0) {
      release();
      return;
    }
    if (reduced.matches) return;
    const limit = maxScrollTop();
    const travel = maxOffset();
    if (limit <= 0 || travel <= 0) return;
    startScrollTop ??= viewport.scrollTop;
    const intended = toContent(event.clientY - grabY, travel, limit);
    const over = toTrack(wheelExcess(startScrollTop, intended, limit), travel, limit);
    if (over === 0) {
      /* The first inward crossing: the thumb resumes travel under Base UI
         and the drawing recoils on its own. */
      letGo();
      return;
    }
    press(over > 0 ? 1 : -1, over);
    draw();
  }

  // oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- DOM nodes carry platform member types that cannot be made readonly
  function onPointerEnd(event: PointerEvent): void {
    if (pointerId === null || event.pointerId !== pointerId) return;
    release();
  }

  function endWheel(): void {
    clearQuiet();
    clearFrame();
    letGo();
  }

  function drawWhenAtBoundary(): void {
    frame = null;
    if (outOfRange()) {
      neutral();
      return;
    }
    if (pressure !== 0 && atBoundary()) draw();
  }

  /* One wheel step that the viewport cannot take becomes pressure, in
     thumb coordinates, at the end it pushed against. Read before the
     browser (over the rows) or Base UI (over the rail) applies the step,
     so `scrollTop` is still the value the step started from. Pinch-zoom
     wheels and a viewport that native overscroll already holds out of
     range are not this drawing's to answer. */
  // oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- DOM nodes carry platform member types that cannot be made readonly
  function onWheel(event: WheelEvent): void {
    if (pointerId !== null || event.ctrlKey || reduced.matches) return;
    const limit = maxScrollTop();
    if (limit <= 0 || outOfRange()) return;
    const delta = normalizeWheel(event.deltaY, event.deltaMode, viewport.clientHeight);
    const excess = wheelExcess(viewport.scrollTop, delta, limit);
    if (excess === 0) {
      /* An inward or in-range step: the held pressure lets go now rather
         than after the quiet period; the content never waits either way. */
      if (pressure !== 0) endWheel();
      return;
    }
    const next: Side = excess > 0 ? 1 : -1;
    const held = side === next ? pressure : 0;
    press(next, held + toTrack(excess, maxOffset(), limit));
    clearQuiet();
    quiet = window.setTimeout(endWheel, WHEEL_QUIET);
    frame ??= window.requestAnimationFrame(drawWhenAtBoundary);
  }

  /* The content moved. Out of range means native overscroll owns the
     gesture and Base UI is drawing it. In range with wheel pressure held,
     the content either just arrived at the boundary (a smooth wheel scroll
     finishing) and the drawing may begin, or it left the boundary by some
     other input and the pressure lets go. */
  function onScroll(): void {
    if (outOfRange()) {
      if (drawn !== 0 || pressure !== 0 || flight !== null) neutral();
      return;
    }
    if (pressure === 0 || pointerId !== null) return;
    if (atBoundary()) draw();
    else endWheel();
  }

  function onBlur(): void {
    neutral();
  }

  function onReducedMotionChange(): void {
    if (reduced.matches) neutral();
  }

  /* A thumb that changed size (a filter, new rows, Safari's overscroll
     override) or a viewport that did (a resize, a zoom) makes any drawn
     deformation stale. Geometry is re-read on the next input. */
  const observer = new ResizeObserver(() => {
    spare = null;
    if (drawn !== 0 || pressure !== 0 || flight !== null) neutral();
  });
  observer.observe(thumb);
  observer.observe(viewport);

  rail.addEventListener("pointerdown", onPointerDown, true);
  rail.addEventListener("pointermove", onPointerMove, true);
  rail.addEventListener("pointerup", onPointerEnd, true);
  rail.addEventListener("pointercancel", onPointerEnd, true);
  rail.addEventListener("lostpointercapture", onPointerEnd, true);
  rail.addEventListener("wheel", onWheel, { passive: true });
  viewport.addEventListener("wheel", onWheel, { passive: true });
  viewport.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("blur", onBlur);
  reduced.addEventListener("change", onReducedMotionChange);

  return () => {
    observer.disconnect();
    rail.removeEventListener("pointerdown", onPointerDown, true);
    rail.removeEventListener("pointermove", onPointerMove, true);
    rail.removeEventListener("pointerup", onPointerEnd, true);
    rail.removeEventListener("pointercancel", onPointerEnd, true);
    rail.removeEventListener("lostpointercapture", onPointerEnd, true);
    rail.removeEventListener("wheel", onWheel);
    viewport.removeEventListener("wheel", onWheel);
    viewport.removeEventListener("scroll", onScroll);
    window.removeEventListener("blur", onBlur);
    reduced.removeEventListener("change", onReducedMotionChange);
    pointerId = null;
    neutral();
  };
}
