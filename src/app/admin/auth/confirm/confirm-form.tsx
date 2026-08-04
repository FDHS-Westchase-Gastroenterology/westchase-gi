"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import {
  confirmAuthLinkAction,
  type ConfirmAuthActionState,
} from "@/app/admin/actions";
import { PasswordForm } from "@/app/admin/set-password/password-form";

type AuthLink = {
  tokenHash: string;
  type: "invite" | "recovery";
};

const INITIAL_STATE: ConfirmAuthActionState = { error: null };

export function ConfirmAuthForm() {
  const [link, setLink] = useState<AuthLink | "invalid" | null>(null);
  const parsedOnce = useRef(false);
  const [state, formAction, pending] = useActionState(
    confirmAuthLinkAction,
    INITIAL_STATE,
  );

  useEffect(() => {
    // Strict Mode replays effects in development (Next 16.3 enables it):
    // parse exactly once, or the replay would read the fragment this effect
    // just stripped and report a valid link as invalid.
    if (parsedOnce.current) return;
    parsedOnce.current = true;

    const params = new URLSearchParams(window.location.hash.slice(1));
    const tokenHash = params.get("token_hash")?.trim() ?? "";
    const type = params.get("type");
    const parsedLink: AuthLink | "invalid" =
      tokenHash.length >= 20 && (type === "invite" || type === "recovery")
        ? { tokenHash, type }
        : "invalid";

    // Remove the bearer token from the address bar before any navigation.
    window.history.replaceState(null, "", window.location.pathname);
    setLink(parsedLink);
  }, []);

  if (link === null) {
    return (
      <p className="mt-6 text-sm text-[var(--color-muted)]">
        Preparing your secure link…
      </p>
    );
  }

  if (link === "invalid") {
    return (
      <div className="mt-6">
        <p
          role="alert"
          className="rounded-[var(--radius)] bg-[var(--color-amber-soft)] px-4 py-3 text-sm font-bold text-[var(--color-ink)]"
        >
          This link is incomplete or no longer valid. Request a new link to
          continue.
        </p>
        <Link
          href="/admin/forgot-password"
          className="btn btn-navy mt-4 min-h-11 w-full"
        >
          Request a new link
        </Link>
      </div>
    );
  }

  if (link.type === "recovery") {
    return <PasswordForm mode="recovery" recoveryTokenHash={link.tokenHash} />;
  }

  return (
    <form action={formAction} className="mt-7 space-y-5">
      <input type="hidden" name="tokenHash" value={link.tokenHash} />
      <input type="hidden" name="type" value={link.type} />
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
        className="btn btn-navy min-h-11 w-full disabled:cursor-wait disabled:opacity-65"
      >
        {pending ? "Verifying…" : "Continue"}
      </button>
    </form>
  );
}
