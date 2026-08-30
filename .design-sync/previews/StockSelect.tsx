/* Ported by .design-sync/ds/port-examples.mjs from
   src/components/stock/examples/select-example.tsx — the shadcn registry's own demo,
   vendored by `npm run ds:stock`. Imports are aliased onto the bundle's
   Stock* exports; the JSX is the registry's, unchanged.
   Cells: SelectBasic, SelectSides, SelectWithIcons, SelectWithGroups, SelectLargeList, SelectMultiple (+9 not shown) */

"use client"


import { StockButton as Button } from "westchase-gi";
import { StockDialog as Dialog, StockDialogContent as DialogContent, StockDialogDescription as DialogDescription, StockDialogHeader as DialogHeader, StockDialogTitle as DialogTitle, StockDialogTrigger as DialogTrigger } from "westchase-gi";
import { StockField as Field, StockFieldDescription as FieldDescription, StockFieldError as FieldError, StockFieldLabel as FieldLabel } from "westchase-gi";
import { StockInput as Input } from "westchase-gi";
import { StockItem as Item, StockItemContent as ItemContent, StockItemDescription as ItemDescription, StockItemTitle as ItemTitle } from "westchase-gi";
import { StockNativeSelect as NativeSelect, StockNativeSelectOption as NativeSelectOption } from "westchase-gi";
import { StockSelect as Select, StockSelectContent as SelectContent, StockSelectGroup as SelectGroup, StockSelectItem as SelectItem, StockSelectLabel as SelectLabel, StockSelectSeparator as SelectSeparator, StockSelectTrigger as SelectTrigger, StockSelectValue as SelectValue } from "westchase-gi";
import { ChartLineIcon, ChartBarIcon, ChartPieIcon } from "lucide-react"


export function SelectBasic() {
  const items = [
    { label: "Select a fruit", value: null },
    { label: "Apple", value: "apple" },
    { label: "Banana", value: "banana" },
    { label: "Blueberry", value: "blueberry" },
    { label: "Grapes", value: "grapes" },
    { label: "Pineapple", value: "pineapple" },
  ]
  return (
    <Example title="Basic">
      <Select defaultOpen items={items}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {items.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </Example>
  )
}

export function SelectSides() {
  const items = [
    { label: "Select", value: null },
    { label: "Apple", value: "apple" },
    { label: "Banana", value: "banana" },
    { label: "Blueberry", value: "blueberry" },
  ]
  return (
    <Example title="Sides" containerClassName="col-span-2">
      <div className="flex flex-wrap justify-center gap-2">
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
          <Select key={side} items={items}>
            <SelectTrigger className="w-28 capitalize">
              <SelectValue placeholder={side.replace("-", " ")} />
            </SelectTrigger>
            <SelectContent side={side} alignItemWithTrigger={false}>
              <SelectGroup>
                {items.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        ))}
      </div>
    </Example>
  )
}

export function SelectWithIcons() {
  const items = [
    {
      label: (
        <>
          <ChartLineIcon
          />
          Chart Type
        </>
      ),
      value: null,
    },
    {
      label: (
        <>
          <ChartLineIcon
          />
          Line
        </>
      ),
      value: "line",
    },
    {
      label: (
        <>
          <ChartBarIcon
          />
          Bar
        </>
      ),
      value: "bar",
    },
    {
      label: (
        <>
          <ChartPieIcon
          />
          Pie
        </>
      ),
      value: "pie",
    },
  ]
  return (
    <Example title="With Icons">
      <div className="flex flex-col gap-4">
        <Select items={items}>
          <SelectTrigger size="sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {items.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        <Select items={items}>
          <SelectTrigger size="default">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {items.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
    </Example>
  )
}

export function SelectWithGroups() {
  const fruits = [
    { label: "Apple", value: "apple" },
    { label: "Banana", value: "banana" },
    { label: "Blueberry", value: "blueberry" },
  ]
  const vegetables = [
    { label: "Carrot", value: "carrot" },
    { label: "Broccoli", value: "broccoli" },
    { label: "Spinach", value: "spinach" },
  ]
  const allItems = [
    { label: "Select a fruit", value: null },
    ...fruits,
    ...vegetables,
  ]
  return (
    <Example title="With Groups & Labels">
      <Select items={allItems}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>Fruits</SelectLabel>
            {fruits.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectGroup>
          <SelectSeparator />
          <SelectGroup>
            <SelectLabel>Vegetables</SelectLabel>
            {vegetables.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </Example>
  )
}

export function SelectLargeList() {
  const items = [
    { label: "Select an item", value: null },
    ...Array.from({ length: 100 }).map((_, i) => ({
      label: `Item ${i}`,
      value: `item-${i}`,
    })),
  ]
  return (
    <Example title="Large List">
      <Select items={items}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {items.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </Example>
  )
}

function SelectSizes() {
  const items = [
    { label: "Select a fruit", value: null },
    { label: "Apple", value: "apple" },
    { label: "Banana", value: "banana" },
    { label: "Blueberry", value: "blueberry" },
  ]
  return (
    <Example title="Sizes">
      <div className="flex flex-col gap-4">
        <Select items={items}>
          <SelectTrigger size="sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {items.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        <Select items={items}>
          <SelectTrigger size="default">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {items.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
    </Example>
  )
}

function SelectWithButton() {
  const items = [
    { label: "Select a fruit", value: null },
    { label: "Apple", value: "apple" },
    { label: "Banana", value: "banana" },
    { label: "Blueberry", value: "blueberry" },
  ]
  return (
    <Example title="With Button">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Select items={items}>
            <SelectTrigger size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {items.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm">
            Submit
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Select items={items}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {items.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <Button variant="outline">Submit</Button>
        </div>
      </div>
    </Example>
  )
}

function SelectItemAligned() {
  const items = [
    { label: "Select a fruit", value: null },
    { label: "Apple", value: "apple" },
    { label: "Banana", value: "banana" },
    { label: "Blueberry", value: "blueberry" },
    { label: "Grapes", value: "grapes", disabled: true },
    { label: "Pineapple", value: "pineapple" },
  ]
  return (
    <Example title="Item Aligned">
      <Select items={items}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent alignItemWithTrigger={true}>
          <SelectGroup>
            {items.map((item) => (
              <SelectItem
                key={item.value}
                value={item.value}
                disabled={item.disabled}
              >
                {item.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </Example>
  )
}

function SelectWithField() {
  const items = [
    { label: "Select a fruit", value: null },
    { label: "Apple", value: "apple" },
    { label: "Banana", value: "banana" },
    { label: "Blueberry", value: "blueberry" },
    { label: "Grapes", value: "grapes" },
    { label: "Pineapple", value: "pineapple" },
  ]
  return (
    <Example title="With Field">
      <Field>
        <FieldLabel htmlFor="select-fruit">Favorite Fruit</FieldLabel>
        <Select items={items}>
          <SelectTrigger id="select-fruit">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {items.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        <FieldDescription>
          Choose your favorite fruit from the list.
        </FieldDescription>
      </Field>
    </Example>
  )
}

function SelectInvalid() {
  const items = [
    { label: "Select a fruit", value: null },
    { label: "Apple", value: "apple" },
    { label: "Banana", value: "banana" },
    { label: "Blueberry", value: "blueberry" },
    { label: "Grapes", value: "grapes" },
    { label: "Pineapple", value: "pineapple" },
  ]
  return (
    <Example title="Invalid">
      <div className="flex flex-col gap-4">
        <Select items={items}>
          <SelectTrigger aria-invalid="true">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {items.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        <Field data-invalid>
          <FieldLabel htmlFor="select-fruit-invalid">Favorite Fruit</FieldLabel>
          <Select items={items}>
            <SelectTrigger id="select-fruit-invalid" aria-invalid>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {items.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <FieldError errors={[{ message: "Please select a valid fruit." }]} />
        </Field>
      </div>
    </Example>
  )
}

function SelectInline() {
  const items = [
    { label: "Filter", value: null },
    { label: "All", value: "all" },
    { label: "Active", value: "active" },
    { label: "Inactive", value: "inactive" },
  ]
  return (
    <Example title="Inline with Input & NativeSelect">
      <div className="flex items-center gap-2">
        <Input placeholder="Search..." className="flex-1" />
        <Select items={items}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {items.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        <NativeSelect className="w-[140px]">
          <NativeSelectOption value="">Sort by</NativeSelectOption>
          <NativeSelectOption value="name">Name</NativeSelectOption>
          <NativeSelectOption value="date">Date</NativeSelectOption>
          <NativeSelectOption value="status">Status</NativeSelectOption>
        </NativeSelect>
      </div>
    </Example>
  )
}

function SelectDisabled() {
  const items = [
    { label: "Select a fruit", value: null },
    { label: "Apple", value: "apple" },
    { label: "Banana", value: "banana" },
    { label: "Blueberry", value: "blueberry" },
    { label: "Grapes", value: "grapes", disabled: true },
    { label: "Pineapple", value: "pineapple" },
  ]
  return (
    <Example title="Disabled">
      <Select items={items} disabled>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {items.map((item) => (
              <SelectItem
                key={item.value}
                value={item.value}
                disabled={item.disabled}
              >
                {item.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </Example>
  )
}

const plans = [
  {
    name: "Starter",
    description: "Perfect for individuals getting started.",
  },
  {
    name: "Professional",
    description: "Ideal for growing teams and businesses.",
  },
  {
    name: "Enterprise",
    description: "Advanced features for large organizations.",
  },
]

function SelectPlan() {
  return (
    <Example title="Subscription Plan">
      <Select
        defaultValue={plans[0]}
        itemToStringValue={(plan: (typeof plans)[number]) => plan.name}
      >
        <SelectTrigger className="h-auto! w-72">
          <SelectValue>
            {(value: (typeof plans)[number]) => <SelectPlanItem plan={value} />}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {plans.map((plan) => (
              <SelectItem key={plan.name} value={plan}>
                <SelectPlanItem plan={plan} />
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </Example>
  )
}

function SelectPlanItem({ plan }: { plan: (typeof plans)[number] }) {
  return (
    <Item size="xs" className="w-full p-0">
      <ItemContent className="gap-0 normal-case">
        <ItemTitle className="font-sans">{plan.name}</ItemTitle>
        <ItemDescription className="text-xs font-normal tracking-normal">
          {plan.description}
        </ItemDescription>
      </ItemContent>
    </Item>
  )
}

export function SelectMultiple() {
  const items = [
    { label: "Apple", value: "apple" },
    { label: "Banana", value: "banana" },
    { label: "Blueberry", value: "blueberry" },
    { label: "Grapes", value: "grapes" },
    { label: "Pineapple", value: "pineapple" },
    { label: "Strawberry", value: "strawberry" },
    { label: "Watermelon", value: "watermelon" },
  ]
  return (
    <Example title="Multiple Selection">
      <Select items={items} multiple defaultValue={[]}>
        <SelectTrigger className="w-72">
          <SelectValue>
            {(value: string[]) => {
              if (value.length === 0) {
                return "Select fruits"
              }
              if (value.length === 1) {
                return items.find((item) => item.value === value[0])?.label
              }
              return `${value.length} fruits selected`
            }}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {items.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </Example>
  )
}

function SelectInDialog() {
  const items = [
    { label: "Select a fruit", value: null },
    { label: "Apple", value: "apple" },
    { label: "Banana", value: "banana" },
    { label: "Blueberry", value: "blueberry" },
    { label: "Grapes", value: "grapes" },
    { label: "Pineapple", value: "pineapple" },
  ]
  return (
    <Example title="In Dialog">
      <Dialog>
        <DialogTrigger render={<Button variant="outline" />}>
          Open Dialog
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Select Example</DialogTitle>
            <DialogDescription>
              Use the select below to choose a fruit.
            </DialogDescription>
          </DialogHeader>
          <Select items={items}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {items.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
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
