#!/usr/bin/env node
/* The design-system build for the claude.ai/design import (cfg.buildCmd).
 *
 * This repo is a Next app, not a published package, so there is no dist/ for
 * the converter to read. This script produces the three things it needs:
 *
 *   1. entry.ts   the barrel (see gen-entry.mjs — brand canonical, stock prefixed)
 *   2. types/     a real .d.ts tree, so component cards carry true prop
 *                 contracts and subcomponents nest under their parents
 *   3. styles.css Tailwind v4 compiled to a static stylesheet, plus the
 *                 brand webfonts, since `@import "tailwindcss"` means nothing
 *                 in a browser and next/font never runs here
 *
 * Everything it writes is gitignored; the inputs (entry.ts, tsconfig.json,
 * shims/, tailwind-entry.css) are committed.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const DS = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(DS, '..', '..');
const TYPES = join(DS, 'types');
const step = (s) => console.error(`\n\u25b8 ${s}`);
const run = (cmd, args, opts = {}) =>
  execFileSync(cmd, args, { cwd: REPO, stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8', ...opts });

// ── 1. barrel ─────────────────────────────────────────────────────────────
step('generating entry.ts');
console.error(run('node', [join(DS, 'gen-entry.mjs')], { stdio: ['ignore', 'pipe', 'inherit'] }) || '');

// ── 2. per-component docs ─────────────────────────────────────────────────
step('generating component docs');
console.error(run('node', [join(DS, 'gen-docs.mjs')], { stdio: ['ignore', 'pipe', 'inherit'] }) || '');

// ── 3. declarations ───────────────────────────────────────────────────────
step('emitting .d.ts');
rmSync(TYPES, { recursive: true, force: true });
try {
  run('npx', ['tsc', '-p', join(DS, 'tsconfig.json')]);
} catch (e) {
  // Declaration emit is best-effort: type errors in app code (server-only
  // imports, RSC-isms) don't stop tsc from writing the .d.ts we need. Only a
  // genuinely empty output is fatal.
  const out = `${e.stdout ?? ''}${e.stderr ?? ''}`.trim();
  if (out) console.error(out.split('\n').slice(0, 25).join('\n'));
}
const walk = (d) =>
  readdirSync(d, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(join(d, e.name)) : e.name.endsWith('.d.ts') ? [join(d, e.name)] : [],
  );
if (!existsSync(TYPES)) {
  console.error('[NO_DTS] tsc emitted nothing — check .design-sync/ds/tsconfig.json');
  process.exit(1);
}
const dtsFiles = walk(TYPES);

// Rewrite `@/x` -> a relative specifier. The converter parses these .d.ts with
// a bare ts-morph project that has no knowledge of the repo's path aliases, so
// an unresolved `@/components/ui/button-variants` collapses the component's
// props to `any` and its card ships an empty API contract.
step('rewriting @/ aliases in .d.ts');
let rewrote = 0;
for (const f of dtsFiles) {
  const before = readFileSync(f, 'utf8');
  const after = before.replace(/(["'])@\/([^"']+)\1/g, (_m, q, tail) => {
    let rel = relative(dirname(f), join(TYPES, 'src', tail)).split('\\').join('/');
    if (!rel.startsWith('.')) rel = './' + rel;
    return `${q}${rel}${q}`;
  });
  if (after !== before) { writeFileSync(f, after); rewrote++; }
}
console.error(`  rewrote ${rewrote}/${dtsFiles.length} .d.ts`);

// The converter's entry probe reads `types` from package.json and globs that
// directory. Point it at a root-level shim so the glob sees the whole tree.
const entryDts = join(TYPES, '.design-sync', 'ds', 'entry.d.ts');
if (!existsSync(entryDts)) {
  console.error(`[NO_DTS] expected ${relative(REPO, entryDts)} — tsc layout changed`);
  process.exit(1);
}
writeFileSync(
  join(TYPES, 'index.d.ts'),
  `// Re-export of the emitted barrel, at the root of the .d.ts tree so the\n` +
    `// converter's types glob picks up every declaration.\n` +
    `export * from ${JSON.stringify('./' + relative(TYPES, entryDts).split('\\').join('/').replace(/\.d\.ts$/, ''))};\n`,
);
console.error(`  ${dtsFiles.length} .d.ts + index.d.ts shim`);

// ── 4. fonts ──────────────────────────────────────────────────────────────
// Must precede the stylesheet step: cfg.extraFonts reads fonts/fonts.css, and
// tailwind-entry.css declares the variables that point at these families.
step('vendoring brand webfonts');
if (!existsSync(join(DS, 'fonts', 'fonts.css'))) {
  run('node', [join(DS, 'fetch-fonts.mjs')], { stdio: ['ignore', 'inherit', 'inherit'] });
} else {
  console.error('  fonts/ already vendored (delete .design-sync/ds/fonts to refetch)');
}

// ── 5. stylesheet ─────────────────────────────────────────────────────────
step('compiling Tailwind v4');
run('npx', [
  '@tailwindcss/cli',
  '-i', join(DS, 'tailwind-entry.css'),
  '-o', join(DS, 'styles.css'),
  '--minify',
], { stdio: ['ignore', 'inherit', 'inherit'] });
const css = readFileSync(join(DS, 'styles.css'), 'utf8');
if (/@import\s+["']tailwindcss/.test(css)) {
  console.error('[CSS_UNCOMPILED] styles.css still contains @import "tailwindcss"');
  process.exit(1);
}
console.error(`  styles.css: ${(statSync(join(DS, 'styles.css')).size / 1024).toFixed(0)} KB`);

// ── 6. guidelines ─────────────────────────────────────────────────────────
// Copied here so cfg.guidelinesGlob stays package-relative. These ship into
// the project's guidelines/ dir, where the design agent can read the system's
// own rules rather than inferring them from the components.
step('copying guidelines');
// Copied to the package ROOT, not a guidelines/ subdir: the converter joins
// its output dir with each file's package-relative path, so a nested source
// would land at guidelines/guidelines/<name>.md.
for (const [from, to] of [
  ['DESIGN.md', 'DESIGN.md'],
  ['src/components/stock/README.md', 'component-tiers.md'],
]) {
  writeFileSync(join(DS, to), readFileSync(join(REPO, from), 'utf8'));
}
console.error('  2 guideline file(s)');

step('done');
