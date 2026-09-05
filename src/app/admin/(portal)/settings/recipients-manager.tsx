"use client";

import { useRouter } from "next/navigation";
import { useEffect, useReducer, useRef, useState, useTransition } from "react";
import type { ComponentProps, KeyboardEvent as ReactKeyboardEvent, RefObject } from "react";

import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type {
  AddRecipientResult,
  ManagementFailureCode,
  MutationResult,
  UpdateRecipientLabelResult,
} from "@/lib/portal/management";
import type { NotificationRecipientRow } from "@/lib/portal/rows";
import { RECIPIENTS_INTRO } from "@/lib/portal/staff-language";

import {
  addNotificationRecipient,
  removeNotificationRecipient,
  toggleNotificationRecipient,
  updateRecipientLabel,
} from "./actions";

/** The notification_recipients columns the settings page reads. */
export type RecipientRow = Readonly<
  Pick<NotificationRecipientRow, "id" | "email" | "label" | "active">
>;

type RecipientMutationResult = MutationResult | AddRecipientResult | UpdateRecipientLabelResult;

const FAILURE_COPY = {
  invalid: "That doesn't look like a valid email address.",
  conflict: "That address is already on the list.",
  not_found: "That recipient no longer exists — the list has been refreshed.",
  unavailable: "Something went wrong saving the change. Try again.",
} as const satisfies Record<ManagementFailureCode, string>;

function failureMessage(code: ManagementFailureCode): string {
  return FAILURE_COPY[code];
}

function keepFocusInDialog(event: ReactKeyboardEvent<HTMLDialogElement>) {
  if (event.key !== "Tab") return;
  const controls = Array.from(
    event.currentTarget.querySelectorAll<HTMLButtonElement>("button:not([disabled])"),
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

// Every mutation reports per row, not per panel: only the affected control
// Goes pending while the rest of the list stays live. The reversible toggle
// Offers an undo in plain language instead of making staff reverse it
// Themselves.
interface RecipientsState {
  readonly pendingKey: string | null;
  readonly error: string | null;
  readonly addEmailError: string | null;
  readonly deliveryNotice: { readonly tone: "success" | "warning"; readonly text: string } | null;
  readonly undo: {
    readonly recipientId: string;
    readonly email: string;
    readonly restoredActive: boolean;
  } | null;
  readonly labelDraft: { readonly recipientId: string; readonly value: string } | null;
  readonly labelNotice: string | null;
  readonly removalNotice: string | null;
}

type RecipientsAction =
  | { readonly type: "begin"; readonly key: string }
  | { readonly type: "failed"; readonly message: string }
  | { readonly type: "add_validation"; readonly message: string }
  | { readonly type: "clear_add_validation" }
  | { readonly type: "settle" }
  | { readonly type: "delivery"; readonly notice: RecipientsState["deliveryNotice"] }
  | { readonly type: "undo_ready"; readonly undo: RecipientsState["undo"] }
  | { readonly type: "dismiss_undo" }
  | { readonly type: "label_draft"; readonly draft: RecipientsState["labelDraft"] }
  | { readonly type: "label_saved"; readonly notice: string }
  | { readonly type: "removed"; readonly notice: string };

const INITIAL_STATE: RecipientsState = {
  pendingKey: null,
  error: null,
  addEmailError: null,
  deliveryNotice: null,
  undo: null,
  labelDraft: null,
  labelNotice: null,
  removalNotice: null,
};

function recipientsReducer(
  state: Readonly<RecipientsState>,
  action: Readonly<RecipientsAction>,
): RecipientsState {
  switch (action.type) {
    case "begin":
      return {
        ...state,
        pendingKey: action.key,
        error: null,
        addEmailError: null,
        deliveryNotice: null,
        undo: null,
        labelNotice: null,
        removalNotice: null,
      };
    case "failed":
      return { ...state, pendingKey: null, error: action.message };
    case "add_validation":
      return {
        ...state,
        error: null,
        addEmailError: action.message,
        deliveryNotice: null,
        undo: null,
        labelNotice: null,
        removalNotice: null,
      };
    case "clear_add_validation":
      return { ...state, addEmailError: null };
    case "settle":
      return { ...state, pendingKey: null };
    case "delivery":
      return { ...state, pendingKey: null, deliveryNotice: action.notice };
    case "undo_ready":
      return { ...state, pendingKey: null, undo: action.undo };
    case "dismiss_undo":
      return { ...state, undo: null };
    case "label_draft":
      return { ...state, labelDraft: action.draft };
    case "label_saved":
      return {
        ...state,
        pendingKey: null,
        labelDraft: null,
        labelNotice: action.notice,
      };
    case "removed":
      return {
        ...state,
        pendingKey: null,
        error: null,
        removalNotice: action.notice,
      };
    default:
      return state;
  }
}

function RemoveRecipientDialog({
  recipient,
  dialogRef,
  cancelRef,
  pending,
  onCancel,
  onConfirm,
  onClose,
}: Readonly<{
  recipient: RecipientRow;
  dialogRef: RefObject<HTMLDialogElement | null>;
  cancelRef: RefObject<HTMLButtonElement | null>;
  pending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  onClose: () => void;
}>) {
  return (
    <dialog
      ref={dialogRef}
      aria-modal="true"
      aria-labelledby="remove-recipient-title"
      aria-describedby="remove-recipient-copy"
      data-testid="remove-recipient-dialog"
      onCancel={(event) => {
        event.preventDefault();
        if (!pending) onCancel();
      }}
      onKeyDown={keepFocusInDialog}
      onClose={onClose}
      className="portal-confirm-dialog"
    >
      <div className="portal-confirm-dialog-body">
        <div className="portal-confirm-dialog-heading">
          <h2 id="remove-recipient-title" className="portal-confirm-dialog-title">
            Remove {recipient.email}?
          </h2>
          <button
            type="button"
            disabled={pending}
            data-testid="close-remove-recipient-dialog"
            onClick={onCancel}
            className="portal-confirm-dialog-close"
          >
            Close
          </button>
        </div>
        <p id="remove-recipient-copy">
          Notification emails will stop for {recipient.email}. Removing this address does not remove
          appointment requests from the portal queue.
        </p>
      </div>
      <div className="portal-confirm-dialog-actions">
        <Button
          ref={cancelRef}
          type="button"
          autoFocus
          disabled={pending}
          data-testid="cancel-remove-recipient"
          onClick={onCancel}
          className="disabled:opacity-60"
        >
          Cancel
        </Button>
        <button
          type="button"
          disabled={pending}
          data-testid="confirm-remove-recipient"
          onClick={onConfirm}
          className="portal-confirm-dialog-destructive min-h-11 disabled:opacity-60"
        >
          {pending ? "Removing recipient…" : "Remove recipient"}
        </button>
      </div>
    </dialog>
  );
}

function RecipientRowItem({
  recipient,
  isAdmin,
  pendingKey,
  labelDraft,
  onToggle,
  onRemove,
  onEditLabel,
  onDraftChange,
  onSaveLabel,
  onCancelLabel,
}: Readonly<{
  recipient: RecipientRow;
  isAdmin: boolean;
  pendingKey: string | null;
  labelDraft: RecipientsState["labelDraft"];
  onToggle: () => void;
  onRemove: () => void;
  onEditLabel: () => void;
  onDraftChange: (value: string) => void;
  onSaveLabel: () => void;
  onCancelLabel: () => void;
}>) {
  const togglePending = pendingKey === `toggle:${recipient.id}`;
  const removePending = pendingKey === `remove:${recipient.id}`;
  const labelPending = pendingKey === `label:${recipient.id}`;
  const label = recipient.label?.trim();
  const hasLabel = label !== undefined && label !== "";
  const activeLabelDraft = labelDraft?.recipientId === recipient.id ? labelDraft : null;
  const editingLabel = activeLabelDraft !== null;
  const labelInputRef = useRef<HTMLInputElement>(null);
  const editButtonRef = useRef<HTMLButtonElement>(null);
  const toggleButtonRef = useRef<HTMLButtonElement>(null);
  const restoreEditFocusRef = useRef(false);
  const restoreToggleFocusRef = useRef(false);

  useEffect(() => {
    if (!editingLabel) return;
    labelInputRef.current?.focus();
  }, [editingLabel]);

  useEffect(() => {
    if (editingLabel || !restoreEditFocusRef.current) return;
    restoreEditFocusRef.current = false;
    editButtonRef.current?.focus();
  }, [editingLabel]);

  useEffect(() => {
    if (togglePending || !restoreToggleFocusRef.current) return;
    restoreToggleFocusRef.current = false;
    toggleButtonRef.current?.focus();
  }, [togglePending]);

  return (
    <li
      data-recipient-id={recipient.id}
      data-recipient-email={recipient.email}
      data-recipient-active={recipient.active}
      className="flex flex-wrap items-center justify-between gap-3 py-3.5"
    >
      <div className="min-w-0">
        <p className="truncate font-bold text-[var(--color-ink)]">{recipient.email}</p>
        {editingLabel ? (
          <div className="mt-1.5 flex flex-wrap items-end gap-2">
            <Field className="w-56">
              <FieldLabel htmlFor={`label-${recipient.id}`}>Recipient label</FieldLabel>
              <Input
                ref={labelInputRef}
                id={`label-${recipient.id}`}
                type="text"
                maxLength={120}
                value={activeLabelDraft.value}
                disabled={labelPending}
                onChange={(event) => {
                  onDraftChange(event.target.value);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    onSaveLabel();
                  }
                  if (event.key === "Escape") {
                    event.preventDefault();
                    restoreEditFocusRef.current = true;
                    onCancelLabel();
                  }
                }}
                className="text-[0.85rem]"
              />
            </Field>
            <button
              type="button"
              data-action="save-label"
              disabled={labelPending}
              onClick={onSaveLabel}
              className="min-h-11 rounded-[var(--radius-sm)] border border-[var(--color-teal-ink)] px-3 text-[0.85rem] font-bold text-[var(--color-teal-ink)] disabled:opacity-60"
            >
              {labelPending ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              disabled={labelPending}
              onClick={() => {
                restoreEditFocusRef.current = true;
                onCancelLabel();
              }}
              className="min-h-11 px-2 text-[0.85rem] font-bold text-[var(--color-muted-ink)] disabled:opacity-60"
            >
              Cancel
            </button>
          </div>
        ) : (
          <p className="text-[0.85rem] text-[var(--color-muted-ink)]">
            {hasLabel ? label : "No label"}
            <button
              ref={editButtonRef}
              type="button"
              data-action="edit-label"
              onClick={onEditLabel}
              className="ml-2 min-h-11 align-baseline font-bold text-[var(--color-teal-ink)] underline underline-offset-2"
            >
              {hasLabel ? "Edit label" : "Add a label"}
            </button>
          </p>
        )}
      </div>
      <div className="flex flex-wrap items-center justify-end gap-2">
        <span
          data-testid="recipient-state"
          data-active={recipient.active}
          className="portal-recipient-state"
        >
          {recipient.active ? "Active" : "Paused"}
        </span>
        <button
          id={`recipient-toggle-${recipient.id}`}
          ref={toggleButtonRef}
          type="button"
          aria-pressed={recipient.active}
          aria-label={`${recipient.active ? "Pause" : "Resume"} notifications for ${recipient.email}`}
          data-action="toggle"
          disabled={togglePending}
          onClick={() => {
            restoreToggleFocusRef.current = true;
            onToggle();
          }}
          className="flex min-h-11 items-center rounded-[var(--radius-sm)] border border-[var(--color-teal-ink)] px-3.5 text-[0.85rem] font-bold text-[var(--color-teal-ink)] transition-colors disabled:opacity-60"
        >
          {togglePending ? "Saving…" : recipient.active ? "Pause" : "Resume"}
        </button>
        {isAdmin && (
          <button
            id={`remove-recipient-${recipient.id}`}
            type="button"
            data-action="remove"
            disabled={removePending}
            onClick={onRemove}
            className="flex min-h-11 items-center rounded-[var(--radius-sm)] border border-[var(--color-line-2)] px-3.5 text-[0.85rem] font-bold text-[var(--color-body)] transition-colors hover:border-[var(--color-amber-deep)] disabled:opacity-60"
          >
            {removePending ? "Removing…" : "Remove"}
          </button>
        )}
      </div>
    </li>
  );
}

type FormAction = Exclude<ComponentProps<"form">["action"], string | undefined>;

function RecipientNotices({
  state,
  onUndo,
  onDismissUndo,
}: Readonly<{
  state: Readonly<RecipientsState>;
  onUndo: () => void;
  onDismissUndo: () => void;
}>) {
  const { pendingKey, error, deliveryNotice, undo, labelNotice, removalNotice } = state;

  return (
    <>
      {error !== null && error !== "" && (
        <p
          role="alert"
          className="mt-4 rounded-[var(--radius-sm)] bg-[var(--color-amber-soft)] px-4 py-3 text-sm font-bold text-[var(--color-ink)]"
        >
          {error}
        </p>
      )}

      {deliveryNotice !== null && (
        <p
          role="status"
          data-testid="recipient-delivery-status"
          className={`mt-4 rounded-[var(--radius-sm)] px-4 py-3 text-sm font-bold text-[var(--color-ink)] ${
            deliveryNotice.tone === "success"
              ? "bg-[var(--color-mint)]"
              : "bg-[var(--color-amber-soft)]"
          }`}
        >
          {deliveryNotice.text}
        </p>
      )}

      {undo !== null && (
        <p
          role="status"
          data-testid="recipient-undo"
          className="mt-4 flex flex-wrap items-center gap-3 rounded-[var(--radius-sm)] bg-[var(--color-mint)] px-4 py-3 text-sm text-[var(--color-ink)]"
        >
          <span className="font-bold">
            Notifications {undo.restoredActive ? "paused" : "resumed"} for {undo.email}.
          </span>
          <button
            type="button"
            data-action="undo-toggle"
            disabled={pendingKey === `toggle:${undo.recipientId}`}
            onClick={onUndo}
            className="min-h-11 font-bold text-[var(--color-teal-ink)] underline underline-offset-2 disabled:opacity-60"
          >
            Undo
          </button>
          <button
            type="button"
            onClick={onDismissUndo}
            className="min-h-11 font-bold text-[var(--color-muted-ink)]"
          >
            Dismiss
          </button>
        </p>
      )}

      {labelNotice !== null && labelNotice !== "" && (
        <p
          role="status"
          data-testid="recipient-label-status"
          className="mt-4 rounded-[var(--radius-sm)] bg-[var(--color-mint)] px-4 py-3 text-sm font-bold text-[var(--color-ink)]"
        >
          {labelNotice}
        </p>
      )}

      {removalNotice !== null && removalNotice !== "" && (
        <p
          role="status"
          data-testid="recipient-removal-status"
          className="mt-4 rounded-[var(--radius-sm)] bg-[var(--color-mint)] px-4 py-3 text-sm font-bold text-[var(--color-ink)]"
        >
          {removalNotice}
        </p>
      )}
    </>
  );
}

function AddRecipientForm({
  action,
  emailRef,
  emailError,
  pending,
  onClearEmailError,
}: Readonly<{
  action: FormAction;
  emailRef: RefObject<HTMLInputElement | null>;
  emailError: string | null;
  pending: boolean;
  onClearEmailError: () => void;
}>) {
  return (
    <form
      className="mt-5 border-t border-[var(--color-line)] pt-5"
      action={action}
      noValidate
      aria-labelledby="add-recipient-heading"
    >
      <h3 id="add-recipient-heading" className="text-sm font-bold text-[var(--color-ink)]">
        Add a recipient
      </h3>
      {emailError !== null && (
        <p
          role="alert"
          data-testid="add-recipient-error-summary"
          className="portal-settings-form-summary"
        >
          Check the highlighted field before adding this recipient.
        </p>
      )}
      <div className="mt-3 grid gap-3 sm:grid-cols-[1.4fr_1fr_auto]">
        <Field className="min-w-0">
          <FieldLabel htmlFor="recipient-email">Recipient email</FieldLabel>
          <Input
            ref={emailRef}
            id="recipient-email"
            name="email"
            type="email"
            required
            placeholder="frontdesk@example.com"
            aria-invalid={emailError !== null || undefined}
            aria-describedby={emailError !== null ? "recipient-email-error" : undefined}
            disabled={pending}
            onChange={() => {
              if (emailError !== null) onClearEmailError();
            }}
          />
          {emailError !== null && <FieldError id="recipient-email-error">{emailError}</FieldError>}
        </Field>
        <Field className="min-w-0">
          <FieldLabel htmlFor="recipient-label">Recipient label (optional)</FieldLabel>
          <Input
            id="recipient-label"
            name="label"
            type="text"
            placeholder="Front desk"
            disabled={pending}
          />
        </Field>
        <Button type="submit" disabled={pending} className="self-end disabled:opacity-60">
          {pending ? "Saving…" : "Add recipient"}
        </Button>
      </div>
    </form>
  );
}

function useRecipientFocusAfterRefresh(recipients: readonly Readonly<RecipientRow>[]) {
  const focusAfterRefreshRef = useRef<string | null>(null);
  const recipientRenderKey = recipients
    .map((recipient) => `${recipient.id}:${String(recipient.active)}:${recipient.label ?? ""}`)
    .join("\n");

  useEffect(() => {
    const targetId = focusAfterRefreshRef.current;
    if (targetId === null) return;
    const target = document.getElementById(targetId);
    if (target === null) return;
    focusAfterRefreshRef.current = null;
    target.focus();
  }, [recipientRenderKey]);

  return focusAfterRefreshRef;
}

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React props carry framework member types that cannot be made readonly
export function RecipientsManager({
  recipients,
  isAdmin,
}: Readonly<{
  recipients: RecipientRow[];
  isAdmin: boolean;
}>) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [state, dispatch] = useReducer(recipientsReducer, INITIAL_STATE);
  const [removeTarget, setRemoveTarget] = useState<RecipientRow | null>(null);
  const recipientEmailRef = useRef<HTMLInputElement>(null);
  const listHeadingRef = useRef<HTMLHeadingElement>(null);
  const removeDialogRef = useRef<HTMLDialogElement>(null);
  const removeCancelRef = useRef<HTMLButtonElement>(null);
  const removeOpenerIdRef = useRef<string | null>(null);
  const removalSucceededRef = useRef(false);
  const recipientFocusAfterRefreshRef = useRecipientFocusAfterRefresh(recipients);
  const { pendingKey, addEmailError, undo, labelDraft } = state;

  useEffect(() => {
    if (removeTarget === null) return;
    const dialog = removeDialogRef.current;
    if (dialog === null) return;
    if (!dialog.open) dialog.showModal();
    removeCancelRef.current?.focus();
  }, [removeTarget]);

  function run(
    key: string,
    action: () => Promise<RecipientMutationResult>,
    onSuccess?: (result: Readonly<Extract<RecipientMutationResult, { ok: true }>>) => void,
    onFailure?: () => void,
  ) {
    dispatch({ type: "begin", key });
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        dispatch({ type: "failed", message: failureMessage(result.code) });
        onFailure?.();
        return;
      }
      if (onSuccess) {
        onSuccess(result);
      } else {
        dispatch({ type: "settle" });
      }
      router.refresh();
    });
  }

  function toggleRecipient(recipient: Readonly<RecipientRow>) {
    recipientFocusAfterRefreshRef.current = `recipient-toggle-${recipient.id}`;
    run(
      `toggle:${recipient.id}`,
      async () =>
        toggleNotificationRecipient({
          recipientId: recipient.id,
          active: !recipient.active,
        }),
      () => {
        dispatch({
          type: "undo_ready",
          undo: {
            recipientId: recipient.id,
            email: recipient.email,
            restoredActive: recipient.active,
          },
        });
      },
    );
  }

  function undoToggle() {
    if (undo === null) return;
    const target = undo;
    recipientFocusAfterRefreshRef.current = `recipient-toggle-${target.recipientId}`;
    run(`toggle:${target.recipientId}`, async () =>
      toggleNotificationRecipient({
        recipientId: target.recipientId,
        active: target.restoredActive,
      }),
    );
  }

  function openRemoveDialog(recipient: Readonly<RecipientRow>) {
    removeOpenerIdRef.current = `remove-recipient-${recipient.id}`;
    removalSucceededRef.current = false;
    setRemoveTarget(recipient);
  }

  function closeRemoveDialog() {
    removeDialogRef.current?.close();
  }

  function finishRemoveDialog() {
    const removalSucceeded = removalSucceededRef.current;
    setRemoveTarget(null);
    requestAnimationFrame(() => {
      if (removalSucceeded) {
        listHeadingRef.current?.focus();
      } else {
        const opener =
          removeOpenerIdRef.current === null
            ? null
            : document.getElementById(removeOpenerIdRef.current);
        if (opener instanceof HTMLButtonElement) opener.focus();
      }
      removalSucceededRef.current = false;
    });
  }

  function confirmRemoval() {
    if (removeTarget === null) return;
    const recipient = removeTarget;
    run(
      `remove:${recipient.id}`,
      async () => removeNotificationRecipient({ id: recipient.id }),
      () => {
        removalSucceededRef.current = true;
        dispatch({
          type: "removed",
          notice: `Removed ${recipient.email} from notification recipients.`,
        });
        closeRemoveDialog();
      },
      closeRemoveDialog,
    );
  }

  function saveLabel(recipient: Readonly<RecipientRow>) {
    if (labelDraft === null || labelDraft.recipientId !== recipient.id) return;
    const next = labelDraft.value.trim();
    const currentLabel = recipient.label?.trim() ?? "";
    if (next === currentLabel) {
      dispatch({ type: "label_draft", draft: null });
      return;
    }
    run(
      `label:${recipient.id}`,
      async () =>
        updateRecipientLabel({
          recipientId: recipient.id,
          label: next === "" ? null : next,
        }),
      () => {
        dispatch({
          type: "label_saved",
          notice: `Label updated for ${recipient.email}.`,
        });
      },
    );
  }

  function addFromForm(formData: FormData) {
    const rawEmail = formData.get("email");
    const rawLabel = formData.get("label");
    const email = rawEmail === null || rawEmail instanceof File ? "" : rawEmail.trim();
    const label = rawLabel === null || rawLabel instanceof File ? "" : rawLabel.trim();
    const emailError =
      email === ""
        ? "Enter a recipient email address."
        : recipientEmailRef.current?.validity.typeMismatch === true
          ? "Enter a complete email address."
          : null;
    if (emailError !== null) {
      dispatch({ type: "add_validation", message: emailError });
      recipientEmailRef.current?.focus();
      return;
    }
    run(
      "add",
      async () => addNotificationRecipient(label ? { email, label } : { email }),
      (result) => {
        dispatch({
          type: "delivery",
          notice:
            "delivery" in result && result.delivery === "accepted"
              ? {
                  tone: "success",
                  text: "Recipient added and confirmation email accepted for delivery.",
                }
              : {
                  tone: "warning",
                  text: "Recipient added, but confirmation email delivery could not be confirmed. The portal queue remains the system of record.",
                },
        });
      },
    );
  }

  return (
    <div data-testid="recipients-manager" className="portal-panel p-6 sm:p-7">
      <h2
        ref={listHeadingRef}
        id="recipient-list-heading"
        tabIndex={-1}
        data-testid="recipient-list-heading"
        className="portal-settings-list-heading text-[1.05rem] font-black text-[var(--color-ink)]"
      >
        Notification recipients
      </h2>
      <p className="mt-1.5 max-w-[65ch] text-[0.9rem] leading-relaxed text-[var(--color-muted-ink)]">
        {RECIPIENTS_INTRO}
      </p>

      <RecipientNotices
        state={state}
        onUndo={undoToggle}
        onDismissUndo={() => {
          dispatch({ type: "dismiss_undo" });
        }}
      />

      <ul
        aria-labelledby="recipient-list-heading"
        data-testid="recipient-list"
        className="mt-5 divide-y divide-[var(--color-line)]"
      >
        {recipients.length === 0 && (
          <li className="py-4 text-[0.95rem] text-[var(--color-muted-ink)]">
            No recipients yet — new-appointment-request emails are currently going to no one. The
            queue still records everything.
          </li>
        )}
        {recipients.map((recipient) => (
          <RecipientRowItem
            key={recipient.id}
            recipient={recipient}
            isAdmin={isAdmin}
            pendingKey={pendingKey}
            labelDraft={labelDraft}
            onToggle={() => {
              toggleRecipient(recipient);
            }}
            onRemove={() => {
              openRemoveDialog(recipient);
            }}
            onEditLabel={() => {
              dispatch({
                type: "label_draft",
                draft: {
                  recipientId: recipient.id,
                  value: recipient.label?.trim() ?? "",
                },
              });
            }}
            onDraftChange={(value) => {
              dispatch({
                type: "label_draft",
                draft: { recipientId: recipient.id, value },
              });
            }}
            onSaveLabel={() => {
              saveLabel(recipient);
            }}
            onCancelLabel={() => {
              dispatch({ type: "label_draft", draft: null });
            }}
          />
        ))}
      </ul>

      {isAdmin ? (
        <AddRecipientForm
          action={addFromForm}
          emailRef={recipientEmailRef}
          emailError={addEmailError}
          pending={pendingKey === "add"}
          onClearEmailError={() => {
            dispatch({ type: "clear_add_validation" });
          }}
        />
      ) : (
        <p className="mt-5 border-t border-[var(--color-line)] pt-5 text-[0.9rem] text-[var(--color-muted-ink)]">
          Adding or removing recipients needs an administrator — you can pause or resume any address
          above.
        </p>
      )}
      {removeTarget !== null && (
        <RemoveRecipientDialog
          recipient={removeTarget}
          dialogRef={removeDialogRef}
          cancelRef={removeCancelRef}
          pending={pendingKey === `remove:${removeTarget.id}`}
          onCancel={closeRemoveDialog}
          onConfirm={confirmRemoval}
          onClose={finishRemoveDialog}
        />
      )}
    </div>
  );
}
