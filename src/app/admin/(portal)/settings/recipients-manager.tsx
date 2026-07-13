"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  addNotificationRecipient,
  removeNotificationRecipient,
  toggleNotificationRecipient,
} from "./actions";

export type RecipientRow = {
  id: string;
  email: string;
  label: string | null;
  active: boolean;
};

type MutationOutcome = { ok: boolean; code?: string };

const FAILURE_COPY: Record<string, string> = {
  invalid: "That doesn't look like a valid email address.",
  conflict: "That address is already on the list.",
  not_found: "That recipient no longer exists — the list has been refreshed.",
  unavailable: "Something went wrong saving the change. Try again.",
};

function failureMessage(result: MutationOutcome): string {
  return FAILURE_COPY[result.code ?? "unavailable"] ?? FAILURE_COPY.unavailable;
}

export function RecipientsManager({
  recipients,
  isAdmin,
}: {
  recipients: RecipientRow[];
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(action: () => Promise<MutationOutcome>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        setError(failureMessage(result));
        return;
      }
      router.refresh();
    });
  }

  function addFromForm(formData: FormData) {
    const email = String(formData.get("email") ?? "").trim();
    const label = String(formData.get("label") ?? "").trim();
    if (!email) return;
    run(() =>
      addNotificationRecipient({ email, label: label || undefined }),
    );
  }

  return (
    <div
      data-testid="recipients-manager"
      className="rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-white p-6 sm:p-7"
    >
      <h2 className="text-[1.05rem] font-black text-[var(--color-ink)]">
        Notification recipients
      </h2>
      <p className="mt-1.5 max-w-[65ch] text-[0.9rem] leading-relaxed text-[var(--color-muted)]">
        Every address here gets an email ping when a new request arrives.
        Notifications supplement the queue — the portal is the system of
        record, so nothing is lost if an email goes astray.
      </p>

      {error && (
        <p
          role="alert"
          className="mt-4 rounded-[var(--radius-sm)] bg-[var(--color-amber-soft)] px-4 py-3 text-sm font-bold text-[var(--color-ink)]"
        >
          {error}
        </p>
      )}

      <ul data-testid="recipient-list" className="mt-5 divide-y divide-[var(--color-line)]">
        {recipients.length === 0 && (
          <li className="py-4 text-[0.95rem] text-[var(--color-muted)]">
            No recipients yet — new-request emails are currently going to
            no one. The queue still records everything.
          </li>
        )}
        {recipients.map((recipient) => (
          <li
            key={recipient.id}
            data-recipient-email={recipient.email}
            className="flex flex-wrap items-center justify-between gap-3 py-3.5"
          >
            <div className="min-w-0">
              <p className="truncate font-bold text-[var(--color-ink)]">
                {recipient.email}
              </p>
              <p className="text-[0.85rem] text-[var(--color-muted)]">
                {recipient.label?.trim() || "No label"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-pressed={recipient.active}
                data-action="toggle"
                disabled={pending}
                onClick={() =>
                  run(() =>
                    toggleNotificationRecipient({
                      recipientId: recipient.id,
                      active: !recipient.active,
                    }),
                  )
                }
                className={`flex min-h-10 items-center rounded-full border px-3.5 text-[0.85rem] font-bold transition-colors disabled:opacity-60 ${
                  recipient.active
                    ? "border-[var(--color-teal-ink)] bg-[var(--color-mint)] text-[var(--color-teal-ink)]"
                    : "border-[var(--color-line-2)] bg-white text-[var(--color-muted)]"
                }`}
              >
                {recipient.active ? "Active" : "Paused"}
              </button>
              {isAdmin && (
                <button
                  type="button"
                  data-action="remove"
                  disabled={pending}
                  onClick={() => {
                    if (
                      window.confirm(
                        `Remove ${recipient.email} from notifications? The queue keeps working either way.`,
                      )
                    ) {
                      run(() =>
                        removeNotificationRecipient({ id: recipient.id }),
                      );
                    }
                  }}
                  className="flex min-h-10 items-center rounded-[var(--radius-sm)] border border-[var(--color-line-2)] px-3.5 text-[0.85rem] font-bold text-[var(--color-body)] transition-colors hover:border-[var(--color-amber-deep)] disabled:opacity-60"
                >
                  Remove
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>

      {isAdmin ? (
        <form
          className="mt-5 border-t border-[var(--color-line)] pt-5"
          action={addFromForm}
        >
          <h3 className="text-sm font-bold text-[var(--color-ink)]">
            Add a recipient
          </h3>
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
                className="min-h-11 w-full rounded-[var(--radius)] border border-[var(--color-line-2)] bg-white px-3.5 text-[0.95rem] text-[var(--color-ink)] outline-none transition-colors focus:border-[var(--color-teal-ink)]"
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
                className="min-h-11 w-full rounded-[var(--radius)] border border-[var(--color-line-2)] bg-white px-3.5 text-[0.95rem] text-[var(--color-ink)] outline-none transition-colors focus:border-[var(--color-teal-ink)]"
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
      ) : (
        <p className="mt-5 border-t border-[var(--color-line)] pt-5 text-[0.9rem] text-[var(--color-muted)]">
          Adding or removing recipients needs an administrator — you can
          pause or resume any address above.
        </p>
      )}
    </div>
  );
}
