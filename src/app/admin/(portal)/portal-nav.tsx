"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { CircleHelp, ClipboardCheck, Home, Settings } from "@/components/icons";

// The four fixed staff destinations, in the specification's fixed order.
// Their presentation adapts from a persistent desktop rail to a mobile
// Tab bar, but the vocabulary, order, current-location signal, and waiting
// Count never move. Occasional utilities stay outside this primary index.

const NAV_ITEMS = [
  { href: "/admin", label: "Home", icon: Home },
  { href: "/admin/requests", label: "Appointments", icon: ClipboardCheck },
  { href: "/admin/settings", label: "Settings", icon: Settings },
  { href: "/admin/help", label: "Help", icon: CircleHelp },
] as const;

function isActive(pathname: string, href: string): boolean {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function PortalNav({ waitingCount }: Readonly<{ waitingCount: number | null }>) {
  const pathname = usePathname();

  return (
    <nav aria-label="Portal sections" className="portal-primary-nav">
      <ul>
        {NAV_ITEMS.map((item) => {
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
