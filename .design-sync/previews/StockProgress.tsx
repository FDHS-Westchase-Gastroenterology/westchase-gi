/* Ported by .design-sync/ds/port-examples.mjs from
   src/components/stock/examples/progress-example.tsx — the shadcn registry's own demo,
   vendored by `npm run ds:stock`. Imports are aliased onto the bundle's
   Stock* exports; the JSX is the registry's, unchanged.
   Cells: ProgressValues, ProgressWithLabel, ProgressControlled, FileUploadList */

"use client"

import * as React from "react"


import { StockItem as Item, StockItemActions as ItemActions, StockItemContent as ItemContent, StockItemGroup as ItemGroup, StockItemMedia as ItemMedia, StockItemTitle as ItemTitle } from "westchase-gi";
import { StockProgress as Progress, StockProgressLabel as ProgressLabel, StockProgressValue as ProgressValue } from "westchase-gi";
import { StockSlider as Slider } from "westchase-gi";
import { FileIcon } from "lucide-react"


export function ProgressValues() {
  return (
    <Example title="Progress Bar">
      <div className="flex w-full flex-col gap-4">
        <Progress value={0} />
        <Progress value={25} className="w-full" />
        <Progress value={50} />
        <Progress value={75} />
        <Progress value={100} />
      </div>
    </Example>
  )
}

export function ProgressWithLabel() {
  return (
    <Example title="With Label">
      <Progress value={56}>
        <ProgressLabel>Upload progress</ProgressLabel>
        <ProgressValue />
      </Progress>
    </Example>
  )
}

export function ProgressControlled() {
  const [value, setValue] = React.useState(50)

  return (
    <Example title="Controlled">
      <div className="flex w-full flex-col gap-4">
        <Progress value={value} className="w-full" />
        <Slider
          value={value}
          onValueChange={(value) => setValue(value as number)}
          min={0}
          max={100}
          step={1}
        />
      </div>
    </Example>
  )
}

export function FileUploadList() {
  const files = React.useMemo(
    () => [
      {
        id: "1",
        name: "document.pdf",
        progress: 45,
        timeRemaining: "2m 30s",
      },
      {
        id: "2",
        name: "presentation.pptx",
        progress: 78,
        timeRemaining: "45s",
      },
      {
        id: "3",
        name: "spreadsheet.xlsx",
        progress: 12,
        timeRemaining: "5m 12s",
      },
      {
        id: "4",
        name: "image.jpg",
        progress: 100,
        timeRemaining: "Complete",
      },
    ],
    []
  )

  return (
    <Example title="File Upload List">
      <ItemGroup>
        {files.map((file) => (
          <Item key={file.id} size="xs" className="px-0">
            <ItemMedia variant="icon">
              <FileIcon className="size-5" />
            </ItemMedia>
            <ItemContent className="inline-block truncate">
              <ItemTitle className="inline">{file.name}</ItemTitle>
            </ItemContent>
            <ItemContent>
              <Progress value={file.progress} className="w-32" />
            </ItemContent>
            <ItemActions className="w-16 justify-end">
              <span className="text-sm text-muted-foreground">
                {file.timeRemaining}
              </span>
            </ItemActions>
          </Item>
        ))}
      </ItemGroup>
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
