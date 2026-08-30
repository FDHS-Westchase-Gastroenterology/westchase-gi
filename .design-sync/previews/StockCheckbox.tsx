/* Ported by .design-sync/ds/port-examples.mjs from
   src/components/stock/examples/checkbox-example.tsx — the shadcn registry's own demo,
   vendored by `npm run ds:stock`. Imports are aliased onto the bundle's
   Stock* exports; the JSX is the registry's, unchanged.
   Cells: CheckboxBasic, CheckboxWithDescription, CheckboxInvalid, CheckboxDisabled, CheckboxWithTitle, CheckboxInTable (+1 not shown) */

"use client"

import * as React from "react"


import { StockCheckbox as Checkbox } from "westchase-gi";
import { StockField as Field, StockFieldContent as FieldContent, StockFieldDescription as FieldDescription, StockFieldGroup as FieldGroup, StockFieldLabel as FieldLabel, StockFieldTitle as FieldTitle } from "westchase-gi";
import { StockTable as Table, StockTableBody as TableBody, StockTableCell as TableCell, StockTableHead as TableHead, StockTableHeader as TableHeader, StockTableRow as TableRow } from "westchase-gi";


export function CheckboxBasic() {
  return (
    <Example title="Basic">
      <Field orientation="horizontal">
        <Checkbox id="terms" />
        <FieldLabel htmlFor="terms">Accept terms and conditions</FieldLabel>
      </Field>
    </Example>
  )
}

export function CheckboxWithDescription() {
  return (
    <Example title="With Description">
      <Field orientation="horizontal">
        <Checkbox id="terms-2" defaultChecked />
        <FieldContent>
          <FieldLabel htmlFor="terms-2">Accept terms and conditions</FieldLabel>
          <FieldDescription>
            By clicking this checkbox, you agree to the terms and conditions.
          </FieldDescription>
        </FieldContent>
      </Field>
    </Example>
  )
}

export function CheckboxInvalid() {
  return (
    <Example title="Invalid">
      <Field orientation="horizontal" data-invalid>
        <Checkbox id="terms-3" aria-invalid />
        <FieldLabel htmlFor="terms-3">Accept terms and conditions</FieldLabel>
      </Field>
    </Example>
  )
}

export function CheckboxDisabled() {
  return (
    <Example title="Disabled">
      <Field orientation="horizontal">
        <Checkbox id="toggle" disabled />
        <FieldLabel htmlFor="toggle">Enable notifications</FieldLabel>
      </Field>
    </Example>
  )
}

export function CheckboxWithTitle() {
  return (
    <Example title="With Title">
      <FieldGroup>
        <FieldLabel htmlFor="toggle-2">
          <Field orientation="horizontal">
            <Checkbox id="toggle-2" defaultChecked />
            <FieldContent>
              <FieldTitle>Enable notifications</FieldTitle>
              <FieldDescription>
                You can enable or disable notifications at any time.
              </FieldDescription>
            </FieldContent>
          </Field>
        </FieldLabel>
        <FieldLabel htmlFor="toggle-4">
          <Field orientation="horizontal" data-disabled>
            <Checkbox id="toggle-4" disabled />
            <FieldContent>
              <FieldTitle>Enable notifications</FieldTitle>
              <FieldDescription>
                You can enable or disable notifications at any time.
              </FieldDescription>
            </FieldContent>
          </Field>
        </FieldLabel>
      </FieldGroup>
    </Example>
  )
}

const tableData = [
  {
    id: "1",
    name: "Sarah Chen",
    email: "sarah.chen@example.com",
    role: "Admin",
  },
  {
    id: "2",
    name: "Marcus Rodriguez",
    email: "marcus.rodriguez@example.com",
    role: "User",
  },
  {
    id: "3",
    name: "Priya Patel",
    email: "priya.patel@example.com",
    role: "User",
  },
  {
    id: "4",
    name: "David Kim",
    email: "david.kim@example.com",
    role: "Editor",
  },
]

export function CheckboxInTable() {
  const [selectedRows, setSelectedRows] = React.useState<Set<string>>(
    new Set(["1"])
  )

  const selectAll = selectedRows.size === tableData.length

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRows(new Set(tableData.map((row) => row.id)))
    } else {
      setSelectedRows(new Set())
    }
  }

  const handleSelectRow = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedRows)
    if (checked) {
      newSelected.add(id)
    } else {
      newSelected.delete(id)
    }
    setSelectedRows(newSelected)
  }

  return (
    <Example title="In Table">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8">
              <Checkbox
                id="select-all"
                checked={selectAll}
                onCheckedChange={handleSelectAll}
              />
            </TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tableData.map((row) => (
            <TableRow
              key={row.id}
              data-state={selectedRows.has(row.id) ? "selected" : undefined}
            >
              <TableCell>
                <Checkbox
                  id={`row-${row.id}`}
                  checked={selectedRows.has(row.id)}
                  onCheckedChange={(checked) =>
                    handleSelectRow(row.id, checked === true)
                  }
                />
              </TableCell>
              <TableCell className="font-medium">{row.name}</TableCell>
              <TableCell>{row.email}</TableCell>
              <TableCell>{row.role}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Example>
  )
}

function CheckboxGroup() {
  return (
    <Example title="Group">
      <Field>
        <FieldLabel>Show these items on the desktop:</FieldLabel>
        <Field orientation="horizontal">
          <Checkbox id="finder-pref-9k2-hard-disks-ljj" />
          <FieldLabel
            htmlFor="finder-pref-9k2-hard-disks-ljj"
            className="font-normal"
          >
            Hard disks
          </FieldLabel>
        </Field>
        <Field orientation="horizontal">
          <Checkbox id="finder-pref-9k2-external-disks-1yg" />
          <FieldLabel
            htmlFor="finder-pref-9k2-external-disks-1yg"
            className="font-normal"
          >
            External disks
          </FieldLabel>
        </Field>
        <Field orientation="horizontal">
          <Checkbox id="finder-pref-9k2-cds-dvds-fzt" />
          <FieldLabel
            htmlFor="finder-pref-9k2-cds-dvds-fzt"
            className="font-normal"
          >
            CDs, DVDs, and iPods
          </FieldLabel>
        </Field>
        <Field orientation="horizontal">
          <Checkbox id="finder-pref-9k2-connected-servers-6l2" />
          <FieldLabel
            htmlFor="finder-pref-9k2-connected-servers-6l2"
            className="font-normal"
          >
            Connected servers
          </FieldLabel>
        </Field>
      </Field>
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
