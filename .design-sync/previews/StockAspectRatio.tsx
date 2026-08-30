/* Ported by .design-sync/ds/port-examples.mjs from
   src/components/stock/examples/aspect-ratio-example.tsx — the shadcn registry's own demo,
   vendored by `npm run ds:stock`. Imports are aliased onto the bundle's
   Stock* exports; the JSX is the registry's, unchanged.
   Cells: AspectRatio16x9, AspectRatio21x9, AspectRatio1x1, AspectRatio9x16 */

import Image from "next/image"


import { StockAspectRatio as AspectRatio } from "westchase-gi";


export function AspectRatio16x9() {
  return (
    <Example title="16:9" className="items-center justify-center">
      <AspectRatio
        ratio={16 / 9}
        className="rounded-lg bg-muted style-luma:rounded-3xl"
      >
        <Image
          src="https://avatar.vercel.sh/shadcn1"
          alt="Photo"
          fill
          className="h-full w-full rounded-lg object-cover grayscale dark:brightness-20 style-luma:rounded-3xl"
        />
      </AspectRatio>
    </Example>
  )
}

export function AspectRatio1x1() {
  return (
    <Example title="1:1" className="items-start">
      <AspectRatio
        ratio={1 / 1}
        className="rounded-lg bg-muted style-luma:rounded-3xl"
      >
        <Image
          src="https://avatar.vercel.sh/shadcn1"
          alt="Photo"
          fill
          className="h-full w-full rounded-lg object-cover grayscale dark:brightness-20 style-luma:rounded-3xl"
        />
      </AspectRatio>
    </Example>
  )
}

export function AspectRatio9x16() {
  return (
    <Example title="9:16" className="items-center justify-center">
      <AspectRatio
        ratio={9 / 16}
        className="rounded-lg bg-muted style-luma:rounded-3xl"
      >
        <Image
          src="https://avatar.vercel.sh/shadcn1"
          alt="Photo"
          fill
          className="h-full w-full rounded-lg object-cover grayscale dark:brightness-20 style-luma:rounded-3xl"
        />
      </AspectRatio>
    </Example>
  )
}

export function AspectRatio21x9() {
  return (
    <Example title="21:9" className="items-center justify-center">
      <AspectRatio
        ratio={21 / 9}
        className="rounded-lg bg-muted style-luma:rounded-3xl"
      >
        <Image
          src="https://avatar.vercel.sh/shadcn1"
          alt="Photo"
          fill
          className="h-full w-full rounded-lg object-cover grayscale dark:brightness-20 style-luma:rounded-3xl"
        />
      </AspectRatio>
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
