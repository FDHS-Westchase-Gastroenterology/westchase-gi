import type { Metadata, Viewport } from "next";
import "../globals.css";
import { fontVariables } from "@/lib/fonts";
import { site } from "@/lib/site";

// The master-QR landing page is deliberately outside the [locale] tree:
// one stable URL for the printed QR, no site chrome, language switching
// inline (patients scan it in the office, often on cellular).

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: `Leave us a review | ${site.name}`,
  description:
    "Scan-to-review hub for Westchase Gastroenterology: share your experience on Google or Facebook, or reach the office in one tap.",
  alternates: { canonical: "/review" },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#20374e",
  colorScheme: "light",
};

export default function ReviewLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={fontVariables}>
      <body>{children}</body>
    </html>
  );
}
