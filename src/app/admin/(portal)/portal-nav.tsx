"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// One task-first primary nav for every role. Home is the landing
// surface; the queue lives under /admin/requests; occasional tasks
// (review flyers, website custody) are reached from Home and Settings
// instead of holding permanent tabs.

const NAV_ITEMS = [
  { href: "/admin", label: "Home" },
  { href: "/admin/requests", label: "Appointment requests" },
  { href: "/admin/settings", label: "Settings" },
  { href: "/admin/help", label: "Help" },
] as const;

function isActive(pathname: string, href: string): boolean {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function PortalNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Portal sections" className="-mb-px overflow-x-auto">
      <ul className="flex min-w-max items-stretch gap-1">
        {NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <li key={item.href} className="flex">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-11 items-center border-b-[3px] px-3.5 text-[0.95rem] font-bold transition-colors sm:px-4 ${
                  active
                    ? "border-[var(--color-amber)] text-white"
                    : "border-transparent text-[var(--color-on-dark-muted)] hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
