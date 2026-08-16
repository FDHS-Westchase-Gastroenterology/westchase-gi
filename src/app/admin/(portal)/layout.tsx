import Link from "next/link";
import { redirect } from "next/navigation";
import { logoutAction } from "@/app/admin/actions";
import { getSessionUser } from "@/lib/portal/auth";
import { getPortalReleaseState } from "@/lib/portal/release-briefing";
import {
  isPortalReleaseEligible,
  PORTAL_RELEASE_BRIEFING,
} from "@/lib/portal/release-briefing-content";
import { availableQueueCount } from "@/lib/portal/request-query";
import { serviceClient } from "@/lib/portal/server";
import { PortalNav } from "./portal-nav";
import {
  PortalReleaseProvider,
  PortalReleaseUtility,
} from "./portal-release-briefing";

// Authenticated portal chrome: a navy work-desk header carrying the
// Practice identity (wordmark, amber active tick) over a calm paper
// Canvas. Deliberately NOT the patient site's marketing chrome and NOT
// A generic SaaS sidebar shell. Login lives outside this group.

export default async function PortalLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSessionUser();
  if (!session) redirect("/admin/login");

  // The waiting signal travels with the worker: the same read discipline as
  // Home (failed read = no badge, never a false zero).
  const releaseEligible =
    session.portalTourDismissedAt !== null &&
    isPortalReleaseEligible(session.onboardedAt);
  const [queueResult, releaseState] = await Promise.all([
    serviceClient()
      .from("requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "new"),
    releaseEligible
      ? getPortalReleaseState(session, PORTAL_RELEASE_BRIEFING.id)
      : Promise.resolve({ status: "hidden" } as const),
  ]);
  const { count, error } = queueResult;
  const waitingCount = availableQueueCount(count, Boolean(error));

  return (
    <PortalReleaseProvider
      eligible={releaseEligible}
      initialState={releaseState}
    >
      <div className="flex min-h-dvh flex-col">
        <header className="bg-[var(--color-navy)] text-[var(--color-on-dark)]">
          <div className="container-x">
            <div className="flex min-h-14 flex-wrap items-center justify-between gap-x-6 gap-y-1 py-2">
              <Link
                href="/admin"
                className="flex min-h-11 items-center gap-x-2.5"
              >
                <span className="font-[var(--font-display)] text-[1.05rem] leading-none">
                  Westchase Gastroenterology
                </span>
                <span className="rounded-full bg-white/12 px-2.5 py-1 text-[0.7rem] font-bold uppercase tracking-[0.08em] text-[var(--color-on-dark-muted)]">
                  Staff portal
                </span>
              </Link>
              <div className="flex items-center gap-x-4">
                <p className="hidden text-[0.85rem] text-[var(--color-on-dark-muted)] md:block">
                  <span data-testid="session-user">{session.displayName}</span>
                  <span aria-hidden="true" className="mx-2">
                    ·
                  </span>
                  <span className="capitalize">{session.role}</span>
                </p>
                <Link
                  href="/"
                  className="flex min-h-11 items-center rounded-[var(--radius-sm)] px-1 text-[0.9rem] font-bold text-[var(--color-on-dark)] underline underline-offset-2"
                >
                  View website
                </Link>
                <form action={logoutAction}>
                  <button
                    type="submit"
                    className="flex min-h-11 items-center rounded-[var(--radius-sm)] border border-[var(--color-line-dark)] px-3.5 text-[0.9rem] font-bold text-[var(--color-on-dark)] transition-colors hover:bg-white/10"
                  >
                    Sign out
                  </button>
                </form>
              </div>
            </div>
            <PortalNav waitingCount={waitingCount} />
          </div>
        </header>
        <PortalReleaseUtility />
        <main className="flex-1 pb-16 pt-8 sm:pt-10">
          <div className="container-x">{children}</div>
        </main>
        <footer className="border-t border-[var(--color-line)] py-5">
          <div className="container-x flex flex-wrap items-center justify-between gap-3 text-[0.85rem] text-[var(--color-muted)]">
            <p>
              <Link
                href="/admin/audit"
                className="font-bold text-[var(--color-teal-ink)] underline underline-offset-2"
              >
                Activity log
              </Link>
            </p>
            <p>
              <span>
                Questions? See{" "}
                <Link
                  href="/admin/help"
                  className="font-bold text-[var(--color-teal-ink)] underline underline-offset-2"
                >
                  Help
                </Link>
              </span>
            </p>
          </div>
        </footer>
      </div>
    </PortalReleaseProvider>
  );
}
