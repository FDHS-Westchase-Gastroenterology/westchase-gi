import { Input as InputPrimitive } from "@base-ui/react/input";
import { cva } from "class-variance-authority";
import type { VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

/*
 * Brand adaptation of the shadcn Input: the committed field recipe.
 * White paper, a 1.5px line-2 border on the brand radius-sm, teal focus
 * (teal's one meaning: the finger tracking a line), destructive reserved
 * for the invalid state, and the 44px minimum target.
 *
 * Motion is decoupled onto its own axis (DESIGN.md "Component API
 * rules"): the base string carries none. `wgi` (default) is the authored
 * .field-input physics — border-color and box-shadow at 200ms. `shadcn`
 * is the upstream registry's stock transition-colors, verbatim.
 */
const inputVariants = cva(
  [
    // Geometry: full width, 44px minimum target
    "min-h-11 w-full min-w-0",
    // Paper: white, 1.5px line-2 hairline, brand radius-sm
    "rounded-sm border-[1.5px] border-line-2 bg-white px-4 py-3",
    // Ink: committed type, muted placeholder, no native outline
    "text-base text-ink outline-none placeholder:text-muted-ink",
    // File inputs: the picker button
    "file:inline-flex file:border-0 file:bg-transparent file:text-sm file:font-semibold file:text-foreground",
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
        /* The authored field physics: border and focus ring fade at
           200ms. Worn by every field unless told otherwise. */
        wgi: "transition-[border-color,box-shadow] duration-200 ease-[ease]",
        /* The upstream registry's stock feel, verbatim; no consumer today. */
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
function Input({
  className,
  type,
  motion = "wgi",
  ...props
}: ComponentProps<"input"> & VariantProps<typeof inputVariants>) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(inputVariants({ motion }), className)}
      {...props}
    />
  );
}

export { Input };
