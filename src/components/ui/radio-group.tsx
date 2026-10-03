"use client";

import { Radio as RadioPrimitive } from "@base-ui/react/radio";
import { RadioGroup as RadioGroupPrimitive } from "@base-ui/react/radio-group";
import { cva } from "class-variance-authority";
import type { VariantProps } from "class-variance-authority";
import { cn } from "cn";

/*
 * Brand adoption of the shadcn Radio Group (base-nova, registry source in
 * src/components/stock/radio-group.tsx) for one choice among a few that are
 * all visible at once: the Schedule's cancel form, its reason and what
 * happens to the request afterwards (issue #354, Figma Ap4). HIG Toggles:
 * radio buttons choose one of a small mutually exclusive set, each labeled by
 * the row it sits in, and a checked one differs by more than color (the ring
 * thickens around a white center).
 *
 * Reused unchanged: Base UI's RadioGroup and Radio.Root — one tab stop, the
 * arrow keys move and choose, a hidden native radio posts `name=value` — the
 * `data-checked` / `data-unchecked` state attributes, `data-slot` names and
 * the registry's wider invisible hit area. A row is the registry's own
 * composition: a FieldLabel wrapping the item and its words.
 *
 * Adapted, and why:
 * - The mark is drawn by an inset ring rather than a filled disc with a
 *   separate indicator dot: a 1.5px line-3 boundary at rest (≥3:1 on paper
 *   and mint), a 5px navy ring around a white center when checked, the same
 *   drawing Home's answer rows use (home.css .wgi-answer). The registry's
 *   Indicator and its dot are dropped; the ring carries the state.
 * - Focus is the portal's teal-ink ring, shown on the mark.
 * - The registry's `dark:` and `aria-invalid` paints are dropped, as in every
 *   approved recipe: dark mode is not a shipped surface, and a radio group
 *   always has a choice.
 *
 * Motion is its own axis (design-system/components.md "Component API rules").
 * `wgi` (default): the micro temperament — the ring's change runs
 * --motion-micro-duration on --motion-exit, on box-shadow alone. A CSS
 * transition, so an arrow key held through the rows retargets from where the
 * ring is. Reduced motion: the blanket reset in globals.css, so the ring
 * lands at once. `none`: no transition.
 */
const radioGroupItemVariants = cva(
  [
    // Geometry: a 16px mark, a wider invisible hit area
    "peer relative flex aspect-square size-4 shrink-0 rounded-full after:absolute after:-inset-x-3 after:-inset-y-2",
    // Paint: the line-3 boundary at rest, a navy ring around white when checked
    "bg-white shadow-[inset_0_0_0_1.5px_var(--color-line-3)] data-checked:shadow-[inset_0_0_0_5px_var(--color-navy)]",
    // Focus
    "outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-teal-ink)]",
    // Disabled
    "data-disabled:cursor-not-allowed data-disabled:opacity-50",
  ],
  {
    variants: {
      motion: {
        wgi: "transition-[box-shadow] duration-[var(--motion-micro-duration)] ease-[var(--motion-exit)]",
        none: "transition-none",
      },
    },
    defaultVariants: { motion: "wgi" },
  },
);

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React props carry framework member types that cannot be made readonly
function RadioGroup({ className, ...props }: RadioGroupPrimitive.Props) {
  return (
    <RadioGroupPrimitive
      data-slot="radio-group"
      className={cn("grid w-full gap-2", className)}
      {...props}
    />
  );
}

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React props carry framework member types that cannot be made readonly
function RadioGroupItem({
  className,
  motion = "wgi",
  ...props
}: RadioPrimitive.Root.Props & VariantProps<typeof radioGroupItemVariants>) {
  return (
    <RadioPrimitive.Root
      data-slot="radio-group-item"
      className={cn(radioGroupItemVariants({ motion }), className)}
      {...props}
    />
  );
}

export { RadioGroup, RadioGroupItem };
