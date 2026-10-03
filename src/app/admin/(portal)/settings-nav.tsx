"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment, useEffect, useSyncExternalStore } from "react";
import type { ComponentType } from "react";

import {
  ChevronLeft,
  ClipboardCheck,
  Download,
  Mail,
  MapPin,
  User,
  Users,
} from "@/components/icons";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";

/* The Settings window (issue #352, Figma St1): inside /admin/settings the
   portal sidebar becomes Settings' own list, the way a settings window on a
   Mac has its sidebar of panes (HIG Sidebars). "‹ Settings" at its head
   leaves the window for the page the user came from, else Home. The rows,
   the current row and the compact rail are the portal sidebar's; three
   labeled groups sit under hairlines. */

export const SETTINGS_ROOT = "/admin/settings";

interface SettingsPane {
  readonly href: string;
  readonly label: string;
  readonly icon: ComponentType<{ readonly className?: string }>;
}

export const SETTINGS_GROUPS: readonly {
  readonly label: string;
  readonly items: readonly SettingsPane[];
}[] = [
  {
    label: "Schedule",
    items: [
      { href: "/admin/settings/providers", label: "Providers", icon: Users },
      {
        href: "/admin/settings/appointment-types",
        label: "Appointment types",
        icon: ClipboardCheck,
      },
      { href: "/admin/settings/locations", label: "Locations", icon: MapPin },
    ],
  },
  {
    label: "Practice",
    items: [
      { href: "/admin/settings/staff", label: "Staff access", icon: User },
      { href: "/admin/settings/notifications", label: "Notifications", icon: Mail },
    ],
  },
  {
    label: "About",
    items: [{ href: "/admin/settings/software", label: "Software", icon: Download }],
  },
];
const SETTINGS_PANES = SETTINGS_GROUPS.flatMap((group) => group.items);

export function inSettings(pathname: string): boolean {
  return pathname === SETTINGS_ROOT || pathname.startsWith(`${SETTINGS_ROOT}/`);
}

/* Where "‹ Settings" returns: the portal page a link into Settings was
   followed from, kept for the tab's session. Read through an external
   store so the server and the first client render agree on Home. */
const RETURN_KEY = "wgi:settings-return";

function subscribe() {
  return () => undefined;
}

function readReturn(): string {
  const stored = window.sessionStorage.getItem(RETURN_KEY);
  return stored?.startsWith("/admin") === true && !inSettings(stored.split("?")[0] ?? "")
    ? stored
    : "/admin";
}

/** Remembers the page a link into Settings is followed from. */
export function useRememberSettingsReturn(pathname: string) {
  const here = inSettings(pathname);
  useEffect(() => {
    if (here) return undefined;
    function remember(event: MouseEvent) {
      if (!(event.target instanceof Element)) return;
      const link = event.target.closest<HTMLAnchorElement>("a[href]");
      if (link === null || !inSettings(new URL(link.href).pathname)) return;
      window.sessionStorage.setItem(
        RETURN_KEY,
        `${window.location.pathname}${window.location.search}`,
      );
    }
    document.addEventListener("click", remember, true);
    return () => {
      document.removeEventListener("click", remember, true);
    };
  }, [here]);
}

function isCurrent(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SettingsNav() {
  const pathname = usePathname();
  const back = useSyncExternalStore(subscribe, readReturn, () => "/admin");

  return (
    <nav
      aria-label="Settings"
      className="portal-primary-nav portal-settings-nav"
      data-layout="sidebar"
    >
      <SidebarMenuButton
        tooltip="Leave Settings"
        render={<Link href={back} />}
        aria-label="Leave Settings"
        className="portal-settings-back"
      >
        <ChevronLeft className="portal-settings-back-icon" />
        <span className="portal-rail-label">Settings</span>
      </SidebarMenuButton>
      {SETTINGS_GROUPS.map((group, index) => {
        const labelId = `settings-group-${group.label.toLowerCase()}`;
        return (
          <Fragment key={group.label}>
            {index > 0 ? <SidebarSeparator className="portal-settings-separator" /> : null}
            <SidebarGroup className="portal-settings-group">
              <SidebarGroupLabel id={labelId} className="portal-settings-group-label">
                {group.label}
              </SidebarGroupLabel>
              <SidebarMenu aria-labelledby={labelId}>
                {group.items.map((item) => {
                  const active = isCurrent(pathname, item.href);
                  const Icon = item.icon;
                  return (
                    <SidebarMenuItem key={item.href}>
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
                })}
              </SidebarMenu>
            </SidebarGroup>
          </Fragment>
        );
      })}
    </nav>
  );
}

/* Below 60rem the phone bar keeps its five destinations, so Settings'
   panes sit in a row of links at the top of the page instead. */
export function SettingsPaneLinks() {
  const pathname = usePathname();
  return (
    <nav aria-label="Settings" className="portal-settings-panes">
      <ul>
        {SETTINGS_PANES.map((item) => {
          const active = isCurrent(pathname, item.href);
          return (
            <li key={item.href}>
              <Link href={item.href} aria-current={active ? "page" : undefined}>
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
