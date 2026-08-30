import Link from "next/link";
import { notFound } from "next/navigation";

import { brandExamples } from "@/app/design/brand";
import { adoptionLabel, catalog, findEntry } from "@/app/design/catalog";
import type { Adoption } from "@/app/design/catalog";
import { CompareView } from "@/app/design/compare-view";
import { requireGallery } from "@/app/design/gallery-gate";
import { stockExamples } from "@/app/design/stock-examples";
import { Badge } from "@/components/ui/badge";

export const dynamicParams = false;

export function generateStaticParams(): { slug: string }[] {
  return catalog.map((entry) => ({ slug: entry.slug }));
}

const stampFor = {
  adapted: "settled",
  pending: "current",
  declined: "quiet",
  none: "quiet",
} satisfies Record<Adoption, "settled" | "current" | "quiet">;

type ComponentPageProps = Readonly<{ params: Promise<{ slug: string }> }>;

export default async function ComponentPage({ params }: ComponentPageProps) {
  requireGallery();
  const { slug } = await params;
  const entry = findEntry(slug);
  if (entry === undefined) {
    notFound();
  }

  const stockLoader = entry.example === undefined ? undefined : stockExamples.get(entry.example);
  const StockExample = stockLoader === undefined ? null : (await stockLoader()).default;
  const brandLoader = brandExamples.get(slug);
  const BrandExample = brandLoader === undefined ? null : (await brandLoader()).default;

  const index = catalog.findIndex((row) => row.slug === slug);
  const previous = index > 0 ? catalog[index - 1] : undefined;
  const next = index < catalog.length - 1 ? catalog[index + 1] : undefined;

  return (
    <article className="flex flex-col gap-8">
      <nav aria-label="Component" className="flex items-center gap-3 text-sm text-muted-ink">
        <Link href="/design#components" className="link-plain">
          Components
        </Link>
        <span aria-hidden>/</span>
        <span className="text-ink">{entry.name}</span>
      </nav>

      <header className="flex max-w-3xl flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-extrabold text-ink">{entry.name}</h1>
          <Badge variant={stampFor[entry.adoption]}>{adoptionLabel[entry.adoption]}</Badge>
        </div>
        <p className="text-base text-body">{entry.note}</p>
        <p className="text-sm text-muted-ink">
          Stock source: <code>src/components/stock/{entry.slug}.tsx</code>
          {entry.adoption === "adapted" ? (
            <>
              {" "}
              · Brand recipe: <code>src/components/ui/{entry.slug}.tsx</code>
            </>
          ) : null}{" "}
          ·{" "}
          <a
            href={`https://ui.shadcn.com/docs/components/base/${entry.slug}`}
            className="link-plain"
            rel="noreferrer"
            target="_blank"
          >
            Registry docs
          </a>
        </p>
      </header>

      <CompareView
        stock={StockExample === null ? null : <StockExample />}
        brand={BrandExample === null ? null : <BrandExample />}
      />

      {StockExample === null ? (
        <p className="text-sm text-muted-ink">
          The registry ships no vendored example for this item (see{" "}
          <code>src/components/stock/MANIFEST.json</code>).
        </p>
      ) : null}

      <footer className="flex justify-between border-t border-line pt-6 text-sm">
        {previous === undefined ? (
          <span />
        ) : (
          <Link href={`/design/${previous.slug}`} className="link-plain">
            ← {previous.name}
          </Link>
        )}
        {next === undefined ? (
          <span />
        ) : (
          <Link href={`/design/${next.slug}`} className="link-plain">
            {next.name} →
          </Link>
        )}
      </footer>
    </article>
  );
}
