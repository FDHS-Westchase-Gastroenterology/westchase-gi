/* Ported by .design-sync/ds/port-examples.mjs from
   src/components/stock/examples/skeleton-example.tsx — the shadcn registry's own demo,
   vendored by `npm run ds:stock`. Imports are aliased onto the bundle's
   Stock* exports; the JSX is the registry's, unchanged.
   Cells: SkeletonAvatar, SkeletonCard, SkeletonText, SkeletonForm, SkeletonTable */

import { StockCard as Card, StockCardContent as CardContent, StockCardHeader as CardHeader } from "westchase-gi";
import { StockSkeleton as Skeleton } from "westchase-gi";


export function SkeletonAvatar() {
  return (
    <Example title="Avatar">
      <div className="flex w-full items-center gap-4">
        <Skeleton className="size-10 shrink-0 rounded-full" />
        <div className="grid gap-2">
          <Skeleton className="h-4 w-[150px]" />
          <Skeleton className="h-4 w-[100px]" />
        </div>
      </div>
    </Example>
  )
}

export function SkeletonCard() {
  return (
    <Example title="Card">
      <Card className="w-full">
        <CardHeader>
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="aspect-square w-full" />
        </CardContent>
      </Card>
    </Example>
  )
}

export function SkeletonText() {
  return (
    <Example title="Text">
      <div className="flex w-full flex-col gap-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    </Example>
  )
}

export function SkeletonForm() {
  return (
    <Example title="Form">
      <div className="flex w-full flex-col gap-7">
        <div className="flex flex-col gap-3">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="flex flex-col gap-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full" />
        </div>
        <Skeleton className="h-9 w-24" />
      </div>
    </Example>
  )
}

export function SkeletonTable() {
  return (
    <Example title="Table">
      <div className="flex w-full flex-col gap-2">
        <div className="flex gap-4">
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-20" />
        </div>
        <div className="flex gap-4">
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-20" />
        </div>
        <div className="flex gap-4">
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-20" />
        </div>
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
