import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getDictionary, isLocale } from "@/lib/i18n";
import { pageMetadata } from "@/lib/metadata";
import { site, localePath, type Locale } from "@/lib/site";
import { physicians, nursePractitioners, infusionNurse } from "@/lib/providers";
import { Reveal } from "@/components/Reveal";
import { TestimonialRail } from "@/components/TestimonialRail";
import { LocationCards } from "@/components/LocationCards";
import { TextBand } from "@/components/TextBand";
import { ArrowRight, ExternalLink, Heart, MessageSquare, Phone } from "@/components/icons";

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : "en";
  const dict = getDictionary(locale);
  const meta = pageMetadata(locale, "/", dict.meta.home.title, dict.meta.home.description);
  // The locale root is the site's front page; don't template-suffix it.
  return { ...meta, title: { absolute: dict.meta.home.title } };
}

export default async function HomePage({ params }: PageProps) {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : "en";
  const dict = getDictionary(locale);
  const t = dict.home;
  const p = (path: string) => localePath(locale, path);

  const tiles = [
    { ...t.tiles.services, href: p("/services"), img: "/images/tiles/services.webp", w: 200, h: 200 },
    { ...t.tiles.forms, href: p("/new-patients"), img: "/images/tiles/patient-forms.webp", w: 200, h: 200 },
    { ...t.tiles.physicians, href: p("/physicians"), img: "/images/tiles/physicians.webp", w: 150, h: 100 },
    { ...t.tiles.directions, href: p("/contact"), img: "/images/tiles/directions.webp", w: 100, h: 80 },
  ];

  return (
    <>
      {/* Hero: the practice's own team photo (the composite the practice
          publishes), not the old template's stock imagery. */}
      <section className="overflow-x-clip bg-[var(--color-navy)] text-[var(--color-on-dark)]">
        {/* Photo column widened + right-edge breakout at xl: the team photo
            reads noticeably larger (client ask) without shrinking the
            headline column below a comfortable measure. */}
        <div className="container-x section grid items-center gap-x-12 gap-y-10 lg:grid-cols-[1fr_1.2fr]">
          <div>
            <p className="flex items-center gap-2 font-bold text-[var(--color-amber)]">
              <Heart className="h-4.5 w-4.5" />
              {t.heroKicker}
            </p>
            <h1 className="display mt-4 font-[var(--font-display)] text-[var(--color-on-dark)]">
              {t.heroTitle}
            </h1>
            <p className="lead mt-5 max-w-xl text-[var(--color-on-dark-muted)]">{t.heroLead}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href={p("/appointment")} className="btn btn-amber btn-lg">
                {dict.common.requestAppointment}
              </Link>
              <a href={site.phone.href} className="btn btn-ghost-light btn-lg">
                <Phone className="h-4.5 w-4.5" /> {dict.common.callUs}
              </a>
            </div>
            <a
              href={site.textLine.href}
              className="mt-6 inline-flex items-center gap-2 font-semibold text-[var(--color-on-dark-muted)] transition-colors hover:text-[var(--color-on-dark)]"
            >
              <MessageSquare className="h-4 w-4 text-[var(--color-amber)]" />
              {dict.common.textLine}: <span className="bidi-ltr">{site.textLine.display}</span> ·{" "}
              {dict.common.textLineHuman}
            </a>
          </div>
          <Reveal variant="fade" className="xl:-me-12 2xl:-me-20">
            <Image
              src="/images/staff/group-lobby-sign.webp"
              alt={t.heroPhoto}
              width={1784}
              height={882}
              priority
              sizes="(min-width: 1024px) 48rem, 100vw"
              className="w-full rounded-[var(--radius-lg)] shadow-[var(--shadow-card)]"
            />
          </Reveal>
        </div>
      </section>

      {/* Quick tiles: the four wayfinding graphics from the practice's own site. */}
      <section className="border-b border-[var(--color-line)] bg-[var(--color-mint)]">
        <div className="container-x section-sm">
          <h2 className="sr-only">{t.tiles.heading}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {tiles.map((tile, i) => (
              <Reveal key={tile.href + tile.title} delay={(i % 4) as 0 | 1 | 2 | 3}>
                <Link
                  href={tile.href}
                  className="group flex h-full items-center gap-4 rounded-[var(--radius-lg)] bg-white p-5 shadow-[var(--shadow-soft)] transition-transform duration-300 ease-[var(--ease-out-quint)] hover:-translate-y-1"
                >
                  <span className="flex h-16 w-16 flex-none items-center justify-center overflow-hidden rounded-full bg-[var(--color-mint)]">
                    <Image src={tile.img} alt="" width={tile.w} height={tile.h} className="h-11 w-11 object-contain" />
                  </span>
                  <span className="min-w-0">
                    <span className="flex items-center gap-1.5 font-extrabold text-[var(--color-ink)]">
                      {tile.title}
                      <ArrowRight className="h-4 w-4 flex-none text-[var(--color-teal-ink)] transition-transform duration-300 group-hover:translate-x-1" />
                    </span>
                    <span className="mt-0.5 block text-[0.92rem] leading-snug text-[var(--color-muted)]">
                      {tile.sub}
                    </span>
                  </span>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Welcome: the practice's own words, verbatim, in the reader's language. */}
      <section className="section">
        <div className="container-tight">
          <Reveal>
            <h2 className="h2 heading-tick">{t.welcomeHeading}</h2>
          </Reveal>
          <div className="mt-7 grid gap-5">
            {t.welcome.map((para) => (
              <p key={para.slice(0, 32)} className="measure">
                {para}
              </p>
            ))}
          </div>
          <div className="mt-9 flex flex-wrap items-center gap-5">
            <Link href={p("/appointment")} className="btn btn-navy">
              {dict.common.requestAppointment}
            </Link>
            <Link href={p("/about")} className="link-line">
              {dict.common.nav.aboutUs} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Physicians strip: the practice's own provider cards, byte-exact. */}
      <section className="border-y border-[var(--color-line)] bg-[var(--color-mint)]">
        <div className="container-x section">
          <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
            <Reveal>
              <h2 className="h2 heading-tick">{t.physiciansHeading}</h2>
              <p className="lead measure-sm mt-3 text-[var(--color-body)]">{t.physiciansLead}</p>
            </Reveal>
            <Link href={p("/physicians")} className="link-line whitespace-nowrap">
              {t.physiciansCta} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {physicians.map((doc, i) => (
              <Reveal key={doc.id} delay={(i % 3) as 0 | 1 | 2}>
                <Link
                  href={`${p("/physicians")}#${doc.id}`}
                  className="group block overflow-hidden rounded-[var(--radius-lg)] bg-white shadow-[var(--shadow-soft)] transition-transform duration-300 ease-[var(--ease-out-quint)] hover:-translate-y-1"
                >
                  <Image
                    src={doc.headshot.src}
                    alt={doc.alt[locale]}
                    width={doc.headshot.width}
                    height={doc.headshot.height}
                    sizes="(min-width: 1024px) 24rem, (min-width: 640px) 50vw, 100vw"
                    className="aspect-[7/8] w-full object-cover object-top"
                  />
                  <span className="block px-6 py-5">
                    <span className="block font-[var(--font-display)] text-xl text-[var(--color-ink)]">
                      {doc.name}, {doc.credentials}
                    </span>
                    <span className="mt-1 block text-[0.95rem] font-semibold text-[var(--color-teal-ink)]">
                      {doc.role[locale]} · {doc.experience[locale]}
                    </span>
                  </span>
                </Link>
              </Reveal>
            ))}
          </div>
          <p className="mt-8 max-w-2xl text-[0.98rem] text-[var(--color-body)]">
            {nursePractitioners.individuals.map((np) => np.name).join(" · ")} —{" "}
            {dict.physicians.npsRole} · {infusionNurse.name} — {infusionNurse.role[locale]}
          </p>
        </div>
      </section>

      {/* Testimonials: verbatim patient quotes on a snap rail. */}
      <section className="section overflow-hidden">
        <div className="container-x">
          <Reveal>
            <h2 className="h2 heading-tick">{t.testimonialsHeading}</h2>
            <p className="mt-3 text-[var(--color-muted)]">{t.testimonialsNote}</p>
          </Reveal>
        </div>
        <div className="mt-8">
          <TestimonialRail label={t.railLabel} prevLabel={t.railPrev} nextLabel={t.railNext} />
        </div>
        <div className="container-x mt-8">
          <a
            href={site.links.googleReview}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-outline"
          >
            {t.reviewCta} <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      </section>

      {/* Plan your visit */}
      <section className="border-t border-[var(--color-line)] bg-[var(--color-mint)]">
        <div className="container-x section">
          <Reveal>
            <h2 className="h2 heading-tick">{t.visitHeading}</h2>
            <p className="lead measure mt-3 text-[var(--color-body)]">{t.visitLead}</p>
          </Reveal>
          <div className="mt-10">
            <LocationCards locale={locale} dict={dict} />
          </div>
        </div>
      </section>

      <TextBand locale={locale} dict={dict} />
    </>
  );
}
