"use client";

import { useRouter } from "next/navigation";
import { useReducer, useTransition } from "react";

import {
  addNotificationRecipient,
  removeNotificationRecipient,
  toggleNotificationRecipient,
  updateRecipientLabel,
} from "./actions";

export interface RecipientRow {
  id: string;
  email: string;
  label: string | null;
  active: boolean;
}

interface MutationOutcome {
  ok: boolean;
  code?: string;
  delivery?: "accepted" | "failed";
}

type RecipientFailureCode = "invalid" | "conflict" | "not_found" | "unavailable";

const FAILURE_COPY = {
  invalid: "That doesn't look like a valid email address.",
  conflict: "That address is already on the list.",
  not_found: "That recipient no longer exists — the list has been refreshed.",
  unavailable: "Something went wrong saving the change. Try again.",
} as const satisfies Record<RecipientFailureCode, string>;

function isRecipientFailureCode(value: string): value is RecipientFailureCode {
  return value in FAILURE_COPY;
}

function failureMessage(result: Readonly<MutationOutcome>): string {
  const code = result.code ?? "unavailable";
  return isRecipientFailureCode(code) ? FAILURE_COPY[code] : FAILURE_COPY.unavailable;
}

// Every mutation reports per row, not per panel: only the affected control
// Goes pending while the rest of the list stays live. The reversible toggle
// Offers an undo in plain language instead of making staff reverse it
// Themselves.
interface RecipientsState {
  readonly pendingKey: string | null;
  readonly error: string | null;
  readonly deliveryNotice: { readonly tone: "success" | "warning"; readonly text: string } | null;
  readonly undo: {
    readonly recipientId: string;
    readonly email: string;
    readonly restoredActive: boolean;
  } | null;
  readonly labelDraft: { readonly recipientId: string; readonly value: string } | null;
  readonly labelNotice: string | null;
}

type RecipientsAction =
  | { readonly type: "begin"; readonly key: string }
  | { readonly type: "failed"; readonly message: string }
  | { readonly type: "settle" }
  | { readonly type: "delivery"; readonly notice: RecipientsState["deliveryNotice"] }
  | { readonly type: "undo_ready"; readonly undo: RecipientsState["undo"] }
  | { readonly type: "dismiss_undo" }
  | { readonly type: "label_draft"; readonly draft: RecipientsState["labelDraft"] }
  | { readonly type: "label_saved"; readonly notice: string };

const INITIAL_STATE: RecipientsState = {
  pendingKey: null,
  error: null,
  deliveryNotice: null,
  undo: null,
  labelDraft: null,
  labelNotice: null,
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
        deliveryNotice: null,
        undo: null,
        labelNotice: null,
      };
    case "failed":
      return { ...state, pendingKey: null, error: action.message };
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
    default:
      return state;
  }
}

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React props carry framework member types that cannot be made readonly
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

  return (
    <li
      data-recipient-email={recipient.email}
      className="flex flex-wrap items-center justify-between gap-3 py-3.5"
    >
      <div className="min-w-0">
        <p className="truncate font-bold text-[var(--color-ink)]">{recipient.email}</p>
        {labelDraft !== null && labelDraft.recipientId === recipient.id ? (
          <span className="mt-1.5 flex flex-wrap items-center gap-2">
            <label htmlFor={`label-${recipient.id}`} className="sr-only">
              Label for {recipient.email}
            </label>
            <input
              id={`label-${recipient.id}`}
              type="text"
              maxLength={120}
              value={labelDraft.value}
              disabled={labelPending}
              onChange={(event) => {
                onDraftChange(event.target.value);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  onSaveLabel();
                }
                if (event.key === "Escape") onCancelLabel();
              }}
              className="min-h-10 rounded-[var(--radius-sm)] border border-[var(--color-line-2)] bg-white px-3 text-[0.85rem] text-[var(--color-ink)] transition-colors outline-none focus:border-[var(--color-teal-ink)] disabled:opacity-60"
            />
            <button
              type="button"
              data-action="save-label"
              disabled={labelPending}
              onClick={onSaveLabel}
              className="min-h-10 rounded-[var(--radius-sm)] border border-[var(--color-teal-ink)] px-3 text-[0.85rem] font-bold text-[var(--color-teal-ink)] disabled:opacity-60"
            >
              {labelPending ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              disabled={labelPending}
              onClick={onCancelLabel}
              className="min-h-10 px-2 text-[0.85rem] font-bold text-[var(--color-muted)] disabled:opacity-60"
            >
              Cancel
            </button>
          </span>
        ) : (
          <p className="text-[0.85rem] text-[var(--color-muted)]">
            {hasLabel ? label : "No label"}
            <button
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
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-pressed={recipient.active}
          data-action="toggle"
          disabled={togglePending}
          onClick={onToggle}
          className={`flex min-h-10 items-center rounded-full border px-3.5 text-[0.85rem] font-bold transition-colors disabled:opacity-60 ${
            recipient.active
              ? "border-[var(--color-teal-ink)] bg-[var(--color-mint)] text-[var(--color-teal-ink)]"
              : "border-[var(--color-line-2)] bg-white text-[var(--color-muted)]"
          }`}
        >
          {togglePending ? "Saving…" : recipient.active ? "Active" : "Paused"}
        </button>
        {isAdmin && (
          <button
            type="button"
            data-action="remove"
            disabled={removePending}
            onClick={onRemove}
            className="flex min-h-10 items-center rounded-[var(--radius-sm)] border border-[var(--color-line-2)] px-3.5 text-[0.85rem] font-bold text-[var(--color-body)] transition-colors hover:border-[var(--color-amber-deep)] disabled:opacity-60"
          >
            {removePending ? "Removing…" : "Remove"}
          </button>
        )}
      </div>
    </li>
  );
}

function RecipientAlerts({
  error,
  deliveryNotice,
  undo,
  labelNotice,
  pendingKey,
  onUndo,
  onDismissUndo,
}: Readonly<{
  error: string | null;
  deliveryNotice: RecipientsState["deliveryNotice"];
  undo: RecipientsState["undo"];
  labelNotice: string | null;
  pendingKey: string | null;
  onUndo: () => void;
  onDismissUndo: () => void;
}>) {
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
            className="min-h-11 font-bold text-[var(--color-muted)]"
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
    </>
  );
}

function AddRecipientForm({
  pending,
  onAdd,
}: Readonly<{
  pending: boolean;
  onAdd: (formData: FormData) => void;
}>) {
  return (
    <form className="mt-5 border-t border-[var(--color-line)] pt-5" action={onAdd}>
      <h3 className="text-sm font-bold text-[var(--color-ink)]">Add a recipient</h3>
      <div className="mt-3 grid gap-3 sm:grid-cols-[1.4fr_1fr_auto]">
        <div>
          <label htmlFor="recipient-email" className="sr-only">
            Email address
          </label>
          <input
            id="recipient-email"
            name="email"
            type="email"
            required
            placeholder="frontdesk@example.com"
            disabled={pending}
            className="min-h-11 w-full rounded-[var(--radius)] border border-[var(--color-line-2)] bg-white px-3.5 text-[0.95rem] text-[var(--color-ink)] transition-colors outline-none focus:border-[var(--color-teal-ink)]"
          />
        </div>
        <div>
          <label htmlFor="recipient-label" className="sr-only">
            Label (optional)
          </label>
          <input
            id="recipient-label"
            name="label"
            type="text"
            placeholder="Label (optional)"
            disabled={pending}
            className="min-h-11 w-full rounded-[var(--radius)] border border-[var(--color-line-2)] bg-white px-3.5 text-[0.95rem] text-[var(--color-ink)] transition-colors outline-none focus:border-[var(--color-teal-ink)]"
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="btn btn-navy min-h-11 disabled:opacity-60"
        >
          {pending ? "Saving…" : "Add"}
        </button>
      </div>
    </form>
  );
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
  const { pendingKey, error, deliveryNotice, undo, labelDraft, labelNotice } = state;

  function run(
    key: string,
    action: () => Promise<MutationOutcome>,
    onSuccess?: (result: Readonly<MutationOutcome>) => void,
  ) {
    dispatch({ type: "begin", key });
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        dispatch({ type: "failed", message: failureMessage(result) });
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
    if (!email) return;
    run(
      "add",
      async () => addNotificationRecipient(label ? { email, label } : { email }),
      (result) => {
        dispatch({
          type: "delivery",
          notice:
            result.delivery === "accepted"
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
    <div
      data-testid="recipients-manager"
      className="rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-white p-6 sm:p-7"
    >
      <h2 className="text-[1.05rem] font-black text-[var(--color-ink)]">Notification recipients</h2>
      <p className="mt-1.5 max-w-[65ch] text-[0.9rem] leading-relaxed text-[var(--color-muted)]">
        Everyone on this list gets an email whenever a patient requests an appointment. The emails
        are just a heads-up — every request is always saved here in the portal, so nothing gets
        missed even if an email does.
      </p>

      <RecipientAlerts
        error={error}
        deliveryNotice={deliveryNotice}
        undo={undo}
        labelNotice={labelNotice}
        pendingKey={pendingKey}
        onUndo={() => {
          if (undo === null) return;
          const target = undo;
          run(`toggle:${target.recipientId}`, async () =>
            toggleNotificationRecipient({
              recipientId: target.recipientId,
              active: target.restoredActive,
            }),
          );
        }}
        onDismissUndo={() => {
          dispatch({ type: "dismiss_undo" });
        }}
      />

      <ul data-testid="recipient-list" className="mt-5 divide-y divide-[var(--color-line)]">
        {recipients.length === 0 && (
          <li className="py-4 text-[0.95rem] text-[var(--color-muted)]">
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
              if (
                window.confirm(
                  `Remove ${recipient.email} from notifications? The queue keeps working either way.`,
                )
              ) {
                run(`remove:${recipient.id}`, async () =>
                  removeNotificationRecipient({ id: recipient.id }),
                );
              }
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
        <AddRecipientForm pending={pendingKey === "add"} onAdd={addFromForm} />
      ) : (
        <p className="mt-5 border-t border-[var(--color-line)] pt-5 text-[0.9rem] text-[var(--color-muted)]">
          Adding or removing recipients needs an administrator — you can pause or resume any address
          above.
        </p>
      )}
    </div>
  );
}
