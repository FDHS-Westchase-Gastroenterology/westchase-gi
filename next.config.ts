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
  // The old "Existing Patients" page (a "Coming Soon!" stub) has no successor:
  // the portal lives in the site chrome and preps have their own section
  // (practice decision 2026-07-08). Old links land on procedure prep.
  ["/existing-patients", "/en/procedure-prep"],
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

// The old blog's 16 live posts (ported 1:1; see src/lib/content/blog).
// Older archive URLs fall through to the blog index below.
const legacyBlogPosts: Array<[string, string]> = [
  ["1468523-what-a-colonoscopy-involves-and-why-it-matters", "what-a-colonoscopy-involves-and-why-it-matters"],
  ["1465777-understanding-gastroparesis-symptoms-and-management", "understanding-gastroparesis-symptoms-and-management"],
  ["1461310-celiac-disease-vs-gluten-sensitivity-understanding-the-difference", "celiac-disease-vs-gluten-sensitivity-understanding-the-difference"],
  ["1457051-how-fiber-supports-your-digestive-health", "how-fiber-supports-your-digestive-health"],
  ["1450012-signs-your-heartburn-may-need-medical-attention", "signs-your-heartburn-may-need-medical-attention"],
  ["1444891-how-diet-choices-influence-digestive-comfort", "how-diet-choices-influence-digestive-comfort"],
  ["1435553-understanding-the-difference-between-ibs-and-ibd", "understanding-the-difference-between-ibs-and-ibd"],
  ["1433238-when-to-see-a-specialist-for-ongoing-digestive-issues", "when-to-see-a-specialist-for-ongoing-digestive-issues"],
  ["1428373-common-digestive-habits-that-impact-daily-comfort", "common-digestive-habits-that-impact-daily-comfort"],
  ["1423233-how-gut-health-supports-immune-function-and-energy", "how-gut-health-supports-immune-function-and-energy"],
  ["1417811-how-digestive-health-affects-daily-energy-and-well-being", "how-digestive-health-affects-daily-energy-and-well-being"],
  ["1414872-when-digestive-symptoms-should-be-checked-by-a-specialist", "when-digestive-symptoms-should-be-checked-by-a-specialist"],
  ["1410147-how-nsaids-affect-your-stomach-safe-use-of-over-the-counter-pain-relievers", "how-nsaids-affect-your-stomach-safe-use-of-over-the-counter-pain-relievers"],
  ["1402958-holiday-food-safety-how-to-prevent-foodborne-illness-during-seasonal-events", "holiday-food-safety-how-to-prevent-foodborne-illness-during-seasonal-events"],
  ["1395187-what-happens-during-a-polyp-removal-and-why-it-matters", "what-happens-during-a-polyp-removal-and-why-it-matters"],
  ["1392574-how-sleep-affects-your-digestive-health", "how-sleep-affects-your-digestive-health"],
];

// The old ASGE-library categories -> the on-site education pages
// (ported 1:1 by topic; see src/lib/content/education).
const legacyEducation: Array<[string, string]> = [
  ["48148", "colorectal-cancer-screening"],
  ["48149", "ibs-with-diarrhea"],
  ["48150", "upper-endoscopy"],
  ["48151", "endoscopic-ultrasonography"],
  ["48153", "ulcerative-colitis"],
  ["48154", "colon-polyps"],
  ["48155", "colonoscopy"],
  ["48156", "capsule-endoscopy"],
  ["48157", "peg-feeding-tube"],
  ["48158", "diet-and-colon-health"],
  ["48159", "diverticulosis"],
  ["48160", "esophageal-manometry-ph-impedance"],
  ["48161", "minor-rectal-bleeding"],
  ["48162", "ercp"],
  ["48163", "bowel-preparation"],
  ["48164", "crohns-disease"],
  ["48165", "gerd"],
];

const nextConfig: NextConfig = {
  // E2E build-dir isolation: a second dev server (broken-DB failure tests)
  // boots with NEXT_DIST_DIR=.next-e2e so concurrent instances never share
  // a Turbopack build directory.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  async redirects() {
    return [
      // Root: English is the default mode; the header toggle switches to /es.
      { source: "/", destination: "/en", permanent: false },
      ...legacy.map(([source, destination]) => ({ source, destination, permanent: true })),
      // The retired V1 existing-patients page (was live + in the sitemap
      // until 2026-07-08); each locale lands on its own prep index.
      {
        source: "/:locale(en|es|vi|ko|ar)/existing-patients",
        destination: "/:locale/procedure-prep",
        permanent: true,
      },
      // The blog: ported posts deep-link; anything older lands on the index.
      ...legacyBlogPosts.map(([old, slug]) => ({
        source: `/blog/${old}`,
        destination: `/en/blog/${slug}`,
        permanent: true,
      })),
      { source: "/blog", destination: "/en/blog", permanent: true },
      { source: "/blog/:path*", destination: "/en/blog", permanent: true },
      // The article library: category pages map to their education topics.
      ...legacyEducation.map(([id, slug]) => ({
        source: `/articles/asge_education_library/category/${id}`,
        destination: `/en/patient-education/${slug}`,
        permanent: true,
      })),
      { source: "/articles/:path*", destination: "/en/patient-education", permanent: true },
    ];
  },
};

export default nextConfig;
