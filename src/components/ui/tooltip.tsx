"use client";

import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip";
import { cva } from "class-variance-authority";
import type { VariantProps } from "class-variance-authority";
import { cn } from "cn";
import { use } from "react";

import { PopoverContainer } from "./popover-behavior";

/*
 * A tooltip: a short label for a control that cannot say it itself, such
 * as why it is unavailable. Adapted from the shadcn Tooltip
 * (src/components/stock/tooltip.tsx) on the same Base UI parts. It never
 * holds anything to press; a preview that is read beside its source is a
 * popover (design-system/overlays.md).
 *
 * Paper: the navy-900 surface with white Lato at 13px, 6px corners and an
 * arrow of the same paint pointing at the trigger. The portal wraps its
 * pages in one TooltipProvider (the (portal) layout), so moving from one
 * trigger to the next opens at once after the first has waited. Inside a
 * modal dialog that provides PopoverContainer, the label portals there so
 * it stands in the dialog's top layer.
 *
 * Motion is its own axis (design-system/components.md "Component API
 * rules"). `wgi` (default): the popover temperament — grows from the
 * trigger's side at scale(0.95) with opacity on the staff home's base beat
 * and leaves on the fast one, both on --motion-standard; Base UI's
 * data-instant (a keyboard open, a dismissal) skips it. Reduced motion:
 * the blanket reset in globals.css, so it appears and leaves at once.
 */
const tooltipVariants = cva(
  [
    // Geometry: a hugging label, never wider than a short sentence
    "z-50 w-fit max-w-xs rounded-[6px] px-2.5 py-1.5",
    // Paper: navy-900 with white Lato at 13px
    "bg-navy-900 font-sans text-[0.8125rem] leading-[1.125rem] font-normal text-white",
    "shadow-[0_4px_10px_rgb(16_20_58/0.18)]",
  ],
  {
    variants: {
      motion: {
        wgi: [
          "origin-(--transform-origin) transition-[transform,opacity]",
          "duration-(--motion-base-duration) ease-(--motion-standard)",
          "data-starting-style:scale-95 data-starting-style:opacity-0",
          "data-ending-style:scale-95 data-ending-style:opacity-0",
          "data-ending-style:duration-(--motion-fast-duration)",
          "data-instant:duration-0",
        ],
        none: "",
      },
    },
    defaultVariants: {
      motion: "wgi",
    },
  },
);

const arrowVariants = [
  "size-2 rotate-45 rounded-[1px] bg-navy-900",
  "data-[side=top]:-bottom-1 data-[side=bottom]:-top-1",
  "data-[side=left]:-right-1 data-[side=right]:-left-1",
];

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React props carry framework member types that cannot be made readonly
function TooltipProvider(props: TooltipPrimitive.Provider.Props) {
  return <TooltipPrimitive.Provider data-slot="tooltip-provider" {...props} />;
}

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React props carry framework member types that cannot be made readonly
function Tooltip(props: TooltipPrimitive.Root.Props) {
  return <TooltipPrimitive.Root data-slot="tooltip" {...props} />;
}

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React props carry framework member types that cannot be made readonly
function TooltipTrigger(props: TooltipPrimitive.Trigger.Props) {
  return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />;
}

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React props carry framework member types that cannot be made readonly
function TooltipContent({
  className,
  motion = "wgi",
  side = "top",
  sideOffset = 8,
  align = "center",
  children,
  ...props
}: TooltipPrimitive.Popup.Props &
  VariantProps<typeof tooltipVariants> &
  Pick<TooltipPrimitive.Positioner.Props, "align" | "side" | "sideOffset">) {
  // Inside a modal dialog the label portals into the dialog's top layer, as a popover does.
  const container = use(PopoverContainer) ?? undefined;
  return (
    <TooltipPrimitive.Portal container={container}>
      <TooltipPrimitive.Positioner
        align={align}
        side={side}
        sideOffset={sideOffset}
        collisionPadding={8}
        className="isolate z-50"
      >
        <TooltipPrimitive.Popup
          data-slot="tooltip-content"
          className={cn(tooltipVariants({ motion }), className)}
          {...props}
        >
          {children}
          <TooltipPrimitive.Arrow className={cn(arrowVariants)} />
        </TooltipPrimitive.Popup>
      </TooltipPrimitive.Positioner>
    </TooltipPrimitive.Portal>
  );
}

export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger };
