"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Secondary navigation inside Settings: quiet underline tabs on the
// paper background, deliberately subordinate to the navy primary nav.

const TABS = [
  { href: "/admin/settings", label: "Notifications & staff" },
  { href: "/admin/settings/software", label: "Website" },
] as const;

export function SettingsTabs() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Settings sections"
      className="mt-5 border-b border-[var(--color-line-2)]"
    >
      <ul className="-mb-px flex items-stretch gap-x-6">
        {TABS.map((tab) => {
          const active = pathname === tab.href;
          return (
            <li key={tab.href} className="flex">
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-11 items-center border-b-2 text-[0.92rem] transition-[color,border-color,transform] duration-150 active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100 ${
                  active
                    ? "border-[var(--color-navy)] font-bold text-[var(--color-ink)]"
                    : "border-transparent font-bold text-[var(--color-muted)] hover:text-[var(--color-ink)]"
                }`}
              >
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
