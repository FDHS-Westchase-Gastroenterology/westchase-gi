"use client";

import { Toggle as TogglePrimitive } from "@base-ui/react/toggle";
import { ToggleGroup as ToggleGroupPrimitive } from "@base-ui/react/toggle-group";
import { cva } from "class-variance-authority";
import type { VariantProps } from "class-variance-authority";
import { cn } from "cn";
import { createContext, use, useMemo } from "react";

/*
 * A row of toggles, one tab stop, the arrow keys moving between them:
 * the record card's follow-up choice (issue #332), the booking month's
 * open starts (issue #344) and the week card's reschedule times (issue
 * #345), each adopted here by issue #360. Adapted from the shadcn
 * ToggleGroup and Toggle (src/components/stock/toggle-group.tsx,
 * src/components/stock/toggle.tsx) on the same Base UI parts. A choice
 * that must post with a form is a segmented control (ui/segmented-control),
 * which is a radio group with a name; this one is not a form control.
 *
 * Variant is an axis on the group, and every item wears it:
 * - `default` / `outline`: the registry's toggles at its three sizes. The
 *   record card's follow-up restates their paint in home.css.
 * - `time`: open start times to pick one from, three to a row. It brings
 *   the grid, tabular figures and the focus ring; the surface that holds
 *   it paints the chips (the booking popover's mint, the week card's
 *   white), because each matches its own frame. Picking a time is the
 *   action, so the group is usually uncontrolled-empty (`value={[]}`) and
 *   reads the pick from `onValueChange`. A taken time is `disabled`, and
 *   the arrow keys pass over it.
 *
 * Changes from the registry: no spacing prop (the registry's default gap
 * is the variant's; a consumer restates its own), pressed paint reads Base
 * UI's `data-pressed` (the registry's `data-[state=on]` is Radix's and
 * never matches here), and motion names its properties — fill, ink, edge and
 * ring at the micro duration on the exit curve, where the registry ships
 * `transition-all` on Tailwind's ease. `time` carries no motion of its
 * own; its consumers' chips restate theirs. Reduced motion: the blanket
 * reset in globals.css.
 */
const toggleGroupVariants = cva("group/toggle-group", {
  variants: {
    variant: {
      default: "flex w-fit flex-row items-center gap-2 rounded-lg",
      outline: "flex w-fit flex-row items-center gap-2 rounded-lg",
      time: "m-0 grid w-full grid-cols-3 gap-2 p-0",
    },
  },
  defaultVariants: { variant: "default" },
});

const toggleItemVariants = cva(
  [
    "shrink-0 outline-none select-none focus:z-10 focus-visible:z-10",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0",
  ],
  {
    variants: {
      variant: {
        default: "bg-transparent",
        outline: "border border-input bg-transparent hover:bg-muted",
        time: [
          "w-full font-[inherit] whitespace-nowrap tabular-nums",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-ink",
        ],
      },
      size: {
        default:
          "h-8 min-w-8 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        sm: "h-7 min-w-7 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-9 min-w-9 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
      },
    },
    compoundVariants: [
      {
        variant: ["default", "outline"],
        className: [
          "group/toggle inline-flex items-center justify-center gap-1 rounded-lg text-sm font-medium whitespace-nowrap",
          "hover:bg-muted hover:text-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
          "disabled:pointer-events-none disabled:opacity-50 aria-pressed:bg-muted data-pressed:bg-muted",
          "aria-invalid:border-destructive aria-invalid:ring-destructive/20 [&_svg:not([class*='size-'])]:size-4",
          "transition-[color,background-color,border-color,box-shadow]",
          "duration-(--motion-micro-duration) ease-(--motion-exit)",
        ],
      },
      { variant: "time", size: ["default", "sm", "lg"], className: "h-auto min-w-0 px-0" },
    ],
    defaultVariants: { variant: "default", size: "default" },
  },
);

type ToggleVariants = VariantProps<typeof toggleItemVariants>;

const ToggleGroupContext = createContext<ToggleVariants>({ variant: "default", size: "default" });

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React props carry framework member types that cannot be made readonly
function ToggleGroup({
  className,
  variant = "default",
  size = "default",
  children,
  ...props
}: ToggleGroupPrimitive.Props & ToggleVariants) {
  const context = useMemo(() => ({ variant, size }), [variant, size]);
  return (
    <ToggleGroupPrimitive
      data-slot="toggle-group"
      data-variant={variant}
      data-size={size}
      className={cn(
        toggleGroupVariants({ variant }),
        "data-[size=sm]:rounded-[min(var(--radius-md),10px)]",
        className,
      )}
      {...props}
    >
      <ToggleGroupContext value={context}>{children}</ToggleGroupContext>
    </ToggleGroupPrimitive>
  );
}

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React props carry framework member types that cannot be made readonly
function ToggleGroupItem({ className, ...props }: TogglePrimitive.Props) {
  const { variant, size } = use(ToggleGroupContext);
  return (
    <TogglePrimitive
      data-slot="toggle-group-item"
      data-variant={variant}
      data-size={size}
      className={cn(toggleItemVariants({ variant, size }), className)}
      {...props}
    />
  );
}

export { ToggleGroup, ToggleGroupItem };
