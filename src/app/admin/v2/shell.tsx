"use client";

// The v2 shell: a navy bar over the mint desk, one row of destinations,
// and the honest prototype ribbon. Attention travels with the nav — the
// Today entry carries the needs-attention count on every path.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { attentionGroup, ATTENTION_NOW, practiceToday } from "./prototype/format";
import { useQueue, useStoreApi } from "./prototype/store";

export function OpeningSheet({ viewer }: { viewer: string }) {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-16 text-center sm:px-6">
      <p className="text-[0.95rem] font-semibold text-[var(--ds-faint)]">
        Opening the day sheet for {viewer}…
      </p>
    </div>
  );
}

function NavLink({
  href,
  label,
  badge,
  exact = false,
}: {
  href: string;
  label: string;
  badge?: number;
  exact?: boolean;
}) {
  const pathname = usePathname();
  const active = exact
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`flex min-h-11 items-center gap-2 border-b-[3px] px-3 text-[0.95rem] font-bold transition-colors sm:px-4 ${
        active
          ? "border-[oklch(0.78_0.13_75)] text-white"
          : "border-transparent text-[var(--ds-on-bar-faint)] hover:text-white"
      }`}
    >
      {label}
      {badge !== undefined && badge > 0 ? (
        <span className="ds-nums inline-flex min-w-5 items-center justify-center rounded-full bg-[oklch(0.78_0.13_75)] px-1.5 py-0.5 text-[0.72rem] font-extrabold text-[oklch(0.3_0.05_248)]">
          {badge}
          <span className="sr-only"> need attention</span>
        </span>
      ) : null}
    </Link>
  );
}

export function V2Shell({
  viewer,
  role,
  signOut,
  children,
}: {
  viewer: string;
  role: string;
  signOut: () => Promise<void>;
  children: React.ReactNode;
}) {
  const { requests } = useQueue();
  const store = useStoreApi();
  const today = practiceToday();
  const attentionCount = requests.filter((request) =>
    ATTENTION_NOW.includes(attentionGroup(request.snapshot, today)),
  ).length;

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="bg-[var(--ds-bar)] text-[var(--ds-on-bar)]">
        <div className="mx-auto w-full max-w-4xl px-4 sm:px-6">
          <div className="flex min-h-14 flex-wrap items-center justify-between gap-x-6 gap-y-1 py-2">
            <Link href="/admin/v2" className="flex min-h-11 items-center gap-x-2.5">
              <span className="text-[1.02rem] font-bold leading-none">
                Westchase Gastroenterology
              </span>
              <span className="rounded-full bg-white/12 px-2.5 py-1 text-[0.68rem] font-bold uppercase tracking-[0.08em] text-[var(--ds-on-bar-faint)]">
                Staff portal
              </span>
            </Link>
            <div className="flex items-center gap-x-4">
              <p className="hidden text-[0.85rem] text-[var(--ds-on-bar-faint)] md:block">
                {viewer}
                <span aria-hidden="true" className="mx-2">
                  ·
                </span>
                <span className="capitalize">{role}</span>
              </p>
              <form action={signOut}>
                <button
                  type="submit"
                  className="flex min-h-11 items-center rounded-[var(--ds-radius)] border border-white/25 px-3.5 text-[0.9rem] font-bold text-[var(--ds-on-bar)] transition-colors hover:bg-white/10"
                >
                  Sign out
                </button>
              </form>
            </div>
          </div>
          <nav aria-label="Portal sections" className="-mb-px overflow-x-auto">
            <ul className="flex min-w-max items-stretch gap-1">
              <li className="flex">
                <NavLink href="/admin/v2" label="Today" badge={attentionCount} exact />
              </li>
              <li className="flex">
                <NavLink href="/admin/v2/requests" label="All appointments" />
              </li>
              <li className="ml-auto flex">
                <NavLink href="/admin" label="Current portal" exact />
              </li>
            </ul>
          </nav>
        </div>
      </header>

      <div className="border-b border-[var(--ds-rule-2)] bg-[var(--ds-flag-soft)]">
        <div className="mx-auto flex w-full max-w-4xl flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-1.5 sm:px-6">
          <p className="text-[0.8rem] font-semibold text-[var(--ds-ink)]">
            Prototype — every patient and colleague here is synthetic. Nothing
            touches real requests.
          </p>
          <button
            type="button"
            onClick={() => store.reset()}
            className="min-h-8 rounded-[var(--ds-radius)] px-2 text-[0.8rem] font-bold text-[var(--ds-pen)] underline underline-offset-2"
          >
            Reset demo data
          </button>
        </div>
      </div>

      <main className="flex-1 pb-16 pt-6 sm:pt-8">
        <div className="mx-auto w-full max-w-4xl px-4 sm:px-6">{children}</div>
      </main>

      <footer className="border-t border-[var(--ds-rule)] py-5">
        <p className="mx-auto w-full max-w-4xl px-4 text-[0.82rem] text-[var(--ds-faint)] sm:px-6">
          Staff portal v2 prototype — the appointment-request machine as a day
          sheet. Decisions graduate through issue #220.
        </p>
      </footer>
    </div>
  );
}
