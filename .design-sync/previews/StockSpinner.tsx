/* Ported by .design-sync/ds/port-examples.mjs from
   src/components/stock/examples/spinner-example.tsx — the shadcn registry's own demo,
   vendored by `npm run ds:stock`. Imports are aliased onto the bundle's
   Stock* exports; the JSX is the registry's, unchanged.
   Cells: SpinnerBasic, SpinnerInButtons, SpinnerInBadges, SpinnerInInputGroup, SpinnerInEmpty */

import { StockBadge as Badge } from "westchase-gi";
import { StockButton as Button } from "westchase-gi";
import { StockEmpty as Empty, StockEmptyContent as EmptyContent, StockEmptyDescription as EmptyDescription, StockEmptyHeader as EmptyHeader, StockEmptyMedia as EmptyMedia, StockEmptyTitle as EmptyTitle } from "westchase-gi";
import { StockField as Field, StockFieldLabel as FieldLabel } from "westchase-gi";
import { StockInputGroup as InputGroup, StockInputGroupAddon as InputGroupAddon, StockInputGroupInput as InputGroupInput } from "westchase-gi";
import { StockSpinner as Spinner } from "westchase-gi";
import { ArrowRightIcon } from "lucide-react"


export function SpinnerBasic() {
  return (
    <Example title="Basic">
      <div className="flex items-center gap-6">
        <Spinner />
        <Spinner className="size-6" />
      </div>
    </Example>
  )
}

export function SpinnerInButtons() {
  return (
    <Example title="In Buttons">
      <div className="flex flex-wrap items-center gap-4">
        <Button>
          <Spinner data-icon="inline-start" /> Submit
        </Button>
        <Button disabled>
          <Spinner data-icon="inline-start" /> Disabled
        </Button>
        <Button variant="outline" disabled>
          <Spinner data-icon="inline-start" /> Outline
        </Button>
        <Button variant="outline" size="icon" disabled>
          <Spinner data-icon="inline-start" />
          <span className="sr-only">Loading...</span>
        </Button>
      </div>
    </Example>
  )
}

export function SpinnerInBadges() {
  return (
    <Example title="In Badges" className="items-center justify-center">
      <div className="flex flex-wrap items-center justify-center gap-4">
        <Badge>
          <Spinner data-icon="inline-start" />
          Badge
        </Badge>
        <Badge variant="secondary">
          <Spinner data-icon="inline-start" />
          Badge
        </Badge>
        <Badge variant="destructive">
          <Spinner data-icon="inline-start" />
          Badge
        </Badge>
        <Badge variant="outline">
          <Spinner data-icon="inline-start" />
          Badge
        </Badge>
      </div>
    </Example>
  )
}

export function SpinnerInInputGroup() {
  return (
    <Example title="In Input Group">
      <Field>
        <FieldLabel htmlFor="input-group-spinner">Input Group</FieldLabel>
        <InputGroup>
          <InputGroupInput id="input-group-spinner" />
          <InputGroupAddon>
            <Spinner />
          </InputGroupAddon>
        </InputGroup>
      </Field>
    </Example>
  )
}

export function SpinnerInEmpty() {
  return (
    <Example title="In Empty State" containerClassName="lg:col-span-full">
      <Empty className="min-h-[300px]">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Spinner />
          </EmptyMedia>
          <EmptyTitle>No projects yet</EmptyTitle>
          <EmptyDescription>
            You haven&apos;t created any projects yet. Get started by creating
            your first project.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <div className="flex gap-2">
            <Button render={<a href="#" />} nativeButton={false}>
              Create project
            </Button>
            <Button variant="outline">Import project</Button>
          </div>
          <Button
            variant="link"
            render={<a href="#" />}
            nativeButton={false}
            className="text-muted-foreground"
          >
            Learn more{" "}
            <ArrowRightIcon
            />
          </Button>
        </EmptyContent>
      </Empty>
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
