/* ScrollBar only renders inside a ScrollArea, so it is previewed in its parent
   (design-sync: compose context-required pieces inside their parent). */

import {
  StockScrollArea as ScrollArea,
  StockScrollBar as ScrollBar,
  StockSeparator as Separator,
} from "westchase-gi";

const preps = [
  "Clenpiq Split-Dose Prep", "Clenpiq Prep", "Sutab Prep",
  "Colonoscopy Prep (MiraLAX)", "Colonoscopy Split-Dose Prep (MiraLAX)",
  "Golytely Prep", "Golytely Split-Dose Prep", "EGD (Upper Endoscopy) Prep",
  "Bravo Prep", "Halo Prep", "Endocapsule Study Prep", "Sigmoidoscopy Prep",
];

export function Vertical() {
  return (
    <ScrollArea className="h-56 w-full max-w-sm rounded-lg border">
      <div className="p-4 text-sm">
        {preps.map((p) => (
          <div key={p}>
            <div className="py-2">{p}</div>
            <Separator />
          </div>
        ))}
      </div>
      <ScrollBar orientation="vertical" />
    </ScrollArea>
  );
}

export function Horizontal() {
  return (
    <ScrollArea className="w-full max-w-sm rounded-lg border whitespace-nowrap">
      <div className="flex w-max gap-3 p-4">
        {preps.slice(0, 6).map((p) => (
          <div key={p} className="rounded-md bg-muted px-3 py-6 text-sm">{p}</div>
        ))}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}
