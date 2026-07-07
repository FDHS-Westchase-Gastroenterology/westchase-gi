import type { Metadata } from "next";
import Link from "next/link";
import { getDictionary, isLocale } from "@/lib/i18n";
import { pageMetadata } from "@/lib/metadata";
import { localePath, type Locale } from "@/lib/site";
import { educationByGroup } from "@/lib/content/education";
import type { EducationTopic } from "@/lib/content/types";
import { PageHero } from "@/components/PageHero";
import { Reveal } from "@/components/Reveal";
import { TextBand } from "@/components/TextBand";
import { ArrowRight } from "@/components/icons";

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : "en";
  const dict = getDictionary(locale);
  return pageMetadata(
    locale,
    "/patient-education",
    dict.meta.patientEducation.title,
    dict.meta.patientEducation.description
  );
}

function TopicList({ topics, locale }: { topics: EducationTopic[]; locale: Locale }) {
  return (
    <ul className="mt-7 divide-y divide-[var(--color-line)] border-y border-[var(--color-line)]">
      {topics.map((topic) => (
        <li key={topic.slug}>
          <Link
            href={localePath(locale, `/patient-education/${topic.slug}`)}
            className="group flex items-baseline justify-between gap-6 py-4.5"
          >
            <span className="min-w-0">
              <span className="block font-[var(--font-display)] text-[1.15rem] leading-snug text-[var(--color-ink)] transition-colors group-hover:text-[var(--color-teal-ink)]">
                {topic.title[locale]}
              </span>
              <span className="measure mt-1 block text-[0.95rem] text-[var(--color-body)]">
                {topic.summary[locale]}
              </span>
            </span>
            <ArrowRight className="h-4 w-4 flex-none translate-y-0.5 text-[var(--color-teal-ink)] transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default async function PatientEducationPage({ params }: PageProps) {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : "en";
  const dict = getDictionary(locale);
  const t = dict.education;

  return (
    <>
      <PageHero title={t.title} lead={t.intro} />

      <section className="section-sm">
        <div className="container-x grid items-start gap-x-14 gap-y-12 lg:grid-cols-2">
          <Reveal>
            <h2 className="h2 heading-tick">{t.proceduresHeading}</h2>
            <p className="measure-sm mt-3 text-[var(--color-body)]">{t.proceduresIntro}</p>
            <TopicList topics={educationByGroup.procedures} locale={locale} />
          </Reveal>
          <Reveal delay={1}>
            <h2 className="h2 heading-tick">{t.conditionsHeading}</h2>
            <p className="measure-sm mt-3 text-[var(--color-body)]">{t.conditionsIntro}</p>
            <TopicList topics={educationByGroup.conditions} locale={locale} />
          </Reveal>
        </div>
      </section>

      <TextBand locale={locale} dict={dict} />
    </>
  );
}
