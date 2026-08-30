#!/usr/bin/env node
/* Ports the repo's 60 vendored registry demos into preview cards.
 *
 * src/components/stock/examples/<slug>-example.tsx are the shadcn registry's
 * OWN demos, vendored by `npm run ds:stock`. They are exactly the
 * author-written compositions a preview should be built from, so this rewrites
 * rather than reinvents them:
 *
 *   - imports from @/components/stock/<x> become aliased imports from the
 *     bundle (`StockAccordion as Accordion`), so not one line of JSX changes
 *   - the Example/ExampleWrapper frame is replaced with a local stub
 *   - the default export's children become NAMED exports — one card cell each
 *
 * Everything else (lucide-react, react, local data) is left alone; design-sync
 * bundles those from source.
 *
 * Writes only files that do not already exist, so a hand-tuned preview is
 * never clobbered. Pass --force to overwrite.
 *
 * Usage: node .design-sync/ds/port-examples.mjs [--force] [Name ...]
 */

import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const DS = dirname(fileURLToPath(import.meta.url));
const REPO = join(DS, '..', '..');
const EXAMPLES = join(REPO, 'src/components/stock/examples');
const OUT = join(REPO, '.design-sync/previews');

const aliases = JSON.parse(readFileSync(join(DS, 'aliases.json'), 'utf8'));
const families = JSON.parse(readFileSync(join(DS, 'families.json'), 'utf8'));
// A file's card name is its family root; single-export files (spinner.tsx,
// switch.tsx, …) have no root, just one orphan — that orphan IS the card.
const rootOf = new Map(
  families
    .filter((f) => f.tier === 'stock')
    .map((f) => {
      if (f.root) return [f.file, f.root];
      if (f.orphans.length === 1) return [f.file, f.orphans[0]];
      // Several sibling exports, no shared prefix (scroll-area.tsx ships
      // ScrollArea + ScrollBar): the card is the one named after the file.
      const want = 'Stock' + f.file.split('/').pop().replace(/\.tsx?$/, '')
        .replace(/(^|-)([a-z])/g, (_m, _d, c) => c.toUpperCase());
      return [f.file, f.orphans.find((o) => o.toLowerCase() === want.toLowerCase()) ?? null];
    })
    .filter(([, root]) => root),
);

const args = process.argv.slice(2);
const force = args.includes('--force');
const only = new Set(args.filter((a) => !a.startsWith('--')));

// The frame the registry demos render inside. Reproduced locally so the ported
// cells keep their titles and spacing without importing gallery-only code.
const FRAME = `
/* Local stand-in for the registry demo frame (src/components/stock/examples/
   example.tsx), which is gallery-only code. Same slots, no dependencies. */
function Example({ title, children, className = "" }) {
  return (
    <div className="flex w-full min-w-0 flex-col gap-1">
      {title ? (
        <div className="px-1.5 py-2 text-xs font-medium text-muted-foreground">{title}</div>
      ) : null}
      <div className={"flex min-w-0 flex-col items-start gap-6 rounded-xl bg-card p-6 text-foreground " + className}>
        {children}
      </div>
    </div>
  );
}
`;

/** Rewrite one import statement; returns null to drop it. */
function rewriteImport(stmt) {
  const from = /from\s+["']([^"']+)["']/.exec(stmt)?.[1];
  if (!from) return stmt;
  if (from.includes('/examples/example')) return null; // replaced by FRAME
  if (!from.startsWith('@/components/stock/')) return stmt; // lucide, react, …

  const file = from.replace('@/', 'src/') + '.tsx';
  const map = aliases[file];
  if (!map) return stmt;

  const names = /\{([\s\S]*?)\}/.exec(stmt)?.[1];
  if (!names) return stmt;
  const specs = names
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      const local = s.replace(/^type\s+/, '').split(/\s+as\s+/).pop().trim();
      const orig = s.replace(/^type\s+/, '').split(/\s+as\s+/)[0].trim();
      const global = map[orig];
      if (!global) return null;
      return global === local ? global : `${global} as ${local}`;
    })
    .filter(Boolean);
  if (!specs.length) return null;
  return `import { ${specs.join(', ')} } from "westchase-gi";`;
}

/** Remove `export default function X() { … }` and return the cell names it listed. */
function stripDefault(src) {
  const start = src.search(/export\s+default\s+function\s+\w+\s*\(/);
  if (start === -1) return { src, cells: [] };
  // Body ends at the first `}` in column 0 after the declaration.
  const rest = src.slice(start);
  const endRel = rest.search(/\n\}\s*\n/);
  const end = endRel === -1 ? src.length : start + endRel + 3;
  const body = src.slice(start, end);
  const cells = [...body.matchAll(/<([A-Z]\w*)\s*\/>/g)].map((m) => m[1]);
  return { src: src.slice(0, start) + src.slice(end), cells };
}

let written = 0;
let skipped = 0;
for (const f of readdirSync(EXAMPLES).sort()) {
  if (!f.endsWith('-example.tsx')) continue;
  const slug = f.replace('-example.tsx', '');
  const root = rootOf.get(`src/components/stock/${slug}.tsx`);
  if (!root) { console.error(`  ! no root for ${slug} — skipped`); continue; }
  if (only.size && !only.has(root)) continue;

  const dest = join(OUT, `${root}.tsx`);
  if (existsSync(dest) && !force) { skipped++; continue; }

  let src = readFileSync(join(EXAMPLES, f), 'utf8');
  const { src: stripped, cells } = stripDefault(src);
  src = stripped;

  // Rewrite imports.
  src = src.replace(/import\s+[\s\S]*?from\s+["'][^"']+["'];?/g, (m) => rewriteImport(m) ?? '');

  // Export exactly the cells the demo itself listed, capped so a card stays
  // readable. Anything else stays a local helper.
  const keep = cells.slice(0, 6);
  for (const c of keep) {
    src = src.replace(new RegExp(`(^|\\n)function ${c}\\(`), `$1export function ${c}(`);
  }
  if (!keep.length) {
    console.error(`  ! ${root}: no cells found — skipped`);
    continue;
  }

  const header =
    `/* Ported by .design-sync/ds/port-examples.mjs from\n` +
    `   src/components/stock/examples/${f} — the shadcn registry's own demo,\n` +
    `   vendored by \`npm run ds:stock\`. Imports are aliased onto the bundle's\n` +
    `   Stock* exports; the JSX is the registry's, unchanged.\n` +
    `   Cells: ${keep.join(', ')}${cells.length > keep.length ? ` (+${cells.length - keep.length} not shown)` : ''} */\n\n`;

  writeFileSync(dest, header + src.trimStart() + FRAME);
  written++;
}

console.error(`  ported ${written} example(s), ${skipped} already present`);
