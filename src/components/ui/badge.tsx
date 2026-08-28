import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { cva } from "class-variance-authority";
import type { VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/*
 * Brand adaptation of the shadcn Badge (DESIGN.md "Component system").
 * The stamp shape is the full pill on the committed type step (0.8125rem,
 * weight 600). The named variants below make the DESIGN.md color law
 * executable: each hue holds exactly one role, and a stamp always carries
 * words beside its color.
 *
 * Sole importer today: src/app/admin/(portal)/requests/status-badge.tsx
 * (rendered on the portal queue and request-detail pages). Consumer maps
 * below are crutches — refresh with docs/COMPONENT-INVENTORY.md; full list
 * regenerates with: rg -l 'ui/badge' src
 *
 * Two axes, decoupled per DESIGN.md "Register legibility rules":
 * - `variant` is color and surface only, and is required: the color law
 *   means there is no meaningless stamp. The registry's six stock variants
 *   were pruned unconsumed (2026-08-28); re-fetch from the registry if a
 *   consumer ever wants one.
 * - `motion` is animation temperament. The default, `none`, is the brand
 *   stance — a stamp is static ink. `shadcn` keeps the upstream registry's
 *   stock transition-all by name. The base string carries no motion.
 */
const badgeVariants = cva(
  [
    // Layout: how the stamp and its contents sit
    "group/badge inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden",
    // Shape and geometry: the full pill
    "rounded-full border border-transparent px-2.5 py-1",
    // Typography: the committed stamp type step
    "text-[0.8125rem] leading-none font-semibold whitespace-nowrap",
    // Focus: the keyboard ring
    "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
    // Icon-aware padding: tighter on the icon side
    "has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
    // Invalid state
    "aria-invalid:border-destructive aria-invalid:ring-destructive/20",
    // Icons: no pointer events, held at stamp scale
    "[&>svg]:pointer-events-none [&>svg]:size-3!",
  ],
  {
    variants: {
      motion: {
        /* The brand default: stamps don't move, state changes swap
           instantly. Worn by every StatusBadge. */
        none: "transition-none",
        /* The upstream registry's stock feel, verbatim; no consumer today. */
        shadcn: "transition-all",
      },
      variant: {
        /* The color law: amber means attention, teal/mint means current or
           in motion, navy is settled ink, neutral recedes. All four are worn
           by status-badge.tsx — new=attention, contacted=current,
           scheduled=settled, closed=quiet. */
        attention: "bg-amber-soft text-ink",
        current: "bg-mint-2 text-teal-ink",
        settled: "bg-navy text-on-dark",
        quiet: "bg-line text-muted-ink",
      },
    },
    defaultVariants: {
      motion: "none",
    },
  },
);

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React props carry framework member types that cannot be made readonly
function Badge({
  className,
  variant,
  motion = "none",
  render,
  ...props
}: useRender.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & {
    /* Required on purpose: every stamp carries a meaning. */
    variant: NonNullable<VariantProps<typeof badgeVariants>["variant"]>;
  }) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ motion, variant }), className),
      },
      props,
    ),
    render,
    state: {
      slot: "badge",
      variant,
    },
  });
}

export { Badge };
