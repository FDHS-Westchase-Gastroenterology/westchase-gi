import { site, type Locale } from "@/lib/site";
import type { Dictionary } from "@/lib/i18n";
import { MessageSquare, Phone } from "./icons";

type TextBandProps = { locale: Locale; dict: Dictionary };

/**
 * The staffed text line, given a stage of its own (practice directive:
 * human attention is the differentiator; keep it prominent, never bot-like).
 */
export function TextBand({ dict }: TextBandProps) {
  const t = dict.common.textBand;
  return (
    <section className="print-hide bg-[var(--color-navy)] text-[var(--color-on-dark)]">
      <div className="container-x section-sm flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
        <div className="max-w-2xl">
          <h2 className="h2 font-[var(--font-display)] text-[var(--color-on-dark)]">{t.heading}</h2>
          <p className="mt-3 text-[var(--color-on-dark-muted)]">{t.body}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <a href={site.textLine.href} className="btn btn-amber btn-lg">
            <MessageSquare className="h-4.5 w-4.5" /> {t.cta}
          </a>
          <a href={site.phone.href} className="btn btn-ghost-light btn-lg">
            <Phone className="h-4.5 w-4.5" /> {dict.common.callUs}
          </a>
        </div>
      </div>
    </section>
  );
}
