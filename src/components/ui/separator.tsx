"use client";

import { Separator as SeparatorPrimitive } from "@base-ui/react/separator";
import { cn } from "cn";

/*
 * Upstream shadcn Separator (base-nova, registry source in
 * src/components/stock/separator.tsx). Adopted verbatim apart from the
 * repo's import and lint conventions: Base UI's Separator primitive with the
 * registry's orientation classes and its data-attribute sizing.
 *
 * Consumers: the full record sheet's rules between sections, and the `Field`
 * and `Item` families, which compose it for `FieldSeparator` and
 * `ItemSeparator` (design-system/surfaces.md "Rules and scrolling").
 */

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React props carry framework member types that cannot be made readonly
function Separator({ className, orientation = "horizontal", ...props }: SeparatorPrimitive.Props) {
  return (
    <SeparatorPrimitive
      data-slot="separator"
      orientation={orientation}
      className={cn(
        "shrink-0 bg-border data-horizontal:h-px data-horizontal:w-full data-vertical:w-px data-vertical:self-stretch",
        className,
      )}
      {...props}
    />
  );
}

export { Separator };
