"use client";

import { useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";

import { showModalWithInitialFocus } from "@/app/admin/(portal)/settings/open-dialog";
import type { SettingsSend } from "@/app/admin/(portal)/settings/use-settings-command";
import { Button } from "@/components/ui/button";
import type { SettingsType } from "@/lib/portal/scheduling/settings-contracts";

/* Delete an appointment type (issue #352). Only a type no appointment has
   used can be deleted — one that has been used is turned off instead, so
   its appointments keep their type — and a delete has no Undo, so it asks
   first, Cancel focused. */

function keepFocusInDialog(event: ReactKeyboardEvent<HTMLDialogElement>) {
  if (event.key !== "Tab") return;
  const controls = Array.from(
    event.currentTarget.querySelectorAll<HTMLElement>("button:not([disabled])"),
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

export function DeleteTypeDialog({
  type,
  send,
  onClose,
}: Readonly<{
  type: SettingsType;
  send: SettingsSend;
  onClose: () => void;
}>) {
  const [pending, setPending] = useState(false);

  async function remove() {
    setPending(true);
    try {
      const outcome = await send({
        kind: "delete_appointment_type",
        id: type.id,
        expectedVersion: type.version,
      });
      if (outcome.ok) onClose();
    } finally {
      setPending(false);
    }
  }

  return (
    <dialog
      ref={(dialog) => {
        if (dialog !== null && !dialog.open) showModalWithInitialFocus(dialog);
      }}
      aria-modal="true"
      aria-labelledby="delete-type-title"
      aria-describedby="delete-type-copy"
      data-testid="delete-type-dialog"
      className="portal-confirm-dialog"
      onKeyDown={keepFocusInDialog}
      onClickCapture={(event) => {
        event.currentTarget.toggleAttribute("data-instant", event.detail === 0);
      }}
      onCancel={(event) => {
        event.preventDefault();
        event.currentTarget.toggleAttribute("data-instant", true);
        if (!pending) onClose();
      }}
    >
      <div className="portal-confirm-dialog-body">
        <div className="portal-confirm-dialog-heading">
          <h2 id="delete-type-title" className="portal-confirm-dialog-title">
            Delete {type.name}?
          </h2>
          <button
            type="button"
            disabled={pending}
            className="portal-confirm-dialog-close"
            onClick={onClose}
          >
            Close
          </button>
        </div>
        <p id="delete-type-copy">
          No appointment has used it. Staff will no longer see it when booking, and this can&apos;t
          be undone.
        </p>
      </div>
      <div className="portal-confirm-dialog-actions">
        <Button type="button" data-initial-focus disabled={pending} onClick={onClose}>
          Cancel
        </Button>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            void remove();
          }}
          className="portal-confirm-dialog-destructive min-h-11 disabled:opacity-60"
        >
          {pending ? "Deleting…" : "Delete type"}
        </button>
      </div>
    </dialog>
  );
}
