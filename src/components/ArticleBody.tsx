import type { ContentSection } from "@/lib/content/types";
import type { Locale } from "@/lib/site";

type ArticleBodyProps = {
  sections: ContentSection[];
  locale: Locale;
};

/** Shared long-form renderer for blog posts and education topics. */
export function ArticleBody({ sections, locale }: ArticleBodyProps) {
  return (
    <div className="grid gap-7">
      {sections.map((section, i) => (
        <section key={section.heading ? section.heading.en : `lead-${i}`}>
          {section.heading ? (
            <h2 className="h3 font-[var(--font-display)]">{section.heading[locale]}</h2>
          ) : null}
          <div className={`grid gap-4 ${section.heading ? "mt-3" : ""}`}>
            {section.paragraphs.map((para) => (
              <p key={para.en.slice(0, 40)} className="measure">
                {para[locale]}
              </p>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
