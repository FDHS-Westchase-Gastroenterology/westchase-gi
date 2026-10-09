"use client";

import { Popover as PopoverPrimitive } from "@base-ui/react/popover";
import { cva } from "class-variance-authority";
import type { VariantProps } from "class-variance-authority";
import { cn } from "cn";
import { use } from "react";

import { PopoverContainer } from "./popover-behavior";

/*
 * A popover: a panel read or used beside the control that opened it — the
 * Schedule's keyboard shortcuts list (issue #351), the staff home's filter
 * editors and record card, the booking month's day, the month's day
 * preview and the week's appointment card (issue #360). Adapted from the
 * shadcn Popover (src/components/stock/popover.tsx) on the same Base UI
 * parts. The registry's Header and Description parts have no product
 * consumer yet and are left out; this adoption adds Close and Arrow, a
 * container context, hover intent, and passes the positioner's placement
 * and collision options through, because each surface knows where it
 * stands; the handle, hover intent and container live in
 * popover-behavior.ts. A list of commands is a menu, and a label is a tooltip
 * (design-system/overlays.md).
 *
 * Paint is an axis:
 * - `paper` (default): white on a 1px line edge, 16px corners and the
 *   popover shadow, in body ink.
 * - `card`: the staff home's card (Figma 76:1005): 8px corners, a hairline
 *   in the list rule, the list surface and its lift, each read through the
 *   surface's --wgi-* paint when one is in scope. A consumer's own class
 *   restates width, corners, inset or shadow where its frame differs.
 * Width and inset belong to the consumer, which knows its content.
 *
 * Motion is its own axis (design-system/components.md "Component API
 * rules"). `wgi` (default): the popover temperament — grows from the
 * trigger at scale(0.95) with opacity on the staff home's base beat and
 * leaves on the fast one, both on --motion-standard; Base UI's
 * data-instant (a keyboard open, a dismissal) skips it. `none` is for a
 * popover opened by a shortcut key or by focus, which appears and leaves
 * at once. Reduced motion: no travel, and the cross-fade registered in
 * globals.css.
 *
 * The positioner is a box at the anchor, not a surface: a card dragged
 * into a panel (use-card-detach.ts) leaves it behind, and what is under
 * that empty box must still take the press. The popup takes its own.
 */
const popoverVariants = cva(["outline-none pointer-events-auto"], {
  variants: {
    paint: {
      paper: "rounded-[16px] border border-slate-200 bg-white text-body shadow-popover",
      card: [
        "rounded-[8px] border border-(--wgi-rule,var(--color-line-2))",
        "bg-(--wgi-surface,var(--portal-surface)) text-body",
        "shadow-(--wgi-card-shadow,var(--shadow-popover))",
      ],
    },
    motion: {
      wgi: [
        /* The transform property, not Tailwind's `scale`: a surface that
           restates its transition (the record card yielding to the sheet)
           names transform, and the card's drag writes only translate. */
        "origin-(--transform-origin) transition-[transform,opacity]",
        "duration-(--motion-base-duration) ease-(--motion-standard)",
        "data-starting-style:[transform:scale(0.95)] data-starting-style:opacity-0",
        "data-ending-style:[transform:scale(0.95)] data-ending-style:opacity-0",
        "data-ending-style:duration-(--motion-fast-duration)",
        "motion-reduce:data-starting-style:[transform:none]",
        "motion-reduce:data-ending-style:[transform:none]",
        "data-instant:duration-0",
      ],
      none: "",
    },
  },
  defaultVariants: {
    paint: "paper",
    motion: "wgi",
  },
});

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React props carry framework member types that cannot be made readonly
function Popover<Payload = unknown>(props: PopoverPrimitive.Root.Props<Payload>) {
  return <PopoverPrimitive.Root data-slot="popover" {...props} />;
}

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React props carry framework member types that cannot be made readonly
function PopoverTrigger<Payload = unknown>(props: PopoverPrimitive.Trigger.Props<Payload>) {
  return <PopoverPrimitive.Trigger data-slot="popover-trigger" {...props} />;
}

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React props carry framework member types that cannot be made readonly
function PopoverContent({
  className,
  positionerClassName,
  paint = "paper",
  motion = "wgi",
  align = "center",
  alignOffset = 0,
  side = "bottom",
  sideOffset = 8,
  anchor,
  arrowPadding,
  collisionPadding = 12,
  collisionAvoidance,
  ...props
}: PopoverPrimitive.Popup.Props &
  VariantProps<typeof popoverVariants> &
  Pick<
    PopoverPrimitive.Positioner.Props,
    | "align"
    | "alignOffset"
    | "side"
    | "sideOffset"
    | "anchor"
    | "arrowPadding"
    | "collisionPadding"
    | "collisionAvoidance"
  > & {
    /** The positioner's own class: its layer when it must rise above a sheet. */
    positionerClassName?: string;
  }) {
  const container = use(PopoverContainer);
  return (
    <PopoverPrimitive.Portal container={container ?? undefined}>
      <PopoverPrimitive.Positioner
        data-slot="popover-positioner"
        align={align}
        alignOffset={alignOffset}
        side={side}
        sideOffset={sideOffset}
        anchor={anchor}
        arrowPadding={arrowPadding}
        collisionPadding={collisionPadding}
        collisionAvoidance={collisionAvoidance}
        className={cn("pointer-events-none isolate z-50", positionerClassName)}
      >
        <PopoverPrimitive.Popup
          data-slot="popover-content"
          data-paint={paint}
          data-motion={motion}
          className={cn(popoverVariants({ paint, motion }), className)}
          {...props}
        />
      </PopoverPrimitive.Positioner>
    </PopoverPrimitive.Portal>
  );
}

/* The arrow points at the source; its shape and edge belong to the
   consumer's frame, which draws it beside the popup's own hairline. */
// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React props carry framework member types that cannot be made readonly
function PopoverArrow(props: PopoverPrimitive.Arrow.Props) {
  return <PopoverPrimitive.Arrow data-slot="popover-arrow" {...props} />;
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

export { Popover, PopoverArrow, PopoverClose, PopoverContent, PopoverTitle, PopoverTrigger };
