"use client";

import Link from "next/link";
import { useActionState, useLayoutEffect } from "react";

import { recoverPasswordAction, setPasswordAction } from "@/app/admin/actions";
import type { SetPasswordActionState } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { PasswordAuthFlow } from "@/lib/portal/contracts";

const INITIAL_STATE: SetPasswordActionState = {
  error: null,
  changeCommitted: false,
};

export function PasswordForm({
  mode,
  recoveryTokenHash,
}: Readonly<{
  mode: PasswordAuthFlow;
  recoveryTokenHash?: string;
}>) {
  const hasRecoveryToken = recoveryTokenHash !== undefined && recoveryTokenHash !== "";
  const [state, formAction, pending] = useActionState(
    hasRecoveryToken ? recoverPasswordAction : setPasswordAction,
    INITIAL_STATE,
  );
  const hasError = state.error !== null && state.error !== "";

  useLayoutEffect(() => {
    // A server-action error render can restore the document's original URL,
    // Including its fragment. Keep the recovery bearer out of the address bar
    // While preserving the hidden value needed for a bounded retry.
    if (hasRecoveryToken && window.location.hash !== "") {
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, [hasRecoveryToken, recoveryTokenHash, state]);

  return (
    <form action={formAction} className="mt-7">
      {hasRecoveryToken ? <input type="hidden" name="tokenHash" value={recoveryTokenHash} /> : null}
      <FieldGroup>
        <FieldDescription id="password-policy">
          Use at least 12 characters. Password managers and pasted passwords are supported.
        </FieldDescription>
        <Field data-disabled={pending || undefined}>
          <FieldLabel htmlFor="new-password">New password</FieldLabel>
          <Input
            id="new-password"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={12}
            maxLength={1024}
            required
            disabled={pending}
            aria-invalid={hasError ? true : undefined}
            aria-describedby={hasError ? "password-policy password-error" : "password-policy"}
          />
        </Field>
        <Field data-disabled={pending || undefined}>
          <FieldLabel htmlFor="confirm-password">Confirm password</FieldLabel>
          <Input
            id="confirm-password"
            name="passwordConfirmation"
            type="password"
            autoComplete="new-password"
            minLength={12}
            maxLength={1024}
            required
            disabled={pending}
            aria-invalid={hasError ? true : undefined}
            aria-describedby={hasError ? "password-policy password-error" : "password-policy"}
          />
        </Field>
        {hasError ? (
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
          <div className="rounded-[var(--radius)] border border-[var(--color-line)] p-4 text-sm text-[var(--color-muted-ink)]">
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
          <Button
            type="submit"
            disabled={pending}
            className="min-h-11 w-full disabled:cursor-wait disabled:opacity-65"
          >
            {pending
              ? "Saving…"
              : mode === "recovery"
                ? "Set password and continue"
                : "Set password"}
          </Button>
        ) : null}
      </FieldGroup>
    </form>
  );
}
