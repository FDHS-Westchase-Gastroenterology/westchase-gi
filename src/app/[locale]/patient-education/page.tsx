import type { Metadata } from "next";
import Link from "next/link";

import { ArrowRight } from "@/components/icons";
import { PageHero } from "@/components/patterns/PageHero";
import { Reveal } from "@/components/patterns/Reveal";
import { TextBand } from "@/components/patterns/TextBand";
import { educationByGroup } from "@/lib/content/education";
import type { EducationTopic } from "@/lib/content/types";
import { getDictionary, isLocale } from "@/lib/i18n";
import { pageMetadata } from "@/lib/metadata";
import { localePath } from "@/lib/site";
import type { Locale } from "@/lib/site";

interface PageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Readonly<PageProps>): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : "en";
  const dict = getDictionary(locale);
  return pageMetadata(
    locale,
    "/patient-education",
    dict.meta.patientEducation.title,
    dict.meta.patientEducation.description,
  );
}

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React props carry framework member types that cannot be made readonly
function TopicList({ topics, locale }: Readonly<{ topics: EducationTopic[]; locale: Locale }>) {
  return (
    <ul className="mt-7 divide-y divide-[var(--color-line)] border-y border-[var(--color-line)]">
      {topics.map((topic) => (
        <li key={topic.slug}>
          <Link
            href={localePath(locale, `/patient-education/${topic.slug}`)}
            className="group flex items-baseline justify-between gap-6 py-4.5"
          >
            <span className="min-w-0">
              <span className="block text-[1.15rem] leading-snug font-[var(--font-display)] text-[var(--color-ink)] transition-colors group-hover:text-[var(--color-teal-ink)]">
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

export default async function PatientEducationPage({ params }: Readonly<PageProps>) {
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
