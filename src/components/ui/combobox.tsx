"use client";

import { Combobox as ComboboxPrimitive } from "@base-ui/react/combobox";
import { cn } from "cn";

import { Input } from "./input";
import type { InputMotion } from "./input";

/*
 * A combobox: a field that narrows a list as it is typed into, the arrow
 * keys walking the list while focus stays in the field, Return picking
 * the highlighted item — the week's open-time card picks its patient this
 * way (issue #360), and the Schedule's toolbar finds a person (issue
 * #356). Adapted from the shadcn Combobox (src/components/stock/combobox.tsx)
 * on the same Base UI parts.
 *
 * Changes from the registry:
 * - The field is the committed Input recipe (ui/input), not the registry's
 *   input group, and it carries no trigger or clear button: Escape clears
 *   it. A consumer whose field is drawn as a pill wraps it in
 *   ComboboxInputGroup, which Base UI anchors the popup to.
 * - The list renders inline where the consumer places it (`<Combobox
 *   inline open>`, inside a surface already open) or in ComboboxContent,
 *   the registry's popup. Its paint and size belong to the consumer, so
 *   the registry's width-to-anchor, shadow, ring and enter/exit animation
 *   are left out: a list that opens as the user types answers every
 *   keystroke, and motion there only lags it (design-system/motion.md).
 *   The registry's chips, groups, separator and Empty part have no product
 *   consumer and are left out; a popup with nothing to list says why in its
 *   own words.
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

/** The highlight a list opens with: none, the first match while filtering, or always the first item. */
export type ComboboxAutoHighlight = boolean | "always";

/* Base UI's Combobox root types `autoHighlight` as a boolean but forwards
   it unchanged to the AriaCombobox it shares with Autocomplete, which
   types and honors "always": the first item stays highlighted whenever the
   list has one, including when the items arrive after the query (the
   Schedule's search, which reads its results from the server). The value
   is passed through by assignment, which the root's narrower type does
   not see. */
// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React props carry framework member types that cannot be made readonly
function Combobox<Value, Multiple extends boolean | undefined = false>({
  autoHighlight,
  ...props
}: Omit<ComboboxPrimitive.Root.Props<Value, Multiple>, "autoHighlight"> & {
  readonly autoHighlight?: ComboboxAutoHighlight;
}) {
  const rootProps: ComboboxPrimitive.Root.Props<Value, Multiple> = props;
  Object.assign(rootProps, { autoHighlight });
  return <ComboboxPrimitive.Root<Value, Multiple> {...rootProps} />;
}

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React props carry framework member types that cannot be made readonly
function ComboboxInput({
  motion,
  ...props
}: ComboboxPrimitive.Input.Props & { readonly motion?: InputMotion }) {
  return (
    <ComboboxPrimitive.Input
      data-slot="combobox-input"
      render={<Input motion={motion} />}
      {...props}
    />
  );
}

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React props carry framework member types that cannot be made readonly
function ComboboxInputGroup(props: ComboboxPrimitive.InputGroup.Props) {
  return <ComboboxPrimitive.InputGroup data-slot="combobox-input-group" {...props} />;
}

/* The registry's popup, portaled to body and placed under the input group
   (or the input when there is none). Base UI fits it to the room left in
   the viewport; the consumer's class sets its width and paint. */
// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React props carry framework member types that cannot be made readonly
function ComboboxContent({
  className,
  side = "bottom",
  sideOffset = 6,
  align = "start",
  alignOffset = 0,
  anchor,
  collisionPadding = 12,
  ...props
}: ComboboxPrimitive.Popup.Props &
  Pick<
    ComboboxPrimitive.Positioner.Props,
    "side" | "align" | "sideOffset" | "alignOffset" | "anchor" | "collisionPadding"
  >) {
  return (
    <ComboboxPrimitive.Portal>
      <ComboboxPrimitive.Positioner
        data-slot="combobox-positioner"
        side={side}
        sideOffset={sideOffset}
        align={align}
        alignOffset={alignOffset}
        anchor={anchor}
        collisionPadding={collisionPadding}
        className="isolate z-50"
      >
        <ComboboxPrimitive.Popup
          data-slot="combobox-content"
          className={cn(
            "relative max-h-(--available-height) max-w-(--available-width) overflow-hidden outline-none",
            "bg-popover text-popover-foreground",
            className,
          )}
          {...props}
        />
      </ComboboxPrimitive.Positioner>
    </ComboboxPrimitive.Portal>
  );
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

export {
  Combobox,
  ComboboxContent,
  ComboboxInput,
  ComboboxInputGroup,
  ComboboxItem,
  ComboboxList,
  ComboboxStatus,
};
