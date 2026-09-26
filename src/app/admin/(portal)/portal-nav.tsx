"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Activity, CircleHelp, ClipboardCheck, FileText, Home, Settings } from "@/components/icons";

// Four destinations per layout, each its own list (issue #327, Figma section
// 08 option 2). The desktop rail gives the four work pages the same row and
// Moves Settings and Help to the account footer; the phone bar keeps Home,
// Requests, Settings and Help, with Activity log in the account menu. The
// Shell renders one PortalNav per layout and hides the inactive one whole,
// So a link that is not on screen never holds a tab stop. Home, Requests,
// The current-location signal and the waiting count never move.

const HOME = { href: "/admin", label: "Home", icon: Home };
const REQUESTS = { href: "/admin/requests", label: "Requests", icon: ClipboardCheck };
const SETTINGS = { href: "/admin/settings", label: "Settings", icon: Settings };
const HELP = { href: "/admin/help", label: "Help", icon: CircleHelp };

const NAV_ITEMS = {
  sidebar: [
    HOME,
    REQUESTS,
    { href: "/admin/review-flyers", label: "Review flyers", icon: FileText },
    { href: "/admin/audit", label: "Activity log", icon: Activity },
  ],
  bar: [HOME, REQUESTS, SETTINGS, HELP],
} as const;

function isActive(pathname: string, href: string): boolean {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function PortalNav({
  layout,
  waitingCount,
}: Readonly<{ layout: keyof typeof NAV_ITEMS; waitingCount: number | null }>) {
  const pathname = usePathname();

  return (
    <nav aria-label="Portal sections" className="portal-primary-nav" data-layout={layout}>
      <ul>
        {NAV_ITEMS[layout].map((item) => {
          const active = isActive(pathname, item.href);
          const showBadge =
            item.href === "/admin/requests" && waitingCount !== null && waitingCount > 0;
          const Icon = item.icon;

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                aria-label={showBadge ? `${item.label}, ${waitingCount} waiting` : item.label}
                className="portal-nav-link"
              >
                <Icon className="portal-nav-icon" />
                <span>{item.label}</span>
                {showBadge ? (
                  <span
                    data-testid="nav-waiting-badge"
                    aria-hidden="true"
                    className="portal-nav-count"
                  >
                    {waitingCount > 99 ? "99+" : waitingCount}
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

// Settings and Help in the desktop account footer: the small-link style of
// View website and Sign out, current in on-dark ink with no fill.
export function PortalAccountLinks() {
  const pathname = usePathname();

  return [SETTINGS, HELP].map((item) => {
    const Icon = item.icon;
    return (
      <Link
        key={item.href}
        href={item.href}
        aria-current={isActive(pathname, item.href) ? "page" : undefined}
      >
        <Icon className="h-4 w-4" />
        {item.label}
      </Link>
    );
  });
}
