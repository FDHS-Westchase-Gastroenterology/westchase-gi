"use client";

import { useEffect, useRef } from "react";

import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { NotificationRecipientRow } from "@/lib/portal/rows";

/** The notification_recipients columns the settings page reads. */
export type RecipientRow = Readonly<
  Pick<NotificationRecipientRow, "id" | "email" | "label" | "active">
>;

export interface RecipientLabelDraft {
  readonly recipientId: string;
  readonly value: string;
}

export function RecipientRowItem({
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
  labelDraft: RecipientLabelDraft | null;
  onToggle: () => void;
  onRemove: () => void;
  onEditLabel: () => void;
  onDraftChange: (value: string) => void;
  onSaveLabel: () => void;
  onCancelLabel: () => void;
}>) {
  const togglePending = pendingKey === `toggle:${recipient.id}`;
  const toggleLabel = recipient.active ? "Pause" : "Resume";
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
          aria-label={`${toggleLabel} notifications for ${recipient.email}`}
          data-action="toggle"
          disabled={togglePending}
          onClick={() => {
            restoreToggleFocusRef.current = true;
            onToggle();
          }}
          className="flex min-h-11 items-center rounded-[var(--radius-sm)] border border-[var(--color-teal-ink)] px-3.5 text-[0.85rem] font-bold text-[var(--color-teal-ink)] transition-colors disabled:opacity-60"
        >
          {togglePending ? "Saving…" : toggleLabel}
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
