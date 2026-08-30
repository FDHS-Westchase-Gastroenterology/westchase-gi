#!/usr/bin/env node
/* Makes overlay preview cards show their overlay.
 *
 * Dialogs, sheets, drawers, menus, popovers and tooltips render nothing but a
 * trigger button in a static card — the thing the component exists for is
 * behind a click. Every one of these roots takes `defaultOpen`, so this adds
 * it to the FIRST cell of each overlay preview and records a matching
 * `cfg.overrides` entry (`cardMode: single` + `primaryStory`) so the open
 * overlay gets a card to itself with room to render.
 *
 * Only the first cell is opened: overlays are portalled and fixed-position, so
 * opening several at once stacks them on top of each other.
 *
 * Run after port-examples.mjs; re-runnable (skips previews already opened).
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const DS = dirname(fileURLToPath(import.meta.url));
const REPO = join(DS, '..', '..');
const PREVIEWS = join(REPO, '.design-sync/previews');
const CONFIG = join(REPO, '.design-sync/config.json');

// root component -> viewport that fits its open state
const OVERLAYS = {
  StockAlertDialog: '900x620',
  StockDialog: '900x700',
  StockSheet: '1000x700',
  StockDrawer: '900x760',
  StockPopover: '900x520',
  StockTooltip: '800x420',
  StockDropdownMenu: '900x620',
  StockContextMenu: '900x620',
  StockHoverCard: '900x520',
  StockSelect: '900x620',
  StockCombobox: '900x620',
  StockMenubar: '1000x560',
  StockNavigationMenu: '1000x560',
  StockCommand: '900x620',
};

const cfg = JSON.parse(readFileSync(CONFIG, 'utf8'));
cfg.overrides ??= {};

let opened = 0;
for (const [root, viewport] of Object.entries(OVERLAYS)) {
  const file = join(PREVIEWS, `${root}.tsx`);
  if (!existsSync(file)) { console.error(`  ! ${root}: no preview — skipped`); continue; }
  let src = readFileSync(file, 'utf8');

  // The local alias the ported demo uses is the un-prefixed name.
  const local = root.replace(/^Stock/, '');

  // First exported cell = the one that gets opened and becomes the card.
  const firstCell = /export function (\w+)\(/.exec(src)?.[1];
  if (!firstCell) { console.error(`  ! ${root}: no exported cell — skipped`); continue; }

  if (!new RegExp(`<${local}\\s+defaultOpen`).test(src)) {
    // Open the first bare `<Root>` or `<Root ...>` occurrence inside that cell.
    const cellStart = src.indexOf(`export function ${firstCell}(`);
    const head = src.slice(0, cellStart);
    let tail = src.slice(cellStart);
    const before = tail;
    tail = tail.replace(new RegExp(`<${local}(\\s|>)`), (m, next) =>
      `<${local} defaultOpen${next === '>' ? '>' : ' '}`);
    if (tail === before) { console.error(`  ! ${root}: <${local}> not found in ${firstCell} — skipped`); continue; }
    src = head + tail;
    writeFileSync(file, src);
  }

  cfg.overrides[root] = { cardMode: 'single', primaryStory: firstCell, viewport };
  opened++;
}

writeFileSync(CONFIG, JSON.stringify(cfg, null, 2) + '\n');
console.error(`  opened ${opened} overlay preview(s); cfg.overrides updated`);
