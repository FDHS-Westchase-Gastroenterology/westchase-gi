"use client";

import { Dialog as SheetPrimitive } from "@base-ui/react/dialog";

import { cn } from "@/lib/utils";

/* Fresh conversion of the stock registry Sheet for the home dashboard
   (portal-home-redesign-brief §4.5): the Base UI dialog skeleton, right side
   only, repainted through the portal bridge. Enter/exit ride the 200ms
   drawer slide; the resize grip is the surface's own affordance and lives
   with the full-record component. Paint lives in home.css under
   `.wgi-sheet*`. */

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
function HomeSheetContent({ className, children, ...props }: SheetPrimitive.Popup.Props) {
  return (
    <SheetPrimitive.Portal>
      <SheetPrimitive.Backdrop data-slot="sheet-overlay" className="wgi-sheet-overlay" />
      <SheetPrimitive.Popup
        data-slot="sheet-content"
        data-side="right"
        className={cn("wgi-sheet", className)}
        {...props}
      >
        {children}
      </SheetPrimitive.Popup>
    </SheetPrimitive.Portal>
  );
}

export { HomeSheet, HomeSheetClose, HomeSheetContent, HomeSheetTitle };
