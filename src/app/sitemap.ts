import type { MetadataRoute } from "next";
import { site, localePath, locales } from "@/lib/site";
import { blogPosts } from "@/lib/content/blog";
import { educationTopics } from "@/lib/content/education";
import { prepDocs } from "@/lib/content/preps";

const paths = [
  "/",
  "/about",
  "/services",
  "/physicians",
  "/office-gallery",
  "/new-patients",
  "/existing-patients",
  "/procedure-prep",
  ...prepDocs.map((d) => `/procedure-prep/${d.slug}`),
  "/resources",
  "/patient-education",
  ...educationTopics.map((t) => `/patient-education/${t.slug}`),
  "/blog",
  ...blogPosts.map((p) => `/blog/${p.slug}`),
  "/contact",
  "/appointment",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  const localized = paths.flatMap((path) =>
    locales.map((locale) => ({
      url: `${site.url}${localePath(locale, path)}`,
      lastModified,
      changeFrequency: "monthly" as const,
      priority: path === "/" ? 1 : 0.7,
      alternates: {
        languages: Object.fromEntries(
          locales.map((l) => [l, `${site.url}${localePath(l, path)}`])
        ),
      },
    }))
  );
  return [
    ...localized,
    // The master-QR review hub: one locale-neutral URL (language switches inline).
    {
      url: `${site.url}/review`,
      lastModified,
      changeFrequency: "yearly" as const,
      priority: 0.5,
    },
  ];
}
