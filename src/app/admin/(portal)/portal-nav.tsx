"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Activity, Calendar, CircleHelp, FileText, Home, Settings } from "@/components/icons";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

import { SettingsNav } from "./settings-nav";
import { inSettings } from "./settings-panes";

/* One list per layout (issue #327, Figma section 08 option 2; Schedule from
   issue #343; the regroup from issue #357, Figma 516:9469). The desktop rail
   holds the day's work, Home, Schedule and Activity log, then the
   "Patient materials" group with Review flyers, and moves Settings and Help
   to the account footer; the phone bar keeps Home, Schedule, Settings and
   Help, with Activity log in the account menu. The shell renders one
   PortalNav per layout and hides the inactive one whole, so a link that is
   not on screen never holds a tab stop. On the compact rail the group
   heading folds away. The current-location signal never moves. */

type NavItem = Readonly<{ href: string; label: string; icon: typeof Home }>;

const HOME = { href: "/admin", label: "Home", icon: Home };
const SCHEDULE = { href: "/admin/schedule", label: "Schedule", icon: Calendar };
const ACTIVITY = { href: "/admin/audit", label: "Activity log", icon: Activity };
const FLYERS = { href: "/admin/review-flyers", label: "Review flyers", icon: FileText };
const SETTINGS = { href: "/admin/settings", label: "Settings", icon: Settings };
const HELP = { href: "/admin/help", label: "Help", icon: CircleHelp };

const NAV_ITEMS = {
  sidebar: [HOME, SCHEDULE, ACTIVITY],
  bar: [HOME, SCHEDULE, SETTINGS, HELP],
} as const satisfies Record<string, readonly NavItem[]>;

/** The rail's groups below the day's work, each under its heading. */
const SIDEBAR_GROUPS = [
  { id: "portal-nav-materials", label: "Patient materials", items: [FLYERS] },
] as const;

function isActive(pathname: string, href: string): boolean {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function PortalNavItem({ item, pathname }: Readonly<{ item: NavItem; pathname: string }>) {
  const active = isActive(pathname, item.href);
  const Icon = item.icon;

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        isActive={active}
        tooltip={item.label}
        render={<Link href={item.href} />}
        aria-current={active ? "page" : undefined}
        className="portal-nav-link"
      >
        <Icon className="portal-nav-icon" />
        <span className="portal-rail-label">{item.label}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

export function PortalNav({ layout }: Readonly<{ layout: keyof typeof NAV_ITEMS }>) {
  const pathname = usePathname();
  // Inside Settings the sidebar is Settings' own list (issue #352).
  if (layout === "sidebar" && inSettings(pathname)) return <SettingsNav />;

  return (
    <nav aria-label="Portal sections" className="portal-primary-nav" data-layout={layout}>
      <SidebarMenu>
        {NAV_ITEMS[layout].map((item) => (
          <PortalNavItem key={item.href} item={item} pathname={pathname} />
        ))}
      </SidebarMenu>
      {layout === "sidebar"
        ? SIDEBAR_GROUPS.map((group) => (
            <SidebarGroup key={group.id} className="portal-nav-group">
              <SidebarGroupLabel id={group.id} className="portal-nav-group-label">
                {group.label}
              </SidebarGroupLabel>
              <SidebarMenu aria-labelledby={group.id}>
                {group.items.map((item) => (
                  <PortalNavItem key={item.href} item={item} pathname={pathname} />
                ))}
              </SidebarMenu>
            </SidebarGroup>
          ))
        : null}
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
