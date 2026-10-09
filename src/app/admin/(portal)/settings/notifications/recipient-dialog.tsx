"use client";

import { useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent, RefObject } from "react";

import {
  addNotificationRecipient,
  updateRecipientLabel,
} from "@/app/admin/(portal)/settings/actions";
import { showModalWithInitialFocus } from "@/app/admin/(portal)/settings/open-dialog";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { DeliveryOutcome } from "@/lib/portal/email";

/* Add an address, or rename one (issue #355, Figma St6). Adding opens from
   the header through the address (?add=1), so Back closes it; the label is
   optional and names the inbox ("Front desk inbox"). Renaming opens from a
   row's ••• menu and edits only the label, because a new address is a new
   confirmation email. */

export interface Recipient {
  readonly id: string;
  readonly email: string;
  readonly label: string | null;
  readonly active: boolean;
}

const LABEL_FAILURE = {
  invalid: "A label can be up to 120 characters.",
  not_found: "That address isn't on the list anymore.",
  unavailable: "That change didn't save. Try again.",
} as const;

const SUBMIT_LABEL = {
  add: { idle: "Add email", pending: "Adding…" },
  rename: { idle: "Save", pending: "Saving…" },
} as const;

function keepFocusInDialog(event: ReactKeyboardEvent<HTMLDialogElement>) {
  if (event.key !== "Tab") return;
  const controls = Array.from(
    event.currentTarget.querySelectorAll<HTMLElement>(
      "button:not([disabled]), input:not([disabled])",
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

export function RecipientDialog({
  editing,
  onLeave,
  onAdded,
  onRenamed,
}: Readonly<{
  /** The address whose label is being edited, or null to add one. */
  editing: Recipient | null;
  onLeave: () => void;
  onAdded: (email: string, delivery: DeliveryOutcome) => void;
  onRenamed: () => void;
}>) {
  const [email, setEmail] = useState("");
  const [label, setLabel] = useState(editing?.label ?? "");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [labelError, setLabelError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const labelRef = useRef<HTMLInputElement>(null);

  async function add() {
    const address = email.trim();
    if (address === "" || emailRef.current?.validity.typeMismatch === true) {
      setEmailError(
        address === "" ? "Enter the email address." : "Enter a complete email address.",
      );
      emailRef.current?.focus();
      return;
    }
    const name = label.trim();
    const result = await addNotificationRecipient(
      name === "" ? { email: address } : { email: address, label: name },
    );
    if (!result.ok) {
      setEmailError(result.error);
      emailRef.current?.focus();
      return;
    }
    onAdded(address, result.delivery);
  }

  async function rename(recipient: Readonly<Recipient>) {
    const name = label.trim();
    const result = await updateRecipientLabel({
      recipientId: recipient.id,
      label: name === "" ? null : name,
    });
    if (!result.ok) {
      setLabelError(LABEL_FAILURE[result.code]);
      labelRef.current?.focus();
      return;
    }
    onRenamed();
  }

  async function submit() {
    setEmailError(null);
    setLabelError(null);
    setPending(true);
    try {
      await (editing === null ? add() : rename(editing));
    } catch {
      (editing === null ? setEmailError : setLabelError)("That didn't go through. Try again.");
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
      aria-labelledby="recipient-dialog-title"
      aria-describedby="recipient-dialog-lead"
      data-testid="recipient-dialog"
      className="portal-confirm-dialog"
      onKeyDown={keepFocusInDialog}
      onClickCapture={(event) => {
        event.currentTarget.toggleAttribute("data-instant", event.detail === 0);
      }}
      onCancel={(event) => {
        event.preventDefault();
        event.currentTarget.toggleAttribute("data-instant", true);
        if (!pending) onLeave();
      }}
    >
      <form
        className="contents"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <div className="portal-confirm-dialog-body">
          <div className="portal-confirm-dialog-heading">
            <div>
              <h2 id="recipient-dialog-title" className="portal-confirm-dialog-title">
                {editing === null ? "Add an email" : "Edit label"}
              </h2>
              <p id="recipient-dialog-lead" className="settings-dialog-lead">
                {editing === null ? (
                  "It gets an email for each new request, and a confirmation email now."
                ) : (
                  <span data-ui-redact>{editing.email}</span>
                )}
              </p>
            </div>
            <button
              type="button"
              disabled={pending}
              className="portal-confirm-dialog-close"
              onClick={onLeave}
            >
              Close
            </button>
          </div>
          <FieldGroup>
            {editing === null ? (
              <EmailField
                inputRef={emailRef}
                value={email}
                error={emailError}
                disabled={pending}
                onChange={(next) => {
                  setEmail(next);
                  if (emailError !== null) setEmailError(null);
                }}
              />
            ) : null}
            <LabelField
              inputRef={labelRef}
              value={label}
              error={labelError}
              renaming={editing !== null}
              disabled={pending}
              onChange={(next) => {
                setLabel(next);
                if (labelError !== null) setLabelError(null);
              }}
            />
          </FieldGroup>
        </div>
        <div className="portal-confirm-dialog-actions">
          <Button type="button" variant="outline" disabled={pending} onClick={onLeave}>
            Cancel
          </Button>
          <Button type="submit" disabled={pending}>
            {SUBMIT_LABEL[editing === null ? "add" : "rename"][pending ? "pending" : "idle"]}
          </Button>
        </div>
      </form>
    </dialog>
  );
}

function EmailField({
  inputRef,
  value,
  error,
  disabled,
  onChange,
}: Readonly<{
  inputRef: RefObject<HTMLInputElement | null>;
  value: string;
  error: string | null;
  disabled: boolean;
  onChange: (value: string) => void;
}>) {
  return (
    <Field data-invalid={error !== null || undefined}>
      <FieldLabel htmlFor="recipient-email">Email</FieldLabel>
      <Input
        ref={inputRef}
        id="recipient-email"
        type="email"
        data-initial-focus
        required
        autoComplete="off"
        maxLength={254}
        placeholder="frontdesk@westchasegi.com"
        data-ui-redact
        value={value}
        aria-invalid={error !== null || undefined}
        aria-describedby={error === null ? undefined : "recipient-email-error"}
        disabled={disabled}
        onChange={(event) => {
          onChange(event.target.value);
        }}
      />
      {error === null ? null : <FieldError id="recipient-email-error">{error}</FieldError>}
    </Field>
  );
}

function LabelField({
  inputRef,
  value,
  error,
  renaming,
  disabled,
  onChange,
}: Readonly<{
  inputRef: RefObject<HTMLInputElement | null>;
  value: string;
  error: string | null;
  renaming: boolean;
  disabled: boolean;
  onChange: (value: string) => void;
}>) {
  return (
    <Field data-invalid={error !== null || undefined}>
      <FieldLabel htmlFor="recipient-label">Label{renaming ? "" : " (optional)"}</FieldLabel>
      <Input
        ref={inputRef}
        id="recipient-label"
        type="text"
        data-initial-focus={renaming || undefined}
        autoComplete="off"
        maxLength={120}
        placeholder="Front desk inbox"
        value={value}
        aria-invalid={error !== null || undefined}
        aria-describedby={error === null ? "recipient-label-hint" : "recipient-label-error"}
        disabled={disabled}
        onChange={(event) => {
          onChange(event.target.value);
        }}
      />
      {error === null ? (
        <FieldDescription id="recipient-label-hint">
          Who reads it. Leave it empty to show the address alone.
        </FieldDescription>
      ) : (
        <FieldError id="recipient-label-error">{error}</FieldError>
      )}
    </Field>
  );
}
