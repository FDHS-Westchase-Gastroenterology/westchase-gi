"use client";

import { Select as SelectPrimitive } from "@base-ui/react/select";
import { cva } from "class-variance-authority";
import type { VariantProps } from "class-variance-authority";
import { cn } from "cn";
import { Check, ChevronDown, ChevronUp } from "lucide-react";

/* Adopted from stock/select.tsx (shadcn base-nova). Appointment type Length
   is the first consumer. The registry's Root, trigger, list, options and
   scroll arrows retain Base UI's selection and keyboard behavior.
   Adaptations: 44px targets, the semantic brand bridge, registry motion,
   and a portal container so a native dialog keeps its list in the top layer.
   No brand-token collisions: background/foreground, input, ring, popover,
   accent, muted-foreground and destructive all resolve through the bridge. */

const Select = SelectPrimitive.Root;

const triggerVariants = cva(
  "flex min-h-11 w-full min-w-0 items-center justify-between gap-2 rounded-sm border-[1.5px] border-input bg-background px-4 py-3 text-left text-base text-foreground outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/25 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      motion: {
        wgi: "transition-[border-color,box-shadow] duration-(--motion-micro-duration) ease-(--motion-exit)",
        none: "",
      },
    },
    defaultVariants: { motion: "wgi" },
  },
);

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- Base UI props carry framework member types that cannot be made readonly
function SelectTrigger({
  className,
  children,
  motion,
  ...props
}: SelectPrimitive.Trigger.Props & VariantProps<typeof triggerVariants>) {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      className={cn(triggerVariants({ motion }), className)}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon>
        <ChevronDown className="text-muted-foreground" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
}

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- Base UI props carry framework member types that cannot be made readonly
function SelectValue({ className, ...props }: SelectPrimitive.Value.Props) {
  return (
    <SelectPrimitive.Value
      data-slot="select-value"
      className={cn("flex-1 truncate", className)}
      {...props}
    />
  );
}

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- Base UI props carry framework member types that cannot be made readonly
function SelectContent({
  className,
  children,
  container,
  ...props
}: SelectPrimitive.Popup.Props & Pick<SelectPrimitive.Portal.Props, "container">) {
  return (
    <SelectPrimitive.Portal container={container}>
      <SelectPrimitive.Positioner
        alignItemWithTrigger={false}
        positionMethod="absolute"
        align="start"
        sideOffset={4}
        collisionPadding={8}
        className="isolate z-50"
      >
        {/* Anchor within the portal container, including a native dialog.
            Opening and closing are instant for this repeated field choice. */}
        <SelectPrimitive.Popup
          data-slot="select-content"
          className={cn(
            "max-h-(--available-height) w-(--anchor-width) min-w-36 overflow-y-auto rounded-lg border border-border bg-popover text-popover-foreground shadow-popover outline-none",
            className,
          )}
          {...props}
        >
          <SelectPrimitive.ScrollUpArrow className="flex min-h-8 items-center justify-center bg-popover [&_svg]:size-4">
            <ChevronUp />
          </SelectPrimitive.ScrollUpArrow>
          <SelectPrimitive.List>{children}</SelectPrimitive.List>
          <SelectPrimitive.ScrollDownArrow className="flex min-h-8 items-center justify-center bg-popover [&_svg]:size-4">
            <ChevronDown />
          </SelectPrimitive.ScrollDownArrow>
        </SelectPrimitive.Popup>
      </SelectPrimitive.Positioner>
    </SelectPrimitive.Portal>
  );
}

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- Base UI props carry framework member types that cannot be made readonly
function SelectGroup({ className, ...props }: SelectPrimitive.Group.Props) {
  return (
    <SelectPrimitive.Group data-slot="select-group" className={cn("p-1", className)} {...props} />
  );
}

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- Base UI props carry framework member types that cannot be made readonly
function SelectItem({ className, children, ...props }: SelectPrimitive.Item.Props) {
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      className={cn(
        "relative flex min-h-11 cursor-default items-center gap-2 rounded-sm py-2 pr-9 pl-3 text-sm outline-none select-none data-disabled:pointer-events-none data-disabled:opacity-50 data-highlighted:bg-accent data-highlighted:text-accent-foreground data-selected:font-semibold",
        className,
      )}
      {...props}
    >
      <SelectPrimitive.ItemText className="flex-1">{children}</SelectPrimitive.ItemText>
      <SelectPrimitive.ItemIndicator className="absolute right-3 [&_svg]:size-4">
        <Check />
      </SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
  );
}

export { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue };
