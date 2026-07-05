// Central site configuration for FDHS Westchase Gastroenterology.
// Every fact mirrors the practice's published content; items flagged
// NEEDS CONFIRMATION carry the value the practice's primary contact page
// publishes today and are centralized here so a confirmed correction is a
// one-line change.

export type Locale = "en" | "es";
export const locales: Locale[] = ["en", "es"];

/** localStorage key for the once-per-visitor notice banner (30-day stamp).
 * Shared by the layout's pre-paint script and the banner's dismiss button. */
export const BANNER_KEY = "wgi-banner-dismissed";

export const site = {
  name: "Westchase Gastroenterology",
  headerName: "FDHS Westchase Gastroenterology",
  network: "Florida Digestive Health Specialists",
  domain: "westchasegi.com",
  url: "https://www.westchasegi.com",
  phone: { display: "(813) 920-8882", href: "tel:+18139208882" },
  // Staffed by a human daily; keep prominent (practice directive).
  textLine: { display: "(813) 564-0315", href: "sms:+18135640315" },
  // NEEDS CONFIRMATION: fax also appears as 813-920-8883 on the old office-gallery
  // page; (813) 920-5800 is what the contact page publishes.
  fax: { display: "(813) 920-5800" },
  // NEEDS CONFIRMATION: info@westchasegi.com also appears on the old office-gallery
  // page; fdhswestchase@fdhs.com is what the contact page publishes and does not
  // depend on the domain's mail setup.
  email: "fdhswestchase@fdhs.com",
  hours: { opens: "08:00", closes: "16:30" },
  affiliations:
    "Tampa Bay Endoscopy Center, Tampa Community Hospital, Tampa Outpatient Surgical Facility, & Memorial Hospital",
  locations: [
    {
      id: "tampa",
      name: "Tampa Office",
      nameEs: "Oficina de Tampa",
      street: "11912 Sheldon Road",
      city: "Tampa",
      region: "FL",
      postal: "33626",
      geo: { lat: 28.057047, lng: -82.584079 },
      mapsQuery: "Westchase Gastroenterology, 11912 Sheldon Road, Tampa, FL 33626",
    },
    {
      id: "lutz",
      name: "Lutz Office",
      nameEs: "Oficina de Lutz",
      street: "4695 Van Dyke Road",
      city: "Lutz",
      region: "FL",
      postal: "33558",
      geo: { lat: 28.145624, lng: -82.52381 },
      mapsQuery: "Westchase Gastroenterology, 4695 Van Dyke Road, Lutz, FL 33558",
    },
  ],
  links: {
    // All external URLs verified live 2026-07-04 (recon link audit).
    portal: "https://mycw140.ecwcloud.com/portal19634/jsp/100mp/login_otp.jsp",
    newPatientFormsEn: "https://hushforms.com/37276-new-pt-packet-form-english",
    newPatientFormsEs: "https://hushforms.com/37276-new-pt-packet-form-spanish",
    googleReview: "https://search.google.com/local/writereview?placeid=ChIJ1XxEt_TqwogRxD4EJvCYK4k",
    googleMapsListing: "https://maps.app.goo.gl/a2TfakxY1pG2d6tm8",
    healthgradesTampa:
      "https://www.healthgrades.com/group-directory/fl-florida/tampa/westchase-gastroenterology-pa-oy57dpj",
    healthgradesLutz:
      "https://www.healthgrades.com/group-directory/fl-florida/lutz/westchase-gastroenterology-pa-oy57dnr",
    alphaOmega: "https://www.alphaomegawellnessfl.com",
  },
} as const;

export type SiteLocation = (typeof site.locations)[number];

export function mapsUrl(query: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export function directionsUrl(query: string): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(query)}`;
}

export function localePath(locale: Locale, path: string): string {
  const clean = path.startsWith("/") ? path : `/${path}`;
  return clean === "/" ? `/${locale}` : `/${locale}${clean}`;
}
