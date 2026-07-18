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
import { ArrowRight, ClipboardCheck, ExternalLink, Heart, MessageSquare, Phone, Star } from "@/components/icons";

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

  // Prep replaced the Services tile (2026-07-18 critique): prep instructions
  // are the most time-critical of the four named patient jobs and had no
  // home-page path, while Services keeps its own top-level nav link. No
  // practice-owned wayfinding graphic exists for prep, so the tile uses the
  // site's own icon set at the same visual weight.
  const tiles = [
    { ...t.tiles.prep, href: p("/procedure-prep"), icon: ClipboardCheck },
    { ...t.tiles.forms, href: p("/new-patients"), img: "/images/tiles/patient-forms.webp", w: 200, h: 200 },
    { ...t.tiles.physicians, href: p("/physicians"), img: "/images/tiles/physicians.webp", w: 150, h: 100 },
    { ...t.tiles.directions, href: p("/contact"), img: "/images/tiles/directions.webp", w: 100, h: 80 },
  ] as const;

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
            {/* Icon + one wrapping text run (not sibling flex items): raw text
                runs as flex items shrink and break mid-phrase on narrow
                viewports — "Text/line:" stacking, the number splitting. */}
            <a
              href={site.textLine.href}
              className="mt-6 inline-flex max-w-xl items-start gap-2 font-semibold text-[var(--color-on-dark-muted)] transition-colors hover:text-[var(--color-on-dark)]"
            >
              <MessageSquare className="mt-1 h-4 w-4 flex-none text-[var(--color-amber)]" />
              <span>
                <span className="whitespace-nowrap">
                  {dict.common.textLine}: <span className="bidi-ltr">{site.textLine.display}</span> ·
                </span>{" "}
                {dict.common.textLineHuman}
              </span>
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
                    {"icon" in tile ? (
                      <tile.icon className="h-9 w-9 text-[var(--color-teal-ink)]" strokeWidth={1.75} />
                    ) : (
                      <Image src={tile.img} alt="" width={tile.w} height={tile.h} className="h-11 w-11 object-contain" />
                    )}
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
              <Reveal key={doc.id} delay={(i % 3) as 0 | 1 | 2} className="h-full">
                {/* Two actions per card (profile + review) means the card can't
                    be one big anchor: the profile link owns the photo and name,
                    and the review link sits as a hairline-divided footer row. */}
                <div className="flex h-full flex-col overflow-hidden rounded-[var(--radius-lg)] bg-white shadow-[var(--shadow-soft)] transition-transform duration-300 ease-[var(--ease-out-quint)] hover:-translate-y-1">
                  <Link href={`${p("/physicians")}#${doc.id}`} className="group block flex-1">
                    <Image
                      src={doc.headshot.src}
                      alt={doc.alt[locale]}
                      width={doc.headshot.width}
                      height={doc.headshot.height}
                      sizes="(min-width: 1024px) 24rem, (min-width: 640px) 50vw, 100vw"
                      className="aspect-[7/8] w-full object-cover object-top"
                    />
                    <span className="block px-6 pb-5 pt-5">
                      <span className="block font-[var(--font-display)] text-xl text-[var(--color-ink)] transition-colors group-hover:text-[var(--color-teal-ink)]">
                        {doc.name}, {doc.credentials}
                      </span>
                      <span className="mt-1 block text-[0.95rem] font-semibold text-[var(--color-teal-ink)]">
                        {doc.role[locale]} · {doc.experience[locale]}
                      </span>
                    </span>
                  </Link>
                  <a
                    href={doc.googleReview}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={t.physicianReviewAria.replace("{name}", doc.name)}
                    className="flex items-center gap-2.5 border-t border-[var(--color-line)] px-6 py-3.5 text-[0.92rem] font-bold text-[var(--color-teal-ink)] transition-colors hover:bg-[var(--color-mint)] hover:text-[var(--color-navy)]"
                  >
                    <Star className="h-4 w-4 flex-none text-[var(--color-amber)]" />
                    {t.physicianReviewCta}
                    <ExternalLink className="ms-auto h-3.5 w-3.5 flex-none text-[var(--color-muted)]" />
                  </a>
                </div>
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
