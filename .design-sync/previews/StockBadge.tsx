/* Ported by .design-sync/ds/port-examples.mjs from
   src/components/stock/examples/badge-example.tsx — the shadcn registry's own demo,
   vendored by `npm run ds:stock`. Imports are aliased onto the bundle's
   Stock* exports; the JSX is the registry's, unchanged.
   Cells: BadgeVariants, BadgeWithIconLeft, BadgeWithIconRight, BadgeWithSpinner, BadgeAsLink, BadgeLongText (+1 not shown) */

import { StockBadge as Badge } from "westchase-gi";
import { StockSpinner as Spinner } from "westchase-gi";
import { BadgeCheck, ArrowRightIcon, ArrowUpRightIcon } from "lucide-react"


export function BadgeVariants() {
  return (
    <Example title="Variants">
      <div className="flex flex-wrap gap-2 style-sera:gap-6">
        <Badge>Default</Badge>
        <Badge variant="secondary">Secondary</Badge>
        <Badge variant="destructive">Destructive</Badge>
        <Badge variant="outline">Outline</Badge>
        <Badge variant="ghost">Ghost</Badge>
        <Badge variant="link">Link</Badge>
      </div>
    </Example>
  )
}

export function BadgeWithIconLeft() {
  return (
    <Example title="Icon Left" className="max-w-fit">
      <div className="flex flex-wrap gap-2 style-sera:gap-6">
        <Badge>
          <BadgeCheck data-icon="inline-start" />
          Default
        </Badge>
        <Badge variant="secondary">
          <BadgeCheck data-icon="inline-start" />
          Secondary
        </Badge>
        <Badge variant="destructive">
          <BadgeCheck data-icon="inline-start" />
          Destructive
        </Badge>
        <Badge variant="outline">
          <BadgeCheck data-icon="inline-start" />
          Outline
        </Badge>
        <Badge variant="ghost">
          <BadgeCheck data-icon="inline-start" />
          Ghost
        </Badge>
        <Badge variant="link">
          <BadgeCheck data-icon="inline-start" />
          Link
        </Badge>
      </div>
    </Example>
  )
}

export function BadgeWithIconRight() {
  return (
    <Example title="Icon Right" className="max-w-fit">
      <div className="flex flex-wrap gap-2 style-sera:gap-6">
        <Badge>
          Default
          <ArrowRightIcon data-icon="inline-end" />
        </Badge>
        <Badge variant="secondary">
          Secondary
          <ArrowRightIcon data-icon="inline-end" />
        </Badge>
        <Badge variant="destructive">
          Destructive
          <ArrowRightIcon data-icon="inline-end" />
        </Badge>
        <Badge variant="outline">
          Outline
          <ArrowRightIcon data-icon="inline-end" />
        </Badge>
        <Badge variant="ghost">
          Ghost
          <ArrowRightIcon data-icon="inline-end" />
        </Badge>
        <Badge variant="link">
          Link
          <ArrowRightIcon data-icon="inline-end" />
        </Badge>
      </div>
    </Example>
  )
}

export function BadgeWithSpinner() {
  return (
    <Example title="With Spinner" className="max-w-fit">
      <div className="flex flex-wrap gap-2 style-sera:gap-6">
        <Badge>
          <Spinner data-icon="inline-start" />
          Default
        </Badge>
        <Badge variant="secondary">
          <Spinner data-icon="inline-start" />
          Secondary
        </Badge>
        <Badge variant="destructive">
          <Spinner data-icon="inline-start" />
          Destructive
        </Badge>
        <Badge variant="outline">
          <Spinner data-icon="inline-start" />
          Outline
        </Badge>
        <Badge variant="ghost">
          <Spinner data-icon="inline-start" />
          Ghost
        </Badge>
        <Badge variant="link">
          <Spinner data-icon="inline-start" />
          Link
        </Badge>
      </div>
    </Example>
  )
}

export function BadgeAsLink() {
  return (
    <Example title="asChild">
      <div className="flex flex-wrap gap-2 style-sera:gap-6">
        <Badge
          render={
            <a href="#">
              Link{" "}
              <ArrowUpRightIcon data-icon="inline-end" />
            </a>
          }
        />
        <Badge
          variant="secondary"
          render={
            <a href="#">
              Link{" "}
              <ArrowUpRightIcon data-icon="inline-end" />
            </a>
          }
        />
        <Badge
          variant="destructive"
          render={
            <a href="#">
              Link{" "}
              <ArrowUpRightIcon data-icon="inline-end" />
            </a>
          }
        />
        <Badge
          variant="ghost"
          render={
            <a href="#">
              Link{" "}
              <ArrowUpRightIcon data-icon="inline-end" />
            </a>
          }
        />
      </div>
    </Example>
  )
}

export function BadgeLongText() {
  return (
    <Example title="Long Text">
      <div className="flex flex-wrap gap-2 style-sera:gap-6">
        <Badge variant="secondary">
          A badge with a lot of text to see how it wraps
        </Badge>
      </div>
    </Example>
  )
}

function BadgeCustomColors() {
  return (
    <Example title="Custom Colors" className="max-w-fit">
      <div className="flex flex-wrap gap-2 style-sera:gap-6">
        <Badge className="bg-blue-600 text-blue-50 dark:bg-blue-600 dark:text-blue-50">
          Blue
        </Badge>
        <Badge className="bg-green-600 text-green-50 dark:bg-green-600 dark:text-green-50">
          Green
        </Badge>
        <Badge className="bg-sky-600 text-sky-50 dark:bg-sky-600 dark:text-sky-50">
          Sky
        </Badge>
        <Badge className="bg-purple-600 text-purple-50 dark:bg-purple-600 dark:text-purple-50">
          Purple
        </Badge>
        <Badge className="bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
          Blue
        </Badge>
        <Badge className="bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300">
          Green
        </Badge>
        <Badge className="bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300">
          Sky
        </Badge>
        <Badge className="bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300">
          Purple
        </Badge>
        <Badge className="bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300">
          Red
        </Badge>
      </div>
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
