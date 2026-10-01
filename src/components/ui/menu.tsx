"use client";

import { Menu as MenuPrimitive } from "@base-ui/react/menu";
import { cva } from "class-variance-authority";
import type { VariantProps } from "class-variance-authority";
import { cn } from "cn";

import { Check } from "@/components/icons";

/*
 * A pull-down menu: a short list of choices opened from a button, such as
 * which provider the schedule's week shows (issue #345). Adapted from the
 * shadcn DropdownMenu (src/components/stock/dropdown-menu.tsx) on the same
 * Base UI Menu parts, without the submenu and shortcut parts no product
 * surface uses yet. A menu holds commands and choices only; a
 * preview read beside its source is a popover (design-system/overlays.md).
 *
 * Paper: white with a 1px line edge, 12px corners and the popover shadow,
 * inset 6px. Items are 8px-cornered rows of 14px Lato in ink; the
 * highlighted row (pointer or keyboard) wears the mint band, and a checked
 * or chosen row carries a check at its end. An item's `tone` marks the one
 * command that confirms a choice made in the menu, such as Compare in the
 * week's compare picker: `primary` sets it in bold teal ink.
 *
 * Motion is its own axis (design-system/components.md "Component API
 * rules"). `wgi` (default): the popover temperament — grows from the
 * trigger at scale(0.95) with opacity on the staff home's base beat and
 * leaves on the fast one, both on --motion-standard; Base UI's
 * data-instant (a keyboard open, a dismissal) skips it. Reduced motion:
 * the blanket reset in globals.css, so it appears and leaves at once.
 */
const menuVariants = cva(
  [
    // Geometry: at least the trigger's width, scrolling if the window is short
    "z-50 max-h-(--available-height) min-w-(--anchor-width) overflow-y-auto rounded-[12px] p-1.5",
    "outline-none",
    // Paper: white on a line edge with the popover shadow
    "border border-slate-200 bg-white text-ink shadow-popover",
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

const itemClasses = [
  "relative flex min-h-9 cursor-default items-center gap-2.5 rounded-[8px] px-2.5 py-1.5",
  "font-sans text-[0.875rem] leading-5 outline-none select-none",
  "data-highlighted:bg-mint-50",
  "data-disabled:pointer-events-none data-disabled:text-muted-ink",
  "[&_svg]:pointer-events-none [&_svg]:shrink-0",
];

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React props carry framework member types that cannot be made readonly
function Menu(props: MenuPrimitive.Root.Props) {
  return <MenuPrimitive.Root data-slot="menu" {...props} />;
}

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React props carry framework member types that cannot be made readonly
function MenuTrigger(props: MenuPrimitive.Trigger.Props) {
  return <MenuPrimitive.Trigger data-slot="menu-trigger" {...props} />;
}

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React props carry framework member types that cannot be made readonly
function MenuContent({
  className,
  motion = "wgi",
  align = "start",
  side = "bottom",
  sideOffset = 6,
  ...props
}: MenuPrimitive.Popup.Props &
  VariantProps<typeof menuVariants> &
  Pick<MenuPrimitive.Positioner.Props, "align" | "side" | "sideOffset">) {
  return (
    <MenuPrimitive.Portal>
      <MenuPrimitive.Positioner
        align={align}
        side={side}
        sideOffset={sideOffset}
        collisionPadding={8}
        className="isolate z-50 outline-none"
      >
        <MenuPrimitive.Popup
          data-slot="menu-content"
          className={cn(menuVariants({ motion }), className)}
          {...props}
        />
      </MenuPrimitive.Positioner>
    </MenuPrimitive.Portal>
  );
}

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React props carry framework member types that cannot be made readonly
function MenuGroup(props: MenuPrimitive.Group.Props) {
  return <MenuPrimitive.Group data-slot="menu-group" {...props} />;
}

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React props carry framework member types that cannot be made readonly
function MenuLabel({ className, ...props }: MenuPrimitive.GroupLabel.Props) {
  return (
    <MenuPrimitive.GroupLabel
      data-slot="menu-label"
      className={cn("px-2.5 pt-1.5 pb-1 text-[0.75rem] leading-4 text-muted-ink", className)}
      {...props}
    />
  );
}

const menuItemVariants = cva(itemClasses, {
  variants: {
    tone: {
      default: "",
      primary: "font-bold text-teal-700",
    },
  },
  defaultVariants: {
    tone: "default",
  },
});

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React props carry framework member types that cannot be made readonly
function MenuItem({
  className,
  tone = "default",
  ...props
}: MenuPrimitive.Item.Props & VariantProps<typeof menuItemVariants>) {
  return (
    <MenuPrimitive.Item
      data-slot="menu-item"
      data-tone={tone}
      className={cn(menuItemVariants({ tone }), className)}
      {...props}
    />
  );
}

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React props carry framework member types that cannot be made readonly
function MenuCheckboxItem({ className, children, ...props }: MenuPrimitive.CheckboxItem.Props) {
  return (
    <MenuPrimitive.CheckboxItem
      data-slot="menu-checkbox-item"
      className={cn(itemClasses, "pr-8", className)}
      {...props}
    >
      {children}
      <MenuPrimitive.CheckboxItemIndicator className="absolute right-2.5 flex items-center text-teal-700">
        <Check className="size-4" />
      </MenuPrimitive.CheckboxItemIndicator>
    </MenuPrimitive.CheckboxItem>
  );
}

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React props carry framework member types that cannot be made readonly
function MenuRadioGroup(props: MenuPrimitive.RadioGroup.Props) {
  return <MenuPrimitive.RadioGroup data-slot="menu-radio-group" {...props} />;
}

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React props carry framework member types that cannot be made readonly
function MenuRadioItem({ className, children, ...props }: MenuPrimitive.RadioItem.Props) {
  return (
    <MenuPrimitive.RadioItem
      data-slot="menu-radio-item"
      className={cn(itemClasses, "pr-8", className)}
      {...props}
    >
      {children}
      <MenuPrimitive.RadioItemIndicator className="absolute right-2.5 flex items-center text-teal-700">
        <Check className="size-4" />
      </MenuPrimitive.RadioItemIndicator>
    </MenuPrimitive.RadioItem>
  );
}

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React props carry framework member types that cannot be made readonly
function MenuSeparator({ className, ...props }: MenuPrimitive.Separator.Props) {
  return (
    <MenuPrimitive.Separator
      data-slot="menu-separator"
      className={cn("-mx-1.5 my-1.5 h-px bg-slate-200", className)}
      {...props}
    />
  );
}

export {
  Menu,
  MenuCheckboxItem,
  MenuContent,
  MenuGroup,
  MenuItem,
  MenuLabel,
  MenuRadioGroup,
  MenuRadioItem,
  MenuSeparator,
  MenuTrigger,
};
