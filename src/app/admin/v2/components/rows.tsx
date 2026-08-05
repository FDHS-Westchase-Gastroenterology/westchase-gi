"use client";

// The ledger's shared row grammar: a section head sitting on its rule,
// rows separated by fine rules, and a left attention gutter carrying the
// one mark that matters in that section. No cards.

import Link from "next/link";
import type { ReactNode } from "react";

export function QueueSection({
  id,
  title,
  count,
  children,
}: {
  id: string;
  title: string;
  count: number;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={`${id}-head`} className="mt-8 first:mt-0">
      <h2 id={`${id}-head`} className="ds-head">
        {title}
        <span className="ds-count" aria-hidden="true">
          {count}
        </span>
        <span className="sr-only">({count})</span>
      </h2>
      <ul className="ds-rows list-none">{children}</ul>
    </section>
  );
}

export function QueueRow({
  href,
  gutter,
  name,
  phone,
  note,
  right,
}: {
  href: string;
  gutter: ReactNode;
  name: string;
  phone: string;
  note: ReactNode;
  right?: ReactNode;
}) {
  return (
    <li>
      <Link href={href} className="ds-row">
        <span className="ds-nums pt-0.5">{gutter}</span>
        <span className="min-w-0">
          <span className="block truncate text-[0.98rem] font-bold text-[var(--ds-ink)]">
            {name}
          </span>
          <span className="ds-nums mt-0.5 block text-[0.88rem] text-[var(--ds-faint)]">
            {phone}
          </span>
        </span>
        <span className="ds-row-note flex min-w-0 items-baseline justify-between gap-3">
          <span className="min-w-0 text-[0.88rem] leading-snug text-[var(--ds-body)]">
            {note}
          </span>
          {right ? (
            <span className="ds-nums hidden shrink-0 text-[0.82rem] text-[var(--ds-faint)] sm:block">
              {right}
            </span>
          ) : null}
        </span>
      </Link>
    </li>
  );
}

export function MiniStamp({
  kind,
  children,
}: {
  kind: "booked" | "closed";
  children: ReactNode;
}) {
  return (
    <span className={`ds-stamp ${kind === "booked" ? "ds-stamp-booked" : "ds-stamp-closed"}`}>
      {children}
    </span>
  );
}

/** The cleared-sheet state: a designed moment, not an apology. */
export function ClearSheet({ title, body }: { title: string; body: string }) {
  return (
    <div className="mt-10 border-y border-[var(--ds-rule)] py-12 text-center">
      <p className="text-[1.05rem] font-bold text-[var(--ds-ink)]">{title}</p>
      <p className="mx-auto mt-1.5 max-w-[46ch] text-[0.92rem] leading-relaxed text-[var(--ds-faint)]">
        {body}
      </p>
    </div>
  );
}
