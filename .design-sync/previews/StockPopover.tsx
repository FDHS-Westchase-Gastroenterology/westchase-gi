/* Ported by .design-sync/ds/port-examples.mjs from
   src/components/stock/examples/popover-example.tsx — the shadcn registry's own demo,
   vendored by `npm run ds:stock`. Imports are aliased onto the bundle's
   Stock* exports; the JSX is the registry's, unchanged.
   Cells: PopoverBasic, PopoverSides, PopoverWithForm, PopoverAlignments, PopoverInDialog */

import { StockButton as Button } from "westchase-gi";
import { StockDialog as Dialog, StockDialogContent as DialogContent, StockDialogDescription as DialogDescription, StockDialogHeader as DialogHeader, StockDialogTitle as DialogTitle, StockDialogTrigger as DialogTrigger } from "westchase-gi";
import { StockField as Field, StockFieldGroup as FieldGroup, StockFieldLabel as FieldLabel } from "westchase-gi";
import { StockInput as Input } from "westchase-gi";
import { StockPopover as Popover, StockPopoverContent as PopoverContent, StockPopoverDescription as PopoverDescription, StockPopoverHeader as PopoverHeader, StockPopoverTitle as PopoverTitle, StockPopoverTrigger as PopoverTrigger } from "westchase-gi";


export function PopoverBasic() {
  return (
    <Example title="Basic">
      <Popover defaultOpen>
        <PopoverTrigger render={<Button variant="outline" className="w-fit" />}>
          Open Popover
        </PopoverTrigger>
        <PopoverContent align="start">
          <PopoverHeader>
            <PopoverTitle>Dimensions</PopoverTitle>
            <PopoverDescription>
              Set the dimensions for the layer.
            </PopoverDescription>
          </PopoverHeader>
        </PopoverContent>
      </Popover>
    </Example>
  )
}

export function PopoverSides() {
  return (
    <Example title="Sides">
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-2">
          {(["inline-start", "left", "top"] as const).map((side) => (
            <Popover key={side}>
              <PopoverTrigger
                render={
                  <Button variant="outline" className="w-fit capitalize" />
                }
              >
                {side.replace("-", " ")}
              </PopoverTrigger>
              <PopoverContent side={side} className="w-40">
                <p>Popover on {side.replace("-", " ")}</p>
              </PopoverContent>
            </Popover>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {(["bottom", "right", "inline-end"] as const).map((side) => (
            <Popover key={side}>
              <PopoverTrigger
                render={
                  <Button variant="outline" className="w-fit capitalize" />
                }
              >
                {side.replace("-", " ")}
              </PopoverTrigger>
              <PopoverContent side={side} className="w-40">
                <p>Popover on {side.replace("-", " ")}</p>
              </PopoverContent>
            </Popover>
          ))}
        </div>
      </div>
    </Example>
  )
}

export function PopoverWithForm() {
  return (
    <Example title="With Form">
      <Popover>
        <PopoverTrigger render={<Button variant="outline" />}>
          Open Popover
        </PopoverTrigger>
        <PopoverContent className="w-64" align="start">
          <PopoverHeader>
            <PopoverTitle>Dimensions</PopoverTitle>
            <PopoverDescription>
              Set the dimensions for the layer.
            </PopoverDescription>
          </PopoverHeader>
          <FieldGroup className="gap-4">
            <Field orientation="horizontal">
              <FieldLabel htmlFor="width" className="w-1/2">
                Width
              </FieldLabel>
              <Input id="width" defaultValue="100%" />
            </Field>
            <Field orientation="horizontal">
              <FieldLabel htmlFor="height" className="w-1/2">
                Height
              </FieldLabel>
              <Input id="height" defaultValue="25px" />
            </Field>
          </FieldGroup>
        </PopoverContent>
      </Popover>
    </Example>
  )
}

export function PopoverAlignments() {
  return (
    <Example title="Alignments">
      <div className="flex gap-6">
        <Popover>
          <PopoverTrigger render={<Button variant="outline" size="sm" />}>
            Start
          </PopoverTrigger>
          <PopoverContent align="start" className="w-40">
            Aligned to start
          </PopoverContent>
        </Popover>
        <Popover>
          <PopoverTrigger render={<Button variant="outline" size="sm" />}>
            Center
          </PopoverTrigger>
          <PopoverContent align="center" className="w-40">
            Aligned to center
          </PopoverContent>
        </Popover>
        <Popover>
          <PopoverTrigger render={<Button variant="outline" size="sm" />}>
            End
          </PopoverTrigger>
          <PopoverContent align="end" className="w-40">
            Aligned to end
          </PopoverContent>
        </Popover>
      </div>
    </Example>
  )
}

export function PopoverInDialog() {
  return (
    <Example title="In Dialog">
      <Dialog>
        <DialogTrigger render={<Button variant="outline" />}>
          Open Dialog
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Popover Example</DialogTitle>
            <DialogDescription>
              Click the button below to see the popover.
            </DialogDescription>
          </DialogHeader>
          <Popover>
            <PopoverTrigger
              render={<Button variant="outline" className="w-fit" />}
            >
              Open Popover
            </PopoverTrigger>
            <PopoverContent align="start">
              <PopoverHeader>
                <PopoverTitle>Popover in Dialog</PopoverTitle>
                <PopoverDescription>
                  This popover appears inside a dialog. Click the button to open
                  it.
                </PopoverDescription>
              </PopoverHeader>
            </PopoverContent>
          </Popover>
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
