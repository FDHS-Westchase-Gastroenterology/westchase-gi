"use client";

import { cn } from "cn";
import { useRef } from "react";
import type { KeyboardEvent as ReactKeyboardEvent, ReactNode, RefObject } from "react";

import { showModalWithInitialFocus } from "@/app/admin/(portal)/settings/open-dialog";

/* One sheet for the Settings window's modal edits: the glass sheet the type
   editor wears (portal-workbench.css "wgi-glass-sheet"), on the native
   <dialog> the overlays grammar keeps for modals. A title, an optional lead,
   the fields on the solid well, and the footer's actions. It opens with focus
   on the control marked `data-initial-focus`, keeps Tab inside, and Escape
   asks `onClose` unless the sheet is busy. A keyboard open or close skips the
   rise; a pointer one plays it. */

function keepFocusInSheet(event: ReactKeyboardEvent<HTMLDialogElement>) {
  if (event.key !== "Tab" || event.defaultPrevented) return;
  const controls = Array.from(
    event.currentTarget.querySelectorAll<HTMLElement>(
      'button:not([disabled]), a[href], input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled])',
    ),
  );
  const first = controls.at(0);
  const last = controls.at(-1);
  if (first === undefined || last === undefined) return;
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

export function SettingsSheet({
  title,
  lead,
  testId,
  className,
  busy,
  onClose,
  onSubmit,
  footer,
  children,
  dialogRef,
}: Readonly<{
  title: ReactNode;
  lead?: ReactNode;
  testId: string;
  className?: string;
  /** While a save is under way, Escape and Cancel wait. */
  busy: boolean;
  onClose: () => void;
  /** The sheet is a form; Enter in a field submits it. */
  onSubmit: () => void;
  footer: ReactNode;
  children: ReactNode;
  /** For a Select inside the sheet, whose list must render in the sheet's top layer. */
  dialogRef?: RefObject<HTMLDialogElement | null>;
}>) {
  const own = useRef<HTMLDialogElement | null>(null);
  const titleId = `${testId}-title`;
  const leadId = `${testId}-lead`;
  return (
    <dialog
      ref={(dialog) => {
        own.current = dialog;
        if (dialogRef !== undefined) dialogRef.current = dialog;
        if (dialog !== null && !dialog.open) {
          dialog.toggleAttribute(
            "data-instant",
            document.activeElement?.matches(":focus-visible") === true,
          );
          showModalWithInitialFocus(dialog);
        }
      }}
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={lead === undefined ? undefined : leadId}
      data-testid={testId}
      className={cn("portal-confirm-dialog wgi-glass-sheet", className)}
      onKeyDown={keepFocusInSheet}
      onPointerDownCapture={(event) => {
        event.currentTarget.toggleAttribute("data-instant", false);
      }}
      onKeyDownCapture={(event) => {
        event.currentTarget.toggleAttribute("data-instant", true);
      }}
      onCancel={(event) => {
        event.preventDefault();
        event.currentTarget.toggleAttribute("data-instant", true);
        if (!busy) onClose();
      }}
    >
      {/* A client action: React submits the form without a page load, Enter included. */}
      <form
        className="contents"
        action={() => {
          onSubmit();
        }}
      >
        <header className="wgi-glass-sheet-header">
          <h2 id={titleId}>{title}</h2>
          {lead === undefined ? null : <p id={leadId}>{lead}</p>}
        </header>
        <div className="wgi-glass-well wgi-settings">{children}</div>
        <div className="portal-confirm-dialog-actions wgi-glass-footer">{footer}</div>
      </form>
    </dialog>
  );
}
