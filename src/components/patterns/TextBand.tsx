import { MessageSquare, Phone } from "@/components/icons";
import { buttonVariants } from "@/components/ui/button-variants";
import type { Dictionary } from "@/lib/i18n";
import { site } from "@/lib/site";
import type { Locale } from "@/lib/site";

interface TextBandProps {
  locale: Locale;
  dict: Dictionary;
}

/**
 * The staffed text line, given a stage of its own (practice directive:
 * human attention is the differentiator; keep it prominent, never bot-like).
 */
export function TextBand({ dict }: Readonly<TextBandProps>) {
  const t = dict.common.textBand;
  return (
    <section className="print-hide bg-[var(--color-navy)] text-[var(--color-on-dark)]">
      <div className="container-x section-sm flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
        <div className="max-w-2xl">
          <h2 className="h2 font-[var(--font-display)] text-[var(--color-on-dark)]">{t.heading}</h2>
          <p className="mt-3 text-[var(--color-on-dark-muted)]">{t.body}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <a
            href={site.textLine.href}
            data-slot="button"
            className={buttonVariants({ variant: "amber", size: "lg" })}
          >
            <MessageSquare className="h-4.5 w-4.5" /> {t.cta}
          </a>
          <a
            href={site.phone.href}
            data-slot="button"
            className={buttonVariants({ variant: "ghost-light", size: "lg" })}
          >
            <Phone className="h-4.5 w-4.5" /> {dict.common.callUs}
          </a>
        </div>
      </div>
    </section>
  );
}
