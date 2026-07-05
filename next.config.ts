import type { NextConfig } from "next";

// Legacy URL map: every indexed path from the practice's previous site gets a
// permanent redirect at DNS cutover (including the old trailing-hyphen
// /about-us- URL and the hollow bio/template slugs).
const legacy: Array<[string, string]> = [
  ["/about-us-", "/en/about"],
  ["/about-us", "/en/about"],
  ["/services", "/en/services"],
  ["/physicians", "/en/physicians"],
  ["/office-gallery", "/en/office-gallery"],
  ["/new-patients", "/en/new-patients"],
  ["/existing-patients", "/en/existing-patients"],
  ["/procedure-preparation-instruction", "/en/procedure-prep"],
  ["/contact", "/en/contact"],
  ["/links", "/en/resources"],
  ["/appointment", "/en/appointment"],
  ["/sitemap", "/en"],
  ["/Dr-John-Chang-Bios", "/en/physicians"],
  ["/Dr-AmirAwad", "/en/physicians"],
  ["/Dr-Alfredo-Mendozas-Bio", "/en/physicians"],
  ["/STAFperson1urlslug", "/en/physicians"],
  ["/STAFperson2urlslug", "/en/physicians"],
  ["/STAFperson3urlslug", "/en/physicians"],
];

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // Root: English is the default mode; the header toggle switches to /es.
      { source: "/", destination: "/en", permanent: false },
      ...legacy.map(([source, destination]) => ({ source, destination, permanent: true })),
      // The retired vendor blog and article library.
      { source: "/blog", destination: "/en", permanent: true },
      { source: "/blog/:path*", destination: "/en", permanent: true },
      { source: "/articles/:path*", destination: "/en/resources", permanent: true },
    ];
  },
};

export default nextConfig;
