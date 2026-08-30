/* Ported by .design-sync/ds/port-examples.mjs from
   src/components/stock/examples/toast-example.tsx — the shadcn registry's own demo,
   vendored by `npm run ds:stock`. Imports are aliased onto the bundle's
   Stock* exports; the JSX is the registry's, unchanged.
   Cells: ToastBasic, ToastWithAction, ToastPromise */

"use client"


import { StockButton as Button } from "westchase-gi";
import { stockToast as toast } from "westchase-gi";


export function ToastBasic() {
  return (
    <Example title="Basic" className="items-center justify-center">
      <Button
        variant="outline"
        className="w-fit"
        onClick={() =>
          toast.add({
            title: "Event created",
            description: "Sunday, December 3 at 9:00 AM",
          })
        }
      >
        Show Toast
      </Button>
    </Example>
  )
}

export function ToastWithAction() {
  function showToast() {
    const id = toast.add({
      title: "Event created",
      description: "You can undo this action.",
      actionProps: {
        children: "Undo",
        onClick() {
          toast.close(id)
          toast.add({
            description: "Event creation undone.",
          })
        },
      },
    })
  }

  return (
    <Example title="With Action" className="items-center justify-center">
      <Button variant="outline" className="w-fit" onClick={showToast}>
        Show Toast
      </Button>
    </Example>
  )
}

export function ToastPromise() {
  function showToast() {
    toast.promise(
      new Promise<{ name: string }>((resolve) => {
        window.setTimeout(() => resolve({ name: "Event" }), 2000)
      }),
      {
        loading: "Creating event…",
        success: (data) => `${data.name} created.`,
        error: "Could not create event.",
      }
    )
  }

  return (
    <Example title="Promise" className="items-center justify-center">
      <Button variant="outline" className="w-fit" onClick={showToast}>
        Create Event
      </Button>
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
