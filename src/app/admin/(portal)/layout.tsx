import Link from "next/link";
import { redirect } from "next/navigation";
import { logoutAction } from "@/app/admin/actions";
import {
  Activity,
  ExternalLink,
  FileText,
  LogOut,
  Users,
} from "@/components/icons";
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

// The Front Desk Ledger: one persistent desktop index becomes the same four
// thumb-reachable destinations on mobile. The navigation stays put while the
// appointment-request canvas changes, preserving location and task continuity.

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSessionUser();
  if (!session) redirect("/admin/login");

  // The waiting signal travels with the worker: a failed read suppresses the
  // badge instead of inventing a reassuring zero.
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
  const waitingCount = availableQueueCount(queueResult.count, queueResult.error);

  return (
    <PortalReleaseProvider
      eligible={releaseEligible}
      initialState={releaseState}
    >
      <div className="portal-workspace min-h-dvh">
        <a href="#portal-main" className="skip-link">
          Skip to staff portal content
        </a>

        <aside className="portal-sidebar print-hide" aria-label="Portal workspace">
          <Link
            href="/admin"
            className="portal-sidebar-brand"
            aria-label="Westchase Gastroenterology staff portal home"
          >
            <span className="portal-sidebar-mark" aria-hidden="true">
              W
            </span>
            <span>
              <strong>Westchase Gastroenterology</strong>
              <small>Staff portal</small>
            </span>
          </Link>

          <PortalNav waitingCount={waitingCount} />

          <div className="portal-sidebar-tools">
            <p>Practice tools</p>
            <Link href="/admin/review-flyers">
              <FileText className="h-[1.1rem] w-[1.1rem]" />
              Review flyers
            </Link>
            <Link href="/admin/audit">
              <Activity className="h-[1.1rem] w-[1.1rem]" />
              Activity log
            </Link>
          </div>

          <div className="portal-sidebar-account">
            <p className="portal-sidebar-person">
              <span data-testid="session-user">{session.displayName}</span>
              <small className="portal-sidebar-person-meta">
                <span className="capitalize">{session.role}</span>
                <span aria-hidden="true">·</span>
                <span data-testid="session-email" title={session.email}>
                  {session.email}
                </span>
              </small>
            </p>
            <div className="portal-sidebar-account-actions">
              <Link href="/">
                <ExternalLink className="h-4 w-4" />
                View website
              </Link>
              <form action={logoutAction}>
                <button type="submit">
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              </form>
            </div>
          </div>
        </aside>

        <div className="portal-stage">
          <header className="portal-mobile-header print-hide">
            <Link href="/admin" className="portal-mobile-brand">
              <span aria-hidden="true">W</span>
              <strong>Staff portal</strong>
            </Link>
            <details className="portal-account-menu">
              <summary role="button" aria-label="Open account menu">
                <Users className="h-5 w-5" />
              </summary>
              <div>
                <p>
                  <strong>{session.displayName}</strong>
                  <span className="capitalize">{session.role}</span>
                </p>
                <Link href="/admin/audit">Activity log</Link>
                <Link href="/">View website</Link>
                <form action={logoutAction}>
                  <button type="submit">Sign out</button>
                </form>
              </div>
            </details>
          </header>

          <PortalReleaseUtility />
          <main id="portal-main" tabIndex={-1}>
            <div className="portal-content">{children}</div>
          </main>
        </div>
      </div>
    </PortalReleaseProvider>
  );
}
