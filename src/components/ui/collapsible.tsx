"use client";

import { Collapsible as CollapsiblePrimitive } from "@base-ui/react/collapsible";
import { cva } from "class-variance-authority";
import type { VariantProps } from "class-variance-authority";
import { cn } from "cn";

/*
 * A disclosure: a summary that opens in place to show what it holds — the
 * Activity log's rows, which open to their before and after (issue #357).
 * Adopted from the shadcn Collapsible (src/components/stock/collapsible.tsx)
 * on the same Base UI parts and slot names. The staff home's full-record
 * sheet converted the same source earlier into its own route part,
 * (home)/parts/collapsible.tsx, painted in home.css; that conversion stays
 * as it is.
 *
 * The root and trigger carry no paint: the consumer's row is the trigger,
 * and Base UI marks it `data-panel-open` for its chevron to read. The
 * panel's motion is an axis (design-system/components.md "Component API
 * rules"):
 * - `wgi` (default): the panel's height follows Base UI's
 *   --collapsible-panel-height on the staff home's base beat and closes on
 *   the fast one, both on --motion-standard, the timing of Home's
 *   disclosure. Reduced motion: the blanket reset in globals.css opens and
 *   closes it at once, with no travel.
 * - `none`: the panel opens and closes at once.
 * Consumers: audit/activity-log-row.tsx (wgi).
 */
const collapsiblePanelVariants = cva(["overflow-hidden"], {
  variants: {
    motion: {
      wgi: [
        "h-(--collapsible-panel-height) transition-[height]",
        "duration-(--motion-base-duration) ease-(--motion-standard)",
        "data-starting-style:h-0 data-ending-style:h-0",
        "data-ending-style:duration-(--motion-fast-duration)",
      ],
      none: "",
    },
  },
  defaultVariants: {
    motion: "wgi",
  },
});

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React props carry framework member types that cannot be made readonly
function Collapsible(props: CollapsiblePrimitive.Root.Props) {
  return <CollapsiblePrimitive.Root data-slot="collapsible" {...props} />;
}

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React props carry framework member types that cannot be made readonly
function CollapsibleTrigger(props: CollapsiblePrimitive.Trigger.Props) {
  return <CollapsiblePrimitive.Trigger data-slot="collapsible-trigger" {...props} />;
}

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React props carry framework member types that cannot be made readonly
function CollapsibleContent({
  className,
  motion = "wgi",
  ...props
}: CollapsiblePrimitive.Panel.Props & VariantProps<typeof collapsiblePanelVariants>) {
  return (
    <CollapsiblePrimitive.Panel
      data-slot="collapsible-content"
      data-motion={motion}
      className={cn(collapsiblePanelVariants({ motion }), className)}
      {...props}
    />
  );
}

export { Collapsible, CollapsibleContent, CollapsibleTrigger };
