import Link from "next/link";
import { redirect } from "next/navigation";

import { logoutAction } from "@/app/admin/actions";
import { ExternalLink, LogOut, Users } from "@/components/icons";
import { SidebarMenuButton } from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getSessionUser } from "@/lib/portal/auth";
import { getPortalReleaseState } from "@/lib/portal/release-briefing";
import {
  isPortalReleaseEligible,
  PORTAL_RELEASE_BRIEFING,
} from "@/lib/portal/release-briefing-content";
import { availableQueueCount } from "@/lib/portal/request-query";
import { serviceClient } from "@/lib/portal/server";

import { PortalAccountLinks, PortalNav } from "./portal-nav";
import { PortalReleaseProvider, PortalReleaseUtility } from "./portal-release-briefing";
import { PortalSidebar, SidebarToggle } from "./portal-sidebar";

import "./wgi-paints.css";

// The Front Desk Ledger: a persistent desktop index of the four work pages,
// With Settings and Help in its account footer, becomes four thumb-reachable
// Destinations on mobile. The navigation stays put while the
// Appointment-request canvas changes, preserving location and task continuity.
// Below 1366px wide it folds to an icon rail (portal-sidebar.tsx).

/** The rail's avatar: the first letters of the first two names. */
function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

export default async function PortalLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSessionUser();
  if (!session) redirect("/admin/login");

  // The waiting signal travels with the worker: a failed read suppresses the
  // Badge instead of inventing a reassuring zero.
  const releaseEligible =
    session.portalTourDismissedAt !== null && isPortalReleaseEligible(session.onboardedAt);
  const [queueResult, releaseState] = await Promise.all([
    serviceClient()
      .from("requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "new"),
    releaseEligible
      ? getPortalReleaseState(session, PORTAL_RELEASE_BRIEFING.id)
      : Promise.resolve({ status: "hidden" } as const),
  ]);
  const waitingCount = availableQueueCount(queueResult.count, queueResult.error !== null);

  return (
    <PortalReleaseProvider eligible={releaseEligible} initialState={releaseState}>
      {/* One provider for every tooltip in the portal, so moving between
          triggers skips the second wait. */}
      <TooltipProvider>
        <div className="portal-workspace min-h-dvh">
          <a href="#portal-main" className="skip-link">
            Skip to staff portal content
          </a>

          <PortalSidebar>
            <Link
              href="/admin"
              className="portal-sidebar-brand"
              aria-label="Westchase Gastroenterology staff portal home"
            >
              <span className="portal-sidebar-mark" aria-hidden="true">
                W
              </span>
              <span className="portal-rail-hidden">
                <strong>Westchase Gastroenterology</strong>
                <small>Staff portal</small>
              </span>
            </Link>

            <PortalNav layout="sidebar" waitingCount={waitingCount} />
            <PortalNav layout="bar" waitingCount={waitingCount} />

            <SidebarToggle />
            <div className="portal-sidebar-account">
              <p className="portal-sidebar-person">
                <span className="portal-sidebar-initials" aria-hidden="true">
                  {initialsOf(session.displayName)}
                </span>
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
                <PortalAccountLinks />
                <SidebarMenuButton tooltip="View website" render={<Link href="/" />}>
                  <ExternalLink className="h-4 w-4" />
                  <span className="portal-rail-label">View website</span>
                </SidebarMenuButton>
                <form action={logoutAction}>
                  <SidebarMenuButton tooltip="Sign out" type="submit">
                    <LogOut className="h-4 w-4" />
                    <span className="portal-rail-label">Sign out</span>
                  </SidebarMenuButton>
                </form>
              </div>
            </div>
          </PortalSidebar>

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
        {/* Save feedback lives with the shell, so a toast outlives the surface
          that earned it (the home record card closes on a confirmed save). */}
        <Toaster />
      </TooltipProvider>
    </PortalReleaseProvider>
  );
}
