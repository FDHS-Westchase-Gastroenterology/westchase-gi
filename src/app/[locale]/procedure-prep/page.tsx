import type { Metadata } from "next";
import { getDictionary, isLocale } from "@/lib/i18n";
import { pageMetadata } from "@/lib/metadata";
import { site, type Locale } from "@/lib/site";
import { PageHero } from "@/components/PageHero";
import { DocumentList } from "@/components/DocumentList";
import { TextBand } from "@/components/TextBand";
import { MessageSquare } from "@/components/icons";

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

export default async function ProcedurePrepPage({ params }: PageProps) {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : "en";
  const dict = getDictionary(locale);
  const t = dict.procedurePrep;

  return (
    <>
      <PageHero title={t.title} lead={t.intro} />

      <section className="section">
        <div className="container-x grid items-start gap-x-14 gap-y-10 lg:grid-cols-[1.3fr_1fr]">
          <div>
            <h2 className="sr-only">{dict.common.docs.prepHeading}</h2>
            <DocumentList category="procedure-prep" locale={locale} dict={dict} />
            <p className="mt-5 text-[0.92rem] text-[var(--color-muted)]">
              {dict.common.docs.pendingExplainer}
            </p>
          </div>
          <aside className="card bg-[var(--color-navy)] p-7 text-[var(--color-on-dark)] sm:p-8 lg:sticky lg:top-32">
            <h2 className="h3 font-[var(--font-display)] text-[var(--color-on-dark)]">{t.unsure}</h2>
            <p className="mt-3 text-[var(--color-on-dark-muted)]">{t.unsureBody}</p>
            <a href={site.textLine.href} className="btn btn-amber mt-6">
              <MessageSquare className="h-4.5 w-4.5" /> {dict.common.textUs}
            </a>
          </aside>
        </div>
      </section>

      <TextBand locale={locale} dict={dict} />
    </>
  );
}
