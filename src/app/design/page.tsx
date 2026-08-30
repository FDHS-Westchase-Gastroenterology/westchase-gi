import Link from "next/link";

import { Badge } from "@/components/ui/badge";

import { adoptionLabel, catalog, families } from "./catalog";
import type { Adoption } from "./catalog";
import {
  ColorSection,
  MotionSection,
  Section,
  GeometrySection,
  SpaceSection,
  TypeSection,
} from "./foundations/sections";
import { requireGallery } from "./gallery-gate";

const stampFor = {
  adapted: "settled",
  pending: "current",
  declined: "quiet",
  none: "quiet",
} satisfies Record<Adoption, "settled" | "current" | "quiet">;

export default function DesignIndexPage() {
  requireGallery();
  const groups = families.map((family) => ({
    family,
    entries: catalog.filter((entry) => entry.family === family),
  }));
  const adapted = catalog.filter((entry) => entry.adoption === "adapted").length;

  return (
    <div className="flex flex-col gap-12">
      <header className="flex max-w-3xl flex-col gap-3">
        <h1 className="text-3xl font-extrabold text-ink">The design system, rendered</h1>
        <p className="text-base text-body">
          Every token below is read live from <code>src/app/globals.css</code>. Every component page
          shows the shadcn registry item as it ships, the same item painted only by the brand token
          bridge, and — where one exists — the brand recipe from <code>src/components/ui/</code>.
          The rules are in <code>DESIGN.md</code>; this is the evidence.
        </p>
        <p className="text-sm text-muted-ink">
          {catalog.length} registry items · {adapted} brand-adapted ·{" "}
          <Link href="#components" className="link-plain">
            jump to components
          </Link>
        </p>
      </header>

      <div id="foundations" className="flex scroll-mt-24 flex-col gap-12">
        <ColorSection />
        <TypeSection />
        <SpaceSection />
        <GeometrySection />
        <MotionSection />
      </div>

      <Section
        id="components"
        title="Components"
        lede="One row per registry item. The stamp is the item's standing in the tiers; the note is the design finding behind it."
      >
        <div className="flex flex-col gap-10">
          {groups.map(({ family, entries }) => (
            <div key={family} className="flex flex-col gap-3">
              <h3 className="text-xs font-semibold tracking-wide text-muted-ink uppercase">
                {family}
              </h3>
              <ul className="divide-y divide-line">
                {entries.map((entry) => (
                  <li
                    key={entry.slug}
                    className="grid gap-2 py-3 sm:grid-cols-[12rem_11rem_1fr] sm:items-start"
                  >
                    <Link
                      href={`/design/${entry.slug}`}
                      className="text-sm font-semibold text-teal-ink hover:underline"
                    >
                      {entry.name}
                    </Link>
                    <Badge variant={stampFor[entry.adoption]}>
                      {adoptionLabel[entry.adoption]}
                    </Badge>
                    <p className="text-sm text-muted-ink">{entry.note}</p>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}
