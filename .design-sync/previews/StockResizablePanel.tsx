/* Ported by .design-sync/ds/port-examples.mjs from
   src/components/stock/examples/resizable-example.tsx — the shadcn registry's own demo,
   vendored by `npm run ds:stock`. Imports are aliased onto the bundle's
   Stock* exports; the JSX is the registry's, unchanged.
   Cells: ResizableHorizontal, ResizableVertical, ResizableWithHandle, ResizableNested, ResizableControlled */

"use client"

import * as React from "react"
import type { Layout } from "react-resizable-panels"


import { StockResizableHandle as ResizableHandle, StockResizablePanel as ResizablePanel, StockResizablePanelGroup as ResizablePanelGroup } from "westchase-gi";


export function ResizableHorizontal() {
  return (
    <Example title="Horizontal">
      <ResizablePanelGroup
        orientation="horizontal"
        className="min-h-[200px] rounded-lg border"
      >
        <ResizablePanel defaultSize="25%">
          <div className="flex h-full items-center justify-center p-6">
            <span className="font-semibold">Sidebar</span>
          </div>
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel defaultSize="75%">
          <div className="flex h-full items-center justify-center p-6">
            <span className="font-semibold">Content</span>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </Example>
  )
}

export function ResizableVertical() {
  return (
    <Example title="Vertical">
      <ResizablePanelGroup
        orientation="vertical"
        className="min-h-[200px] rounded-lg border"
      >
        <ResizablePanel defaultSize="25%">
          <div className="flex h-full items-center justify-center p-6">
            <span className="font-semibold">Header</span>
          </div>
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel defaultSize="75%">
          <div className="flex h-full items-center justify-center p-6">
            <span className="font-semibold">Content</span>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </Example>
  )
}

export function ResizableWithHandle() {
  return (
    <Example title="With Handle">
      <ResizablePanelGroup
        orientation="horizontal"
        className="min-h-[200px] rounded-lg border"
      >
        <ResizablePanel defaultSize="25%">
          <div className="flex h-full items-center justify-center p-6">
            <span className="font-semibold">Sidebar</span>
          </div>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize="75%">
          <div className="flex h-full items-center justify-center p-6">
            <span className="font-semibold">Content</span>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </Example>
  )
}

export function ResizableNested() {
  return (
    <Example title="Nested">
      <ResizablePanelGroup
        orientation="horizontal"
        className="rounded-lg border"
      >
        <ResizablePanel defaultSize="50%">
          <div className="flex h-[200px] items-center justify-center p-6">
            <span className="font-semibold">One</span>
          </div>
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel defaultSize="50%">
          <ResizablePanelGroup orientation="vertical">
            <ResizablePanel defaultSize="25%">
              <div className="flex h-full items-center justify-center p-6">
                <span className="font-semibold">Two</span>
              </div>
            </ResizablePanel>
            <ResizableHandle />
            <ResizablePanel defaultSize="75%">
              <div className="flex h-full items-center justify-center p-6">
                <span className="font-semibold">Three</span>
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </ResizablePanel>
      </ResizablePanelGroup>
    </Example>
  )
}

export function ResizableControlled() {
  const [layout, setLayout] = React.useState<Layout>({})

  return (
    <Example title="Controlled">
      <ResizablePanelGroup
        orientation="horizontal"
        className="min-h-[200px] rounded-lg border"
        onLayoutChange={setLayout}
      >
        <ResizablePanel defaultSize="30%" id="left" minSize="20%">
          <div className="flex h-full flex-col items-center justify-center gap-2 p-6">
            <span className="font-semibold">
              {Math.round(layout.left ?? 30)}%
            </span>
          </div>
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel defaultSize="70%" id="right" minSize="30%">
          <div className="flex h-full flex-col items-center justify-center gap-2 p-6">
            <span className="font-semibold">
              {Math.round(layout.right ?? 70)}%
            </span>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
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
