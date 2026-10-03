"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  Activity,
  Calendar,
  CircleHelp,
  ClipboardCheck,
  FileText,
  Home,
  Settings,
} from "@/components/icons";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";

// Five destinations per layout, each its own list (issue #327, Figma section
// 08 option 2; Schedule from issue #343). The desktop rail gives the five work
// Pages the same row and moves Settings and Help to the account footer; the
// Phone bar keeps Home, Schedule, Requests, Settings and Help, with Activity
// Log in the account menu. The
// Shell renders one PortalNav per layout and hides the inactive one whole,
// So a link that is not on screen never holds a tab stop. Home, Requests,
// The current-location signal and the waiting count never move.

const HOME = { href: "/admin", label: "Home", icon: Home };
const SCHEDULE = { href: "/admin/schedule", label: "Schedule", icon: Calendar };
const REQUESTS = { href: "/admin/requests", label: "Requests", icon: ClipboardCheck };
const SETTINGS = { href: "/admin/settings", label: "Settings", icon: Settings };
const HELP = { href: "/admin/help", label: "Help", icon: CircleHelp };

const NAV_ITEMS = {
  sidebar: [
    HOME,
    SCHEDULE,
    REQUESTS,
    { href: "/admin/review-flyers", label: "Review flyers", icon: FileText },
    { href: "/admin/audit", label: "Activity log", icon: Activity },
  ],
  bar: [HOME, SCHEDULE, REQUESTS, SETTINGS, HELP],
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
      <SidebarMenu>
        {NAV_ITEMS[layout].map((item) => {
          const active = isActive(pathname, item.href);
          const showBadge =
            item.href === "/admin/requests" && waitingCount !== null && waitingCount > 0;
          const Icon = item.icon;

          return (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                isActive={active}
                tooltip={item.label}
                render={<Link href={item.href} />}
                aria-current={active ? "page" : undefined}
                aria-label={showBadge ? `${item.label}, ${waitingCount} waiting` : item.label}
                className="portal-nav-link"
              >
                <Icon className="portal-nav-icon" />
                <span className="portal-rail-label">{item.label}</span>
                {showBadge ? (
                  <span
                    data-testid="nav-waiting-badge"
                    aria-hidden="true"
                    className="portal-nav-count"
                  >
                    {waitingCount > 99 ? "99+" : waitingCount}
                  </span>
                ) : null}
              </SidebarMenuButton>
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    </nav>
  );
}

// Settings and Help in the desktop account footer: the small-link style of
// View website and Sign out, current in on-dark ink with no fill. On the
// Compact rail each is an icon named by its tooltip.
export function PortalAccountLinks() {
  const pathname = usePathname();

  return [SETTINGS, HELP].map((item) => {
    const Icon = item.icon;
    const active = isActive(pathname, item.href);
    return (
      <SidebarMenuButton
        key={item.href}
        isActive={active}
        tooltip={item.label}
        render={<Link href={item.href} />}
        aria-current={active ? "page" : undefined}
      >
        <Icon className="h-4 w-4" />
        <span className="portal-rail-label">{item.label}</span>
      </SidebarMenuButton>
    );
  });
}
