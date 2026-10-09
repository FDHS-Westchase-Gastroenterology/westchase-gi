/*
 * The TimePicker's physics, kept apart from time-picker.tsx the way
 * time-picker-variants.ts is: none of it touches React, all of it is the
 * platform behavior a mouse does not supply, and every rule here is
 * checkable on its own.
 *
 * The wheel is a scroll container, so touch and trackpad already get the
 * platform's momentum, rubber-banding and mid-flight interruption. A
 * mouse gets none of those, and this module is the three that matter,
 * taken from Apple's own model rather than approximated:
 *
 *   - `projectRest` is scroll deceleration, so a flick is thrown to where
 *     it was going rather than snapped back to where the button came up;
 *   - `rubberband` is the resistance past an end, so a wheel that has run
 *     out of rows reads as short rather than seized;
 *   - `releaseVelocity` is the speed of the hand over the last stretch of
 *     the gesture, which is what the settle is handed so there is no seam
 *     between the drag and the animation.
 *
 * `place` is the one path every kind of travel goes through — drag,
 * throw, click, keyboard, an outside value change — so an overshoot
 * stretches the same way whichever produced it.
 */

/* The scroll deceleration model, at the rate a five-row window wants: a
   flick of 1000px/s carries about three rows past the release point. */
export function projectRest(velocity: number): number {
  const rate = 0.99;
  return ((velocity / 1000) * rate) / (1 - rate);
}

/* Apple's rubber-band curve: the further past the end the wheel is pulled,
   the less of that pull it follows, tending toward a little over half the
   window. A two-row meridiem wheel is at an end the whole time, so a hard
   stop there would read as a seized control rather than a short list. */
export function rubberband(overshoot: number, window: number): number {
  const constant = 0.55;
  return (overshoot * window * constant) / (window + constant * Math.abs(overshoot));
}

export function clamp(index: number, last: number): number {
  return Math.min(Math.max(index, 0), last);
}

/** The row height as the browser laid it out, so the size axis stays CSS. */
export function rowHeight(track: HTMLElement): number {
  const row = track.firstElementChild?.nextElementSibling;
  const height = row instanceof HTMLElement ? row.offsetHeight : 0;
  return height > 0 ? height : 1;
}

/* `top` is the wheel's unbounded position: the scroller carries as much of
   it as it has room for, and whatever is left over becomes stretch on the
   track, because a scroll container has no room past its own ends to show
   an over-drag. Returns that leftover, which is what an interruption adds
   back to `scrollTop` to know where the wheel actually is on screen. */
export function place(scroller: HTMLElement, track: HTMLElement, top: number): number {
  const bounded = Math.min(Math.max(top, 0), scroller.scrollHeight - scroller.clientHeight);
  const over = top - bounded;
  scroller.scrollTop = bounded;
  const stretched = over !== 0;
  track.style.transform = stretched
    ? `translateY(${String(-rubberband(over, scroller.clientHeight))}px)`
    : "";
  /* The hint lasts as long as the stretch does. A wheel sitting on its row
     is not about to move, and a layer kept for it is one the compositor
     holds for nothing. */
  track.style.willChange = stretched ? "transform" : "";
  return over;
}

export interface Sample {
  readonly y: number;
  readonly time: number;
}

/* Velocity over the last stretch of the gesture rather than the last two
   events: a single pair is noisy, and a hand that came to rest before
   letting go has to read as zero rather than as whatever the last two
   pixels said. */
export const VELOCITY_WINDOW = 100;

/** What is left of an in-flight settle: where it is going, and the way to stop it. */
export interface Flight {
  readonly target: number;
  readonly controls: { readonly stop: () => void };
}

/** A gesture in progress: where it was grabbed, and the samples it has left. */
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

/** The row a key asks for, or nothing when the key is not the wheel's. */
export function keyTarget(key: string, centered: number, last: number): number | null {
  if (key === "ArrowDown") return clamp(centered + 1, last);
  if (key === "ArrowUp") return clamp(centered - 1, last);
  if (key === "PageDown") return clamp(centered + 3, last);
  if (key === "PageUp") return clamp(centered - 3, last);
  if (key === "Home") return 0;
  if (key === "End") return last;
  return null;
}
