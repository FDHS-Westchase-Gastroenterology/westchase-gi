"use client";

import { useActionState, useEffect, useState } from "react";
import {
  confirmAuthLinkAction,
  type ConfirmAuthActionState,
} from "@/app/admin/actions";

type AuthLink = {
  tokenHash: string;
  type: "invite" | "recovery";
};

const INITIAL_STATE: ConfirmAuthActionState = { error: null };

export function ConfirmAuthForm() {
  const [link, setLink] = useState<AuthLink | "invalid" | null>(null);
  const [state, formAction, pending] = useActionState(
    confirmAuthLinkAction,
    INITIAL_STATE,
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.slice(1));
    const tokenHash = params.get("token_hash")?.trim() ?? "";
    const type = params.get("type");
    const parsedLink: AuthLink | "invalid" =
      tokenHash.length >= 20 && (type === "invite" || type === "recovery")
        ? { tokenHash, type }
        : "invalid";

    // Remove the bearer token from the address bar before any navigation.
    window.history.replaceState(null, "", window.location.pathname);
    const timer = window.setTimeout(() => setLink(parsedLink), 0);
    return () => window.clearTimeout(timer);
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
      <p
        role="alert"
        className="mt-6 rounded-[var(--radius)] bg-[var(--color-amber-soft)] px-4 py-3 text-sm font-bold text-[var(--color-ink)]"
      >
        This link is incomplete or no longer valid. Request another reset or
        ask your portal administrator for a new invitation.
      </p>
    );
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
        className="btn btn-navy w-full disabled:cursor-wait disabled:opacity-65"
      >
        {pending ? "Verifying…" : "Continue"}
      </button>
    </form>
  );
}
