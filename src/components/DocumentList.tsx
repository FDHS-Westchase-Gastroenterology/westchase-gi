import Link from "next/link";
import { documentsByCategory, type DocCategory } from "@/lib/documents";
import { topicForDocument } from "@/lib/content/education";
import { prepForDocument } from "@/lib/content/preps";
import { site, localePath, type Locale } from "@/lib/site";
import type { Dictionary } from "@/lib/i18n";
import { ArrowRight, Download, FileText, MessageSquare } from "./icons";

type DocumentListProps = {
  category: DocCategory;
  locale: Locale;
  dict: Dictionary;
};

/**
 * Slot-aware document list. Replaces the old site's 33 dead PDF links:
 * a real download link renders ONLY when the registry has a file.
 * Disease-information topics link to their on-site education page, prep
 * instructions link to their on-site (printable) instruction page, and
 * anything not yet readable on-site offers the staffed text line instead.
 */
export function DocumentList({ category, locale, dict }: DocumentListProps) {
  const docs = documentsByCategory(category);
  const d = dict.common.docs;
  return (
    <ul className="divide-y divide-[var(--color-line)] rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-white">
      {docs.map((doc) => {
        const topic = topicForDocument(doc.id);
        const prep = prepForDocument(doc.id);
        return (
          <li key={doc.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3.5">
            <FileText className="h-4.5 w-4.5 flex-none text-[var(--color-teal-ink)]" />
            <span className="min-w-0 flex-1 font-semibold text-[var(--color-ink)]">
              {doc.label[locale]}
            </span>
            {topic ? (
              <Link
                href={localePath(locale, `/patient-education/${topic.slug}`)}
                className="link-line text-[0.92rem]"
              >
                {d.readOnline} <ArrowRight className="h-4 w-4" />
              </Link>
            ) : null}
            {prep ? (
              <Link
                href={localePath(locale, `/procedure-prep/${prep.slug}`)}
                className="link-line text-[0.92rem]"
              >
                {d.viewInstructions} <ArrowRight className="h-4 w-4" />
              </Link>
            ) : null}
            {doc.file ? (
              <a href={doc.file} className="link-line text-[0.92rem]" download>
                <Download className="h-4 w-4" /> {d.download}
              </a>
            ) : topic ? (
              <span
                className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-mint)] px-3 py-1.5 text-[0.88rem] font-bold text-[var(--color-teal-ink)]"
                title={d.pendingExplainer}
              >
                {d.printablePending}
              </span>
            ) : prep ? null : (
              <a
                href={site.textLine.href}
                className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-mint)] px-3 py-1.5 text-[0.88rem] font-bold text-[var(--color-teal-ink)] transition-colors hover:bg-[var(--color-mint-2)]"
                title={d.pendingExplainer}
              >
                <MessageSquare className="h-3.5 w-3.5" /> {d.requestByText}
              </a>
            )}
          </li>
        );
      })}
    </ul>
  );
}
