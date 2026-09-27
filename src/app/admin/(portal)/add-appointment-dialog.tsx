"use client";

import { useRouter } from "next/navigation";
import { useCallback, useId, useRef, useState } from "react";

import { clearLanded, markLanded } from "./(home)/landed-request";
import { StaffRequestForm } from "./requests/new/staff-request-form";
import type { StaffRequestFormHandle } from "./requests/new/use-leave-guard";

/* Adding a walk-in or a phoned-in request used to cost two navigations: out to
   a page and back again. Coming to the portal is already an interruption to the
   day, and going pages deeper compounds it, so the form opens over the line the
   way Print requests does and closes back onto it. The route still exists
   for deep links and still lands on the new record; only this entry point stays.

   The form is mounted on open and unmounted on close, so a dismissed draft
   never survives to surprise the next person who opens it. The result is the
   form's toast: the dialog only closes, marks the new row as landed
   (landed-request.ts) and refreshes the line under it. Home's filter is
   never touched; when it hides the new row, the toast is the confirmation.

   The sheet is Home's glass (home.css "Glass sheets"). Cancel and Escape
   are its ways out, so it has no Close button. */
export function AddAppointmentDialog({
  triggerClassName,
  idempotencyKey,
}: Readonly<{
  triggerClassName: string;
  /** Server-generated per page render, so a double submit cannot duplicate work. */
  idempotencyKey: string;
}>) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const formHandleRef = useRef<StaffRequestFormHandle>(null);
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const close = useCallback(() => {
    dialogRef.current?.close();
  }, []);

  const requestClose = useCallback(() => {
    formHandleRef.current?.requestDismiss();
  }, []);

  const created = useCallback(
    (requestId: string) => {
      markLanded(requestId);
      close();
      router.refresh();
    },
    [close, router],
  );

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        data-testid="home-add-patient-request"
        aria-haspopup="dialog"
        aria-expanded={open}
        className={triggerClassName}
        onClick={(event) => {
          dialogRef.current?.toggleAttribute("data-instant", event.detail === 0);
          dialogRef.current?.showModal();
          setOpen(true);
        }}
      >
        Add request…
      </button>
      <dialog
        ref={dialogRef}
        aria-modal="true"
        aria-labelledby={titleId}
        data-testid="add-appointment-dialog"
        onPointerDownCapture={(event) => {
          event.currentTarget.toggleAttribute("data-instant", false);
        }}
        onKeyDownCapture={(event) => {
          event.currentTarget.toggleAttribute("data-instant", true);
        }}
        onCancel={(event) => {
          if (event.target !== event.currentTarget) return;
          event.preventDefault();
          event.currentTarget.toggleAttribute("data-instant", true);
          requestClose();
        }}
        onClose={(event) => {
          if (event.target !== event.currentTarget) return;
          setOpen(false);
          triggerRef.current?.focus();
        }}
        className="portal-confirm-dialog wgi-glass-sheet portal-add-appointment"
      >
        <header className="wgi-glass-sheet-header">
          <h2 id={titleId}>Add request</h2>
          <p>It joins the line under New. No chart is created and no email is sent.</p>
        </header>
        {open ? (
          <StaffRequestForm
            idempotencyKey={idempotencyKey}
            permalink="/admin"
            returnHref="/admin"
            returnLabel="Cancel"
            onCreated={created}
            onCreatedToastLeave={clearLanded}
            onDismiss={close}
            dismissRequestRef={formHandleRef}
          />
        ) : null}
      </dialog>
    </>
  );
}
