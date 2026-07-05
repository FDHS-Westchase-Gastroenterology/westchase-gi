import type { Metadata } from "next";
import { site, localePath, type Locale } from "./site";

/** Per-page metadata with canonical + hreflang pair (fixes the old site's
 * single duplicated description across all 64 pages). */
export function pageMetadata(
  locale: Locale,
  path: string,
  title: string,
  description: string
): Metadata {
  const canonical = localePath(locale, path);
  return {
    title,
    description,
    alternates: {
      canonical,
      languages: {
        en: localePath("en", path),
        es: localePath("es", path),
        "x-default": localePath("en", path),
      },
    },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: site.name,
      locale: locale === "es" ? "es_US" : "en_US",
      type: "website",
    },
  };
}
