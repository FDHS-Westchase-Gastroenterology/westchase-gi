"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// The four fixed staff destinations, in the spec's fixed order
// (DEC-UX-02): Home, Appointments, Settings, Help. Home is the landing
// Surface; the appointment workbench lives under /admin/requests (the
// Records remain appointment requests — the portal owns no Appointment
// Entity); occasional tasks (review flyers, website custody) are
// Reached from Home and Settings instead of holding permanent tabs.
// Every destination stays visible on a phone without unmarked
// Horizontal scrolling.

interface NavItem {
  href: string;
  label: string;
  compactLabel?: string;
}

const NAV_ITEMS: readonly NavItem[] = [
  { href: "/admin", label: "Home" },
  { href: "/admin/requests", label: "Appointments" },
  { href: "/admin/settings", label: "Settings" },
  { href: "/admin/help", label: "Help" },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function PortalNav({ waitingCount }: Readonly<{ waitingCount: number | null }>) {
  const pathname = usePathname();

  return (
    <nav aria-label="Portal sections" className="-mb-px overflow-x-auto">
      <ul className="flex min-w-max items-stretch gap-1">
        {NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item.href);
          const showBadge =
            item.href === "/admin/requests" && waitingCount !== null && waitingCount > 0;
          return (
            <li key={item.href} className="flex">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-11 items-center border-b-[3px] px-2.5 text-[0.95rem] font-bold transition-colors sm:px-4 ${
                  active
                    ? "border-[var(--color-amber)] text-white"
                    : "border-transparent text-[var(--color-on-dark-muted)] hover:text-white"
                }`}
              >
                {item.compactLabel !== undefined && item.compactLabel !== "" ? (
                  <>
                    <span className="sm:hidden">{item.compactLabel}</span>
                    <span className="hidden sm:inline">{item.label}</span>
                  </>
                ) : (
                  item.label
                )}
                {showBadge ? (
                  <span
                    data-testid="nav-waiting-badge"
                    className="ml-2 inline-flex min-w-5 items-center justify-center rounded-full bg-[var(--color-amber)] px-1.5 py-0.5 text-center text-[0.72rem] font-extrabold text-[var(--color-navy-2)] tabular-nums"
                  >
                    {waitingCount}
                    <span className="sr-only"> waiting</span>
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
