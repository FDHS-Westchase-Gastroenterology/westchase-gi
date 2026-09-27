"use client";

import { useActionState, useState } from "react";

import { loginAction } from "@/app/admin/actions";
import type { LoginActionState } from "@/app/admin/actions";
import { ResetRequestForm } from "@/app/admin/forgot-password/reset-request-form";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { signInIdentifierField } from "@/lib/portal/staff-language";

const INITIAL_STATE: LoginActionState = { error: null };

/* A single 8ms tick on press, where the platform offers one (Android
   Chrome; iOS Safari has no Vibration API and simply skips it). Haptics
   are not motion, so prefers-reduced-motion does not gate this. */
function pressTick() {
  if ("vibrate" in navigator) {
    navigator.vibrate(8);
  }
}

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
    <form action={formAction} className="mt-7">
      <FieldGroup>
        <Field data-disabled={pending || undefined}>
          <FieldLabel htmlFor="email">{identifierField.label}</FieldLabel>
          <Input
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
          />
        </Field>

        <Field data-disabled={pending || undefined}>
          <div className="flex flex-wrap items-center justify-between gap-x-4">
            <FieldLabel htmlFor="password">Password</FieldLabel>
            <button
              type="button"
              onClick={() => {
                setMode("recovery");
              }}
              className="-mx-2 inline-flex min-h-11 shrink-0 items-center justify-center rounded-[var(--radius)] px-2 py-2 text-sm font-bold text-[var(--color-teal-ink)] underline underline-offset-2 transition-[background-color,transform] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.97] active:bg-[var(--color-teal-ink)]/14 motion-reduce:transition-none motion-reduce:active:scale-100 [@media(hover:hover)_and_(pointer:fine)]:hover:bg-[var(--color-teal-ink)]/8"
            >
              Forgot password?
            </button>
          </div>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            disabled={pending}
            aria-invalid={hasError ? true : undefined}
            aria-describedby={hasError ? "login-error" : undefined}
          />
        </Field>

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

        {/* The submit wears the `commit` motion temperament: a firm, deep
            press, a fast snap on release, and — once the action commits —
            a held state (data-pending) the button keeps until the server
            answers, at full opacity so it holds its weight instead of
            fading toward inert. On touch, one short haptic tick lands with
            the press; the label swap below is now a supporting detail. */}
        <Button
          type="submit"
          motion="commit"
          disabled={pending}
          data-pending={pending || undefined}
          onPointerDown={pressTick}
          className="min-h-11 w-full disabled:cursor-wait disabled:opacity-100"
        >
          {pending ? (
            <span key="pending" className="portal-submit-label">
              Signing in…
            </span>
          ) : (
            <span key="idle" className="portal-submit-label">
              Sign in
            </span>
          )}
        </Button>
      </FieldGroup>
    </form>
  );
}
