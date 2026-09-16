"use client";

import { cn } from "cn";
import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react";
import { Toaster as Sonner } from "sonner";
import type { ToasterProps } from "sonner";

/*
 * Brand adoption of the shadcn Sonner toaster (base-nova, registry source in
 * src/components/stock/sonner.tsx): the staff portal's save feedback. Sonner
 * is the project owner's explicit choice for this surface (DESIGN.md
 * "Standing findings"); the registry's Base UI Toast stays unadopted. Every
 * consumer follows one save with `toast.promise`: the staff home record card
 * (record-card.tsx), the add-request sheet (staff-request-form.tsx), the
 * note composer (request-notes.tsx) and the request work panel
 * (use-workflow-panel.ts). The portal layout mounts this once, so a result
 * outlives the popover, dialog or page that earned it.
 *
 * Kept from the registry recipe: the lucide icon set with the loader
 * spinning, the `toaster group` / `cn-toast` class hooks, and Sonner's four
 * paper variables mapped onto the semantic bridge (`--popover` paper,
 * `--popover-foreground` ink, `--border` line, `--radius`), which the bridge
 * resolves to the brand palette. No `richColors`: a save's result is its
 * sentence and its icon, not a colored bar.
 *
 * Custom behavior and styling, and why:
 * - `theme="light"` replaces next-themes. The portal has no ThemeProvider
 *   and dark mode is not a shipped surface (globals.css, the `.dark` block),
 *   as in every other approved recipe.
 * - `position="bottom-center"`: the record card floats over the list, so
 *   its result lands under the eye instead of in a corner.
 * - Type and paper read the registry through inline style, because Sonner's
 *   stylesheet is unlayered and sets a system font stack, a 13px size and a
 *   neutral drop shadow of its own: the brand sans, the portal's `--pt-xs`
 *   step (Sonner's own 13px, named), and the floating-surface throw every
 *   other portal popover wears (`--shadow-popover`). The width grows from
 *   Sonner's 356px to 26rem so a failure sentence holds to two lines.
 * - Motion is the registry's, not Sonner's (400ms ease both ways): the
 *   spring on arrival, the faster exit on departure, the micro beat for the
 *   loading → result icon swap. The utilities are important because Sonner's
 *   rules are unlayered; the reduced-motion reset in @layer base still
 *   outranks them (an earlier layer wins among important declarations), and
 *   the toast's reduced-motion cross-fade is registered there beside it.
 */
const TOAST_MOTION = [
  // Arrival: the registry spring, rising into place; height rides along so a stack settles on the same beat
  "transition-[transform,opacity,height]! duration-[var(--motion-spring-duration)]! ease-[var(--motion-spring)]!",
  // Departure: faster than arrival, the registry exit
  "data-[removed=true]:duration-[var(--motion-exit-duration)]! data-[removed=true]:ease-[var(--motion-exit)]!",
  // A swipe follows the pointer with no transition, as Sonner authors it
  "data-[swiping=true]:transition-none!",
  // The loading → result icon swap, and the content fade of a stacked toast, at the micro beat
  "[&_[data-icon]>svg]:[animation-duration:var(--motion-micro-duration)]! [&_[data-icon]>svg]:[animation-timing-function:var(--motion-exit)]!",
  "[&>*]:duration-[var(--motion-micro-duration)]! [&>*]:ease-[var(--motion-exit)]!",
];

/* SAFETY: Sonner reads its paper variables from the toaster's inline style.
   React's CSSProperties has no index for custom properties, and every key
   here is one of Sonner's documented names (`--normal-*`, `--border-radius`,
   `--width`), so the assertion adds names the type cannot express. */
const TOASTER_STYLE = {
  "--normal-bg": "var(--popover)",
  "--normal-text": "var(--popover-foreground)",
  "--normal-border": "var(--border)",
  "--border-radius": "var(--radius)",
  "--width": "26rem",
  fontFamily: "var(--font-sans)",
} as React.CSSProperties;

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- Sonner props carry framework member types that cannot be made readonly
export function Toaster({ toastOptions, ...props }: ToasterProps) {
  return (
    <Sonner
      theme="light"
      position="bottom-center"
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={TOASTER_STYLE}
      toastOptions={{
        ...toastOptions,
        style: {
          fontSize: "var(--pt-xs, 0.8125rem)",
          boxShadow: "var(--shadow-popover)",
          ...toastOptions?.style,
        },
        classNames: {
          ...toastOptions?.classNames,
          toast: cn("cn-toast", TOAST_MOTION, toastOptions?.classNames?.toast),
        },
      }}
      {...props}
    />
  );
}
