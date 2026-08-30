/* Ported by .design-sync/ds/port-examples.mjs from
   src/components/stock/examples/slider-example.tsx — the shadcn registry's own demo,
   vendored by `npm run ds:stock`. Imports are aliased onto the bundle's
   Stock* exports; the JSX is the registry's, unchanged.
   Cells: SliderBasic, SliderRange, SliderMultiple, SliderVertical, SliderControlled, SliderDisabled */

"use client"

import * as React from "react"


import { StockLabel as Label } from "westchase-gi";
import { StockSlider as Slider } from "westchase-gi";


export function SliderBasic() {
  return (
    <Example title="Basic">
      <Slider defaultValue={50} max={100} step={1} />
    </Example>
  )
}

export function SliderRange() {
  return (
    <Example title="Range">
      <Slider defaultValue={[25, 50]} max={100} step={5} />
    </Example>
  )
}

export function SliderMultiple() {
  return (
    <Example title="Multiple Thumbs">
      <Slider defaultValue={[10, 20, 70]} max={100} step={10} />
    </Example>
  )
}

export function SliderVertical() {
  return (
    <Example title="Vertical">
      <div className="flex items-center gap-6">
        <Slider
          defaultValue={[50]}
          max={100}
          step={1}
          orientation="vertical"
          className="h-40"
        />
        <Slider
          defaultValue={[25]}
          max={100}
          step={1}
          orientation="vertical"
          className="h-40"
        />
      </div>
    </Example>
  )
}

export function SliderControlled() {
  const [value, setValue] = React.useState([0.3, 0.7])

  return (
    <Example title="Controlled">
      <div className="grid w-full gap-3">
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor="slider-demo-temperature">Temperature</Label>
          <span className="text-sm text-muted-foreground">
            {value.join(", ")}
          </span>
        </div>
        <Slider
          id="slider-demo-temperature"
          value={value}
          onValueChange={(value) => setValue(value as number[])}
          min={0}
          max={1}
          step={0.1}
        />
      </div>
    </Example>
  )
}

export function SliderDisabled() {
  return (
    <Example title="Disabled">
      <Slider defaultValue={[50]} max={100} step={1} disabled />
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
