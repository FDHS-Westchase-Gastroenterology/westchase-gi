import type { MetadataRoute } from "next";
import { site, localePath, locales } from "@/lib/site";

const paths = [
  "/",
  "/about",
  "/services",
  "/physicians",
  "/office-gallery",
  "/new-patients",
  "/existing-patients",
  "/procedure-prep",
  "/resources",
  "/contact",
  "/appointment",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return paths.flatMap((path) =>
    locales.map((locale) => ({
      url: `${site.url}${localePath(locale, path)}`,
      lastModified,
      changeFrequency: "monthly" as const,
      priority: path === "/" ? 1 : 0.7,
      alternates: {
        languages: {
          en: `${site.url}${localePath("en", path)}`,
          es: `${site.url}${localePath("es", path)}`,
        },
      },
    }))
  );
}
