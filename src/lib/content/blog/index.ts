// The practice blog, ported from the old site's most recent posts (the 16
// Full posts a visitor finds on the old blog's first two pages, Nov 2025 –
// Jun 2026). Topic, title, and posted date match the old site exactly; the
// Bodies are original writing (the old bodies were vendor-licensed text that
// Does not transfer), authored as an EN/ES baseline and expanded into VI/KO/AR
// By machine translation; all translated copy awaits native-speaker review.
// Older archive titles (2019–2025)
// Exist only as teasers in the recon capture and are catalogued in the
// Faithfulness matrix at the repo root, not ported.

import type { Locale } from "@/lib/site";
import type { BlogPost } from "../types";
import { batch1 } from "./batch1";
import { batch2 } from "./batch2";
import { batch3 } from "./batch3";

export const blogPosts: BlogPost[] = [...batch1, ...batch2, ...batch3].sort(
  (a, b) => (a.posted < b.posted ? 1 : -1)
);

export function getPost(slug: string): BlogPost | undefined {
  return blogPosts.find((p) => p.slug === slug);
}

// Built once per locale; constructing an Intl formatter is expensive and
// FormatPosted runs for every post card on every list render.
const dateOpts = {
  year: "numeric",
  month: "long",
  day: "numeric",
  timeZone: "UTC",
} as const;
const postedFormat = {
  en: new Intl.DateTimeFormat("en-US", dateOpts),
  es: new Intl.DateTimeFormat("es-US", dateOpts),
  vi: new Intl.DateTimeFormat("vi-VN", dateOpts),
  ko: new Intl.DateTimeFormat("ko-KR", dateOpts),
  ar: new Intl.DateTimeFormat("ar-u-nu-latn", dateOpts),
} as const satisfies Record<Locale, Intl.DateTimeFormat>;

export function formatPosted(iso: string, locale: Locale): string {
  const [y, m, d] = iso.split("-").map(Number);
  return postedFormat[locale].format(new Date(Date.UTC(y, m - 1, d)));
}
