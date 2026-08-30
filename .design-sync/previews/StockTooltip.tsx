/* Ported by .design-sync/ds/port-examples.mjs from
   src/components/stock/examples/tooltip-example.tsx — the shadcn registry's own demo,
   vendored by `npm run ds:stock`. Imports are aliased onto the bundle's
   Stock* exports; the JSX is the registry's, unchanged.
   Cells: TooltipBasic, TooltipSides, TooltipWithIcon, TooltipLongContent, TooltipDisabled, TooltipWithKeyboard (+2 not shown) */

"use client"


import { StockButton as Button } from "westchase-gi";
import { StockKbd as Kbd } from "westchase-gi";
import { StockTooltip as Tooltip, StockTooltipContent as TooltipContent, StockTooltipTrigger as TooltipTrigger } from "westchase-gi";
import { InfoIcon, SaveIcon } from "lucide-react"


export function TooltipBasic() {
  return (
    <Example title="Basic">
      <Tooltip defaultOpen>
        <TooltipTrigger render={<Button variant="outline" className="w-fit" />}>
          Show Tooltip
        </TooltipTrigger>
        <TooltipContent>
          <p>Add to library</p>
        </TooltipContent>
      </Tooltip>
    </Example>
  )
}

export function TooltipSides() {
  return (
    <Example title="Sides">
      <div className="flex flex-wrap gap-2">
        {(
          [
            "inline-start",
            "left",
            "top",
            "bottom",
            "right",
            "inline-end",
          ] as const
        ).map((side) => (
          <Tooltip key={side}>
            <TooltipTrigger
              render={<Button variant="outline" className="w-fit capitalize" />}
            >
              {side.replace("-", " ")}
            </TooltipTrigger>
            <TooltipContent side={side}>
              <p>Add to library</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </Example>
  )
}

export function TooltipWithIcon() {
  return (
    <Example title="With Icon">
      <Tooltip>
        <TooltipTrigger render={<Button variant="ghost" size="icon" />}>
          <InfoIcon
          />
          <span className="sr-only">Info</span>
        </TooltipTrigger>
        <TooltipContent>
          <p>Additional information</p>
        </TooltipContent>
      </Tooltip>
    </Example>
  )
}

export function TooltipLongContent() {
  return (
    <Example title="Long Content">
      <Tooltip>
        <TooltipTrigger render={<Button variant="outline" className="w-fit" />}>
          Show Tooltip
        </TooltipTrigger>
        <TooltipContent>
          To learn more about how this works, check out the docs. If you have
          any questions, please reach out to us.
        </TooltipContent>
      </Tooltip>
    </Example>
  )
}

export function TooltipDisabled() {
  return (
    <Example title="Disabled">
      <Tooltip>
        <TooltipTrigger render={<span className="inline-block w-fit" />}>
          <Button variant="outline" disabled>
            Disabled
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>This feature is currently unavailable</p>
        </TooltipContent>
      </Tooltip>
    </Example>
  )
}

export function TooltipWithKeyboard() {
  return (
    <Example title="With Keyboard Shortcut">
      <Tooltip>
        <TooltipTrigger render={<Button variant="outline" size="icon-sm" />}>
          <SaveIcon
          />
        </TooltipTrigger>
        <TooltipContent>
          Save Changes <Kbd>S</Kbd>
        </TooltipContent>
      </Tooltip>
    </Example>
  )
}

function TooltipOnLink() {
  return (
    <Example title="On Link">
      <Tooltip>
        <TooltipTrigger
          render={
            <a
              href="#"
              className="w-fit text-sm text-primary underline-offset-4 hover:underline"
              onClick={(e) => e.preventDefault()}
            />
          }
        >
          Learn more
        </TooltipTrigger>
        <TooltipContent>
          <p>Click to read the documentation</p>
        </TooltipContent>
      </Tooltip>
    </Example>
  )
}

function TooltipFormatted() {
  return (
    <Example title="Formatted Content">
      <Tooltip>
        <TooltipTrigger render={<Button variant="outline" className="w-fit" />}>
          Status
        </TooltipTrigger>
        <TooltipContent>
          <div className="flex flex-col gap-1">
            <p className="font-semibold">Active</p>
            <p className="text-xs opacity-80">Last updated 2 hours ago</p>
          </div>
        </TooltipContent>
      </Tooltip>
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
