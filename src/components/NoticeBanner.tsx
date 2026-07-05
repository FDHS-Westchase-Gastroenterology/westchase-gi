"use client";

import { useCallback } from "react";
import Link from "next/link";
import { BANNER_KEY } from "@/lib/site";
import { X } from "./icons";

const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

type NoticeBannerProps = {
  headline: string;
  body: string;
  cta: string;
  ctaHref: string;
  dismissLabel: string;
};

/**
 * The practice's "accepting new patients" notice, rebuilt to show once per
 * visitor site-wide (30-day localStorage stamp) as a dismissible in-flow
 * banner. The old site re-opened it as a full-screen modal on every page,
 * per-path, every 24 hours; never restore that behavior.
 * A pre-paint inline script in the layout sets `html.banner-dismissed` so
 * returning visitors never see a flash (see globals.css).
 */
export function NoticeBanner({ headline, body, cta, ctaHref, dismissLabel }: NoticeBannerProps) {
  const dismiss = useCallback(() => {
    document.documentElement.classList.add("banner-dismissed");
    try {
      localStorage.setItem(BANNER_KEY, String(Date.now() + THIRTY_DAYS));
    } catch {
      // Private mode: the banner simply returns next visit.
    }
  }, []);

  return (
    <aside
      className="notice-banner border-b border-[color-mix(in_oklch,var(--color-amber)_45%,white)] bg-[var(--color-amber-soft)]"
      aria-label={headline}
    >
      <div className="container-x relative flex flex-wrap items-center gap-x-4 gap-y-1.5 py-2.5 pr-10 text-[0.95rem] leading-snug text-[var(--color-ink)] sm:pr-2">
        <p className="min-w-0">
          <strong className="font-extrabold">{headline}</strong>{" "}
          <span className="text-[var(--color-body)]">{body}</span>{" "}
          <Link href={ctaHref} className="link-plain whitespace-nowrap">
            {cta}
          </Link>
        </p>
        <button
          type="button"
          onClick={dismiss}
          aria-label={dismissLabel}
          className="absolute right-3 mt-0.5 rounded-md p-1.5 text-[var(--color-muted)] transition-colors hover:bg-[color-mix(in_oklch,var(--color-amber)_25%,transparent)] hover:text-[var(--color-ink)] sm:static sm:ml-auto"
        >
          <X className="h-4.5 w-4.5" />
        </button>
      </div>
    </aside>
  );
}
