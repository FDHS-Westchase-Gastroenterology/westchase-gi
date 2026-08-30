/* Ported by .design-sync/ds/port-examples.mjs from
   src/components/stock/examples/alert-dialog-example.tsx — the shadcn registry's own demo,
   vendored by `npm run ds:stock`. Imports are aliased onto the bundle's
   Stock* exports; the JSX is the registry's, unchanged.
   Cells: AlertDialogBasic, AlertDialogSmall, AlertDialogWithMedia, AlertDialogSmallWithMedia, AlertDialogDestructive, AlertDialogInDialog */

import { StockAlertDialog as AlertDialog, StockAlertDialogAction as AlertDialogAction, StockAlertDialogCancel as AlertDialogCancel, StockAlertDialogContent as AlertDialogContent, StockAlertDialogDescription as AlertDialogDescription, StockAlertDialogFooter as AlertDialogFooter, StockAlertDialogHeader as AlertDialogHeader, StockAlertDialogMedia as AlertDialogMedia, StockAlertDialogTitle as AlertDialogTitle, StockAlertDialogTrigger as AlertDialogTrigger } from "westchase-gi";
import { StockButton as Button } from "westchase-gi";
import { StockDialog as Dialog, StockDialogContent as DialogContent, StockDialogDescription as DialogDescription, StockDialogFooter as DialogFooter, StockDialogHeader as DialogHeader, StockDialogTitle as DialogTitle, StockDialogTrigger as DialogTrigger } from "westchase-gi";
import { BluetoothIcon, Trash2Icon } from "lucide-react"


export function AlertDialogBasic() {
  return (
    <Example title="Basic" className="items-center">
      <AlertDialog defaultOpen>
        <AlertDialogTrigger
          render={<Button variant="outline">Default</Button>}
        />
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your
              account and remove your data from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Example>
  )
}

export function AlertDialogSmall() {
  return (
    <Example title="Small" className="items-center">
      <AlertDialog>
        <AlertDialogTrigger render={<Button variant="outline">Small</Button>} />
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Allow accessory to connect?</AlertDialogTitle>
            <AlertDialogDescription>
              Do you want to allow the USB accessory to connect to this device?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Don&apos;t allow</AlertDialogCancel>
            <AlertDialogAction>Allow</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Example>
  )
}

export function AlertDialogWithMedia() {
  return (
    <Example title="With Media" className="items-center">
      <AlertDialog>
        <AlertDialogTrigger
          render={<Button variant="outline">Default (Media)</Button>}
        />
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia>
              <BluetoothIcon
              />
            </AlertDialogMedia>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete your account and remove your data
              from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Example>
  )
}

export function AlertDialogSmallWithMedia() {
  return (
    <Example title="Small With Media" className="items-center">
      <AlertDialog>
        <AlertDialogTrigger
          render={<Button variant="outline">Small (Media)</Button>}
        />

        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogMedia>
              <BluetoothIcon
              />
            </AlertDialogMedia>
            <AlertDialogTitle>Allow accessory to connect?</AlertDialogTitle>
            <AlertDialogDescription>
              Do you want to allow the USB accessory to connect to this device?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Don&apos;t allow</AlertDialogCancel>
            <AlertDialogAction>Allow</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Example>
  )
}

export function AlertDialogDestructive() {
  return (
    <Example title="Destructive" className="items-center">
      <AlertDialog>
        <AlertDialogTrigger
          render={<Button variant="destructive">Delete Chat</Button>}
        />
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-destructive/10 text-destructive dark:bg-destructive/20 dark:text-destructive">
              <Trash2Icon
              />
            </AlertDialogMedia>
            <AlertDialogTitle>Delete chat?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this chat conversation. View{" "}
              <a href="#">Settings</a> delete any memories saved during this
              chat.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel variant="ghost">Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Example>
  )
}

export function AlertDialogInDialog() {
  return (
    <Example title="In Dialog" className="items-center">
      <Dialog>
        <DialogTrigger render={<Button variant="outline" />}>
          Open Dialog
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alert Dialog Example</DialogTitle>
            <DialogDescription>
              Click the button below to open an alert dialog.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <AlertDialog>
              <AlertDialogTrigger render={<Button />}>
                Open Alert Dialog
              </AlertDialogTrigger>
              <AlertDialogContent size="sm">
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete
                    your account and remove your data from our servers.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction>Continue</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </DialogFooter>
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
