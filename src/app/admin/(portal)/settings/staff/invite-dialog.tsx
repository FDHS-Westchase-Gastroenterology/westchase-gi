"use client";

import { useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";

import { inviteStaff } from "@/app/admin/(portal)/settings/actions";
import { showModalWithInitialFocus } from "@/app/admin/(portal)/settings/open-dialog";
import { ROLE_NAMES, ROLE_REACH } from "@/app/admin/(portal)/settings/staff/staff-model";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SegmentedControl } from "@/components/ui/segmented-control";
import type { StaffRole } from "@/lib/portal/contracts";
import type { InviteStaffResult } from "@/lib/portal/management";

/* Invite someone (issue #355, Figma St4): the header's Invite opens this
   modal through the address (?invite=1), so Back closes it. One email and a
   role; the line under the role says what that role can do. The sheet stays
   open while the invite is sent, so a refusal lands beside the email that
   caused it. */

const ROLE_OPTIONS = [
  { value: "staff", label: ROLE_NAMES.staff },
  { value: "admin", label: ROLE_NAMES.admin },
] as const;

function keepFocusInDialog(event: ReactKeyboardEvent<HTMLDialogElement>) {
  if (event.key !== "Tab") return;
  const controls = Array.from(
    event.currentTarget.querySelectorAll<HTMLElement>(
      "button:not([disabled]), input:not([disabled]):not([tabindex='-1'])",
    ),
  ).filter((control) => control.tabIndex >= 0);
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

export interface SentInvite {
  readonly email: string;
  readonly role: StaffRole;
  readonly result: Readonly<Exclude<InviteStaffResult, { ok: false }>>;
}

export function InviteDialog({
  onLeave,
  onSent,
}: Readonly<{
  onLeave: () => void;
  onSent: (sent: Readonly<SentInvite>) => void;
}>) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<StaffRole>("staff");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);

  async function send() {
    const address = email.trim();
    if (address === "" || emailRef.current?.validity.typeMismatch === true) {
      setError(address === "" ? "Enter their email address." : "Enter a complete email address.");
      emailRef.current?.focus();
      return;
    }
    setError(null);
    setPending(true);
    try {
      const result = await inviteStaff({ email: address, role });
      if (!result.ok) {
        setError(
          result.code === "conflict" ? "Someone already signs in with that email." : result.error,
        );
        emailRef.current?.focus();
        return;
      }
      onSent({ email: address, role, result });
    } catch {
      setError("The invite couldn't be sent. Try again.");
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
      aria-labelledby="invite-staff-title"
      aria-describedby="invite-staff-lead"
      data-testid="invite-staff-dialog"
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
          void send();
        }}
      >
        <div className="portal-confirm-dialog-body">
          <div className="portal-confirm-dialog-heading">
            <div>
              <h2 id="invite-staff-title" className="portal-confirm-dialog-title">
                Invite someone
              </h2>
              <p id="invite-staff-lead" className="settings-dialog-lead">
                They&apos;ll get an email with a link to set up their sign-in.
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
            <Field data-invalid={error !== null || undefined}>
              <FieldLabel htmlFor="invite-email">Email</FieldLabel>
              <Input
                ref={emailRef}
                id="invite-email"
                type="email"
                data-initial-focus
                required
                autoComplete="off"
                maxLength={254}
                placeholder="name@westchasegi.com"
                data-ui-redact
                value={email}
                aria-invalid={error !== null || undefined}
                aria-describedby={error === null ? undefined : "invite-email-error"}
                disabled={pending}
                onChange={(event) => {
                  setEmail(event.target.value);
                  if (error !== null) setError(null);
                }}
              />
              {error === null ? null : <FieldError id="invite-email-error">{error}</FieldError>}
            </Field>
            <Field>
              <FieldLabel id="invite-role-label">Role</FieldLabel>
              <SegmentedControl
                name="role"
                aria-labelledby="invite-role-label"
                aria-describedby="invite-role-reach"
                options={ROLE_OPTIONS}
                value={role}
                disabled={pending}
                onValueChange={setRole}
              />
              <FieldDescription id="invite-role-reach" aria-live="polite">
                {ROLE_REACH[role]}
              </FieldDescription>
            </Field>
          </FieldGroup>
        </div>
        <div className="portal-confirm-dialog-actions">
          <Button type="button" variant="outline" disabled={pending} onClick={onLeave}>
            Cancel
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? "Sending…" : "Send invite"}
          </Button>
        </div>
      </form>
    </dialog>
  );
}
