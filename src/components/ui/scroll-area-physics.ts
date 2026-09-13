/*
 * The elastic thumb's physics, kept apart from scroll-area.tsx the way
 * time-picker-physics.ts is kept apart from the TimePicker: none of it
 * touches React or the DOM, and every rule is checkable on its own.
 *
 * The thumb Base UI measures and translates is never touched. What flexes
 * is a drawn layer inside it (the ink), and these functions decide how far
 * it flexes for a given push and how fast it was moving when the push
 * ended (issue #302):
 *
 *   - `wheelExcess` is the part of a scroll step the viewport cannot take,
 *     the same arithmetic for a wheel notch and for a thumb drag once the
 *     drag is expressed in content pixels;
 *   - `toTrack` puts that excess in thumb coordinates, so one push maps
 *     the same way whichever input produced it;
 *   - `squash` is the resistance: diminishing returns that never reach
 *     the cap, so the thumb reads as short and never as more records;
 *   - `deformationVelocity` is how fast the drawing itself was changing
 *     over the last stretch, which is what the recoil spring is handed.
 */

/** The most of the drawn height a push can remove, as a fraction. */
export const MAX_SQUASH = 0.3;

/** How much of the squash comes back sideways, as a fraction of it. */
export const WIDEN_RATIO = 0.5;

/** Milliseconds; samples older than this describe a hand that has moved on. */
export const VELOCITY_WINDOW = 100;

/** Milliseconds without outward wheel input before the drawing recoils. */
export const WHEEL_QUIET = 150;

/* A wheel that reports lines rather than pixels is normalized at the
   size the browsers use for one line; a page is the viewport. */
const LINE_HEIGHT = 16;

export interface Sample {
  readonly value: number;
  readonly time: number;
}

/* The signed part of a scroll step the viewport cannot take: negative
   past the start, positive past the end, zero while the step fits. Read
   `scrollTop` before the browser applies the step. */
export function wheelExcess(scrollTop: number, delta: number, maxScrollTop: number): number {
  const next = scrollTop + delta;
  if (next < 0) return next;
  if (next > maxScrollTop) return next - maxScrollTop;
  return 0;
}

export function normalizeWheel(delta: number, deltaMode: number, pageHeight: number): number {
  if (deltaMode === 1) return delta * LINE_HEIGHT;
  if (deltaMode === 2) return delta * pageHeight;
  return delta;
}

/* Content pixels expressed as thumb travel, by the ratio Base UI drags
   with. One thumb height of travel is one viewport of content, so a push
   past the end is felt the same whether it came from the thumb or the
   rows. */
export function toTrack(contentPx: number, maxOffset: number, maxScrollTop: number): number {
  if (maxScrollTop <= 0 || maxOffset <= 0) return 0;
  return (contentPx * maxOffset) / maxScrollTop;
}

/* Thumb travel expressed as content pixels, the inverse of `toTrack`. */
export function toContent(trackPx: number, maxOffset: number, maxScrollTop: number): number {
  if (maxScrollTop <= 0 || maxOffset <= 0) return 0;
  return (trackPx * maxScrollTop) / maxOffset;
}

/* The resistance: a push of one thumb height removes half the cap, and no
   push removes the cap. Positive, in pixels of drawn height. */
export function squash(over: number, height: number): number {
  const push = Math.abs(over);
  if (push === 0 || height <= 0) return 0;
  return (MAX_SQUASH * height * push) / (push + height);
}

/* The drawing may not compress past the cap; it may stretch past rest by
   the same amount when a recoil overshoots. */
export function clampDrawn(value: number, height: number): number {
  const cap = MAX_SQUASH * height;
  return Math.min(Math.max(value, -cap), cap);
}

/* Velocity of the drawing over the last stretch rather than the last two
   samples, in pixels per second: a single pair is noisy, and a hand that
   paused before letting go has to read as still. */
export function deformationVelocity(
  samples: readonly Sample[],
  current: number,
  now: number,
): number {
  const first = samples.find((sample) => now - sample.time <= VELOCITY_WINDOW);
  if (first === undefined) return 0;
  const elapsed = now - first.time;
  if (elapsed <= 0) return 0;
  return ((current - first.value) / elapsed) * 1000;
}

/* Keeps only the samples the velocity window can use. */
export function trimSamples(samples: readonly Sample[], now: number): Sample[] {
  return samples.filter((sample) => now - sample.time <= VELOCITY_WINDOW);
}
