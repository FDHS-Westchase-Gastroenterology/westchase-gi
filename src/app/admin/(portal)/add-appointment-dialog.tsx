"use client";

import { useRouter } from "next/navigation";
import { useCallback, useId, useRef, useState } from "react";

import { usePortalFeedback } from "./portal-feedback";
import { StaffRequestForm } from "./requests/new/staff-request-form";
import type { StaffRequestFormHandle } from "./requests/new/staff-request-form";

/* Adding a walk-in or a phoned-in request used to cost two navigations: out to
   a page and back again. Coming to the portal is already an interruption to the
   day, and going pages deeper compounds it, so the form opens over the line the
   way Print appointments does and closes back onto it. The route still exists
   for deep links and still lands on the new record; only this entry point stays.

   The form is mounted on open and unmounted on close, so a dismissed draft
   never survives to surprise the next person who opens it. */
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
  const { publish } = usePortalFeedback();

  const close = useCallback(() => {
    dialogRef.current?.close();
  }, []);

  const requestClose = useCallback(() => {
    formHandleRef.current?.requestDismiss();
  }, []);

  const created = useCallback(
    (name: string) => {
      close();
      publish({
        source: "requests-output",
        tone: "status",
        message: `${name} is on the line under Call first.`,
      });
      router.refresh();
    },
    [close, publish, router],
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
        onClick={() => {
          dialogRef.current?.showModal();
          setOpen(true);
        }}
      >
        Add appointment
      </button>
      <dialog
        ref={dialogRef}
        aria-modal="true"
        aria-labelledby={titleId}
        data-testid="add-appointment-dialog"
        onCancel={(event) => {
          if (event.target !== event.currentTarget) return;
          event.preventDefault();
          requestClose();
        }}
        onClose={(event) => {
          if (event.target !== event.currentTarget) return;
          setOpen(false);
          triggerRef.current?.focus();
        }}
        className="portal-confirm-dialog portal-add-appointment"
      >
        <div className="portal-confirm-dialog-body">
          <div className="portal-confirm-dialog-heading">
            <h2 id={titleId} className="portal-confirm-dialog-title">
              Add appointment request
            </h2>
            <button type="button" onClick={requestClose} className="portal-confirm-dialog-close">
              Close
            </button>
          </div>
          <p>
            For a call, a walk-in, or a message that needs appointment follow-up. It joins the line
            as a New request.
          </p>
          {open ? (
            <StaffRequestForm
              idempotencyKey={idempotencyKey}
              permalink="/admin"
              returnHref="/admin"
              returnLabel="Cancel"
              onCreated={created}
              onDismiss={close}
              dismissRequestRef={formHandleRef}
            />
          ) : null}
        </div>
      </dialog>
    </>
  );
}
