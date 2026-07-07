import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDictionary, isLocale } from "@/lib/i18n";
import { pageMetadata } from "@/lib/metadata";
import { localePath, locales, site, type Locale } from "@/lib/site";
import { getPrep, prepDocs } from "@/lib/content/preps";
import { PrepBody } from "@/components/PrepBody";
import { PrintButton } from "@/components/PrintButton";
import { TextBand } from "@/components/TextBand";
import { MessageSquare, Phone } from "@/components/icons";

type PageProps = { params: Promise<{ locale: string; slug: string }> };

export function generateStaticParams() {
  return locales.flatMap((locale) => prepDocs.map((d) => ({ locale, slug: d.slug })));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale: raw, slug } = await params;
  const locale: Locale = isLocale(raw) ? raw : "en";
  const doc = getPrep(slug);
  if (!doc) return {};
  return pageMetadata(
    locale,
    `/procedure-prep/${doc.slug}`,
    doc.title[locale],
    doc.summary[locale]
  );
}

/** Print-only letterhead so the printed page reads as a practice handout,
 *  not a webpage. Practice name + both offices + the numbers patients need. */
function PrintLetterhead({ locale }: { locale: Locale }) {
  return (
    <div className="hidden text-center print:block">
      <p className="font-[var(--font-display)] text-[16pt] font-bold">{site.name}</p>
      <p className="mt-1 text-[9pt]">
        {site.locations
          .map(
            (l) =>
              `${locale === "es" ? l.nameEs : l.name}: ${l.street}, ${l.city}, ${l.region} ${l.postal}`
          )
          .join("   ·   ")}
      </p>
      <p className="text-[9pt]">
        {locale === "es" ? "Teléfono" : "Telephone"}: {site.phone.display}
        {"   ·   "}
        {locale === "es" ? "Línea de texto" : "Text line"}: {site.textLine.display}
        {"   ·   "}
        {site.domain}
      </p>
      <hr className="mt-3 mb-6 border-t-2 border-black" />
    </div>
  );
}

export default async function PrepDetailPage({ params }: PageProps) {
  const { locale: raw, slug } = await params;
  const locale: Locale = isLocale(raw) ? raw : "en";
  const dict = getDictionary(locale);
  const t = dict.procedurePrep;
  const doc = getPrep(slug);
  if (!doc) notFound();

  return (
    <>
      <section className="border-b border-[var(--color-line)] bg-[var(--color-mint)] print:border-0 print:bg-white">
        <div className="container-tight section-sm">
          <PrintLetterhead locale={locale} />
          <Link
            href={localePath(locale, "/procedure-prep")}
            className="link-line print-hide text-[0.95rem]"
          >
            ← {t.backToAll}
          </Link>
          <h1 className="h1 heading-tick mt-6 print:mt-0">{doc.title[locale]}</h1>
          <p className="lead measure mt-4 text-[var(--color-body)]">{doc.regimen[locale]}</p>
          <div className="print-hide mt-6 flex flex-wrap items-center gap-x-6 gap-y-4">
            <PrintButton label={t.print} />
            <p className="measure-sm text-[0.9rem] text-[var(--color-muted)]">{t.blanksHint}</p>
          </div>
        </div>
      </section>

      <article className="section-sm">
        <div className="container-tight">
          <PrepBody sections={doc.sections[locale]} />

          {/* The human channel, on-page — patients mid-prep should never dig
              for a number. Hidden in print; the letterhead carries it there. */}
          <div className="print-hide mt-12 border-t border-[var(--color-line)] pt-7">
            <h2 className="font-[var(--font-body)] text-base font-extrabold text-[var(--color-ink)]">
              {t.questionsHeading}
            </h2>
            <p className="measure mt-2 text-[0.98rem] text-[var(--color-body)]">
              {t.questionsBody}
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <a href={site.textLine.href} className="btn btn-navy">
                <MessageSquare className="h-4.5 w-4.5" /> {dict.common.textUs}
              </a>
              <a href={site.phone.href} className="btn btn-outline">
                <Phone className="h-4.5 w-4.5" /> {dict.common.callUs}
              </a>
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
              <PrintButton label={t.print} />
              <Link href={localePath(locale, "/procedure-prep")} className="link-line">
                ← {t.backToAll}
              </Link>
            </div>
          </div>
        </div>
      </article>

      <TextBand locale={locale} dict={dict} />
    </>
  );
}
