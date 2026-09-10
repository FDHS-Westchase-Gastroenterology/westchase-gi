"use client";

import { useRouter } from "next/navigation";
import { useCallback, useId, useRef, useState } from "react";

import { toast } from "@/components/ui/toast-manager";

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

  const close = useCallback(() => {
    dialogRef.current?.close();
  }, []);

  const requestClose = useCallback(() => {
    formHandleRef.current?.requestDismiss();
  }, []);

  const created = useCallback(
    (name: string) => {
      close();
      /* The dialog is already gone by the time this lands, so the toast is
         the only thing that says the request exists: the title is the fact,
         the description is who it is about (src/components/ui/toast.tsx). */
      toast.add({
        type: "success",
        title: "Added to the line under New",
        description: name,
        /* The description is a patient's name, and a toast outlives the
           surface it speaks about: without this the capture script would
           redact the page and leave the name floating over it. */
        data: { redact: "patient-name" },
      });
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
