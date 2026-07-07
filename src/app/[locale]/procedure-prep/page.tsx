import type { Metadata } from "next";
import Link from "next/link";
import { getDictionary, isLocale } from "@/lib/i18n";
import { pageMetadata } from "@/lib/metadata";
import { site, localePath, type Locale } from "@/lib/site";
import { prepGroups, type PrepDoc, type PrepGroup } from "@/lib/content/preps";
import { PageHero } from "@/components/PageHero";
import { Reveal } from "@/components/Reveal";
import { TextBand } from "@/components/TextBand";
import { ArrowRight, MessageSquare } from "@/components/icons";

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : "en";
  const dict = getDictionary(locale);
  return pageMetadata(
    locale,
    "/procedure-prep",
    dict.meta.procedurePrep.title,
    dict.meta.procedurePrep.description
  );
}

function PrepList({ docs, locale }: { docs: PrepDoc[]; locale: Locale }) {
  return (
    <ul className="mt-6 divide-y divide-[var(--color-line)] border-y border-[var(--color-line)]">
      {docs.map((doc) => (
        <li key={doc.slug}>
          <Link
            href={localePath(locale, `/procedure-prep/${doc.slug}`)}
            className="group flex items-baseline justify-between gap-6 py-4"
          >
            <span className="min-w-0">
              <span className="block font-[var(--font-display)] text-[1.12rem] leading-snug text-[var(--color-ink)] transition-colors group-hover:text-[var(--color-teal-ink)]">
                {doc.title[locale]}
              </span>
              <span className="measure mt-1 block text-[0.93rem] text-[var(--color-body)]">
                {doc.regimen[locale]}
              </span>
            </span>
            <ArrowRight className="h-4 w-4 flex-none translate-y-0.5 text-[var(--color-teal-ink)] transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
        </li>
      ))}
    </ul>
  );
}

function GroupBlock({
  group,
  locale,
  delay = 0,
}: {
  group: PrepGroup;
  locale: Locale;
  delay?: 0 | 1 | 2 | 3 | 4;
}) {
  return (
    <Reveal delay={delay}>
      <h2 className="h2 heading-tick">{group.title[locale]}</h2>
      <p className="measure-sm mt-3 text-[var(--color-body)]">{group.blurb[locale]}</p>
      <PrepList docs={group.docs} locale={locale} />
    </Reveal>
  );
}

export default async function ProcedurePrepPage({ params }: PageProps) {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : "en";
  const dict = getDictionary(locale);
  const t = dict.procedurePrep;

  const colonoscopy = prepGroups.find((g) => g.id === "colonoscopy")!;
  const rest = prepGroups.filter((g) => g.id !== "colonoscopy");

  return (
    <>
      <PageHero title={t.title} lead={t.intro}>
        {/* The one question that matters before anything else on this page. */}
        <div className="card mt-8 flex flex-wrap items-center justify-between gap-x-8 gap-y-4 p-5 sm:p-6">
          <div className="min-w-0">
            <h2 className="font-[var(--font-body)] text-base font-extrabold text-[var(--color-ink)]">
              {t.unsure}
            </h2>
            <p className="measure mt-1 text-[0.95rem] text-[var(--color-body)]">{t.unsureBody}</p>
          </div>
          <a href={site.textLine.href} className="btn btn-navy">
            <MessageSquare className="h-4.5 w-4.5" /> {dict.common.textUs}
          </a>
        </div>
      </PageHero>

      <section className="section-sm">
        <div className="container-x grid items-start gap-x-14 gap-y-12 lg:grid-cols-2">
          <GroupBlock group={colonoscopy} locale={locale} />
          <div className="grid gap-y-12">
            {rest.map((group, i) => (
              <GroupBlock
                key={group.id}
                group={group}
                locale={locale}
                delay={Math.min(i + 1, 4) as 1 | 2 | 3 | 4}
              />
            ))}
          </div>
        </div>
      </section>

      <TextBand locale={locale} dict={dict} />
    </>
  );
}
