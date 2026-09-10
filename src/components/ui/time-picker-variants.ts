import { cva } from "class-variance-authority";

/* The record card uses size="sm"; default keeps a larger five-row window.
   Size controls geometry. Motion defaults to the registry spring and micro
   transitions; "none" disables both. Recipes stay separate for Fast Refresh. */
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
        /* The record-card wheel uses a JS spring; native smooth scrolling would
           compete for the same offset. */
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
        /* Record-card selection and press feedback. */
        /* Reduced motion keeps the tint and drops the press scale. */
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
