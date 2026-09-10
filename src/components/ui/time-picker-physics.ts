import { rubberband } from "@/lib/motion";

/** Returns travel in pixels from velocity in px/s; 1000px/s travels about three rows. */
export function projectRest(velocity: number): number {
  const rate = 0.99;
  return ((velocity / 1000) * rate) / (1 - rate);
}

export function clamp(index: number, last: number): number {
  return Math.min(Math.max(index, 0), last);
}

export function rowHeight(track: HTMLElement): number {
  const row = track.firstElementChild?.nextElementSibling;
  if (!(row instanceof HTMLElement) || row.offsetHeight === 0) {
    throw new Error("Time picker needs a measurable option row");
  }
  return row.offsetHeight;
}

/* Scroll offsets cannot exceed the container. Show the remainder as track
   stretch and return it so interruption can recover the full position. */
export function place(scroller: HTMLElement, track: HTMLElement, top: number): number {
  const bounded = Math.min(Math.max(top, 0), scroller.scrollHeight - scroller.clientHeight);
  const over = top - bounded;
  scroller.scrollTop = bounded;
  const stretched = over !== 0;
  track.style.transform = stretched
    ? `translateY(${String(-rubberband(over, scroller.clientHeight))}px)`
    : "";
  // Release the compositor layer when stretching ends.
  track.style.willChange = stretched ? "transform" : "";
  return over;
}

export interface Sample {
  readonly y: number;
  readonly time: number;
}

// Sample the last 100ms to avoid noise from a single pair of pointer events.
export const VELOCITY_WINDOW = 100;

export interface Flight {
  readonly target: number;
  readonly controls: { readonly stop: () => void };
}

export interface Drag {
  readonly startY: number;
  readonly startTop: number;
  readonly samples: Sample[];
  moved: boolean;
}

export function releaseVelocity(samples: readonly Sample[], endY: number, endTime: number): number {
  const first = samples.at(0);
  if (first === undefined) return 0;
  const elapsed = endTime - first.time;
  if (elapsed <= 0) return 0;
  return ((first.y - endY) / elapsed) * 1000;
}

export function keyTarget(key: string, centered: number, last: number): number | null {
  if (key === "ArrowDown") return clamp(centered + 1, last);
  if (key === "ArrowUp") return clamp(centered - 1, last);
  if (key === "PageDown") return clamp(centered + 3, last);
  if (key === "PageUp") return clamp(centered - 3, last);
  if (key === "Home") return 0;
  if (key === "End") return last;
  return null;
}
