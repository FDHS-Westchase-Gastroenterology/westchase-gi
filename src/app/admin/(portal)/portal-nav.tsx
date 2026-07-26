"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// One task-first primary nav for every role. Home is the landing
// surface; the queue lives under /admin/requests; occasional tasks
// (review flyers, website custody) are reached from Home and Settings
// instead of holding permanent tabs.

const NAV_ITEMS = [
  { href: "/admin", label: "Home", mobileLabel: "Home" },
  {
    href: "/admin/requests",
    label: "Appointment requests",
    mobileLabel: "Requests",
  },
  { href: "/admin/settings", label: "Settings", mobileLabel: "Settings" },
  { href: "/admin/help", label: "Help", mobileLabel: "More" },
] as const;

function isActive(pathname: string, href: string): boolean {
  if (href === "/admin") return pathname === "/admin";
  if (href === "/admin/help") {
    return ["/admin/help", "/admin/audit", "/admin/review-flyers"].some(
      (path) => pathname === path || pathname.startsWith(`${path}/`),
    );
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function PortalNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Portal sections" className="-mb-px">
      <ul className="grid w-full grid-cols-4 items-stretch gap-0 sm:flex sm:w-auto sm:gap-1">
        {NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <li key={item.href} className="flex min-w-0">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-11 w-full min-w-0 items-center justify-center border-b-[3px] px-1.5 text-[0.82rem] font-bold transition-colors sm:w-auto sm:px-4 sm:text-[0.95rem] ${
                  active
                    ? "border-[var(--color-amber)] text-white"
                    : "border-transparent text-[var(--color-on-dark-muted)] hover:text-white"
                }`}
              >
                <span className="sm:hidden">{item.mobileLabel}</span>
                <span className="hidden sm:inline">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
