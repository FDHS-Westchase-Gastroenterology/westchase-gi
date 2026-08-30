#!/usr/bin/env node
/* Copies the brand images the components hard-code into the built bundle.
 *
 * Header and Footer reference `/images/brand/...` as absolute paths served by
 * Next's public/ dir. Nothing in the converter knows about those, so without
 * this step the logo is a broken image — in the preview cards AND in every
 * design the agent builds with Header or Footer.
 *
 * Must run AFTER package-build.mjs, which wipes the out dir:
 *   node .ds-sync/package-build.mjs … --out ./ds-bundle
 *   node .design-sync/ds/copy-assets.mjs
 *
 * Keep ASSETS in sync with:
 *   grep -rho '"/images/[^"]*"' src/components src/lib/site.ts
 */

import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT = process.argv[2] ?? join(REPO, 'ds-bundle');

const ASSETS = [
  // Header + Footer brand marks.
  'images/brand/header-logo-fdhs.webp',
  'images/brand/alpha-omega-white.webp',
  'images/brand/favicon-fdhs-192.png',
  // The provider card the ProfileCardViewer preview opens.
  'images/staff/headshots/dr-chang.jpg',
];

let n = 0;
for (const rel of ASSETS) {
  const from = join(REPO, 'public', rel);
  if (!existsSync(from)) {
    console.error(`  ! asset missing, skipped: public/${rel}`);
    continue;
  }
  const to = join(OUT, rel);
  mkdirSync(dirname(to), { recursive: true });
  copyFileSync(from, to);
  n++;
}
console.error(`  assets: ${n}/${ASSETS.length} copied → ${OUT}/images/`);
