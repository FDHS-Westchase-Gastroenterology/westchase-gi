"use client";

import { Collapsible as CollapsiblePrimitive } from "@base-ui/react/collapsible";
import { cn } from "cn";

/* Fresh conversion of the stock registry Collapsible
   (src/components/stock/collapsible.tsx) for the full record's request
   details: the same Base UI skeleton, with this surface's paint and motion
   in home.css under `.wgi-disclosure`. The panel's height animates through
   Base UI's `--collapsible-panel-height`, and a closed panel stays
   mounted-but-hidden only while it animates out. */

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React props carry framework member types that cannot be made readonly
function HomeCollapsible({ className, ...props }: CollapsiblePrimitive.Root.Props) {
  return (
    <CollapsiblePrimitive.Root
      data-slot="collapsible"
      className={cn("wgi-disclosure", className)}
      {...props}
    />
  );
}

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React props carry framework member types that cannot be made readonly
function HomeCollapsibleTrigger({ className, ...props }: CollapsiblePrimitive.Trigger.Props) {
  return (
    <CollapsiblePrimitive.Trigger
      data-slot="collapsible-trigger"
      className={cn("wgi-disclosure-trigger", className)}
      {...props}
    />
  );
}

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React props carry framework member types that cannot be made readonly
function HomeCollapsiblePanel({ className, ...props }: CollapsiblePrimitive.Panel.Props) {
  return (
    <CollapsiblePrimitive.Panel
      data-slot="collapsible-content"
      className={cn("wgi-disclosure-panel", className)}
      {...props}
    />
  );
}

export { HomeCollapsible, HomeCollapsiblePanel, HomeCollapsibleTrigger };
