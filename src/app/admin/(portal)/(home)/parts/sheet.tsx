"use client";

import { Dialog as SheetPrimitive } from "@base-ui/react/dialog";
import { cn } from "cn";

/* Stock Sheet adapted for the Home record panel. home.css owns its paint
   and motion; data-instant disables both panel and scrim transitions for
   keyboard actions. The record surface owns resizing. */

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
  const instantAttr = instant ? "keyboard" : undefined;
  return (
    <SheetPrimitive.Portal>
      <SheetPrimitive.Backdrop
        data-slot="sheet-overlay"
        data-instant={instantAttr}
        className="wgi-sheet-overlay"
      />
      <SheetPrimitive.Popup
        data-slot="sheet-content"
        data-side="right"
        data-instant={instantAttr}
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
