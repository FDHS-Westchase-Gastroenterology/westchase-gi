import type { Metadata, Viewport } from "next";
import Link from "next/link";

import { fontVariables } from "@/lib/fonts";

import "@/app/globals.css";
import "./design.css";

/* The design gallery is its own root layout, a sibling of [locale], admin,
   and review: no patient chrome, no portal scope, never indexed. It shows
   the token system and every component tier side by side (DESIGN.md
   "The gallery"). */

export const metadata: Metadata = {
  title: "Design system | Westchase Gastroenterology",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#2e4a61",
  colorScheme: "light",
};

export default function DesignLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={fontVariables}>
      <body className="design-scope min-h-dvh">
        <header className="border-b border-line bg-white">
          <div className="mx-auto flex max-w-7xl items-center gap-6 px-6 py-3">
            <Link href="/design" className="text-sm font-bold tracking-wide text-ink uppercase">
              Westchase GI design system
            </Link>
            <nav aria-label="Gallery" className="flex items-center gap-4 text-sm">
              <Link href="/design#foundations" className="text-muted-ink hover:text-ink">
                Foundations
              </Link>
              <Link href="/design#components" className="text-muted-ink hover:text-ink">
                Components
              </Link>
            </nav>
            <span className="ms-auto text-xs text-muted-ink">
              Local and Preview only · 404 in Production
            </span>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-6 py-10">{children}</main>
      </body>
    </html>
  );
}
