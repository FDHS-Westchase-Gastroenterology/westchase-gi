import type { Metadata } from "next";
import Image from "next/image";
import { getDictionary, isLocale } from "@/lib/i18n";
import { pageMetadata } from "@/lib/metadata";
import { site, type Locale } from "@/lib/site";
import { PageHero } from "@/components/PageHero";
import { Reveal } from "@/components/Reveal";
import { LocationCards } from "@/components/LocationCards";
import { TextBand } from "@/components/TextBand";
import { ExternalLink, Star } from "@/components/icons";

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : "en";
  const dict = getDictionary(locale);
  return pageMetadata(locale, "/office-gallery", dict.meta.gallery.title, dict.meta.gallery.description);
}

export default async function GalleryPage({ params }: PageProps) {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : "en";
  const dict = getDictionary(locale);
  const t = dict.gallery;

  // The three photos the practice's site published, plus two practice-provided
  // lobby photos supplied for this rebuild.
  const photos = [
    { src: "/images/facility/lobby-panorama.webp", w: 1067, h: 436, alt: t.photos.lobbyPanorama, wide: true },
    { src: "/images/facility/consult-room.webp", w: 1067, h: 436, alt: t.photos.consultRoom, wide: true },
    { src: "/images/facility/storefront-tampa.webp", w: 1067, h: 436, alt: t.photos.storefront, wide: true },
    { src: "/images/facility/lobby.jpeg", w: 2362, h: 1330, alt: t.photos.lobby, wide: false },
    { src: "/images/facility/lobby-2.jpeg", w: 2362, h: 1330, alt: t.photos.lobby2, wide: false },
  ];

  const reviewLinks = [
    { label: t.reviewGoogle, href: site.links.googleReview },
    { label: t.healthgradesTampa, href: site.links.healthgradesTampa },
    { label: t.healthgradesLutz, href: site.links.healthgradesLutz },
  ];

  return (
    <>
      <PageHero title={t.title} lead={t.intro} />

      <section className="section">
        <div className="container-x grid gap-5 sm:grid-cols-2">
          {photos.map((photo, i) => (
            <Reveal
              key={photo.src}
              delay={(i % 2) as 0 | 1}
              className={photo.wide && i === 0 ? "sm:col-span-2" : undefined}
            >
              <Image
                src={photo.src}
                alt={photo.alt}
                width={photo.w}
                height={photo.h}
                sizes={photo.wide && i === 0 ? "(min-width: 1216px) 72rem, 100vw" : "(min-width: 640px) 50vw, 100vw"}
                className="w-full rounded-[var(--radius-lg)] object-cover shadow-[var(--shadow-soft)]"
              />
            </Reveal>
          ))}
        </div>
      </section>

      {/* Reviews: live, verified profiles only (the old page's Facebook and
          Yelp links were dead or misnamed; they return once the practice
          confirms live profiles). */}
      <section className="border-y border-[var(--color-line)] bg-[var(--color-mint)]">
        <div className="container-x section-sm">
          <Reveal>
            <h2 className="h2 heading-tick flex-wrap">
              {t.reviewsHeading}
            </h2>
            <p className="measure mt-3 text-[var(--color-body)]">{t.reviewsBody}</p>
          </Reveal>
          <div className="mt-7 flex flex-wrap gap-3">
            {reviewLinks.map((link, i) => (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className={`btn ${i === 0 ? "btn-navy" : "btn-outline"}`}
              >
                {i === 0 ? <Star className="h-4 w-4 text-[var(--color-amber)]" /> : null}
                {link.label}
                <ExternalLink className="h-4 w-4" />
              </a>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container-x">
          <h2 className="h2 heading-tick">{dict.contact.locationsHeading}</h2>
          <div className="mt-9">
            <LocationCards locale={locale} dict={dict} />
          </div>
        </div>
      </section>

      <TextBand locale={locale} dict={dict} />
    </>
  );
}
