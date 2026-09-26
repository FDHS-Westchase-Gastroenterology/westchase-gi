"use client";

import { Dialog as SheetPrimitive } from "@base-ui/react/dialog";
import { cn } from "cn";

/* Fresh conversion of the stock registry Sheet for the home dashboard
   (portal-home-redesign-brief §4.5): the Base UI dialog skeleton, right side
   only, repainted through the portal bridge. The sheet is the record's
   inspector: non-modal beside the record card, and undimmed — no scroll
   lock, nothing inert behind it, and no backdrop, because a dimmed page
   reads as modal and this surface is not one
   (plans/full-record-sheet-decisions.md, the companion model). On the
   sidebar layout the card sits above it, never covered. Enter/exit ride
   --motion-standard over the sheet and base beats in home.css; `instant`
   marks the popup `data-instant` (the attribute Base UI's popovers set on
   their own) for a keyboard-initiated open or close, which never animates.
   The popup carries a stable id so the card's footer can point at it as
   the sheet's toggle. The resize grip is the surface's own affordance and
   lives with the full-record component. Paint lives in home.css under
   `.wgi-sheet*`. */

type HomeSheetChangeDetails = SheetPrimitive.Root.ChangeEventDetails;

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React props carry framework member types that cannot be made readonly
function HomeSheet(props: SheetPrimitive.Root.Props) {
  return <SheetPrimitive.Root data-slot="sheet" {...props} />;
}

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React props carry framework member types that cannot be made readonly
function HomeSheetTitle(props: SheetPrimitive.Title.Props) {
  return <SheetPrimitive.Title data-slot="sheet-title" {...props} />;
}

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React props carry framework member types that cannot be made readonly
function HomeSheetClose(props: SheetPrimitive.Close.Props) {
  return <SheetPrimitive.Close data-slot="sheet-close" {...props} />;
}

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React props carry framework member types that cannot be made readonly
function HomeSheetContent({
  className,
  children,
  instant = false,
  ...props
}: SheetPrimitive.Popup.Props & { readonly instant?: boolean }) {
  return (
    <SheetPrimitive.Portal>
      <SheetPrimitive.Popup
        id="wgi-full-record"
        data-slot="sheet-content"
        data-side="right"
        data-instant={instant ? "keyboard" : undefined}
        className={cn("wgi-sheet", className)}
        {...props}
      >
        {children}
      </SheetPrimitive.Popup>
    </SheetPrimitive.Portal>
  );
}

export { HomeSheet, HomeSheetClose, HomeSheetContent, HomeSheetTitle };
export type { HomeSheetChangeDetails };
