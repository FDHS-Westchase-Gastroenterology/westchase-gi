/* Ported by .design-sync/ds/port-examples.mjs from
   src/components/stock/examples/hover-card-example.tsx — the shadcn registry's own demo,
   vendored by `npm run ds:stock`. Imports are aliased onto the bundle's
   Stock* exports; the JSX is the registry's, unchanged.
   Cells: HoverCardSides, HoverCardInDialog */

import { StockButton as Button } from "westchase-gi";
import { StockDialog as Dialog, StockDialogContent as DialogContent, StockDialogDescription as DialogDescription, StockDialogHeader as DialogHeader, StockDialogTitle as DialogTitle, StockDialogTrigger as DialogTrigger } from "westchase-gi";
import { StockHoverCard as HoverCard, StockHoverCardContent as HoverCardContent, StockHoverCardTrigger as HoverCardTrigger } from "westchase-gi";


const HOVER_CARD_SIDES = [
  "inline-start",
  "left",
  "top",
  "bottom",
  "right",
  "inline-end",
] as const

export function HoverCardSides() {
  return (
    <Example title="Sides" containerClassName="col-span-2">
      <div className="flex flex-wrap items-center justify-center gap-2">
        {HOVER_CARD_SIDES.map((side) => (
          <HoverCard defaultOpen key={side}>
            <HoverCardTrigger
              delay={100}
              closeDelay={100}
              render={<Button variant="outline" className="capitalize" />}
            >
              {side.replace("-", " ")}
            </HoverCardTrigger>
            <HoverCardContent side={side}>
              <div className="flex flex-col style-vega:gap-2 style-nova:gap-1.5 style-lyra:gap-1 style-maia:gap-2 style-mira:gap-1 style-luma:gap-2">
                <h4 className="font-medium">Hover Card</h4>
                <p>
                  This hover card appears on the {side.replace("-", " ")} side
                  of the trigger.
                </p>
              </div>
            </HoverCardContent>
          </HoverCard>
        ))}
      </div>
    </Example>
  )
}

export function HoverCardInDialog() {
  return (
    <Example title="In Dialog">
      <Dialog>
        <DialogTrigger render={<Button variant="outline" />}>
          Open Dialog
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hover Card Example</DialogTitle>
            <DialogDescription>
              Hover over the button below to see the hover card.
            </DialogDescription>
          </DialogHeader>
          <HoverCard>
            <HoverCardTrigger
              delay={100}
              closeDelay={100}
              render={<Button variant="outline" className="w-fit" />}
            >
              Hover me
            </HoverCardTrigger>
            <HoverCardContent>
              <div className="flex flex-col style-vega:gap-2 style-nova:gap-1.5 style-lyra:gap-1 style-maia:gap-2 style-mira:gap-1 style-luma:gap-2">
                <h4 className="font-medium">Hover Card</h4>
                <p>
                  This hover card appears inside a dialog. Hover over the button
                  to see it.
                </p>
              </div>
            </HoverCardContent>
          </HoverCard>
        </DialogContent>
      </Dialog>
    </Example>
  )
}

/* Local stand-in for the registry demo frame (src/components/stock/examples/
   example.tsx), which is gallery-only code. Same slots, no dependencies. */
function Example({ title, children, className = "" }) {
  return (
    <div className="flex w-full min-w-0 flex-col gap-1">
      {title ? (
        <div className="px-1.5 py-2 text-xs font-medium text-muted-foreground">{title}</div>
      ) : null}
      <div className={"flex min-w-0 flex-col items-start gap-6 rounded-xl bg-card p-6 text-foreground " + className}>
        {children}
      </div>
    </div>
  );
}
