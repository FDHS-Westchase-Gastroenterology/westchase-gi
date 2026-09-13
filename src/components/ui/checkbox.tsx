"use client";

import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox";
import { cva } from "class-variance-authority";
import type { VariantProps } from "class-variance-authority";
import { cn } from "cn";

import { Check } from "@/components/icons";

/*
 * Brand adaptation of the shadcn Checkbox: a provisional recipe synced from
 * src/components/stock/checkbox.tsx for the print chooser's status list
 * (DESIGN.md roadmap item 3), pending confirmation in Claude Design. Base
 * UI renders a `role="checkbox"` control with a hidden native input beside
 * it, so a wrapping FieldLabel and Playwright's `.check()` both work.
 *
 * Every color is a semantic token resolved by the bridge: `border-input`
 * is line-3, `bg-primary` / `text-primary-foreground` are navy and on-dark
 * (the fill the portal's hand-rolled choice indicator already uses),
 * `ring-ring` is teal-ink, and `destructive` is the one permitted literal.
 * The 4px corner is the registry's; the brand radius ramp has no step this
 * small, and it is one of the questions for the design review. Dark mode is
 * not a shipped surface (globals.css, the `.dark` block), so the registry's
 * `dark:` overrides are dropped here as in every other approved recipe.
 *
 * Motion is decoupled onto its own axis (DESIGN.md "Component API
 * rules"): the base string carries none. `wgi` (default) paints the
 * checked and focus states at the registry micro temperament,
 * --motion-micro-duration on --motion-exit, the same beat as the button
 * recipe's hover tint. `shadcn` is the upstream registry's stock
 * transition-colors, verbatim.
 */
const checkboxVariants = cva(
  [
    // Geometry: 16px box, the registry's 4px corner, a wider invisible hit area
    "peer relative flex size-4 shrink-0 items-center justify-center rounded-[4px] after:absolute after:-inset-x-3 after:-inset-y-2",
    // Paper: line-3 hairline, no native outline
    "border border-input outline-none",
    // Checked: navy fill, on-dark check
    "data-checked:border-primary data-checked:bg-primary data-checked:text-primary-foreground",
    // Focus: teal ring on the box; inside a choice card the card wears it instead
    "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 group-has-[:focus-visible]/field-label:ring-0 group-has-[:focus-visible]/field-label:not-data-checked:border-input group-has-[:focus-visible]/field-label:data-checked:border-primary",
    // Disabled: the control and its field fade together
    "disabled:cursor-not-allowed disabled:opacity-50 group-has-disabled/field:opacity-50",
    // Invalid state
    "aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 aria-invalid:aria-checked:border-primary",
  ],
  {
    variants: {
      motion: {
        /* The registry micro beat: paint changes only, no travel. */
        wgi: "transition-[background-color,border-color,color] duration-[var(--motion-micro-duration)] ease-[var(--motion-exit)]",
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
function Checkbox({
  className,
  motion = "wgi",
  ...props
}: CheckboxPrimitive.Root.Props & VariantProps<typeof checkboxVariants>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(checkboxVariants({ motion }), className)}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="grid place-content-center text-current transition-none [&>svg]:size-3.5"
      >
        <Check />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export { Checkbox };
