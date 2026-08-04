"use client";

import Link from "next/link";
import { useActionState, useLayoutEffect } from "react";
import {
  recoverPasswordAction,
  setPasswordAction,
  type SetPasswordActionState,
} from "@/app/admin/actions";

const INITIAL_STATE: SetPasswordActionState = {
  error: null,
  changeCommitted: false,
};
const inputClassName =
  "mt-2 w-full rounded-[var(--radius)] border border-[var(--color-line-2)] bg-white px-3.5 py-3 text-base text-[var(--color-ink)] outline-none transition-colors focus:border-[var(--color-teal-ink)]";

export function PasswordForm({
  mode,
  recoveryTokenHash,
}: {
  mode: "invite" | "recovery";
  recoveryTokenHash?: string;
}) {
  const [state, formAction, pending] = useActionState(
    recoveryTokenHash ? recoverPasswordAction : setPasswordAction,
    INITIAL_STATE,
  );

  useLayoutEffect(() => {
    // A server-action error render can restore the document's original URL,
    // including its fragment. Keep the recovery bearer out of the address bar
    // while preserving the hidden value needed for a bounded retry.
    if (recoveryTokenHash && window.location.hash) {
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, [recoveryTokenHash, state]);

  return (
    <form action={formAction} className="mt-7 space-y-5">
      {recoveryTokenHash ? (
        <input type="hidden" name="tokenHash" value={recoveryTokenHash} />
      ) : null}
      <p id="password-policy" className="text-sm text-[var(--color-muted)]">
        Use at least 12 characters. Password managers and pasted passwords are
        supported.
      </p>
      <div>
        <label
          htmlFor="new-password"
          className="block text-sm font-bold text-[var(--color-ink)]"
        >
          New password
        </label>
        <input
          id="new-password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={12}
          maxLength={1024}
          required
          disabled={pending}
          aria-invalid={state.error ? true : undefined}
          aria-describedby={
            state.error ? "password-policy password-error" : "password-policy"
          }
          className={inputClassName}
        />
      </div>
      <div>
        <label
          htmlFor="confirm-password"
          className="block text-sm font-bold text-[var(--color-ink)]"
        >
          Confirm password
        </label>
        <input
          id="confirm-password"
          name="passwordConfirmation"
          type="password"
          autoComplete="new-password"
          minLength={12}
          maxLength={1024}
          required
          disabled={pending}
          aria-invalid={state.error ? true : undefined}
          aria-describedby={
            state.error ? "password-policy password-error" : "password-policy"
          }
          className={inputClassName}
        />
      </div>
      {state.error ? (
        <p
          id="password-error"
          role="alert"
          aria-live="polite"
          className="rounded-[var(--radius)] bg-[var(--color-amber-soft)] px-4 py-3 text-sm font-bold text-[var(--color-ink)]"
        >
          {state.error}
        </p>
      ) : null}
      {state.changeCommitted && mode === "recovery" ? (
        <div className="rounded-[var(--radius)] border border-[var(--color-line)] p-4 text-sm text-[var(--color-muted)]">
          <p>Do not repeat the reset. Your new password is already active.</p>
          <Link
            href="/admin/login"
            className="mt-2 inline-flex min-h-11 items-center font-bold text-[var(--color-teal-ink)] underline underline-offset-2"
          >
            Sign in with the new password
          </Link>
        </div>
      ) : null}
      {!state.changeCommitted ? (
        <button
          type="submit"
          disabled={pending}
          className="btn btn-navy min-h-11 w-full disabled:cursor-wait disabled:opacity-65"
        >
          {pending
            ? "Saving…"
            : mode === "recovery"
              ? "Set password and continue"
              : "Set password"}
        </button>
      ) : null}
    </form>
  );
}
