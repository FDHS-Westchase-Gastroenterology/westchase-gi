"use client";

import { Popover as PopoverPrimitive } from "@base-ui/react/popover";
import { cn } from "cn";

/* Fresh conversion of the stock registry Popover for the home dashboard
   (portal-home-redesign-brief §4.5): the same Base UI skeleton, repainted
   through the portal bridge and given this surface's own motion — 160ms in,
   120ms out on the strong ease-out, growing from scale(0.95) at the
   trigger's origin (never from nothing). Paint and motion live in home.css
   under `.wgi-popover`. */

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React props carry framework member types that cannot be made readonly
function HomePopover(props: PopoverPrimitive.Root.Props) {
  return <PopoverPrimitive.Root data-slot="popover" {...props} />;
}

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React props carry framework member types that cannot be made readonly
function HomePopoverTrigger(props: PopoverPrimitive.Trigger.Props) {
  return <PopoverPrimitive.Trigger data-slot="popover-trigger" {...props} />;
}

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React props carry framework member types that cannot be made readonly
function HomePopoverContent({
  className,
  align = "start",
  side = "bottom",
  sideOffset = 8,
  anchor,
  ...props
}: PopoverPrimitive.Popup.Props &
  Pick<
    PopoverPrimitive.Positioner.Props,
    "align" | "alignOffset" | "anchor" | "side" | "sideOffset"
  >) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Positioner
        /* The list row anchors the card when the trigger is only the
           chevron at the row's end; without an anchor the popup positions
           against the trigger. */
        anchor={anchor}
        align={align}
        side={side}
        sideOffset={sideOffset}
        collisionPadding={8}
        /* The row supplies the side — the roomier of above and below, in
           line-row.tsx — and the positioner only shifts the card into the
           viewport when it overflows, never flips the side and never
           shrinks it: a popover is only as big as its contents, so the
           card slides over its anchor row instead of crushing a column.
           The perpendicular fallback stays off, so the card never lands
           beside the row where the sidebar is. */
        collisionAvoidance={{ side: "shift", align: "shift", fallbackAxisSide: "none" }}
        className="wgi-popover-positioner isolate z-50"
      >
        <PopoverPrimitive.Popup
          data-slot="popover-content"
          className={cn("wgi-popover", className)}
          {...props}
        />
      </PopoverPrimitive.Positioner>
    </PopoverPrimitive.Portal>
  );
}

export { HomePopover, HomePopoverContent, HomePopoverTrigger };
