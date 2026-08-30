/* Ported by .design-sync/ds/port-examples.mjs from
   src/components/stock/examples/kbd-example.tsx — the shadcn registry's own demo,
   vendored by `npm run ds:stock`. Imports are aliased onto the bundle's
   Stock* exports; the JSX is the registry's, unchanged.
   Cells: KbdBasic, KbdModifierKeys, KbdGroupExample, KbdArrowKeys, KbdWithIcons, KbdWithIconsAndText (+3 not shown) */

import { StockButton as Button } from "westchase-gi";
import { StockInputGroup as InputGroup, StockInputGroupAddon as InputGroupAddon, StockInputGroupInput as InputGroupInput } from "westchase-gi";
import { StockKbd as Kbd, StockKbdGroup as KbdGroup } from "westchase-gi";
import { StockTooltip as Tooltip, StockTooltipContent as TooltipContent, StockTooltipTrigger as TooltipTrigger } from "westchase-gi";
import { CircleDashedIcon, ArrowLeftIcon, ArrowRightIcon, SaveIcon } from "lucide-react"


export function KbdBasic() {
  return (
    <Example title="Basic">
      <div className="flex items-center gap-2">
        <Kbd>Ctrl</Kbd>
        <Kbd>⌘K</Kbd>
        <Kbd>Ctrl + B</Kbd>
      </div>
    </Example>
  )
}

export function KbdModifierKeys() {
  return (
    <Example title="Modifier Keys">
      <div className="flex items-center gap-2">
        <Kbd>⌘</Kbd>
        <Kbd>C</Kbd>
      </div>
    </Example>
  )
}

export function KbdGroupExample() {
  return (
    <Example title="KbdGroup">
      <KbdGroup>
        <Kbd>Ctrl</Kbd>
        <Kbd>Shift</Kbd>
        <Kbd>P</Kbd>
      </KbdGroup>
    </Example>
  )
}

export function KbdArrowKeys() {
  return (
    <Example title="Arrow Keys">
      <div className="flex items-center gap-2">
        <Kbd>↑</Kbd>
        <Kbd>↓</Kbd>
        <Kbd>←</Kbd>
        <Kbd>→</Kbd>
      </div>
    </Example>
  )
}

export function KbdWithIcons() {
  return (
    <Example title="With Icons">
      <KbdGroup>
        <Kbd>
          <CircleDashedIcon
          />
        </Kbd>
        <Kbd>
          <ArrowLeftIcon
          />
        </Kbd>
        <Kbd>
          <ArrowRightIcon
          />
        </Kbd>
      </KbdGroup>
    </Example>
  )
}

export function KbdWithIconsAndText() {
  return (
    <Example title="With Icons and Text">
      <KbdGroup>
        <Kbd>
          <ArrowLeftIcon
          />
          Left
        </Kbd>
        <Kbd>
          <CircleDashedIcon
          />
          Voice Enabled
        </Kbd>
      </KbdGroup>
    </Example>
  )
}

function KbdInInputGroup() {
  return (
    <Example title="InputGroup">
      <InputGroup>
        <InputGroupInput />
        <InputGroupAddon>
          <Kbd>Space</Kbd>
        </InputGroupAddon>
      </InputGroup>
    </Example>
  )
}

function KbdInTooltip() {
  return (
    <Example title="Tooltip">
      <Tooltip>
        <TooltipTrigger render={<Button size="icon-sm" variant="outline" />}>
          <SaveIcon
          />
        </TooltipTrigger>
        <TooltipContent className="pr-1.5">
          <div className="flex items-center gap-2">
            Save Changes <Kbd>S</Kbd>
          </div>
        </TooltipContent>
      </Tooltip>
    </Example>
  )
}

function KbdWithSamp() {
  return (
    <Example title="With samp">
      <Kbd>
        <samp>File</samp>
      </Kbd>
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
