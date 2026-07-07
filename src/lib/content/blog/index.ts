// The practice blog, ported from the old site's most recent posts (the 16
// full posts a visitor finds on the old blog's first two pages, Nov 2025 –
// Jun 2026). Topic, title, and posted date match the old site exactly; the
// bodies are original writing (the old bodies were vendor-licensed text that
// does not transfer), in both languages. Older archive titles (2019–2025)
// exist only as teasers in the recon capture and are catalogued in the
// faithfulness matrix at the repo root, not ported.

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

export function formatPosted(iso: string, locale: "en" | "es"): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return new Intl.DateTimeFormat(locale === "es" ? "es-US" : "en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
}
