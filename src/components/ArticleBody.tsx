import type { ContentSection } from "@/lib/content/types";
import type { Locale } from "@/lib/site";

interface ArticleBodyProps {
  readonly sections: readonly ContentSection[];
  readonly locale: Locale;
}

/** Shared long-form renderer for blog posts and education topics. */
// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React props carry framework member types that cannot be made readonly
export function ArticleBody({ sections, locale }: Readonly<ArticleBodyProps>) {
  return (
    <div className="grid gap-7">
      {sections.map((section) => (
        <section
          key={section.heading?.en ?? section.paragraphs.at(0)?.en ?? "lead"}
        >
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
