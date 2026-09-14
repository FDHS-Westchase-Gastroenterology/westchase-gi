/* The motion registry, bound for motion.dev (DESIGN.md "Motion").

   Two engines, one registry. The `--motion-*` tokens in src/app/globals.css
   and the presets below are the same temperaments, so a surface may animate
   with CSS or with motion.dev — whichever fits the job — and never changes
   character crossing between them. Neither engine invents a curve or a
   duration; both read the registry.

   `arrive` matches --motion-spring: a ζ≈0.7 spring settled in 440ms —
   motion's `bounce` is 1 − ζ, so 0.3 reproduces the single 4.6% overshoot.
   `leave` matches --motion-exit: a strong ease-out at 160ms.
   `micro` matches --motion-micro-duration: 150ms for surfaces that tint.
   `crossfade` is the reduced-motion temperament: 120ms, opacity only. */

import type { Transition } from "motion/react";

export const arrive: Transition = { type: "spring", duration: 0.44, bounce: 0.3 };
export const leave: Transition = { type: "tween", duration: 0.16, ease: [0.23, 1, 0.32, 1] };
export const micro: Transition = { type: "tween", duration: 0.15, ease: "easeOut" };
export const crossfade: Transition = { type: "tween", duration: 0.12, ease: "linear" };

export type MotionTemperament = "arrive" | "leave" | "micro";

const temperaments = { arrive, leave, micro } satisfies Record<MotionTemperament, Transition>;

/* Reduced motion withholds the physics, never the change: every temperament
   collapses to the cross-fade, and the caller drops its travel the same way
   the CSS registry does (DESIGN.md "Reduced motion"). */
export function transitionFor(kind: MotionTemperament, reducedMotion: boolean): Transition {
  return reducedMotion ? crossfade : temperaments[kind];
}
