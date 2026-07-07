import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDictionary, isLocale } from "@/lib/i18n";
import { pageMetadata } from "@/lib/metadata";
import { localePath, locales, site, type Locale } from "@/lib/site";
import { educationTopics, getTopic } from "@/lib/content/education";
import { documents } from "@/lib/documents";
import { ArticleBody } from "@/components/ArticleBody";
import { TextBand } from "@/components/TextBand";
import { ArrowRight, Download, FileText, MessageSquare } from "@/components/icons";

type PageProps = { params: Promise<{ locale: string; slug: string }> };

export function generateStaticParams() {
  return locales.flatMap((locale) => educationTopics.map((t) => ({ locale, slug: t.slug })));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale: raw, slug } = await params;
  const locale: Locale = isLocale(raw) ? raw : "en";
  const topic = getTopic(slug);
  if (!topic) return {};
  return pageMetadata(
    locale,
    `/patient-education/${topic.slug}`,
    topic.title[locale],
    topic.summary[locale]
  );
}

export default async function EducationTopicPage({ params }: PageProps) {
  const { locale: raw, slug } = await params;
  const locale: Locale = isLocale(raw) ? raw : "en";
  const dict = getDictionary(locale);
  const t = dict.education;
  const topic = getTopic(slug);
  if (!topic) notFound();

  const sheet = topic.relatedDocId
    ? documents.find((d) => d.id === topic.relatedDocId)
    : undefined;
  const isProcedure = topic.group === "procedures";

  return (
    <>
      <section className="border-b border-[var(--color-line)] bg-[var(--color-mint)]">
        <div className="container-tight section-sm">
          <Link href={localePath(locale, "/patient-education")} className="link-line text-[0.95rem]">
            ← {t.backToLibrary}
          </Link>
          <h1 className="h1 heading-tick mt-6">{topic.title[locale]}</h1>
          <p className="lead measure mt-4 text-[var(--color-body)]">{topic.summary[locale]}</p>
        </div>
      </section>

      <article className="section-sm">
        <div className="container-tight">
          <ArticleBody sections={topic.sections} locale={locale} />

          {/* Take-home sheet: a real download once the office's PDF exists,
              an honest "on the way" note until then (never a dead link). */}
          {sheet ? (
            <div className="card-lined mt-10 flex flex-wrap items-center justify-between gap-4 bg-[var(--color-mint)] p-6">
              <div className="flex min-w-0 items-start gap-3">
                <FileText className="mt-1 h-5 w-5 flex-none text-[var(--color-teal-ink)]" />
                <div>
                  <h2 className="font-[var(--font-body)] text-base font-extrabold text-[var(--color-ink)]">
                    {t.sheetHeading}
                  </h2>
                  <p className="measure-sm mt-1 text-[0.95rem] text-[var(--color-body)]">
                    {sheet.file ? t.sheetBodyAvailable : t.sheetBodyPending}
                  </p>
                </div>
              </div>
              {sheet.file ? (
                <a href={sheet.file} download className="btn btn-navy">
                  <Download className="h-4 w-4" /> {dict.common.docs.download}
                </a>
              ) : (
                <a href={site.textLine.href} className="btn btn-outline">
                  <MessageSquare className="h-4 w-4" /> {dict.common.textUs}
                </a>
              )}
            </div>
          ) : null}

          {/* General-education disclaimer + the human channel. */}
          <div className="mt-10 border-t border-[var(--color-line)] pt-7">
            <h2 className="font-[var(--font-body)] text-base font-extrabold text-[var(--color-ink)]">
              {t.questionsHeading}
            </h2>
            <p className="measure mt-2 text-[0.98rem] text-[var(--color-body)]">{t.questionsBody}</p>
            {isProcedure ? (
              <Link href={localePath(locale, "/procedure-prep")} className="link-line mt-4 inline-flex">
                {t.prepCta} <ArrowRight className="h-4 w-4" />
              </Link>
            ) : null}
          </div>
        </div>
      </article>

      <TextBand locale={locale} dict={dict} />
    </>
  );
}
