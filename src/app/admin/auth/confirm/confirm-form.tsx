"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { confirmAuthLinkAction } from "@/app/admin/actions";
import type { ConfirmAuthActionState } from "@/app/admin/actions";
import { PasswordForm } from "@/app/admin/set-password/password-form";

interface AuthLink {
  tokenHash: string;
  type: "invite" | "recovery";
}

const INITIAL_STATE: ConfirmAuthActionState = { error: null };

export function ConfirmAuthForm() {
  const [link, setLink] = useState<AuthLink | "invalid" | null>(null);
  const parsedOnce = useRef(false);
  const [state, formAction, pending] = useActionState(
    confirmAuthLinkAction,
    INITIAL_STATE,
  );

  useEffect(() => {
    function parseFragment() {
      const hash = window.location.hash;
      if (!hash) {
        // Strict Mode replays effects in development (Next 16.3 enables it).
        // Do not replace a valid parsed link with invalid after the first pass
        // Stripped its fragment, but do reject a genuinely fragment-free load.
        if (!parsedOnce.current) {
          parsedOnce.current = true;
          setLink("invalid");
        }
        return;
      }

      parsedOnce.current = true;
      const params = new URLSearchParams(hash.slice(1));
      const tokenHash = params.get("token_hash")?.trim() ?? "";
      const type = params.get("type");
      const parsedLink: AuthLink | "invalid" =
        tokenHash.length >= 20 && (type === "invite" || type === "recovery")
          ? { tokenHash, type }
          : "invalid";

      // Remove the bearer token from the address bar before any navigation.
      window.history.replaceState(null, "", window.location.pathname);
      setLink(parsedLink);
    }

    parseFragment();
    // Opening a newer email in the same tab can navigate only the fragment,
    // Leaving this Client Component mounted. Parse that new bearer too.
    window.addEventListener("hashchange", parseFragment);
    return () => window.removeEventListener("hashchange", parseFragment);
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
