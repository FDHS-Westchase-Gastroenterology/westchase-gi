import { cva } from "class-variance-authority";
import type { VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

/*
 * Brand adaptation of the shadcn Textarea: the same committed field
 * register as Input (white paper, 1.5px line-2 border, brand radius-sm,
 * teal focus), with content-following sizing.
 *
 * Motion is decoupled onto its own axis (DESIGN.md "Register legibility
 * rules"), mirroring Input: `wgi` (default) is the authored .field-input
 * physics; `shadcn` is the stock transition-colors, verbatim.
 */
const textareaVariants = cva(
  [
    // Geometry: full width, content-following height
    "field-sizing-content flex min-h-16 w-full",
    // Paper: white, 1.5px line-2 hairline, brand radius-sm
    "rounded-sm border-[1.5px] border-line-2 bg-white px-4 py-3",
    // Ink: committed type, muted placeholder, no native outline
    "text-base text-ink outline-none placeholder:text-muted-ink",
    // Focus: teal, the finger tracking a line
    "focus-visible:border-teal-ink focus-visible:ring-3 focus-visible:ring-teal/25",
    // Disabled state
    "disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50",
    // Invalid state
    "aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20",
  ],
  {
    variants: {
      motion: {
        /* The authored field physics: border and focus ring fade at 200ms. */
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
function Textarea({
  className,
  motion = "wgi",
  ...props
}: ComponentProps<"textarea"> & VariantProps<typeof textareaVariants>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(textareaVariants({ motion }), className)}
      {...props}
    />
  );
}

export { Textarea };
