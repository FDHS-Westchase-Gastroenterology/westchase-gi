import type { Metadata, Viewport } from "next";
import { fontVariables } from "@/lib/fonts";

import "@/app/globals.css";
import "./portal-workbench.css";

// The staff portal is a sibling segment to [locale] with its own root
// Layout: English-only, no patient Header/Footer/NoticeBanner, never
// Indexed. m2 packets build the real shell on top of this.

export const metadata: Metadata = {
  title: "Staff portal | Westchase Gastroenterology",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#2e4a61",
  colorScheme: "light",
};

export default function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={fontVariables}>
      <body className="portal-scope min-h-dvh bg-[var(--color-paper)] text-[var(--color-body)]">
        <template
          data-design-contract="admin-front-desk-ledger"
          dangerouslySetInnerHTML={{
            __html: `<!--
THESIS: A calm front-desk ledger turns each appointment request into the next safe action and a documented outcome; it refuses the generic metrics dashboard and decorative card grid.
OWN-WORLD: Navy task index, cool paper canvas, ruled white work sheets, amber attention marks, teal ready states, plain-language handoff controls.
STORY: Staff see what needs contact, distribute a truthful paper packet when needed, record the outcome in the live request, and know what happens next.
FIRST VIEWPORT: Desktop holds a 17rem task rail beside the ordered work stack and its primary print action; mobile keeps the same four destinations in a bottom bar above one readable column.
FORM: A persistent task index plus ordered worksheet ledger mirrors the practice's paper routing stack while keeping the portal authoritative.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, and DESIGN.md
-->`,
          }}
        />
        {children}
      </body>
    </html>
  );
}
