import type { PrepBlock, PrepSection } from "@/lib/content/preps";

/* Inline syntax from the prep transcriptions: **bold** for the handout's
   load-bearing emphasis, runs of 3+ underscores for fill-in blanks. */
const INLINE_TOKEN = /(\*\*[^*]+\*\*|_{3,})/g;

/** Stable keys for immutable content lists: the content itself, with a
 *  collision counter for repeated strings (never the array index). */
function contentKeys(parts: string[], take = 32): string[] {
  const seen = new Map<string, number>();
  return parts.map((part) => {
    const base = part.slice(0, take);
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    return n > 1 ? `${base}#${n}` : base;
  });
}

/** Renders one transcription string, honoring bold runs and fill-in blanks
 *  (which may nest, e.g. "**take at ___ AM**"). Deterministic parse of an
 *  immutable string: content keys are stable by construction. */
function Inline({ text }: { text: string }) {
  const parts = text.split(INLINE_TOKEN).filter(Boolean);
  const keys = contentKeys(parts, 24);
  return (
    <>
      {parts.map((part, i) => {
        const key = keys[i];
        if (part.startsWith("**") && part.endsWith("**")) {
          return (
            <strong key={key}>
              <Inline text={part.slice(2, -2)} />
            </strong>
          );
        }
        if (/^_{3,}$/.test(part)) {
          // Decorative on screen readers: the surrounding sentence carries
          // the meaning, and the page explains how blanks get filled in.
          return <span key={key} className="fill-blank" aria-hidden="true" />;
        }
        return <span key={key}>{part}</span>;
      })}
    </>
  );
}

const LIST_CLASS: Record<string, string> = {
  bullet: "list-plain",
  steps: "list-steps",
  check: "list-check",
  avoid: "list-avoid",
};

function Block({ block }: { block: PrepBlock }) {
  switch (block.kind) {
    case "p":
      return (
        <p className="measure">
          <Inline text={block.text} />
        </p>
      );
    case "list": {
      const keys = contentKeys(block.items);
      const items = block.items.map((item, i) => (
        <li key={keys[i]} className="measure">
          <Inline text={item} />
        </li>
      ));
      return block.style === "steps" ? (
        <ol className={LIST_CLASS.steps}>{items}</ol>
      ) : (
        <ul className={LIST_CLASS[block.style]}>{items}</ul>
      );
    }
    case "note": {
      const keys = contentKeys(block.text);
      return (
        <div className="prep-note">
          {block.text.map((t, i) => (
            <p key={keys[i]}>
              <Inline text={t} />
            </p>
          ))}
        </div>
      );
    }
    case "schedule":
      return (
        <div className="grid gap-4">
          <div className="prep-schedule">
            {block.columns.map((col) => {
              const keys = contentKeys(col.items);
              return (
                <div key={col.title} className="prep-schedule-col">
                  <div className="prep-schedule-head">
                    <Inline text={col.title} />
                  </div>
                  <ul>
                    {col.items.map((item, j) => (
                      <li key={keys[j]}>
                        <Inline text={item} />
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
          {block.footer ? (
            <p className="measure font-bold text-[var(--color-ink)]">
              <Inline text={block.footer} />
            </p>
          ) : null}
        </div>
      );
    case "table":
      return (
        <div className="prep-table-wrap">
          <table className="prep-table">
            <thead>
              <tr>
                {block.head.map((h) => (
                  <th key={h} scope="col">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row) => (
                <tr key={row[0]}>
                  {row.map((cell, j) => (
                    <td key={`${cell.slice(0, 24)}@${j}`}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
  }
}

/** Content-derived section keys: heading (or first block's text), made
 *  unique with a counter only on collision. Stable across renders because
 *  the content itself is immutable module data. */
function sectionKeys(sections: PrepSection[]): string[] {
  const seen = new Map<string, number>();
  return sections.map((s) => {
    const first = s.blocks[0];
    const base =
      s.heading ??
      (first && "text" in first
        ? (Array.isArray(first.text) ? first.text[0] : first.text).slice(0, 48)
        : (first?.kind ?? "empty"));
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    return n > 1 ? `${base}#${n}` : base;
  });
}

/** Renders one locale's section tree of a prep handout. */
export function PrepBody({ sections }: { sections: PrepSection[] }) {
  const keys = sectionKeys(sections);
  return (
    <div className="grid gap-10">
      {sections.map((section, i) => (
        <section key={keys[i]}>
          {section.heading ? (
            <h2 className="h3 font-[var(--font-display)]">{section.heading}</h2>
          ) : null}
          <div className={`grid gap-5 ${section.heading ? "mt-4" : ""}`}>
            {section.blocks.map((block, j) => (
              <Block key={`${block.kind}@${j}`} block={block} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
