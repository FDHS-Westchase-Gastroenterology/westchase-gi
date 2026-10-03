"use client";

import { cn } from "cn";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { toast } from "sonner";

import {
  removeNotificationRecipient,
  sendTestNotification,
  toggleNotificationRecipient,
} from "@/app/admin/(portal)/settings/actions";
import { RecipientDialog } from "@/app/admin/(portal)/settings/notifications/recipient-dialog";
import type { Recipient } from "@/app/admin/(portal)/settings/notifications/recipient-dialog";
import { showModalWithInitialFocus } from "@/app/admin/(portal)/settings/open-dialog";
import { Ellipsis, Mail } from "@/components/icons";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Menu, MenuContent, MenuGroup, MenuItem, MenuTrigger } from "@/components/ui/menu";
import { Switch } from "@/components/ui/switch";
import { showUndoToast } from "@/components/ui/undo-toast";
import type { DeliveryOutcome } from "@/lib/portal/email";
import type { TestNotificationResult } from "@/lib/portal/management";
import { RECIPIENTS_INTRO } from "@/lib/portal/staff-language";

/* Notifications (issue #355, Figma St6): the addresses that get an email
   when a patient sends a request from the website. An admin adds one from
   the header, pauses or resumes one from its switch (with Undo), renames or
   removes one from its ••• menu, and sends a test to every address that is
   on. Removing asks first, because adding the address back sends it another
   confirmation. Under the list, the email itself: what an address receives,
   drawn from the same text the server sends, so the preview cannot drift
   from the message. The front desk reads all of it. */

export type { Recipient } from "@/app/admin/(portal)/settings/notifications/recipient-dialog";

export interface EmailPreview {
  readonly from: string;
  readonly subject: string;
  readonly body: string;
}

function nameOf(recipient: Readonly<Recipient>): string {
  return recipient.label ?? recipient.email;
}

/* The toast a test send ends with: all sent, none sent, or some. */
function reportTestResult(result: Readonly<TestNotificationResult>) {
  if (!result.ok) {
    toast.error(result.error);
    return;
  }
  const { accepted, recipientCount } = result;
  const addresses = recipientCount === 1 ? "address" : "addresses";
  if (accepted === recipientCount) {
    toast.success(`Test email sent to ${recipientCount} ${addresses}.`);
  } else if (accepted === 0) {
    toast.error("The test email couldn't be sent. Requests still arrive on Home.");
  } else {
    toast.warning(`Sent to ${accepted} of ${recipientCount} ${addresses}.`, {
      description: "The others couldn't be sent. Check those addresses.",
    });
  }
}

function reportAdded(email: string, delivery: DeliveryOutcome) {
  if (delivery === "accepted") {
    toast.success(`${email} added`, { description: "A confirmation email is on its way." });
  } else {
    toast.warning(`${email} added`, {
      description: "The confirmation email didn't send. Send a test email to check the address.",
    });
  }
}

export function NotificationsView({
  recipients,
  canEdit,
  adding,
  preview,
}: Readonly<{
  recipients: readonly Recipient[];
  canEdit: boolean;
  adding: boolean;
  preview: EmailPreview;
}>) {
  const router = useRouter();
  const [editing, setEditing] = useState<Recipient | null>(null);
  const [removing, setRemoving] = useState<Recipient | null>(null);

  function leaveAdd() {
    const address = new URL(window.location.href);
    address.searchParams.delete("add");
    router.replace(`${address.pathname}${address.search}`, { scroll: false });
  }

  async function toggle(recipient: Readonly<Recipient>, active: boolean) {
    const result = await toggleNotificationRecipient({ recipientId: recipient.id, active });
    router.refresh();
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    const name = nameOf(recipient);
    showUndoToast({
      headline: active ? `${name} is on` : `${name} paused`,
      detail: active
        ? `${recipient.email} gets request emails again.`
        : `${recipient.email} won't get request emails.`,
      undo: async () => {
        const back = await toggleNotificationRecipient({
          recipientId: recipient.id,
          active: !active,
        });
        return back.ok
          ? { ok: true, message: active ? `${name} paused again` : `${name} is on again` }
          : { ok: false, message: back.error };
      },
      onSettled: () => {
        router.refresh();
      },
    });
  }

  return (
    <div data-testid="recipients-manager" className="wgi-settings mt-6 flex flex-col gap-4">
      <p className="text-[0.875rem] leading-5 text-(--wgi-muted-ink)">{RECIPIENTS_INTRO}</p>
      <RecipientList
        recipients={recipients}
        canEdit={canEdit}
        onToggle={toggle}
        onEdit={setEditing}
        onRemove={setRemoving}
      />
      <EmailPreviewSection recipients={recipients} canEdit={canEdit} preview={preview} />

      {canEdit && (adding || editing !== null) ? (
        <RecipientDialog
          key={editing?.id ?? "add"}
          editing={editing}
          onLeave={() => {
            if (editing === null) leaveAdd();
            else setEditing(null);
          }}
          onAdded={(email, delivery) => {
            reportAdded(email, delivery);
            leaveAdd();
            router.refresh();
          }}
          onRenamed={() => {
            setEditing(null);
            toast.success("Label saved");
            router.refresh();
          }}
        />
      ) : null}
      {removing === null ? null : (
        <RemoveRecipientDialog
          recipient={removing}
          onClose={() => {
            setRemoving(null);
          }}
          onDone={() => {
            setRemoving(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function RecipientList({
  recipients,
  canEdit,
  onToggle,
  onEdit,
  onRemove,
}: Readonly<{
  recipients: readonly Recipient[];
  canEdit: boolean;
  onToggle: (recipient: Readonly<Recipient>, active: boolean) => Promise<void>;
  onEdit: (recipient: Recipient) => void;
  onRemove: (recipient: Recipient) => void;
}>) {
  if (recipients.length === 0) {
    return (
      <Empty className="settings-empty" data-tour="recipients">
        <EmptyHeader>
          <EmptyMedia variant="icon" aria-hidden="true">
            <Mail />
          </EmptyMedia>
          <EmptyTitle>No addresses yet</EmptyTitle>
          <EmptyDescription>
            {canEdit
              ? "Add the inbox the front desk reads, so a new request doesn't wait unseen."
              : "An admin can add the inbox the front desk reads."}
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }
  return (
    <>
      {recipients.some((recipient) => recipient.active) ? null : (
        <p role="status" className="settings-notice">
          Every address is paused, so nobody gets an email when a request arrives. Requests still
          wait on Home.
        </p>
      )}
      <div className="settings-table settings-recipients" data-tour="recipients">
        <div aria-hidden="true" className="settings-table-head">
          <span>Sends to</span>
          <span>On</span>
          <span />
        </div>
        <ul
          data-testid="recipient-list"
          aria-label="Addresses that get request emails"
          className="contents"
        >
          {recipients.map((recipient) => (
            <RecipientRowView
              key={recipient.id}
              recipient={recipient}
              canEdit={canEdit}
              onToggle={async (active) => onToggle(recipient, active)}
              onEdit={() => {
                onEdit(recipient);
              }}
              onRemove={() => {
                onRemove(recipient);
              }}
            />
          ))}
        </ul>
      </div>
    </>
  );
}

/* The email itself, beside what it carries and the test send. */
function EmailPreviewSection({
  recipients,
  canEdit,
  preview,
}: Readonly<{
  recipients: readonly Recipient[];
  canEdit: boolean;
  preview: EmailPreview;
}>) {
  const [testing, setTesting] = useState(false);
  const firstOn = recipients.find((recipient) => recipient.active);

  async function sendTest() {
    setTesting(true);
    try {
      reportTestResult(await sendTestNotification());
    } catch {
      toast.error("The test email couldn't be sent. Try again.");
    } finally {
      setTesting(false);
    }
  }

  return (
    <section aria-labelledby="email-preview-title" className="settings-email">
      <div className="settings-email-preview" data-testid="notification-preview">
        <dl className="settings-email-fields">
          <div>
            <dt>From</dt>
            <dd>{preview.from}</dd>
          </div>
          <div>
            <dt>To</dt>
            <dd data-ui-redact>
              {firstOn?.email ??
                (recipients.length === 0 ? "No address yet" : "Every address is paused")}
            </dd>
          </div>
          <div>
            <dt>Subject</dt>
            <dd className="font-bold text-(--wgi-name-ink)">{preview.subject}</dd>
          </div>
        </dl>
        <p className="settings-email-body">{preview.body}</p>
      </div>
      <div className="flex flex-col gap-3">
        <h2 id="email-preview-title" className="settings-section-title">
          What each address receives
        </h2>
        <p className="text-[0.875rem] leading-5 text-(--wgi-muted-ink)">
          One short plain-text email for each new request from the website, with a link to the
          portal. It never includes the patient&apos;s name or what they asked for; staff read the
          request on Home after signing in.
        </p>
        {canEdit ? (
          <div className="flex flex-col items-start gap-1.5">
            <button
              type="button"
              data-action="send-test"
              disabled={testing || firstOn === undefined}
              aria-describedby={firstOn === undefined ? "send-test-reason" : undefined}
              className="settings-text-command -ml-1.5 self-start disabled:opacity-50"
              onClick={() => {
                void sendTest();
              }}
            >
              <Mail aria-hidden="true" className="size-4" />
              {testing ? "Sending…" : "Send a test email to everyone who is on"}
            </button>
            {firstOn === undefined ? (
              <p id="send-test-reason" className="text-[0.8125rem] text-(--wgi-muted-ink)">
                Turn an address on to send a test.
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function RecipientRowView({
  recipient,
  canEdit,
  onToggle,
  onEdit,
  onRemove,
}: Readonly<{
  recipient: Recipient;
  canEdit: boolean;
  onToggle: (active: boolean) => Promise<void>;
  onEdit: () => void;
  onRemove: () => void;
}>) {
  /* The switch moves at once; the server's answer settles it either way. */
  const [active, setActive] = useState(recipient.active);
  const [seen, setSeen] = useState(recipient.active);
  if (seen !== recipient.active) {
    setSeen(recipient.active);
    setActive(recipient.active);
  }
  const name = nameOf(recipient);
  const line = [recipient.label === null ? null : recipient.email, active ? null : "paused"]
    .filter((part) => part !== null)
    .join(" · ");

  return (
    <li
      data-testid="recipient-row"
      data-recipient-email={recipient.email}
      className={cn("settings-table-row", !active && "is-paused")}
    >
      <span className="flex min-w-0 items-center gap-3">
        <span aria-hidden="true" className="settings-avatar is-mail">
          <Mail className="size-4" />
        </span>
        <span className="min-w-0">
          <span data-ui-redact className="settings-table-name block truncate">
            {name}
          </span>
          {line === "" ? null : (
            <span
              data-ui-redact
              className="block truncate text-[0.8125rem] leading-[1.125rem] text-(--wgi-muted-ink)"
            >
              {line}
            </span>
          )}
        </span>
      </span>
      <span className="flex items-center">
        <Switch
          checked={active}
          disabled={!canEdit}
          aria-label={`Request emails to ${recipient.email}`}
          onCheckedChange={(next) => {
            setActive(next);
            void onToggle(next).finally(() => {
              setActive(recipient.active);
            });
          }}
        />
      </span>
      <span className="flex items-center justify-center">
        {canEdit ? (
          <Menu>
            <MenuTrigger className="settings-row-more" aria-label={`More for ${name}`}>
              <Ellipsis aria-hidden="true" width={15} height={15} />
            </MenuTrigger>
            <MenuContent align="end" className="min-w-44">
              <MenuGroup>
                <MenuItem data-action="edit-label" onClick={onEdit}>
                  Edit label
                </MenuItem>
                <MenuItem data-action="remove" onClick={onRemove}>
                  Remove
                </MenuItem>
              </MenuGroup>
            </MenuContent>
          </Menu>
        ) : null}
      </span>
    </li>
  );
}

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

/* Removing has no Undo (adding the address back sends a new confirmation),
   so it asks first, Keep focused. */
function RemoveRecipientDialog({
  recipient,
  onClose,
  onDone,
}: Readonly<{
  recipient: Recipient;
  onClose: () => void;
  onDone: () => void;
}>) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const name = nameOf(recipient);

  async function confirm() {
    setPending(true);
    setError(null);
    try {
      const result = await removeNotificationRecipient({ id: recipient.id });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success(`${name} removed`);
      onDone();
    } catch {
      setError("That address couldn't be removed. Try again.");
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
      aria-labelledby="remove-recipient-title"
      aria-describedby="remove-recipient-copy"
      data-testid="remove-recipient-dialog"
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
          <h2 id="remove-recipient-title" className="portal-confirm-dialog-title">
            Remove <span data-ui-redact>{name}</span>?
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
        <p id="remove-recipient-copy">
          <span data-ui-redact>{recipient.email}</span> stops getting request emails. To pause it
          for a while instead, turn its switch off.
        </p>
        {error === null ? null : (
          <p role="alert" className="settings-notice">
            {error}
          </p>
        )}
      </div>
      <div className="portal-confirm-dialog-actions">
        <Button type="button" data-initial-focus disabled={pending} onClick={onClose}>
          Keep it
        </Button>
        <button
          type="button"
          data-action="confirm-remove"
          disabled={pending}
          onClick={() => {
            void confirm();
          }}
          className="portal-confirm-dialog-destructive min-h-11 disabled:opacity-60"
        >
          {pending ? "Removing…" : "Remove"}
        </button>
      </div>
    </dialog>
  );
}
