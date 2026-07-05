import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getDictionary, isLocale } from "@/lib/i18n";
import { pageMetadata } from "@/lib/metadata";
import { localePath, type Locale } from "@/lib/site";
import { conditions, procedures } from "@/lib/services";
import { PageHero } from "@/components/PageHero";
import { Reveal } from "@/components/Reveal";
import { TextBand } from "@/components/TextBand";
import { ArrowRight } from "@/components/icons";

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : "en";
  const dict = getDictionary(locale);
  return pageMetadata(locale, "/services", dict.meta.services.title, dict.meta.services.description);
}

export default async function ServicesPage({ params }: PageProps) {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : "en";
  const dict = getDictionary(locale);
  const t = dict.services;

  return (
    <>
      <PageHero title={t.title} lead={t.conditionsIntro} />

      <section className="section">
        <div className="container-x grid gap-x-14 gap-y-12 lg:grid-cols-2">
          <Reveal>
            <div className="flex items-center gap-4">
              {/* The practice's own digestive-system graphic, byte-exact. */}
              <Image
                src="/images/home/digestive-system.webp"
                alt=""
                width={100}
                height={150}
                className="h-20 w-auto flex-none"
              />
              <h2 className="h2">{t.conditionsHeading}</h2>
            </div>
            <ul className="list-check mt-7">
              {conditions.map((c) => (
                <li key={c.en} className="font-semibold text-[var(--color-ink)]">
                  {c[locale]}
                </li>
              ))}
            </ul>
          </Reveal>

          <Reveal delay={1}>
            <h2 className="h2">{t.proceduresHeading}</h2>
            <p className="measure-sm mt-4 text-[var(--color-body)]">{t.proceduresIntro}</p>
            <ul className="list-check mt-7">
              {procedures.map((c) => (
                <li key={c.en} className="font-semibold text-[var(--color-ink)]">
                  {c[locale]}
                </li>
              ))}
            </ul>
            <div className="card-lined mt-10 flex flex-wrap items-center justify-between gap-4 bg-[var(--color-mint)] p-6">
              <div>
                <h3 className="font-[var(--font-body)] text-base font-extrabold text-[var(--color-ink)]">
                  {t.prepNote}
                </h3>
                <p className="mt-1 text-[0.95rem] text-[var(--color-body)]">{t.prepNoteBody}</p>
              </div>
              <Link href={localePath(locale, "/procedure-prep")} className="link-line whitespace-nowrap">
                {t.prepNoteCta} <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      <TextBand locale={locale} dict={dict} />
    </>
  );
}
