"use client";

import { useActionState, useState } from "react";
import { loginAction } from "@/app/admin/actions";
import type { LoginActionState } from "@/app/admin/actions";
import { ResetRequestForm } from "@/app/admin/forgot-password/reset-request-form";

const INITIAL_STATE: LoginActionState = { error: null };

const inputClassName =
  "mt-2 w-full rounded-[var(--radius)] border border-[var(--color-line-2)] bg-white px-3.5 py-3 text-base text-[var(--color-ink)] outline-none transition-colors focus:border-[var(--color-teal-ink)]";

export function LoginForm({
  allowPreviewAlias,
}: {
  allowPreviewAlias: boolean;
}) {
  const [mode, setMode] = useState<"sign-in" | "recovery">("sign-in");
  const [email, setEmail] = useState("");
  const [state, formAction, pending] = useActionState(
    loginAction,
    INITIAL_STATE,
  );

  if (mode === "recovery") {
    return (
      <ResetRequestForm
        inline
        initialEmail={email}
        onEmailChange={setEmail}
        onBack={() => setMode("sign-in")}
      />
    );
  }

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
          type={allowPreviewAlias ? "text" : "email"}
          inputMode={allowPreviewAlias ? undefined : "email"}
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          required
          maxLength={254}
          disabled={pending}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          aria-invalid={state.error ? true : undefined}
          aria-describedby={state.error ? "login-error" : undefined}
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
          <button
            type="button"
            onClick={() => setMode("recovery")}
            className="inline-flex min-h-11 items-center justify-center py-2 text-sm font-bold text-[var(--color-teal-ink)] underline underline-offset-2"
          >
            Forgot password?
          </button>
        </div>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          disabled={pending}
          aria-invalid={state.error ? true : undefined}
          aria-describedby={state.error ? "login-error" : undefined}
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
        className="btn btn-navy min-h-11 w-full disabled:cursor-wait disabled:opacity-65"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
