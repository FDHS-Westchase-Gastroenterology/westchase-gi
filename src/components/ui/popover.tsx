"use client";

import { Popover as PopoverPrimitive } from "@base-ui/react/popover";
import { cva } from "class-variance-authority";
import type { VariantProps } from "class-variance-authority";
import { cn } from "cn";

/*
 * A popover: a panel read or used beside the control that opened it, such
 * as the Schedule's keyboard shortcuts list (issue #351). Adapted from the
 * shadcn Popover (src/components/stock/popover.tsx) on the same Base UI
 * parts. The registry's Header and Description parts have no product
 * consumer yet and are left out; this adoption adds Close, and passes the
 * positioner's anchor and collision padding through, because the shortcuts
 * list opens from whichever control asked for it. A list of commands is a
 * menu, and a label is a tooltip (design-system/overlays.md).
 *
 * Paper: white on a 1px line edge, 16px corners and the popover shadow, in
 * body ink. Width and inset belong to the consumer, which knows its content.
 *
 * Motion is its own axis (design-system/components.md "Component API
 * rules"). `wgi` (default): the popover temperament — grows from the
 * trigger at scale(0.95) with opacity on the staff home's base beat and
 * leaves on the fast one, both on --motion-standard; Base UI's
 * data-instant (a keyboard open, a dismissal) skips it. `none` is for a
 * popover opened by a shortcut key, which appears and leaves at once.
 * Reduced motion: the blanket reset in globals.css.
 */
const popoverVariants = cva(
  [
    "z-50 outline-none",
    // Paper: white on a line edge with the popover shadow
    "rounded-[16px] border border-slate-200 bg-white text-body shadow-popover",
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

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React props carry framework member types that cannot be made readonly
function Popover(props: PopoverPrimitive.Root.Props) {
  return <PopoverPrimitive.Root data-slot="popover" {...props} />;
}

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React props carry framework member types that cannot be made readonly
function PopoverTrigger(props: PopoverPrimitive.Trigger.Props) {
  return <PopoverPrimitive.Trigger data-slot="popover-trigger" {...props} />;
}

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React props carry framework member types that cannot be made readonly
function PopoverContent({
  className,
  motion = "wgi",
  align = "center",
  alignOffset = 0,
  side = "bottom",
  sideOffset = 8,
  anchor,
  collisionPadding = 12,
  ...props
}: PopoverPrimitive.Popup.Props &
  VariantProps<typeof popoverVariants> &
  Pick<
    PopoverPrimitive.Positioner.Props,
    "align" | "alignOffset" | "side" | "sideOffset" | "anchor" | "collisionPadding"
  >) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Positioner
        align={align}
        alignOffset={alignOffset}
        side={side}
        sideOffset={sideOffset}
        anchor={anchor}
        collisionPadding={collisionPadding}
        className="isolate z-50"
      >
        <PopoverPrimitive.Popup
          data-slot="popover-content"
          className={cn(popoverVariants({ motion }), className)}
          {...props}
        />
      </PopoverPrimitive.Positioner>
    </PopoverPrimitive.Portal>
  );
}

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React props carry framework member types that cannot be made readonly
function PopoverTitle({ className, ...props }: PopoverPrimitive.Title.Props) {
  return (
    <PopoverPrimitive.Title
      data-slot="popover-title"
      className={cn("m-0 font-sans text-[1rem] leading-[22px] font-bold text-ink", className)}
      {...props}
    />
  );
}

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React props carry framework member types that cannot be made readonly
function PopoverClose(props: PopoverPrimitive.Close.Props) {
  return <PopoverPrimitive.Close data-slot="popover-close" {...props} />;
}

export { Popover, PopoverClose, PopoverContent, PopoverTitle, PopoverTrigger };
