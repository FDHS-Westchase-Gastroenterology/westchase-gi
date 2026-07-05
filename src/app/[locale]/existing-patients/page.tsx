import type { Metadata } from "next";
import Link from "next/link";
import { getDictionary, isLocale } from "@/lib/i18n";
import { pageMetadata } from "@/lib/metadata";
import { site, localePath, type Locale } from "@/lib/site";
import { PageHero } from "@/components/PageHero";
import { Reveal } from "@/components/Reveal";
import { TextBand } from "@/components/TextBand";
import { ArrowRight, ExternalLink, MessageSquare } from "@/components/icons";

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : "en";
  const dict = getDictionary(locale);
  return pageMetadata(
    locale,
    "/existing-patients",
    dict.meta.existingPatients.title,
    dict.meta.existingPatients.description
  );
}

export default async function ExistingPatientsPage({ params }: PageProps) {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : "en";
  const dict = getDictionary(locale);
  const t = dict.existingPatients;

  return (
    <>
      <PageHero title={t.title} lead={t.intro} />

      <section className="section">
        <div className="container-x grid gap-6 lg:grid-cols-3">
          <Reveal as="article" className="card flex flex-col p-7 sm:p-8">
            <h2 className="h3 font-[var(--font-display)]">{t.portalHeading}</h2>
            <p className="mt-3 flex-1">{t.portalBody}</p>
            <a
              href={site.links.portal}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-navy mt-6 self-start"
            >
              {t.portalCta} <ExternalLink className="h-4 w-4" />
            </a>
          </Reveal>

          <Reveal as="article" delay={1} className="card flex flex-col p-7 sm:p-8">
            <h2 className="h3 font-[var(--font-display)]">{t.prepHeading}</h2>
            <p className="mt-3 flex-1">{t.prepBody}</p>
            <Link href={localePath(locale, "/procedure-prep")} className="btn btn-amber mt-6 self-start">
              {t.prepCta} <ArrowRight className="h-4 w-4" />
            </Link>
          </Reveal>

          <Reveal as="article" delay={2} className="card flex flex-col p-7 sm:p-8">
            <h2 className="h3 font-[var(--font-display)]">{t.recordsHeading}</h2>
            <p className="mt-3 flex-1">{t.recordsBody}</p>
            <a href={site.textLine.href} className="btn btn-outline mt-6 self-start">
              <MessageSquare className="h-4 w-4" /> {dict.common.textUs}
            </a>
          </Reveal>
        </div>
      </section>

      <TextBand locale={locale} dict={dict} />
    </>
  );
}
