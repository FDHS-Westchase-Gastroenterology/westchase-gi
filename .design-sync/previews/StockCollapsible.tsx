/* Ported by .design-sync/ds/port-examples.mjs from
   src/components/stock/examples/collapsible-example.tsx — the shadcn registry's own demo,
   vendored by `npm run ds:stock`. Imports are aliased onto the bundle's
   Stock* exports; the JSX is the registry's, unchanged.
   Cells: CollapsibleFileTree, CollapsibleSettings */

"use client"

import * as React from "react"


import { StockButton as Button } from "westchase-gi";
import { StockCard as Card, StockCardContent as CardContent, StockCardDescription as CardDescription, StockCardHeader as CardHeader, StockCardTitle as CardTitle } from "westchase-gi";
import { StockCollapsible as Collapsible, StockCollapsibleContent as CollapsibleContent, StockCollapsibleTrigger as CollapsibleTrigger } from "westchase-gi";
import { StockField as Field, StockFieldGroup as FieldGroup, StockFieldLabel as FieldLabel } from "westchase-gi";
import { StockInput as Input } from "westchase-gi";
import { StockTabs as Tabs, StockTabsList as TabsList, StockTabsTrigger as TabsTrigger } from "westchase-gi";
import { ChevronRightIcon, FolderIcon, FileIcon, MinimizeIcon, MaximizeIcon } from "lucide-react"


type FileTreeItem = { name: string } | { name: string; items: FileTreeItem[] }

export function CollapsibleFileTree() {
  const fileTree: FileTreeItem[] = [
    {
      name: "components",
      items: [
        {
          name: "ui",
          items: [
            { name: "button.tsx" },
            { name: "card.tsx" },
            { name: "dialog.tsx" },
            { name: "input.tsx" },
            { name: "select.tsx" },
            { name: "table.tsx" },
          ],
        },
        { name: "login-form.tsx" },
        { name: "register-form.tsx" },
      ],
    },
    {
      name: "lib",
      items: [{ name: "utils.ts" }, { name: "cn.ts" }, { name: "api.ts" }],
    },
    {
      name: "hooks",
      items: [
        { name: "use-media-query.ts" },
        { name: "use-debounce.ts" },
        { name: "use-local-storage.ts" },
      ],
    },
    {
      name: "types",
      items: [{ name: "index.d.ts" }, { name: "api.d.ts" }],
    },
    {
      name: "public",
      items: [
        { name: "favicon.ico" },
        { name: "logo.svg" },
        { name: "images" },
      ],
    },
    { name: "app.tsx" },
    { name: "layout.tsx" },
    { name: "globals.css" },
    { name: "package.json" },
    { name: "tsconfig.json" },
    { name: "README.md" },
    { name: ".gitignore" },
  ]

  const renderItem = (fileItem: FileTreeItem) => {
    if ("items" in fileItem) {
      return (
        <Collapsible key={fileItem.name}>
          <CollapsibleTrigger
            render={
              <Button
                variant="ghost"
                size="sm"
                className="group w-full justify-start transition-none hover:bg-accent hover:text-accent-foreground"
              />
            }
          >
            <ChevronRightIcon className="transition-transform group-data-[state=open]:rotate-90" />
            <FolderIcon
            />
            {fileItem.name}
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-1 ml-5 style-lyra:ml-4">
            <div className="flex flex-col gap-1">
              {fileItem.items.map((child) => renderItem(child))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )
    }
    return (
      <Button
        key={fileItem.name}
        variant="link"
        size="sm"
        className="w-full justify-start gap-2 text-foreground"
      >
        <FileIcon
        />
        <span>{fileItem.name}</span>
      </Button>
    )
  }

  return (
    <Example title="File Tree" className="items-center">
      <Card className="mx-auto w-full max-w-[16rem] gap-2" size="sm">
        <CardHeader>
          <Tabs defaultValue="explorer">
            <TabsList className="w-full">
              <TabsTrigger value="explorer">Explorer</TabsTrigger>
              <TabsTrigger value="settings">Outline</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-1">
            {fileTree.map((item) => renderItem(item))}
          </div>
        </CardContent>
      </Card>
    </Example>
  )
}

export function CollapsibleSettings() {
  const [isOpen, setIsOpen] = React.useState(false)

  return (
    <Example title="Settings" className="items-center">
      <Card className="mx-auto w-full max-w-xs" size="sm">
        <CardHeader>
          <CardTitle>Radius</CardTitle>
          <CardDescription>
            Set the corner radius of the element.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Collapsible
            open={isOpen}
            onOpenChange={setIsOpen}
            className="flex items-start gap-2"
          >
            <FieldGroup className="grid w-full grid-cols-2 gap-2">
              <Field>
                <FieldLabel htmlFor="radius-x" className="sr-only">
                  Radius X
                </FieldLabel>
                <Input id="radius" placeholder="0" defaultValue={0} />
              </Field>
              <Field>
                <FieldLabel htmlFor="radius-y" className="sr-only">
                  Radius Y
                </FieldLabel>
                <Input id="radius" placeholder="0" defaultValue={0} />
              </Field>
              <CollapsibleContent className="col-span-full grid grid-cols-subgrid gap-2">
                <Field>
                  <FieldLabel htmlFor="radius-x" className="sr-only">
                    Radius X
                  </FieldLabel>
                  <Input id="radius" placeholder="0" defaultValue={0} />
                </Field>
                <Field>
                  <FieldLabel htmlFor="radius-y" className="sr-only">
                    Radius Y
                  </FieldLabel>
                  <Input id="radius" placeholder="0" defaultValue={0} />
                </Field>
              </CollapsibleContent>
            </FieldGroup>
            <CollapsibleTrigger
              render={<Button variant="outline" size="icon" />}
            >
              {isOpen ? (
                <MinimizeIcon
                />
              ) : (
                <MaximizeIcon
                />
              )}
            </CollapsibleTrigger>
          </Collapsible>
        </CardContent>
      </Card>
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
