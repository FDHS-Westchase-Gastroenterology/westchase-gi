// Aggregate, PHI-free patient-site event counters per the 2026-07-28
// Patient-site experience assessment (I6). Counts are directional, not
// Forensic — throttle drops and coarse device class mean totals are
// Approximate product signal, never a visitor journey or identity store.
//
// Client-importable contract only: no server-only imports, no secrets.
// Route templates are explicit path strings derived from the static patient
// Routes, content-index slugs (preps / education / blog), and documents.ts
// Ids — listed here rather than imported so this module stays lean for the
// Client beacon and importable under node:test.

import { z } from "zod";

export const ANALYTICS_EVENTS = [
  "page_view",
  "form_view",
  "form_submit",
  "form_success",
  "form_failure",
  "form_unknown",
  "form_throttled",
  "cta_tap_call",
  "cta_tap_text",
  "cta_tap_patient_portal",
  "cta_tap_hushforms",
  "cta_tap_review",
  "chooser_shown",
  "chooser_accepted_hint",
  "chooser_switched",
  "chooser_kept_current",
  "chooser_dismissed",
  "banner_dismissed",
  "doc_download",
  "doc_request_by_text",
] as const;
export type AnalyticsEvent = (typeof ANALYTICS_EVENTS)[number];

export const DEVICE_CLASSES = ["mobile", "tablet", "desktop"] as const;
export type DeviceClass = (typeof DEVICE_CLASSES)[number];

/** Mirrors src/lib/site.ts locales — kept local so this module stays leaf-importable. */
export const TELEMETRY_LOCALES = ["en", "es", "vi", "ko", "ar"] as const;
export type TelemetryLocale = (typeof TELEMETRY_LOCALES)[number];

/**
 * Shared Postgres-backed telemetry throttle. Distinct HMAC domain from intake
 * so buckets never mix. Counts are directional, not forensic.
 */
export const TELEMETRY_RATE_LIMIT = {
  limit: 300,
  windowSeconds: 600,
} as const;

/** HMAC domain — must stay distinct from intake's wgi:intake-rate-limit:client:v1\0 */
export const TELEMETRY_CLIENT_HASH_DOMAIN = "wgi:telemetry-rate-limit:client:v1\0";

const STATIC_ROUTE_TEMPLATES = [
  "/",
  "/about",
  "/services",
  "/physicians",
  "/procedure-prep",
  "/patient-education",
  "/blog",
  "/new-patients",
  "/resources",
  "/office-gallery",
  "/contact",
  "/appointment",
  "/appointment/received",
] as const;

/** Derived from src/lib/content/preps/ slug fields. */
const PREP_SLUGS = [
  "clenpiq-split-dose",
  "clenpiq",
  "sutab",
  "miralax",
  "miralax-split-dose",
  "golytely",
  "golytely-split-dose",
  "egd",
  "bravo",
  "halo",
  "endocapsule",
  "sigmoidoscopy",
  "anti-reflux-diet",
] as const;

/** Derived from src/lib/content/education/ slug fields. */
const EDUCATION_SLUGS = [
  "colorectal-cancer-screening",
  "upper-endoscopy",
  "endoscopic-ultrasonography",
  "colonoscopy",
  "capsule-endoscopy",
  "peg-feeding-tube",
  "esophageal-manometry-ph-impedance",
  "ercp",
  "bowel-preparation",
  "diet-and-colon-health",
  "ibs-with-diarrhea",
  "ulcerative-colitis",
  "colon-polyps",
  "diverticulosis",
  "minor-rectal-bleeding",
  "crohns-disease",
  "gerd",
  "abdominal-pain",
  "barretts-esophagus",
  "constipation",
  "food-allergy-intolerance",
  "gallstones",
  "hemochromatosis",
  "inflammatory-bowel-disease",
  "intestinal-gas",
  "liver-disease",
  "rectal-disease",
  "ulcers",
] as const;

/** Derived from src/lib/content/blog/ slug fields. */
const BLOG_SLUGS = [
  "what-a-colonoscopy-involves-and-why-it-matters",
  "understanding-gastroparesis-symptoms-and-management",
  "celiac-disease-vs-gluten-sensitivity-understanding-the-difference",
  "how-fiber-supports-your-digestive-health",
  "signs-your-heartburn-may-need-medical-attention",
  "how-diet-choices-influence-digestive-comfort",
  "understanding-the-difference-between-ibs-and-ibd",
  "when-to-see-a-specialist-for-ongoing-digestive-issues",
  "common-digestive-habits-that-impact-daily-comfort",
  "how-gut-health-supports-immune-function-and-energy",
  "how-digestive-health-affects-daily-energy-and-well-being",
  "when-digestive-symptoms-should-be-checked-by-a-specialist",
  "how-nsaids-affect-your-stomach-safe-use-of-over-the-counter-pain-relievers",
  "holiday-food-safety-how-to-prevent-foodborne-illness-during-seasonal-events",
  "what-happens-during-a-polyp-removal-and-why-it-matters",
  "how-sleep-affects-your-digestive-health",
] as const;

/** Derived from src/lib/documents.ts ids — doc_download / doc_request_by_text only. */
const DOCUMENT_IDS = [
  "record-release-to-wcgi",
  "record-release-from-wcgi",
  "prep-clenpiq-split-dose",
  "prep-clenpiq",
  "prep-sutab",
  "prep-colonoscopy-miralax",
  "prep-colonoscopy-miralax-split-dose",
  "prep-golytely",
  "prep-golytely-split-dose",
  "prep-egd",
  "prep-bravo",
  "prep-halo",
  "prep-endocapsule",
  "prep-sigmoidoscopy",
  "prep-anti-reflux-diet",
  "info-abdominal-pain",
  "info-barretts-esophagus",
  "info-colorectal-cancer",
  "info-constipation",
  "info-crohns-disease",
  "info-diverticular-disease",
  "info-food-allergy",
  "info-gallstones",
  "info-gerd",
  "info-hemochromatosis",
  "info-ibd",
  "info-intestinal-gas",
  "info-liver-disease",
  "info-rectal-disease",
  "info-ulcers",
  "info-ulcerative-colitis",
] as const;

export const TELEMETRY_ROUTE_TEMPLATES = [
  ...STATIC_ROUTE_TEMPLATES,
  ...PREP_SLUGS.map((slug) => `/procedure-prep/${slug}`),
  ...EDUCATION_SLUGS.map((slug) => `/patient-education/${slug}`),
  ...BLOG_SLUGS.map((slug) => `/blog/${slug}`),
  ...DOCUMENT_IDS.map((id) => `documents:${id}`),
] as const;

export type TelemetryRouteTemplate = (typeof TELEMETRY_ROUTE_TEMPLATES)[number];

const routeTemplateSet = new Set<string>(TELEMETRY_ROUTE_TEMPLATES);

export const telemetryEventSchema = z.object({
  event: z.enum(ANALYTICS_EVENTS),
  routeTemplate: z
    .string()
    .trim()
    .min(1)
    .max(160)
    .refine((value) => routeTemplateSet.has(value), "route_template_not_allowed"),
  locale: z.enum(TELEMETRY_LOCALES),
  deviceClass: z.enum(DEVICE_CLASSES),
});

export type TelemetryEventInput = z.infer<typeof telemetryEventSchema>;
