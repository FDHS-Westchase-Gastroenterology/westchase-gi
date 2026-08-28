"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";

import { requestPasswordResetAction } from "@/app/admin/actions";
import type { ResetRequestActionState } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import {
  PASSWORD_RESET_RESEND_COOLDOWN_SECONDS,
  RESET_REQUEST_MESSAGE,
} from "@/lib/portal/contracts";

const INITIAL_STATE: ResetRequestActionState = {
  submitted: false,
  email: "",
  requestKey: 0,
};
const inputClassName =
  "mt-2 w-full rounded-[var(--radius)] border border-[var(--color-line-2)] bg-white px-3.5 py-3 text-base text-[var(--color-ink)] outline-none transition-colors focus:border-[var(--color-teal-ink)]";
const textActionClassName =
  "inline-flex min-h-11 items-center justify-center py-2 text-sm font-bold text-[var(--color-teal-ink)] underline underline-offset-2";

function ResendControl({
  action,
  email,
  pending,
}: Readonly<{
  action: (payload: FormData) => void;
  email: string;
  pending: boolean;
}>) {
  const [secondsRemaining, setSecondsRemaining] = useState(PASSWORD_RESET_RESEND_COOLDOWN_SECONDS);

  useEffect(() => {
    if (secondsRemaining <= 0) return undefined;
    const timer = window.setTimeout(() => {
      setSecondsRemaining((current) => Math.max(0, current - 1));
    }, 1000);
    return () => {
      window.clearTimeout(timer);
    };
  }, [secondsRemaining]);

  return (
    <form action={action}>
      <input type="hidden" name="email" value={email} />
      <Button
        type="submit"
        disabled={pending || secondsRemaining > 0}
        className="min-h-11 w-full disabled:cursor-wait disabled:opacity-65"
      >
        {pending
          ? "Requesting…"
          : secondsRemaining > 0
            ? `Resend in ${secondsRemaining}s`
            : "Resend link"}
      </Button>
    </form>
  );
}

export function ResetRequestForm({
  initialEmail = "",
  inline = false,
  onBack,
  onEmailChange,
}: Readonly<{
  initialEmail?: string;
  inline?: boolean;
  onBack?: () => void;
  onEmailChange?: (email: string) => void;
}>) {
  const [state, formAction, pending] = useActionState(requestPasswordResetAction, INITIAL_STATE);
  const [email, setEmail] = useState(initialEmail);
  const [editing, setEditing] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const showEmailForm = !state.submitted || editing;

  useEffect(() => {
    if (showEmailForm) emailRef.current?.focus();
  }, [showEmailForm]);

  function updateEmail(value: string) {
    setEmail(value);
    onEmailChange?.(value);
  }

  function backToSignIn() {
    onEmailChange?.(state.submitted && !editing ? state.email : email);
    onBack?.();
  }

  function changeEmail() {
    setEmail(state.email);
    onEmailChange?.(state.email);
    setEditing(true);
  }

  if (state.submitted && !editing) {
    return (
      <section className="mt-6" aria-labelledby="reset-result-title">
        <h2 id="reset-result-title" className="text-xl text-[var(--color-ink)]">
          Check your email
        </h2>
        <p
          role="status"
          aria-live="polite"
          data-testid="reset-request-result"
          className="mt-3 rounded-[var(--radius)] bg-[var(--color-mint-2)] px-4 py-3 text-sm font-bold text-[var(--color-ink)]"
        >
          {RESET_REQUEST_MESSAGE}
        </p>
        {state.email ? (
          <p className="mt-4 text-sm break-words text-[var(--color-ink)]">
            Request entered for <strong data-testid="reset-request-email">{state.email}</strong>.
            This only repeats what you entered; it does not confirm an account or inbox delivery.
          </p>
        ) : null}
        <div className="mt-4 space-y-2 text-sm text-[var(--color-muted-ink)]">
          <p>Delivery can take a few minutes. Check your Inbox and Spam or Junk folders.</p>
          <p>
            The one-time link expires in one hour. Use the newest message if you requested more than
            one.
          </p>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <Button type="button" variant="outline" onClick={changeEmail} className="min-h-11 w-full">
            Change email
          </Button>
          <ResendControl
            key={state.requestKey}
            action={formAction}
            email={state.email}
            pending={pending}
          />
        </div>

        <p className="mt-5 text-sm text-[var(--color-muted-ink)]">
          Still no message? Ask your portal administrator to confirm your expected staff email and
          active status. They should never ask for your password or reset link.
        </p>
        <div className="mt-3 text-center">
          {onBack ? (
            <button type="button" onClick={backToSignIn} className={textActionClassName}>
              Back to sign in
            </button>
          ) : (
            <Link href="/admin/login" className={textActionClassName}>
              Back to sign in
            </Link>
          )}
        </div>
      </section>
    );
  }

  return (
    <div className={inline ? "mt-6" : undefined}>
      {inline ? (
        <div className="mb-5">
          <h2 className="text-xl text-[var(--color-ink)]">Reset your password</h2>
          <p className="mt-1.5 text-sm text-[var(--color-muted-ink)]">
            Enter your staff email and we’ll send a secure reset link if the account is eligible.
          </p>
        </div>
      ) : null}
      <form
        action={formAction}
        className={inline ? "space-y-5" : "mt-7 space-y-5"}
        onSubmit={() => {
          setEditing(false);
        }}
      >
        <div>
          <label htmlFor="reset-email" className="block text-sm font-bold text-[var(--color-ink)]">
            Email
          </label>
          <input
            ref={emailRef}
            id="reset-email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            required
            maxLength={254}
            disabled={pending}
            value={email}
            onChange={(event) => {
              updateEmail(event.target.value);
            }}
            className={inputClassName}
          />
        </div>
        <Button
          type="submit"
          disabled={pending}
          className="min-h-11 w-full disabled:cursor-wait disabled:opacity-65"
        >
          {pending ? "Sending…" : "Send reset link"}
        </Button>
      </form>
      <div className="mt-3 text-center">
        {onBack ? (
          <button type="button" onClick={backToSignIn} className={textActionClassName}>
            Back to sign in
          </button>
        ) : (
          <Link href="/admin/login" className={textActionClassName}>
            Back to sign in
          </Link>
        )}
      </div>
    </div>
  );
}
