"use client";

import { useActionState } from "react";
import {
  requestPasswordResetAction,
  type ResetRequestActionState,
} from "@/app/admin/actions";
import { RESET_REQUEST_MESSAGE } from "@/lib/portal/contracts";

const INITIAL_STATE: ResetRequestActionState = { submitted: false };

export function ResetRequestForm() {
  const [state, formAction, pending] = useActionState(
    requestPasswordResetAction,
    INITIAL_STATE,
  );

  if (state.submitted) {
    return (
      <p
        role="status"
        data-testid="reset-request-result"
        className="mt-6 rounded-[var(--radius)] bg-[var(--color-mint-2)] px-4 py-3 text-sm font-bold text-[var(--color-ink)]"
      >
        {RESET_REQUEST_MESSAGE}
      </p>
    );
  }

  return (
    <form action={formAction} className="mt-7 space-y-5">
      <div>
        <label
          htmlFor="reset-email"
          className="block text-sm font-bold text-[var(--color-ink)]"
        >
          Email
        </label>
        <input
          id="reset-email"
          name="email"
          type="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          required
          disabled={pending}
          className="mt-2 w-full rounded-[var(--radius)] border border-[var(--color-line-2)] bg-white px-3.5 py-3 text-base text-[var(--color-ink)] outline-none transition-colors focus:border-[var(--color-teal-ink)]"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="btn btn-navy w-full disabled:cursor-wait disabled:opacity-65"
      >
        {pending ? "Sending…" : "Send reset link"}
      </button>
    </form>
  );
}
