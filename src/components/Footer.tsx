import Image from "next/image";
import Link from "next/link";
import { site, localePath, directionsUrl, formatOfficeHours, type Locale } from "@/lib/site";
import type { Dictionary } from "@/lib/i18n";
import { ArrowRight, ExternalLink, Facebook, Mail, MapPin, MessageSquare, Phone, Printer, Star } from "./icons";

type FooterProps = { locale: Locale; dict: Dictionary };

export function Footer({ locale, dict }: FooterProps) {
  const c = dict.common;
  const p = (path: string) => localePath(locale, path);
  const year = new Date().getFullYear();

  const explore = [
    { label: c.nav.home, href: p("/") },
    { label: c.nav.aboutUs, href: p("/about") },
    { label: c.nav.services, href: p("/services") },
    { label: c.nav.physicians, href: p("/physicians") },
    { label: c.nav.gallery, href: p("/office-gallery") },
    { label: c.nav.blog, href: p("/blog") },
    { label: c.nav.contact, href: p("/contact") },
  ];
  const patients = [
    { label: c.nav.newPatients, href: p("/new-patients") },
    { label: c.nav.procedurePrep, href: p("/procedure-prep") },
    { label: c.nav.patientEducation, href: p("/patient-education") },
    { label: c.nav.resources, href: p("/resources") },
    { label: c.nav.appointment, href: p("/appointment") },
  ];

  return (
    <footer className="bg-[var(--color-navy-2)] text-[var(--color-on-dark-muted)]">
      <div className="container-x section-sm grid gap-x-10 gap-y-12 md:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr_1.4fr]">
        {/* Identity + human channels */}
        <div>
          <div className="flex items-center gap-3">
            <Image
              src="/images/brand/favicon-fdhs-192.png"
              alt=""
              width={50}
              height={50}
              className="h-11 w-11 rounded-full bg-white/95 p-1.5"
            />
            <p className="font-[var(--font-display)] text-xl leading-tight text-[var(--color-on-dark)]">
              {site.headerName}
            </p>
          </div>
          <p className="mt-4 max-w-sm text-[0.95rem] leading-relaxed">{c.footer.phoneNote}</p>
          <p className="mt-3 max-w-sm text-[0.95rem] leading-relaxed">
            {c.footer.emailNote}{" "}
            <a href={`mailto:${site.email}`} className="font-bold text-[var(--color-on-dark)] underline decoration-[var(--color-line-dark)] underline-offset-4 hover:decoration-[var(--color-amber)]">
              {site.email}
            </a>
            .
          </p>
        </div>

        {/* Explore */}
        <nav aria-label={c.footer.exploreHeading}>
          <h2 className="font-[var(--font-body)] text-[0.85rem] font-extrabold uppercase tracking-wide text-[var(--color-amber)]">
            {c.footer.exploreHeading}
          </h2>
          <ul className="mt-4 grid gap-2.5 font-semibold">
            {explore.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="transition-colors hover:text-[var(--color-on-dark)]">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* For patients */}
        <nav aria-label={c.footer.patientsHeading}>
          <h2 className="font-[var(--font-body)] text-[0.85rem] font-extrabold uppercase tracking-wide text-[var(--color-amber)]">
            {c.footer.patientsHeading}
          </h2>
          <ul className="mt-4 grid gap-2.5 font-semibold">
            {patients.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="transition-colors hover:text-[var(--color-on-dark)]">
                  {l.label}
                </Link>
              </li>
            ))}
            <li>
              <a
                href={site.links.portal}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 transition-colors hover:text-[var(--color-on-dark)]"
              >
                {c.patientPortal}
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </li>
          </ul>
        </nav>

        {/* Locations + contact */}
        <div>
          <h2 className="font-[var(--font-body)] text-[0.85rem] font-extrabold uppercase tracking-wide text-[var(--color-amber)]">
            {c.footer.locationsHeading}
          </h2>
          <ul className="mt-4 grid gap-5">
            {site.locations.map((loc) => (
              <li key={loc.id} className="flex items-start gap-2.5">
                <MapPin className="mt-1 h-4 w-4 flex-none text-[var(--color-amber)]" />
                <div>
                  <p className="font-bold text-[var(--color-on-dark)]">
                    {loc.name[locale]}
                  </p>
                  <a
                    href={directionsUrl(loc.mapsQuery)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[0.95rem] transition-colors hover:text-[var(--color-on-dark)]"
                  >
                    {loc.street}, {loc.city}, {loc.region} {loc.postal}
                  </a>
                </div>
              </li>
            ))}
          </ul>
          <ul className="mt-5 grid gap-2 text-[0.95rem] font-semibold">
            <li>
              <a href={site.phone.href} className="inline-flex items-center gap-2 transition-colors hover:text-[var(--color-on-dark)]">
                <Phone className="h-4 w-4 flex-none text-[var(--color-amber)]" />{" "}
                <span className="bidi-ltr">{site.phone.display}</span>
              </a>
            </li>
            <li>
              <a href={site.textLine.href} className="inline-flex items-center gap-2 transition-colors hover:text-[var(--color-on-dark)]">
                <MessageSquare className="h-4 w-4 flex-none text-[var(--color-amber)]" />
                <span className="whitespace-nowrap">
                  {c.textLine}: <span className="bidi-ltr">{site.textLine.display}</span>
                </span>
              </a>
            </li>
            <li className="inline-flex items-center gap-2">
                <Printer className="h-4 w-4 flex-none text-[var(--color-amber)]" />
                <span className="whitespace-nowrap">
                  {c.contactCard.fax}: <span className="bidi-ltr">{site.fax.display}</span>
                </span>
            </li>
            <li>
              <a href={`mailto:${site.email}`} className="inline-flex items-center gap-2 transition-colors hover:text-[var(--color-on-dark)]">
                <Mail className="h-4 w-4 flex-none text-[var(--color-amber)]" /> {site.email}
              </a>
            </li>
          </ul>
          <div className="mt-4 grid gap-1 text-[0.95rem]">
            {site.locations.map((loc) => (
              <p key={loc.id}>
                {loc.name[locale]}: {c.hours.weekdays}, {formatOfficeHours(locale, loc.hours)}
              </p>
            ))}
          </div>
        </div>
      </div>

      {/* Review invitation. The two direct links are the verified-live ones
          (Google form + the Facebook page's Reviews tab); every platform —
          including ones added later — lives on /review, the master-QR hub,
          so this row never has to grow a dead link to feel complete. */}
      <div className="border-t border-[var(--color-line-dark)]">
        <div className="container-x flex flex-col gap-6 py-9 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-md">
            <p className="font-[var(--font-display)] text-xl leading-tight text-[var(--color-on-dark)]">
              {c.footer.reviewHeading}
            </p>
            <p className="mt-2 text-[0.95rem] leading-relaxed">{c.footer.reviewBody}</p>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-3">
            <a
              href={site.links.googleReview}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-amber btn-sm"
            >
              <Star className="h-4 w-4" /> {c.footer.reviewGoogle}
            </a>
            <a
              href={site.links.facebookReviews}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-ghost-light btn-sm"
            >
              <Facebook className="h-4 w-4" /> {c.footer.reviewFacebook}
            </a>
            <Link
              href={locale === "en" ? "/review" : `/review?lang=${locale}`}
              className="inline-flex items-center gap-1.5 px-1 py-2 text-[0.95rem] font-bold text-[var(--color-on-dark)] underline decoration-[var(--color-line-dark)] underline-offset-4 transition-colors hover:decoration-[var(--color-amber)]"
            >
              {c.footer.reviewMore}
              <ArrowRight className="h-4 w-4 flex-none" />
            </Link>
          </div>
        </div>
      </div>

      <div className="border-t border-[var(--color-line-dark)]">
        <div className="container-x flex flex-wrap items-center justify-between gap-x-6 gap-y-3 py-5 text-[0.9rem]">
          <p>
            © {year} {c.footer.copyright} <span className="whitespace-nowrap">{c.footer.networkLine}</span>
          </p>
          {/* Outbound partner link (one-way rule: this direction is the allowed one). */}
          <a
            href={site.links.alphaOmega}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 transition-opacity hover:opacity-80"
          >
            <span>{c.footer.sisterClinic}</span>
            <Image
              src="/images/brand/alpha-omega-white.webp"
              alt="Alpha Omega Wellness"
              width={50}
              height={16}
              className="h-4 w-auto"
            />
          </a>
        </div>
      </div>
    </footer>
  );
}
