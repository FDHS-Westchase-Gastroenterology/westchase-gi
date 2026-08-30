/* Ported by .design-sync/ds/port-examples.mjs from
   src/components/stock/examples/table-example.tsx — the shadcn registry's own demo,
   vendored by `npm run ds:stock`. Imports are aliased onto the bundle's
   Stock* exports; the JSX is the registry's, unchanged.
   Cells: TableBasic, TableWithFooter, TableSimple, TableWithBadges, TableWithActions, TableWithSelect (+1 not shown) */

"use client"


import { StockButton as Button } from "westchase-gi";
import { StockDropdownMenu as DropdownMenu, StockDropdownMenuContent as DropdownMenuContent, StockDropdownMenuItem as DropdownMenuItem, StockDropdownMenuSeparator as DropdownMenuSeparator, StockDropdownMenuTrigger as DropdownMenuTrigger } from "westchase-gi";
import { StockInput as Input } from "westchase-gi";
import { StockSelect as Select, StockSelectContent as SelectContent, StockSelectGroup as SelectGroup, StockSelectItem as SelectItem, StockSelectTrigger as SelectTrigger, StockSelectValue as SelectValue } from "westchase-gi";
import { StockTable as Table, StockTableBody as TableBody, StockTableCaption as TableCaption, StockTableCell as TableCell, StockTableFooter as TableFooter, StockTableHead as TableHead, StockTableHeader as TableHeader, StockTableRow as TableRow } from "westchase-gi";
import { MoreHorizontalIcon } from "lucide-react"

const invoices = [
  {
    invoice: "INV001",
    paymentStatus: "Paid",
    totalAmount: "$250.00",
    paymentMethod: "Credit Card",
  },
  {
    invoice: "INV002",
    paymentStatus: "Pending",
    totalAmount: "$150.00",
    paymentMethod: "PayPal",
  },
  {
    invoice: "INV003",
    paymentStatus: "Unpaid",
    totalAmount: "$350.00",
    paymentMethod: "Bank Transfer",
  },
  {
    invoice: "INV004",
    paymentStatus: "Paid",
    totalAmount: "$450.00",
    paymentMethod: "Credit Card",
  },
  {
    invoice: "INV005",
    paymentStatus: "Paid",
    totalAmount: "$550.00",
    paymentMethod: "PayPal",
  },
  {
    invoice: "INV006",
    paymentStatus: "Pending",
    totalAmount: "$200.00",
    paymentMethod: "Bank Transfer",
  },
  {
    invoice: "INV007",
    paymentStatus: "Unpaid",
    totalAmount: "$300.00",
    paymentMethod: "Credit Card",
  },
]


export function TableBasic() {
  return (
    <Example title="Basic">
      <Table>
        <TableCaption>A list of your recent invoices.</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">Invoice</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Method</TableHead>
            <TableHead className="text-right">Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invoices.slice(0, 3).map((invoice) => (
            <TableRow key={invoice.invoice}>
              <TableCell className="font-medium">{invoice.invoice}</TableCell>
              <TableCell>{invoice.paymentStatus}</TableCell>
              <TableCell>{invoice.paymentMethod}</TableCell>
              <TableCell className="text-right">
                {invoice.totalAmount}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Example>
  )
}

export function TableWithFooter() {
  return (
    <Example title="With Footer">
      <Table>
        <TableCaption>A list of your recent invoices.</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">Invoice</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Method</TableHead>
            <TableHead className="text-right">Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invoices.slice(0, 3).map((invoice) => (
            <TableRow key={invoice.invoice}>
              <TableCell className="font-medium">{invoice.invoice}</TableCell>
              <TableCell>{invoice.paymentStatus}</TableCell>
              <TableCell>{invoice.paymentMethod}</TableCell>
              <TableCell className="text-right">
                {invoice.totalAmount}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell colSpan={3}>Total</TableCell>
            <TableCell className="text-right">$2,500.00</TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </Example>
  )
}

export function TableSimple() {
  return (
    <Example title="Simple">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead className="text-right">Role</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell className="font-medium">Sarah Chen</TableCell>
            <TableCell>sarah.chen@acme.com</TableCell>
            <TableCell className="text-right">Admin</TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="font-medium">Marc Rodriguez</TableCell>
            <TableCell>marcus.rodriguez@acme.com</TableCell>
            <TableCell className="text-right">User</TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="font-medium">Emily Watson</TableCell>
            <TableCell>emily.watson@acme.com</TableCell>
            <TableCell className="text-right">User</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </Example>
  )
}

export function TableWithBadges() {
  return (
    <Example title="With Badges">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Task</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Priority</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell className="font-medium">Design homepage</TableCell>
            <TableCell>
              <span className="inline-flex items-center rounded-full bg-green-500/10 px-2 py-1 text-xs font-medium text-green-700 dark:text-green-400">
                Completed
              </span>
            </TableCell>
            <TableCell className="text-right">
              <span className="inline-flex items-center rounded-full bg-blue-500/10 px-2 py-1 text-xs font-medium text-blue-700 dark:text-blue-400">
                High
              </span>
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="font-medium">Implement API</TableCell>
            <TableCell>
              <span className="inline-flex items-center rounded-full bg-yellow-500/10 px-2 py-1 text-xs font-medium text-yellow-700 dark:text-yellow-400">
                In Progress
              </span>
            </TableCell>
            <TableCell className="text-right">
              <span className="inline-flex items-center rounded-full bg-gray-500/10 px-2 py-1 text-xs font-medium text-gray-700 dark:text-gray-400">
                Medium
              </span>
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="font-medium">Write tests</TableCell>
            <TableCell>
              <span className="inline-flex items-center rounded-full bg-gray-500/10 px-2 py-1 text-xs font-medium text-gray-700 dark:text-gray-400">
                Pending
              </span>
            </TableCell>
            <TableCell className="text-right">
              <span className="inline-flex items-center rounded-full bg-gray-500/10 px-2 py-1 text-xs font-medium text-gray-700 dark:text-gray-400">
                Low
              </span>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </Example>
  )
}

export function TableWithActions() {
  return (
    <Example title="With Actions">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Product</TableHead>
            <TableHead>Price</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell className="font-medium">Wireless Mouse</TableCell>
            <TableCell>$29.99</TableCell>
            <TableCell className="text-right">
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button variant="ghost" size="icon" className="size-8" />
                  }
                >
                  <MoreHorizontalIcon
                  />
                  <span className="sr-only">Open menu</span>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>Edit</DropdownMenuItem>
                  <DropdownMenuItem>Duplicate</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive">
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="font-medium">Mechanical Keyboard</TableCell>
            <TableCell>$129.99</TableCell>
            <TableCell className="text-right">
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button variant="ghost" size="icon" className="size-8" />
                  }
                >
                  <MoreHorizontalIcon
                  />
                  <span className="sr-only">Open menu</span>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>Edit</DropdownMenuItem>
                  <DropdownMenuItem>Duplicate</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive">
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="font-medium">USB-C Hub</TableCell>
            <TableCell>$49.99</TableCell>
            <TableCell className="text-right">
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button variant="ghost" size="icon" className="size-8" />
                  }
                >
                  <MoreHorizontalIcon
                  />
                  <span className="sr-only">Open menu</span>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>Edit</DropdownMenuItem>
                  <DropdownMenuItem>Duplicate</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive">
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </Example>
  )
}

const people = [
  { value: "sarah", label: "Sarah Chen" },
  { value: "marcus", label: "Marc Rodriguez" },
  { value: "emily", label: "Emily Watson" },
  { value: "david", label: "David Kim" },
]

const tasks = [
  {
    task: "Design homepage",
    assignee: "sarah",
    status: "In Progress",
  },
  {
    task: "Implement API",
    assignee: "marcus",
    status: "Pending",
  },
  {
    task: "Write tests",
    assignee: "emily",
    status: "Not Started",
  },
]

export function TableWithSelect() {
  return (
    <Example title="With Select">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Task</TableHead>
            <TableHead>Assignee</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tasks.map((item) => (
            <TableRow key={item.task}>
              <TableCell className="font-medium">{item.task}</TableCell>
              <TableCell>
                <Select
                  items={people}
                  defaultValue={people.find(
                    (person) => person.value === item.assignee
                  )}
                  itemToStringValue={(item) => {
                    return item.value
                  }}
                >
                  <SelectTrigger className="w-40" size="sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {people.map((person) => (
                        <SelectItem key={person.value} value={person}>
                          {person.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell>{item.status}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Example>
  )
}

function TableWithInput() {
  return (
    <Example title="With Input">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Product</TableHead>
            <TableHead>Quantity</TableHead>
            <TableHead>Price</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell className="font-medium">Wireless Mouse</TableCell>
            <TableCell>
              <Input
                type="number"
                defaultValue="1"
                className="h-8 w-20"
                min="0"
              />
            </TableCell>
            <TableCell>$29.99</TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="font-medium">Mechanical Keyboard</TableCell>
            <TableCell>
              <Input
                type="number"
                defaultValue="2"
                className="h-8 w-20"
                min="0"
              />
            </TableCell>
            <TableCell>$129.99</TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="font-medium">USB-C Hub</TableCell>
            <TableCell>
              <Input
                type="number"
                defaultValue="1"
                className="h-8 w-20"
                min="0"
              />
            </TableCell>
            <TableCell>$49.99</TableCell>
          </TableRow>
        </TableBody>
      </Table>
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
