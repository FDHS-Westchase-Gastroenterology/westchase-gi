"use client";

import { Tabs as TabsPrimitive } from "@base-ui/react/tabs";
import { cn } from "cn";

/*
 * Tabs: one panel of several shown at a time, chosen from a row of
 * labels above it. Adopted from the shadcn Tabs (src/components/stock/tabs.tsx),
 * so it is Base UI's tabs underneath: `role="tablist"`, one tab stop, the
 * arrow keys move between tabs and choose as they go, Home and End reach
 * the ends, and each panel is labelled by its tab.
 *
 * Paper is the segmented control's (ui/segmented-control.tsx `track`) so
 * the two read as one family: a bare slate-100 track with a 4px inset,
 * holding equal-width tabs; the chosen tab is a white, hairline-stroked
 * pill under the thumb shadow, its ink slate-950 at weight 600. Other
 * tabs ink slate-700 and darken on hover. Focus is the recipe teal ring.
 * The stock `line` variant, its underline pseudo-element and its dark
 * mode paint are dropped: no product surface uses them.
 *
 * No motion. A tab answers a click or an arrow key, and keyboard-initiated
 * changes never animate (design-system/motion.md); the pill is painted on
 * the chosen tab itself rather than slid under it.
 */

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React props carry framework member types that cannot be made readonly
function Tabs({ className, ...props }: TabsPrimitive.Root.Props) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      className={cn("flex min-h-0 flex-col gap-3", className)}
      {...props}
    />
  );
}

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React props carry framework member types that cannot be made readonly
function TabsList({ className, ...props }: TabsPrimitive.List.Props) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        "grid w-full auto-cols-fr grid-flow-col gap-0.5 rounded-[0.5rem] bg-slate-100 p-1",
        className,
      )}
      {...props}
    />
  );
}

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React props carry framework member types that cannot be made readonly
function TabsTrigger({ className, ...props }: TabsPrimitive.Tab.Props) {
  return (
    <TabsPrimitive.Tab
      data-slot="tabs-trigger"
      className={cn(
        // Geometry: fills its column, 32px tall inside the track
        "inline-flex min-h-8 min-w-0 cursor-pointer items-center justify-center rounded-[0.375rem] border border-transparent px-2",
        // Ink: slate-700 at rest, darker on hover
        "text-[0.8125rem] leading-none font-normal whitespace-nowrap text-slate-700 select-none",
        "hover:not-data-active:text-slate-950",
        // Chosen: the white raised pill
        "data-active:border-slate-200 data-active:bg-white data-active:font-semibold data-active:text-slate-950 data-active:shadow-[0_1px_2px_rgb(27_42_58/0.12)]",
        // Focus: the recipe teal ring
        "outline-none focus-visible:ring-2 focus-visible:ring-teal-ink",
        "disabled:cursor-default disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React props carry framework member types that cannot be made readonly
function TabsContent({ className, ...props }: TabsPrimitive.Panel.Props) {
  return (
    <TabsPrimitive.Panel
      data-slot="tabs-content"
      className={cn("min-h-0 flex-1 outline-none", className)}
      {...props}
    />
  );
}

export { Tabs, TabsContent, TabsList, TabsTrigger };
