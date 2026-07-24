import reviewTargets from "@/lib/review-targets.json";

// Central site configuration for FDHS Westchase Gastroenterology.
// Facts carry dated provenance comments where useful; unresolved practice
// confirmations are listed in README so a present value is never mistaken
// for confirmed merely because it is centralized here.

export type Locale = "en" | "es" | "vi" | "ko" | "ar";
export const locales: Locale[] = ["en", "es", "vi", "ko", "ar"];
export type OfficeHours = { opens: string; closes: string };

const officeTimeFormatters: Record<Locale, Intl.DateTimeFormat> = {
  en: new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "UTC",
  }),
  es: new Intl.DateTimeFormat("es", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "UTC",
  }),
  vi: new Intl.DateTimeFormat("vi", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "UTC",
  }),
  ko: new Intl.DateTimeFormat("ko", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "UTC",
  }),
  ar: new Intl.DateTimeFormat("ar", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "UTC",
  }),
};

function officeTime(value: string, locale: Locale): string {
  const [hour, minute] = value.split(":").map(Number);
  return officeTimeFormatters[locale].format(new Date(Date.UTC(2026, 0, 1, hour, minute)));
}

export function formatOfficeHours(locale: Locale, hours: OfficeHours): string {
  return `${officeTime(hours.opens, locale)} – ${officeTime(hours.closes, locale)}`;
}

/** Native-language labels for the language menu. */
export const localeNames: Record<Locale, string> = {
  en: "English",
  es: "Español",
  vi: "Tiếng Việt",
  ko: "한국어",
  ar: "العربية",
};

export function localeDir(locale: Locale): "ltr" | "rtl" {
  return locale === "ar" ? "rtl" : "ltr";
}

/** localStorage key for the once-per-visitor notice banner (30-day stamp).
 * Shared by the layout's pre-paint script and the banner's dismiss button. */
export const BANNER_KEY = "wgi-banner-dismissed";

/** Cookie recording the visitor's explicitly chosen locale. Read by the
 * proxy to send future visits to `/` to the right language. */
export const LOCALE_COOKIE = "wgi-locale";

export const site = {
  name: "Westchase Gastroenterology",
  headerName: "FDHS Westchase Gastroenterology",
  network: "Florida Digestive Health Specialists",
  domain: "westchasegi.com",
  url: "https://www.westchasegi.com",
  phone: { display: "(813) 920-8882", href: "tel:+18139208882" },
  // Staffed by a human, answered within 24 hours; keep prominent (practice directive).
  textLine: { display: "(813) 564-0315", href: "sms:+18135640315" },
  // Confirmed by the practice 2026-07-08: 920-8883 is the correct fax (the old
  // contact page's 920-5800 was wrong; office-gallery page had it right).
  fax: { display: "(813) 920-8883" },
  // 2026-07-10 debrief: use the contact-page address as the canonical public address.
  // Staff do not reliably monitor it, so appointment requests must not depend on this
  // inbox; the shipped intake system uses the durable database/admin queue instead.
  email: "fdhswestchase@fdhs.com",
  // Confirmed by the practice 2026-07-05: these are the ONLY current procedure
  // locations (the four facilities on the old site are outdated).
  affiliations:
    "AdventHealth Surgery Center Wellswood & AdventHealth Carrollwood",
  locations: [
    {
      id: "tampa",
      name: {
        en: "Tampa Office",
        es: "Oficina de Tampa",
        vi: "Văn phòng Tampa",
        ko: "탬파 진료소",
        ar: "مكتب تامبا",
      },
      street: "11912 Sheldon Road",
      city: "Tampa",
      region: "FL",
      postal: "33626",
      geo: { lat: 28.057047, lng: -82.584079 },
      mapsQuery: "Westchase Gastroenterology, 11912 Sheldon Road, Tampa, FL 33626",
      // Google Business Profile, marked practice-confirmed 2026-07-03, rechecked 2026-07-10.
      hours: { opens: "08:00", closes: "17:00" },
    },
    {
      id: "lutz",
      name: {
        en: "Lutz Office",
        es: "Oficina de Lutz",
        vi: "Văn phòng Lutz",
        ko: "루츠 진료소",
        ar: "مكتب لوتز",
      },
      street: "4695 Van Dyke Road",
      city: "Lutz",
      region: "FL",
      postal: "33558",
      geo: { lat: 28.145624, lng: -82.52381 },
      mapsQuery: "Westchase Gastroenterology, 4695 Van Dyke Road, Lutz, FL 33558",
      // Practice-confirmed 2026-07-10: 8:00–4:30. No separate Google profile surfaced.
      hours: { opens: "08:00", closes: "16:30" },
    },
  ],
  links: {
    // All external URLs verified live 2026-07-04 (recon link audit).
    portal: "https://mycw140.ecwcloud.com/portal19634/jsp/100mp/login_otp.jsp",
    newPatientFormsEn: "https://hushforms.com/37276-new-pt-packet-form-english",
    newPatientFormsEs: "https://hushforms.com/37276-new-pt-packet-form-spanish",
    googleReview: reviewTargets.practice.destination,
    googleMapsListing: "https://maps.app.goo.gl/a2TfakxY1pG2d6tm8",
    // The practice's live Facebook page (verified 2026-07-08: renders logged-out;
    // page ID carries the old vanity slug's business_id — see REVIEW-LINKS.md).
    facebookPage: "https://www.facebook.com/profile.php?id=100064038010410",
    // Reviews tab verified publicly reachable logged-out 2026-07-08 (shows the
    // existing recommendation; the "Do you recommend?" prompt appears on login).
    facebookReviews: "https://www.facebook.com/profile.php?id=100064038010410&sk=reviews",
    healthgradesTampa:
      "https://www.healthgrades.com/group-directory/fl-florida/tampa/westchase-gastroenterology-pa-oy57dpj",
    healthgradesLutz:
      "https://www.healthgrades.com/group-directory/fl-florida/lutz/westchase-gastroenterology-pa-oy57dnr",
    alphaOmega: "https://www.alphaomegawellnessfl.com",
  },
} as const;

export type SiteLocation = (typeof site.locations)[number];

/** Keyless Google Maps iframe embed, localized. Verified live 2026-07-07:
 *  resolves 200 to /maps/embed for both office queries in en and es. */
export function mapEmbedUrl(query: string, locale: Locale): string {
  return `https://www.google.com/maps?q=${encodeURIComponent(query)}&z=15&output=embed&hl=${locale}`;
}

export function directionsUrl(query: string): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(query)}`;
}

export function localePath(locale: Locale, path: string): string {
  const clean = path.startsWith("/") ? path : `/${path}`;
  return clean === "/" ? `/${locale}` : `/${locale}${clean}`;
}

/** Re-point a localized path at another locale without changing its page. */
export function pathInLocale(pathname: string, target: Locale): string {
  const rest = pathname.replace(
    new RegExp(`^/(${locales.join("|")})(?=/|$)`),
    "",
  );
  return `/${target}${rest}`;
}
