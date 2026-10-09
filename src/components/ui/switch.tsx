"use client";

import { Switch as SwitchPrimitive } from "@base-ui/react/switch";
import { cva } from "class-variance-authority";
import type { VariantProps } from "class-variance-authority";
import { cn } from "cn";

/*
 * Brand adoption of the shadcn Switch (base-nova, registry source in
 * src/components/stock/switch.tsx) for a setting that applies the moment it
 * changes: Settings' "Takes appointments" on a provider and "In use" on an
 * appointment type (issue #352, Figma St1 and St3). HIG Toggles: a switch
 * manages one on/off state, labeled by the row it sits in, and its states
 * differ by more than color (the thumb travels to the other end).
 *
 * Reused unchanged: Base UI's Switch.Root and Thumb, a `role="switch"` button
 * with a hidden native checkbox beside it, the `data-checked` /
 * `data-unchecked` state attributes and the wider invisible hit area.
 *
 * Adapted, and why:
 * - Geometry is the frame's 40×24 track with a 20px thumb, rather than the
 *   registry's 32×18, so the control sits level with the 13px label beside it.
 * - Paint reads brand tokens: the steel-blue teal when on (the frame's
 *   toggle), the line-3 control boundary when off (≥3:1 on white), a white
 *   thumb with a hairline shadow. The registry's `dark:` overrides are
 *   dropped, as in every approved recipe: dark mode is not a shipped surface.
 * - Focus is the portal's teal-ink ring.
 *
 * Motion is its own axis (design-system/components.md "Component API rules").
 * `wgi` (default): the micro temperament — the track's paint and the thumb's
 * travel run --motion-micro-duration on --motion-exit, named properties only
 * (the registry's `transition-all` would animate anything that changes).
 * Both are CSS transitions, so a quick second toggle retargets from where the
 * thumb is. Reduced motion: the blanket reset in globals.css, so the thumb
 * lands at once. `none`: no transitions.
 */
const switchVariants = cva(
  [
    // Geometry: 40×24 track, a wider invisible hit area
    "peer group/switch relative inline-flex h-6 w-10 shrink-0 items-center rounded-full p-0.5 after:absolute after:-inset-x-2 after:-inset-y-2",
    // Paint: line-3 off, teal on
    "outline-none data-unchecked:bg-[var(--color-line-3)] data-checked:bg-[var(--color-teal)]",
    // Focus
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-teal-ink)]",
    // Disabled
    "data-disabled:cursor-not-allowed data-disabled:opacity-50",
  ],
  {
    variants: {
      motion: {
        wgi: "transition-[background-color] duration-[var(--motion-micro-duration)] ease-[var(--motion-exit)]",
        none: "transition-none",
      },
    },
    defaultVariants: { motion: "wgi" },
  },
);

const thumbVariants = cva(
  [
    "pointer-events-none block size-5 rounded-full bg-white shadow-[0_1px_2px_rgb(16_20_58/0.24)]",
    "data-unchecked:translate-x-0 data-checked:translate-x-4",
  ],
  {
    variants: {
      motion: {
        wgi: "transition-transform duration-[var(--motion-micro-duration)] ease-[var(--motion-exit)]",
        none: "transition-none",
      },
    },
    defaultVariants: { motion: "wgi" },
  },
);

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React props carry framework member types that cannot be made readonly
function Switch({
  className,
  motion = "wgi",
  ...props
}: SwitchPrimitive.Root.Props & VariantProps<typeof switchVariants>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(switchVariants({ motion }), className)}
      {...props}
    >
      <SwitchPrimitive.Thumb data-slot="switch-thumb" className={thumbVariants({ motion })} />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
