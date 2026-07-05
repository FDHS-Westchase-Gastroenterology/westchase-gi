import type { Metadata } from "next";
import { getDictionary, isLocale } from "@/lib/i18n";
import { pageMetadata } from "@/lib/metadata";
import { site, type Locale } from "@/lib/site";
import { PageHero } from "@/components/PageHero";
import { Reveal } from "@/components/Reveal";
import { DocumentList } from "@/components/DocumentList";
import { TextBand } from "@/components/TextBand";
import { ExternalLink, FileText } from "@/components/icons";

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : "en";
  const dict = getDictionary(locale);
  return pageMetadata(locale, "/new-patients", dict.meta.newPatients.title, dict.meta.newPatients.description);
}

export default async function NewPatientsPage({ params }: PageProps) {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : "en";
  const dict = getDictionary(locale);
  const t = dict.newPatients;

  return (
    <>
      <PageHero title={t.title} lead={t.intro} />

      {/* Forms: the live online packet leads; printable forms are honest
          slots until the practice supplies current PDFs. */}
      <section className="section">
        <div className="container-x grid items-start gap-x-14 gap-y-12 lg:grid-cols-[1.15fr_1fr]">
          <div>
            <Reveal>
              <h2 className="h2 heading-tick">{t.formsHeading}</h2>
              <p className="measure-sm mt-4">{t.formsIntro}</p>
            </Reveal>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <a
                href={site.links.newPatientFormsEn}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-navy justify-between"
              >
                <span className="inline-flex items-center gap-2">
                  <FileText className="h-4.5 w-4.5" /> {t.formsOnlineEn}
                </span>
                <ExternalLink className="h-4 w-4" />
              </a>
              <a
                href={site.links.newPatientFormsEs}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-navy justify-between"
              >
                <span className="inline-flex items-center gap-2">
                  <FileText className="h-4.5 w-4.5" /> {t.formsOnlineEs}
                </span>
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
            <h3 className="mt-10 font-[var(--font-body)] text-base font-extrabold text-[var(--color-ink)]">
              {dict.common.docs.newPatientHeading}
            </h3>
            <p className="measure-sm mt-2 text-[0.95rem] text-[var(--color-body)]">{t.formsPrintableIntro}</p>
            <div className="mt-4">
              <DocumentList category="new-patient" locale={locale} dict={dict} />
            </div>
          </div>

          <Reveal delay={1} className="card p-7 sm:p-8 lg:sticky lg:top-32">
            <h2 className="h3 font-[var(--font-display)]">{t.missionHeading}</h2>
            <p className="mt-4">{t.missionIntro}</p>
            <ul className="list-check mt-5">
              {t.missionItems.map((item) => (
                <li key={item} className="font-semibold text-[var(--color-ink)]">
                  {item}
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </section>

      <section className="border-y border-[var(--color-line)] bg-[var(--color-mint)]">
        <div className="container-x section grid gap-x-14 gap-y-10 lg:grid-cols-3">
          <Reveal>
            <h2 className="h3 heading-tick">{t.insuranceHeading}</h2>
            <p className="mt-4">{t.insuranceBody}</p>
          </Reveal>
          <Reveal delay={1}>
            <h2 className="h3 heading-tick">{t.paymentHeading}</h2>
            <p className="mt-4">{t.paymentBody}</p>
          </Reveal>
          <Reveal delay={2}>
            <h2 className="h3 heading-tick">{t.expectHeading}</h2>
            <p className="mt-4">{t.expectBody}</p>
          </Reveal>
        </div>
      </section>

      <TextBand locale={locale} dict={dict} />
    </>
  );
}
