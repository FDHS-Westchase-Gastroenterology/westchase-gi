import { cva } from "class-variance-authority";

/*
 * The TimePicker recipes, kept apart from time-picker.tsx the way
 * button-variants.ts is kept apart from button.tsx: a component file that
 * exports only components lets Fast Refresh preserve wheel state, and a
 * surface that only needs the frame's classes can wear them without
 * pulling in the client component.
 *
 * Three recipes, one per part: the frame that draws the band, the wheel
 * that scrolls under it, and the row. Axes are decoupled (DESIGN.md
 * "Component API rules") — `size` is geometry, `motion` is temperament,
 * and the base strings carry no motion at all.
 */
const timePickerVariants = cva(
  [
    // Geometry: the wheels side by side inside one window
    "relative isolate flex w-full min-w-0 select-none",
    // Paper: the field recipe's hairline and radius, so the wheel reads as one control
    "overflow-hidden rounded-sm border-[1.5px] border-line-2 bg-white",
    // Ink: the committed type; digits hold their column as they turn
    "text-base text-ink tabular-nums",
  ],
  {
    variants: {
      size: {
        /* The portal's density: five 2rem rows inside a card. */
        sm: "[--tp-row:2rem] [--tp-rows:5]",
        /* The patient-site and full-width default. */
        default: "[--tp-row:2.5rem] [--tp-rows:5]",
      },
    },
    defaultVariants: {
      size: "default",
    },
  },
);

const timePickerColumnVariants = cva(
  [
    // Geometry: a window var(--tp-rows) tall that scrolls one row at a time
    "relative h-[calc(var(--tp-row)*var(--tp-rows))] min-w-0 flex-1 basis-0 overflow-y-auto",
    // Physics: every row is a snap point; the wheel never scrolls its parent
    "snap-y snap-mandatory overscroll-contain",
    // A wheel the browser is not scrolling is not the browser's to snap
    "data-dragging:snap-none data-settling:snap-none",
    // The rows leaving the window fade rather than stop at a hard edge
    "[mask-image:linear-gradient(to_bottom,transparent,#000_20%,#000_80%,transparent)]",
    // Chrome: no scrollbar, and a grab cursor where a mouse can throw it
    "cursor-grab [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
    "data-dragging:cursor-grabbing",
    // Focus: the field recipe's teal edge, drawn inside so the frame stays one line
    "outline-none focus-visible:ring-3 focus-visible:ring-teal/25 focus-visible:ring-inset",
    // Disabled
    "data-disabled:pointer-events-none data-disabled:cursor-default data-disabled:opacity-50",
  ],
  {
    variants: {
      motion: {
        /* The wheel's own travel is the registry spring, driven in
           JavaScript so it can carry the hand's velocity and be caught
           mid-flight, which no scroll behavior can do. Nothing is left
           for the user agent to time, so `scroll-behavior` stays out of
           the recipe: it would only compete for the same scroll offset. */
        wgi: "scroll-auto",
        /* No settle: every move lands on the row it was asked for. */
        none: "scroll-auto",
      },
    },
    defaultVariants: {
      motion: "wgi",
    },
  },
);

const timePickerOptionVariants = cva(
  [
    // Geometry: one row, centered on the band it will stop under
    "flex h-[var(--tp-row)] snap-center items-center justify-center px-2",
    // Ink: quiet until it is the row the band holds
    "cursor-pointer text-muted-ink",
    "data-selected:font-bold data-selected:text-ink",
  ],
  {
    variants: {
      motion: {
        /* The registry micro beat as a row takes the band, and the
           portal's press depth when it is clicked into place. */
        /* The press depth is travel, and the portal drops travel rather
           than duration under reduced motion (home.css's :active group),
           so the row still tints but no longer sinks. */
        wgi: "transition-[color,transform] duration-[var(--motion-micro-duration)] ease-[var(--motion-exit)] active:scale-[0.98] active:duration-0 motion-reduce:active:scale-100",
        /* No transitions at all. */
        none: "transition-none",
      },
    },
    defaultVariants: {
      motion: "wgi",
    },
  },
);

export { timePickerColumnVariants, timePickerOptionVariants, timePickerVariants };
