import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getDictionary, isLocale } from "@/lib/i18n";
import { pageMetadata } from "@/lib/metadata";
import { localePath, type Locale } from "@/lib/site";
import { PageHero } from "@/components/PageHero";
import { Reveal } from "@/components/Reveal";
import { TextBand } from "@/components/TextBand";
import { ArrowRight } from "@/components/icons";

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : "en";
  const dict = getDictionary(locale);
  return pageMetadata(locale, "/about", dict.meta.about.title, dict.meta.about.description);
}

export default async function AboutPage({ params }: PageProps) {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : "en";
  const dict = getDictionary(locale);
  const t = dict.about;

  return (
    <>
      <PageHero title={t.title} lead={t.body[0]} />

      <section className="section">
        <div className="container-x grid items-start gap-x-14 gap-y-10 lg:grid-cols-[1.15fr_1fr]">
          <div className="grid gap-5">
            {t.body.slice(1).map((para) => (
              <p key={para.slice(0, 32)} className="measure">
                {para}
              </p>
            ))}
          </div>
          <Reveal variant="fade" className="lg:sticky lg:top-32">
            <Image
              src="/images/staff/group-outdoor.webp"
              alt={dict.home.heroPhoto}
              width={767}
              height={511}
              sizes="(min-width: 1024px) 30rem, 100vw"
              className="w-full rounded-[var(--radius-lg)] shadow-[var(--shadow-card)]"
            />
          </Reveal>
        </div>
      </section>

      <section className="border-y border-[var(--color-line)] bg-[var(--color-mint)]">
        <div className="container-x section">
          <Reveal>
            <h2 className="h2 heading-tick">{t.whyHeading}</h2>
          </Reveal>
          <ul className="list-check mt-8 sm:grid-cols-2 sm:gap-x-10 lg:grid-cols-3">
            {t.whyItems.map((item) => (
              <li key={item} className="font-semibold text-[var(--color-ink)]">
                {item}
              </li>
            ))}
          </ul>
          <p className="measure mt-9">{t.closing}</p>
          <Link href={localePath(locale, "/physicians")} className="link-line mt-6 inline-flex">
            {dict.home.physiciansCta} <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <TextBand locale={locale} dict={dict} />
    </>
  );
}
