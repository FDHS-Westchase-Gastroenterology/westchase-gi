import { documentsByCategory, type DocCategory } from "@/lib/documents";
import { site, type Locale } from "@/lib/site";
import type { Dictionary } from "@/lib/i18n";
import { Download, FileText, MessageSquare } from "./icons";

type DocumentListProps = {
  category: DocCategory;
  locale: Locale;
  dict: Dictionary;
};

/**
 * Slot-aware document list. Replaces the old site's 33 dead PDF links:
 * a real download link renders ONLY when the registry has a file; otherwise
 * the row offers the staffed text line, which works today.
 */
export function DocumentList({ category, locale, dict }: DocumentListProps) {
  const docs = documentsByCategory(category);
  const d = dict.common.docs;
  return (
    <ul className="divide-y divide-[var(--color-line)] rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-white">
      {docs.map((doc) => (
        <li key={doc.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3.5">
          <FileText className="h-4.5 w-4.5 flex-none text-[var(--color-teal-ink)]" />
          <span className="min-w-0 flex-1 font-semibold text-[var(--color-ink)]">
            {doc.label[locale]}
          </span>
          {doc.file ? (
            <a
              href={doc.file}
              className="link-line text-[0.92rem]"
              download
            >
              <Download className="h-4 w-4" /> {d.download}
            </a>
          ) : (
            <a
              href={site.textLine.href}
              className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-mint)] px-3 py-1.5 text-[0.88rem] font-bold text-[var(--color-teal-ink)] transition-colors hover:bg-[var(--color-mint-2)]"
              title={d.pendingExplainer}
            >
              <MessageSquare className="h-3.5 w-3.5" /> {d.requestByText}
            </a>
          )}
        </li>
      ))}
    </ul>
  );
}
