"use client";

import { useActionState } from "react";
import {
  setPasswordAction,
  type SetPasswordActionState,
} from "@/app/admin/actions";

const INITIAL_STATE: SetPasswordActionState = { error: null };
const inputClassName =
  "mt-2 w-full rounded-[var(--radius)] border border-[var(--color-line-2)] bg-white px-3.5 py-3 text-base text-[var(--color-ink)] outline-none transition-colors focus:border-[var(--color-teal-ink)]";

export function PasswordForm() {
  const [state, formAction, pending] = useActionState(
    setPasswordAction,
    INITIAL_STATE,
  );

  return (
    <form action={formAction} className="mt-7 space-y-5">
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
          className={inputClassName}
        />
      </div>
      {state.error ? (
        <p
          role="alert"
          className="rounded-[var(--radius)] bg-[var(--color-amber-soft)] px-4 py-3 text-sm font-bold text-[var(--color-ink)]"
        >
          {state.error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="btn btn-navy w-full disabled:cursor-wait disabled:opacity-65"
      >
        {pending ? "Saving…" : "Set password"}
      </button>
    </form>
  );
}
