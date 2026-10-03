"use client";

import { Combobox as ComboboxPrimitive } from "@base-ui/react/combobox";
import { cn } from "cn";

import { Input } from "./input";

/*
 * A combobox: a field that narrows a list as it is typed into, the arrow
 * keys walking the list while focus stays in the field, Return picking
 * the highlighted item — the week's open-time card picks its patient this
 * way (issue #360). Adapted from the shadcn Combobox
 * (src/components/stock/combobox.tsx) on the same Base UI parts.
 *
 * Changes from the registry:
 * - The field is the committed Input recipe (ui/input), not the registry's
 *   input group, and it carries no trigger or clear button: a search
 *   inside a card has nothing to open, and Escape clears it.
 * - Inline only. The registry's popup, chips, groups and separator have no
 *   product consumer and are left out; the list renders where the consumer
 *   places it (`<Combobox inline open>`), inside a surface already open.
 * - Status is added: the polite live region that announces the list's
 *   state ("Searching…", "3 patients"). It stays mounted; its children
 *   change.
 * - The registry's check indicator is left out: picking an item is the
 *   action, so no item shows as chosen.
 *
 * An item's highlight follows the keyboard and the pointer alike
 * (data-highlighted); the registry's accent fill is the default and a
 * surface whose rows have their own paint restates it. No motion of its
 * own; reduced motion is the blanket reset.
 */

const Combobox = ComboboxPrimitive.Root;

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React props carry framework member types that cannot be made readonly
function ComboboxInput(props: ComboboxPrimitive.Input.Props) {
  return <ComboboxPrimitive.Input data-slot="combobox-input" render={<Input />} {...props} />;
}

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React props carry framework member types that cannot be made readonly
function ComboboxList({ className, ...props }: ComboboxPrimitive.List.Props) {
  return (
    <ComboboxPrimitive.List
      data-slot="combobox-list"
      className={cn("scroll-py-1 overflow-y-auto overscroll-contain data-empty:hidden", className)}
      {...props}
    />
  );
}

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React props carry framework member types that cannot be made readonly
function ComboboxItem({ className, ...props }: ComboboxPrimitive.Item.Props) {
  return (
    <ComboboxPrimitive.Item
      data-slot="combobox-item"
      className={cn(
        "relative flex w-full cursor-default items-center gap-2 outline-hidden select-none",
        "data-highlighted:bg-accent data-highlighted:text-accent-foreground",
        "data-disabled:pointer-events-none data-disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React props carry framework member types that cannot be made readonly
function ComboboxStatus(props: ComboboxPrimitive.Status.Props) {
  return <ComboboxPrimitive.Status data-slot="combobox-status" {...props} />;
}

export { Combobox, ComboboxInput, ComboboxItem, ComboboxList, ComboboxStatus };
