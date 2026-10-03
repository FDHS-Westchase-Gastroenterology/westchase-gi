"use client";

import { useRouter } from "next/navigation";
import { useCallback, useId, useImperativeHandle, useRef, useState } from "react";
import type { Ref } from "react";

import { clearLanded, markLanded } from "./(home)/landed-request";
import type { StaffRequestPrefill } from "./requests/new/staff-request-draft";
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
   are its ways out, so it has no Close button.

   The dialog itself is AddRequestDialog, opened through a handle: Home's
   button opens it empty, and the Schedule's search (issue #356) opens it
   with the name or the number that found nobody. */

export interface AddRequestDialogHandle {
  /** Opens the form, with what a search typed when it has any; `instant` when the keyboard asked. */
  readonly open: (prefill: StaffRequestPrefill, instant: boolean) => void;
}

export function AddRequestDialog({
  idempotencyKey,
  permalink,
  handleRef,
  onCreated,
  onClosed,
}: Readonly<{
  /** Server-generated per page render, so a double submit cannot duplicate work. */
  idempotencyKey: string;
  /** The page the form posts back to without JavaScript, and Cancel's way out there. */
  permalink: string;
  handleRef: Ref<AddRequestDialogHandle>;
  /** The request exists and the dialog has closed over it. */
  onCreated: (requestId: string) => void;
  /** The dialog has closed, whichever way: focus goes back to whoever opened it. */
  onClosed: () => void;
}>) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const formHandleRef = useRef<StaffRequestFormHandle>(null);
  const [prefill, setPrefill] = useState<StaffRequestPrefill | null>(null);

  useImperativeHandle(
    handleRef,
    () => ({
      open(next, instant) {
        dialogRef.current?.toggleAttribute("data-instant", instant);
        dialogRef.current?.showModal();
        setPrefill(next);
      },
    }),
    [],
  );

  const close = useCallback(() => {
    dialogRef.current?.close();
  }, []);

  const requestClose = useCallback(() => {
    formHandleRef.current?.requestDismiss();
  }, []);

  const created = useCallback(
    (requestId: string) => {
      close();
      onCreated(requestId);
    },
    [close, onCreated],
  );

  return (
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
        setPrefill(null);
        onClosed();
      }}
      className="portal-confirm-dialog wgi-glass-sheet portal-add-appointment"
    >
      <header className="wgi-glass-sheet-header">
        <h2 id={titleId}>Add request</h2>
        <p>It joins the line under New. No chart is created and no email is sent.</p>
      </header>
      {prefill === null ? null : (
        <StaffRequestForm
          idempotencyKey={idempotencyKey}
          permalink={permalink}
          returnHref={permalink}
          returnLabel="Cancel"
          onCreated={created}
          onCreatedToastLeave={clearLanded}
          onDismiss={close}
          dismissRequestRef={formHandleRef}
          prefill={prefill}
        />
      )}
    </dialog>
  );
}

/** Home's Add request button and the dialog it opens. */
export function AddAppointmentDialog({
  triggerClassName,
  idempotencyKey,
}: Readonly<{
  triggerClassName: string;
  /** Server-generated per page render, so a double submit cannot duplicate work. */
  idempotencyKey: string;
}>) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialog = useRef<AddRequestDialogHandle>(null);
  const [open, setOpen] = useState(false);
  const router = useRouter();

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
          dialog.current?.open({}, event.detail === 0);
          setOpen(true);
        }}
      >
        Add request…
      </button>
      <AddRequestDialog
        idempotencyKey={idempotencyKey}
        permalink="/admin"
        handleRef={dialog}
        onCreated={(requestId) => {
          markLanded(requestId);
          router.refresh();
        }}
        onClosed={() => {
          setOpen(false);
          triggerRef.current?.focus();
        }}
      />
    </>
  );
}
