#!/usr/bin/env node
/* Generates .design-sync/ds/docs/<Name>.md — the per-component reference the
 * converter turns into <Name>.prompt.md, which is what the claude.ai/design
 * agent reads before composing with a component.
 *
 * Everything here is derived from material the repo already maintains:
 *   src/app/design/catalog.ts   family + adoption status + curated note
 *   src/components/**           the leading prose comment on each recipe
 *   families.json               tier, source file, subcomponents
 *
 * Nothing is invented. The frontmatter `category` also sets the component's
 * group in the Design System pane, which is what keeps the brand tier and the
 * registry tier visibly separate.
 */

import { mkdirSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const DS = dirname(fileURLToPath(import.meta.url));
const REPO = join(DS, '..', '..');
const OUT = join(DS, 'docs');

const families = JSON.parse(readFileSync(join(DS, 'families.json'), 'utf8'));

// ── the gallery catalog: slug -> {name, family, adoption, note} ────────────
function parseCatalog() {
  const src = readFileSync(join(REPO, 'src/app/design/catalog.ts'), 'utf8');
  const noConsumer = /const NO_CONSUMER = "([^"]*)"/.exec(src)?.[1] ?? '';
  const entries = new Map();
  // Object literals inside the `catalog` array; fields may span lines.
  for (const block of src.split(/\n  \{\n/).slice(1)) {
    const body = block.split(/\n  \},?/)[0];
    const f = (k) => {
      const m = new RegExp(`${k}:\\s*(?:"((?:[^"\\\\]|\\\\.)*)"|([A-Z_]+))`, 's').exec(body);
      return m ? (m[1] !== undefined ? m[1].replace(/\\"/g, '"') : m[2] === 'NO_CONSUMER' ? noConsumer : '') : '';
    };
    // Multi-line notes are written as adjacent string literals in the source.
    const noteRaw = /note:\s*([\s\S]*?),\n\s*(?:example|adoption|family|slug|name):/.exec(body)?.[1]
      ?? /note:\s*([\s\S]*?),?\s*$/.exec(body)?.[1] ?? '';
    const note = noteRaw.trim() === 'NO_CONSUMER'
      ? noConsumer
      : [...noteRaw.matchAll(/"((?:[^"\\]|\\.)*)"/g)].map((m) => m[1].replace(/\\"/g, '"')).join('');
    const slug = f('slug');
    if (slug) entries.set(slug, { slug, name: f('name'), family: f('family'), adoption: f('adoption'), note });
  }
  return entries;
}
const catalog = parseCatalog();

// ── the leading prose comment on a component's source ──────────────────────
// DESIGN.md: "Every recipe opens with a prose comment explaining its axes, its
// defaults, and where its consumers are. The recipe is the documentation."
// Consumer maps and refresh reminders are maintainer bookkeeping, not guidance
// for someone composing with the component — drop those lines.
const MAINTAINER_RX = /^(sole importer|consumer|importers?|refresh|regenerates?|full list|rg -l|todo|fixme)\b/i;
function prose(file) {
  if (!existsSync(join(REPO, file))) return '';
  const src = readFileSync(join(REPO, file), 'utf8');
  const m = /\/\*+([\s\S]*?)\*\//.exec(src.slice(0, 4000));
  if (!m) return '';
  const lines = m[1]
    .split('\n')
    .map((l) => l.replace(/^\s*\*? ?/, '').trimEnd())
    .filter((l) => !MAINTAINER_RX.test(l.trim()));
  // Keep everything up to the first blank-line break after real content.
  const out = [];
  for (const l of lines) {
    if (!l.trim() && out.length) break;
    if (l.trim()) out.push(l.trim());
  }
  return out.join(' ').replace(/\s+/g, ' ').trim();
}

const kebab = (n) => n.replace(/([a-z0-9])([A-Z])/g, '$1-$2').replace(/([A-Z])([A-Z][a-z])/g, '$1-$2').toLowerCase();

const TIER_CATEGORY = { patterns: 'Patterns', domain: 'Site sections' };

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

// Brand roots, so a stock doc can name its counterpart.
const brandRoots = new Set(
  families.filter((f) => f.tier === 'ui').flatMap((f) => [f.root, ...f.orphans].filter(Boolean)),
);

let written = 0;
for (const fam of families) {
  const roots = [fam.root, ...fam.orphans].filter(Boolean);
  for (const root of roots) {
    const isStock = fam.tier === 'stock';
    const bare = isStock ? root.replace(/^Stock/, '') : root;
    // The catalog is keyed by REGISTRY ITEM, and a registry item is a file —
    // so scroll-area.tsx's second export (ScrollBar) still resolves to the
    // scroll-area entry. Falling back to the component's own name only helps
    // the brand tiers, where file and component names coincide.
    const fileSlug = fam.file.split('/').pop().replace(/\.tsx?$/, '');
    const entry = catalog.get(fileSlug) ?? catalog.get(kebab(bare));
    const subs = root === fam.root ? fam.members : [];

    let category;
    if (isStock) category = `Registry · ${entry?.family ?? 'Other'}`;
    else if (TIER_CATEGORY[fam.tier]) category = TIER_CATEGORY[fam.tier];
    else category = entry?.family ?? 'Components';

    const body = [`---`, `category: ${category}`, `---`, ``];

    if (isStock) {
      const counterpart = brandRoots.has(bare) ? bare : null;
      body.push(
        `Registry component, byte-exact from the shadcn \`base-nova\` registry — the *before* in this design system's before/after pairing (\`${fam.file}\`).`,
        ``,
      );
      if (counterpart) {
        body.push(
          `**Prefer \`${counterpart}\`.** The practice ships a brand adaptation of this component; \`${root}\` is kept only so the unadapted baseline stays visible. Reach for \`${root}\` only when you deliberately want to show the registry default.`,
          ``,
        );
      } else {
        body.push(
          `**No brand adaptation exists yet.** Nothing in a product surface imports from the registry tier (\`src/components/stock/README.md\`); adopting this component means a brand pass first, per DESIGN.md "Adoption". Using it as-is renders the registry default through the brand token bridge.`,
          ``,
        );
      }
      if (entry?.note) body.push(entry.note, ``);
    } else {
      const label =
        fam.tier === 'ui' ? 'Brand recipe' : fam.tier === 'patterns' ? 'Brand composition' : 'Domain component';
      body.push(`${label} — \`${fam.file}\`.`, ``);
      const p = prose(fam.file);
      if (p) body.push(p, ``);
      else if (entry?.note) body.push(entry.note, ``);
      if (fam.tier === 'ui') {
        body.push(
          `Defaults produce the brand: a forgotten prop renders the practice's look, never the generic. \`className\` is for layout only — never a component's own color, type, radius, or motion.`,
          ``,
        );
      }
    }

    if (subs.length) {
      body.push(`**Subcomponents:** ${subs.map((s) => `\`${s}\``).join(', ')}`, ``);
    }

    writeFileSync(join(OUT, `${root}.md`), body.join('\n'));
    written++;
  }
}

console.error(`  docs: ${written} component docs → .design-sync/ds/docs/`);
