import { cva } from "class-variance-authority";
import type { VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

/*
 * Project-authored primitive, not a registry component (DESIGN.md
 * "Component system"): patient-facing selects keep the native element —
 * the OS picker on mobile is better for patients than a scripted listbox —
 * and wear the committed field register.
 *
 * Motion is decoupled onto its own axis (DESIGN.md "Register legibility
 * rules"), mirroring Input: `wgi` (default) is the authored .field-input
 * physics; `shadcn` is the stock Input transition-colors, verbatim.
 */
const nativeSelectVariants = cva(
  [
    // Geometry: full width, 44px minimum target
    "min-h-11 w-full min-w-0",
    // Paper: white, 1.5px line-2 hairline, brand radius-sm
    "rounded-sm border-[1.5px] border-line-2 bg-white px-4 py-3",
    // Ink: committed type, no native outline
    "text-base text-ink outline-none",
    // Focus: teal, the finger tracking a line
    "focus-visible:border-teal-ink focus-visible:ring-3 focus-visible:ring-teal/25",
    // Disabled state
    "disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50",
    // Invalid state
    "aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20",
  ],
  {
    variants: {
      motion: {
        /* The authored field physics: border and focus ring fade at 200ms. */
        wgi: "transition-[border-color,box-shadow] duration-200 ease-[ease]",
        /* The stock feel this register would wear upstream; no consumer today. */
        shadcn: "transition-colors",
        /* No transitions at all; no consumer today. */
        none: "transition-none",
      },
    },
    defaultVariants: {
      motion: "wgi",
    },
  },
);

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React props carry framework member types that cannot be made readonly
function NativeSelect({
  className,
  motion = "wgi",
  ...props
}: ComponentProps<"select"> & VariantProps<typeof nativeSelectVariants>) {
  return (
    <select
      data-slot="native-select"
      className={cn(nativeSelectVariants({ motion }), className)}
      {...props}
    />
  );
}

export { NativeSelect };
