"use client";

import { useState } from "react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";

/* The before/after switch. Both panels stay mounted so the flip is
   instant and the eye can hold one position while the recipe changes
   under it — a keyboard-driven, hundreds-of-times-a-day control, so it
   does not animate (DESIGN.md "Motion" — frequency decides).

   - stock   the registry example under shadcn's own neutral palette
   - bridge  the same example painted only by the semantic token bridge —
             what `shadcn add` produces here with zero adaptation
   - brand   the example rebuilt on src/components/ui/, the committed recipe */

type View = "stock" | "bridge" | "brand";

interface CompareViewProps {
  readonly stock: ReactNode;
  readonly brand: ReactNode;
}

const views: readonly { readonly id: View; readonly label: string }[] = [
  { id: "stock", label: "Stock" },
  { id: "bridge", label: "Stock through the bridge" },
  { id: "brand", label: "Brand" },
];

export function CompareView({ stock, brand }: CompareViewProps) {
  const hasBrand = brand !== null && brand !== undefined;
  const hasStock = stock !== null && stock !== undefined;
  const [view, setView] = useState<View>(hasBrand ? "brand" : "bridge");

  return (
    <section className="flex flex-col gap-4">
      <div role="group" aria-label="Recipe" className="flex flex-wrap gap-2">
        {views.map(({ id, label }) => {
          const available = id === "brand" ? hasBrand : hasStock;
          return (
            <Button
              key={id}
              size="sm"
              motion="none"
              variant={view === id ? "default" : "outline"}
              aria-pressed={view === id}
              disabled={!available}
              onClick={() => {
                setView(id);
              }}
            >
              {label}
            </Button>
          );
        })}
      </div>
      <div
        hidden={view === "brand"}
        data-palette={view === "stock" ? "stock" : "bridge"}
        className="overflow-hidden rounded-lg border border-line"
      >
        {stock}
      </div>
      <div hidden={view !== "brand"} className="overflow-hidden rounded-lg border border-line">
        {brand}
      </div>
    </section>
  );
}
