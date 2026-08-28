"use client";

import { useActionState, useState } from "react";

import { loginAction } from "@/app/admin/actions";
import type { LoginActionState } from "@/app/admin/actions";
import { ResetRequestForm } from "@/app/admin/forgot-password/reset-request-form";
import { Button } from "@/components/ui/button";
import { signInIdentifierField } from "@/lib/portal/staff-language";

const INITIAL_STATE: LoginActionState = { error: null };

const inputClassName =
  "mt-2 w-full rounded-[var(--radius)] border border-[var(--color-line-2)] bg-white px-3.5 py-3 text-base text-[var(--color-ink)] outline-none transition-colors focus:border-[var(--color-teal-ink)]";

export function LoginForm({
  allowPreviewAlias,
}: Readonly<{
  allowPreviewAlias: boolean;
}>) {
  const [mode, setMode] = useState<"sign-in" | "recovery">("sign-in");
  const [email, setEmail] = useState("");
  const [state, formAction, pending] = useActionState(loginAction, INITIAL_STATE);
  const hasError = state.error !== null && state.error !== "";
  const identifierField = signInIdentifierField(allowPreviewAlias);

  if (mode === "recovery") {
    return (
      <ResetRequestForm
        inline
        initialEmail={email}
        onEmailChange={setEmail}
        onBack={() => {
          setMode("sign-in");
        }}
      />
    );
  }

  return (
    <form action={formAction} className="mt-7 space-y-5">
      <div>
        <label htmlFor="email" className="block text-sm font-bold text-[var(--color-ink)]">
          {identifierField.label}
        </label>
        <input
          id="email"
          name="email"
          type={identifierField.type}
          inputMode={identifierField.inputMode}
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          required
          maxLength={254}
          disabled={pending}
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
          }}
          aria-invalid={hasError ? true : undefined}
          aria-describedby={hasError ? "login-error" : undefined}
          className={inputClassName}
        />
      </div>

      <div>
        <div className="flex flex-wrap items-center justify-between gap-x-4">
          <label htmlFor="password" className="block text-sm font-bold text-[var(--color-ink)]">
            Password
          </label>
          <button
            type="button"
            onClick={() => {
              setMode("recovery");
            }}
            className="-mx-2 inline-flex min-h-11 shrink-0 items-center justify-center rounded-[var(--radius)] px-2 py-2 text-sm font-bold text-[var(--color-teal-ink)] underline underline-offset-2 transition-colors duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] active:bg-[var(--color-teal-ink)]/14 motion-reduce:transition-none [@media(hover:hover)_and_(pointer:fine)]:hover:bg-[var(--color-teal-ink)]/8"
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
          aria-invalid={hasError ? true : undefined}
          aria-describedby={hasError ? "login-error" : undefined}
          className={inputClassName}
        />
      </div>

      {hasError ? (
        <p
          id="login-error"
          role="alert"
          aria-live="polite"
          className="rounded-[var(--radius)] bg-[var(--color-amber-soft)] px-4 py-3 text-sm font-bold text-[var(--color-ink)]"
        >
          {state.error}
        </p>
      ) : null}

      <Button
        type="submit"
        disabled={pending}
        className="min-h-11 w-full disabled:cursor-wait disabled:opacity-65"
      >
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
