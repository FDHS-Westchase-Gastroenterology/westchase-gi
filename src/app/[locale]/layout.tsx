import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { Lato, Trocchi } from "next/font/google";
import "../globals.css";
import { Header } from "@/components/Header";
import { JsonLd } from "@/components/JsonLd";
import { Footer } from "@/components/Footer";
import { NoticeBanner } from "@/components/NoticeBanner";
import { getDictionary, isLocale } from "@/lib/i18n";
import { site, localePath, locales, BANNER_KEY, type Locale } from "@/lib/site";

// The practice's own type pairing: Lato for UI/body, Trocchi for display.
const lato = Lato({
  variable: "--font-lato",
  subsets: ["latin"],
  weight: ["400", "700", "900"],
  display: "swap",
});

const trocchi = Trocchi({
  variable: "--font-trocchi",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

export const dynamicParams = false;

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : "en";
  const dict = getDictionary(locale);
  return {
    metadataBase: new URL(site.url),
    title: {
      default: dict.meta.home.title,
      template: `%s | ${site.name}`,
    },
    description: dict.meta.home.description,
    // FDHS's own published favicon set (the teal Florida network mark),
    // matching the Florida inside the header logo.
    icons: {
      icon: [
        { url: "/images/brand/favicon-fdhs-32.png", sizes: "32x32", type: "image/png" },
        { url: "/images/brand/favicon-fdhs-192.png", sizes: "192x192", type: "image/png" },
      ],
      apple: { url: "/images/brand/favicon-fdhs-180.png", sizes: "180x180", type: "image/png" },
    },
    robots: { index: true, follow: true },
  };
}

export const viewport: Viewport = {
  themeColor: "#20374e",
  colorScheme: "light",
};

/** Two MedicalClinic entities (Tampa AND Lutz; the old schema omitted Lutz)
 * plus WebSite. Dead social profiles are excluded from sameAs. */
function ClinicSchema() {
  const clinics = site.locations.map((loc) => ({
    "@type": "MedicalClinic",
    "@id": `${site.url}/#${loc.id}`,
    name: `${site.name} – ${loc.name}`,
    url: site.url,
    telephone: "+18139208882",
    faxNumber: "+18139205800",
    email: site.email,
    medicalSpecialty: "Gastroenterologic",
    address: {
      "@type": "PostalAddress",
      streetAddress: loc.street,
      addressLocality: loc.city,
      addressRegion: loc.region,
      postalCode: loc.postal,
      addressCountry: "US",
    },
    geo: { "@type": "GeoCoordinates", latitude: loc.geo.lat, longitude: loc.geo.lng },
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        opens: site.hours.opens,
        closes: site.hours.closes,
      },
    ],
    sameAs: [
      site.links.googleMapsListing,
      loc.id === "tampa" ? site.links.healthgradesTampa : site.links.healthgradesLutz,
    ],
    parentOrganization: { "@type": "MedicalOrganization", name: site.network },
  }));
  const json = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        name: site.name,
        url: site.url,
        inLanguage: ["en", "es"],
      },
      ...clinics,
    ],
  };
  return <JsonLd data={json} />;
}

export default async function LocaleLayout({
  children,
  params,
}: Readonly<{ children: React.ReactNode; params: Promise<{ locale: string }> }>) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale: Locale = raw;
  const dict = getDictionary(locale);

  return (
    <html lang={locale} className={`${lato.variable} ${trocchi.variable}`} suppressHydrationWarning>
      <body>
        {/* Pre-paint: enable reveal-on-scroll only with JS, and hide the
            once-per-visitor banner for returning visitors without a flash.
            Deliberately a native <script>: it must run before first paint,
            and next/script can't do that for inline code (beforeInteractive
            only supports external src; verified against Next.js docs 2026-07-07). */}
        {/* oxlint-disable-next-line react-doctor/nextjs-no-native-script */}
        <script
          dangerouslySetInnerHTML={{
            __html: `document.documentElement.classList.add('js');try{var v=+localStorage.getItem('${BANNER_KEY}');if(v&&Date.now()<v)document.documentElement.classList.add('banner-dismissed')}catch(e){}`,
          }}
        />
        <ClinicSchema />
        <a href="#main" className="skip-link">
          {dict.common.skipToContent}
        </a>
        <Header locale={locale} dict={dict} />
        <NoticeBanner
          headline={dict.common.banner.headline}
          body={dict.common.banner.body}
          cta={dict.common.banner.cta}
          ctaHref={localePath(locale, "/appointment")}
          dismissLabel={dict.common.banner.dismiss}
        />
        <main id="main">{children}</main>
        <Footer locale={locale} dict={dict} />
      </body>
    </html>
  );
}
