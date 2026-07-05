import type { Metadata } from "next";
import { getDictionary, isLocale } from "@/lib/i18n";
import { pageMetadata } from "@/lib/metadata";
import type { Locale } from "@/lib/site";
import { patientResources, professionalOrgs, patientEducation } from "@/lib/resources";
import { PageHero } from "@/components/PageHero";
import { Reveal } from "@/components/Reveal";
import { DocumentList } from "@/components/DocumentList";
import { TextBand } from "@/components/TextBand";
import { ExternalLink } from "@/components/icons";

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : "en";
  const dict = getDictionary(locale);
  return pageMetadata(locale, "/resources", dict.meta.resources.title, dict.meta.resources.description);
}

export default async function ResourcesPage({ params }: PageProps) {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : "en";
  const dict = getDictionary(locale);
  const t = dict.resources;

  return (
    <>
      <PageHero title={t.title} lead={t.intro} />

      {/* ASGE patient education (replaces the vendor-hosted article library). */}
      <section className="section-sm">
        <div className="container-x">
          <Reveal className="card-lined flex flex-wrap items-center justify-between gap-6 bg-[var(--color-mint)] p-7 sm:p-8">
            <div className="max-w-xl">
              <h2 className="h3 font-[var(--font-display)]">{t.educationHeading}</h2>
              <p className="mt-2 text-[var(--color-body)]">{t.educationBody}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <a
                href={patientEducation.conditionsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-navy"
              >
                {t.educationCtaConditions} <ExternalLink className="h-4 w-4" />
              </a>
              <a
                href={patientEducation.proceduresUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-outline"
              >
                {t.educationCtaProcedures} <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Topic organizations (the old Links page, with dead URLs repaired). */}
      <section className="section-sm">
        <div className="container-x">
          <h2 className="h2 heading-tick">{t.orgsHeading}</h2>
          <dl className="mt-8 grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
            {patientResources.map((r) => (
              <div key={r.url}>
                <dt className="font-extrabold text-[var(--color-ink)]">{r.topic[locale]}</dt>
                <dd className="mt-1.5">
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="link-plain inline-flex items-center gap-1.5"
                  >
                    {r.org} <ExternalLink className="h-3.5 w-3.5 flex-none" />
                  </a>
                  <p className="mt-1.5 text-[0.95rem] text-[var(--color-body)]">{r.description[locale]}</p>
                </dd>
              </div>
            ))}
          </dl>

          <h2 className="h3 mt-14 font-[var(--font-display)]">{t.professionalHeading}</h2>
          <ul className="mt-5 flex flex-wrap gap-x-8 gap-y-3">
            {professionalOrgs.map((org) => (
              <li key={org.url}>
                <a
                  href={org.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="link-plain inline-flex items-center gap-1.5"
                >
                  {org.name} <ExternalLink className="h-3.5 w-3.5 flex-none" />
                </a>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Disease information sheets (16 honest slots until PDFs arrive). */}
      <section className="border-t border-[var(--color-line)] bg-[var(--color-mint)]">
        <div className="container-x section-sm">
          <h2 className="h2 heading-tick">{t.sheetsHeading}</h2>
          <p className="measure mt-3 text-[var(--color-body)]">{t.sheetsIntro}</p>
          <div className="mt-7">
            <DocumentList category="disease-info" locale={locale} dict={dict} />
          </div>
        </div>
      </section>

      <TextBand locale={locale} dict={dict} />
    </>
  );
}
