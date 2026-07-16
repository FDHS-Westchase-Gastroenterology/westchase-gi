"use client";

import Link from "next/link";
import { useActionState } from "react";
import {
  loginAction,
  type LoginActionState,
} from "@/app/admin/actions";

const INITIAL_STATE: LoginActionState = { error: null };

const inputClassName =
  "mt-2 w-full rounded-[var(--radius)] border border-[var(--color-line-2)] bg-white px-3.5 py-3 text-base text-[var(--color-ink)] outline-none transition-colors focus:border-[var(--color-teal-ink)]";

export function LoginForm() {
  const [state, formAction, pending] = useActionState(
    loginAction,
    INITIAL_STATE,
  );

  return (
    <form action={formAction} className="mt-7 space-y-5">
      <div>
        <label
          htmlFor="email"
          className="block text-sm font-bold text-[var(--color-ink)]"
        >
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          required
          disabled={pending}
          aria-invalid={state.error ? true : undefined}
          className={inputClassName}
        />
      </div>

      <div>
        <div className="flex items-center justify-between gap-4">
          <label
            htmlFor="password"
            className="block text-sm font-bold text-[var(--color-ink)]"
          >
            Password
          </label>
          <Link
            href="/admin/forgot-password"
            className="text-sm font-bold text-[var(--color-teal-ink)] underline underline-offset-2"
          >
            Forgot password?
          </Link>
        </div>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          disabled={pending}
          aria-invalid={state.error ? true : undefined}
          className={inputClassName}
        />
      </div>

      {state.error ? (
        <p
          id="login-error"
          role="alert"
          aria-live="polite"
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
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
