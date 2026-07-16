import type { Metadata, Viewport } from "next";
import "../globals.css";
import { fontVariables } from "@/lib/fonts";

// The staff portal is a sibling segment to [locale] with its own root
// layout: English-only, no patient Header/Footer/NoticeBanner, never
// indexed. m2 packets build the real shell on top of this.

export const metadata: Metadata = {
  title: "Staff portal | Westchase Gastroenterology",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#2e4a61",
  colorScheme: "light",
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={fontVariables}>
      <body className="portal-scope min-h-dvh bg-[var(--color-paper)] text-[var(--color-body)]">
        {children}
      </body>
    </html>
  );
}
