import type { Metadata } from "next";
import { site, locales, localePath } from "./site";
import type { Locale } from "./site";

/** Og:locale values (Facebook's ll_CC set) per site locale. */
const ogLocale = {
  en: "en_US",
  es: "es_US",
  vi: "vi_VN",
  ko: "ko_KR",
  ar: "ar_AR",
} as const satisfies Record<Locale, string>;

/** Per-page metadata with canonical + full hreflang set (fixes the old
 * site's single duplicated description across all 64 pages). */
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
        ...Object.fromEntries(locales.map((l) => [l, localePath(l, path)])),
        "x-default": localePath("en", path),
      },
    },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: site.name,
      locale: ogLocale[locale],
      type: "website",
    },
  };
}
