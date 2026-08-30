# design-sync notes — Westchase GI → claude.ai/design

Repo-specific gotchas for future syncs. Read this before re-running.
Project: `Westchase GI` (`6c62f245-61fc-4341-a386-9c5fbb5c9cde`).

## Shape

This is a **Next.js app, not a published package** — no `dist/`, no `types`, no
build that emits anything the converter can read. `.design-sync/ds/` supplies
all three, driven by `cfg.buildCmd` (`node .design-sync/ds/build-ds.mjs`):

| Script | Produces | Why |
|---|---|---|
| `gen-entry.mjs` | `entry.ts`, `compounds.json`, `families.json`, `aliases.json` | the barrel + family/alias metadata |
| `gen-docs.mjs` | `docs/<Name>.md` | per-component `.prompt.md` source + `category` (= the pane's grouping) |
| `tsc -p tsconfig.json` | `types/**/*.d.ts` | real prop contracts for the design agent |
| `fetch-fonts.mjs` | `fonts/` | Lato + Trocchi woff2 |
| Tailwind CLI | `styles.css` | compiled from `tailwind-entry.css` |
| `copy-assets.mjs` | `ds-bundle/images/` | **run AFTER `package-build.mjs`** (see below) |

`.design-sync/ds/package.json` is a **synthetic manifest** — not installed, not
published, not part of the app build. It exists only so the converter has a
package root and a `types` entry, which is what keeps the repo's real
`package.json` untouched.

## The name-collision problem (the reason `entry.ts` exists)

`src/components/ui/` and `src/components/stock/` export the **same 42 names**
(`Button`, `Card`, `Field`, `Table`, …) and the bundle is a flat
`window.WestchaseGi` namespace. The converter's default synth entry does
`export * from` every source file, and ES semantics **silently drop** a name
exported by two `export *` — so the entire brand tier would vanish with no
error at all. `gen-entry.mjs` therefore emits an explicit barrel: brand keeps
canonical names, stock is re-exported `Stock*` / `stock*` (case-preserving, so
`Toast`→`StockToast` and `toast`→`stockToast` don't collapse into each other).

`RENAME` in `gen-entry.mjs` handles genuine upstream duplicates: the registry
ships two `Toaster`s (Base UI in `toast.tsx`, sonner in `sonner.tsx`); the
sonner one becomes `StockSonnerToaster`.

## Landmines hit this run — each cost real time

- **A JSON key literally named `"//"` breaks the converter's tsconfig reader.**
  It strips `//` line comments with a regex that also eats that key, the JSON
  parse throws, and `tsconfigPathsPlugin` returns `null` **silently** — so
  `cfg.tsconfig` is ignored, the `next/*` shims never apply, and the real
  Next.js runtime gets bundled (symptom: `ReferenceError: process is not
  defined` on every card). **Use block comments only in
  `.design-sync/ds/tsconfig.json`.**
- **Directory imports must precede the `@/*` wildcard in `paths`.** The paths
  plugin probes extensions with a bare `existsSync` and tries the empty
  extension first, so `@/lib/content/preps` resolves to the *directory* and
  esbuild fails with `Cannot read file …: is a directory`. Four exact entries
  sit above the wildcard for this.
- **Emitted `.d.ts` keep `@/` aliases**, which the converter's bare ts-morph
  project cannot resolve — props collapse to `any` and the card ships an empty
  API contract. `build-ds.mjs` rewrites them to relative specifiers.
- **`PrepDoc.sections` is keyed BY LOCALE** (`Record<Locale, PrepSection[]>`),
  unlike `EducationTopic.sections` which is already an array. Passing the whole
  record renders an empty card, with no error.
- **`package-build.mjs` wipes `ds-bundle/`**, including `_screenshots/` and the
  copied `images/`. Re-run `copy-assets.mjs` after every full build, and don't
  expect earlier review sheets to survive one.

## Fonts

`src/lib/fonts.ts` loads **8** families via `next/font/google`. Only the EN/ES
pairing (**Lato** 400/700/900 + **Trocchi** 400, both OFL) is vendored — those
are the practice's identity and what `globals.css` resolves `--font-display` /
`--font-body` to. The six locale fallbacks (Aleo, Be Vietnam Pro, Noto Serif/
Sans KR, Noto Naskh/Sans Arabic) are **deliberately not shipped**: the design
agent has no way to exercise vi/ko/ar text. If a card ever needs them, extend
`FAMILIES` in `fetch-fonts.mjs`.

`next/font` never runs in the bundle, so `--font-lato` / `--font-trocchi` are
declared in `tailwind-entry.css`; the `@font-face` rules ride `cfg.extraFonts`.

## Images

Header and Footer hard-code `/images/brand/…`. Nothing in the converter knows
about Next's `public/`, so without `copy-assets.mjs` the logo is a broken image
**in every design the agent builds**, not just in the cards. `images/**` is in
the upload plan for this reason. Keep `ASSETS` in `copy-assets.mjs` in sync
with `grep -rho '"/images/[^"]*"' src/components src/lib/site.ts`.

## The `dts.mjs` fork

`.design-sync/overrides/dts.mjs` merges `ds/compounds.json` into the compound
map (`cfg.libOverrides` declares it). Without it the converter emits **444 flat
cards** instead of 97 roots: design-sync infers subcomponents from compound
statics (`Card.Header`) or namespace exports, and shadcn/Base UI ship flat
named exports, so nothing in the `.d.ts` relates `CardHeader` to `Card`. The
relationship lives in the repo's tier contract instead — one registry item per
file (`src/components/stock/README.md`, `MANIFEST.json`) — which
`gen-entry.mjs` reads.

Needs `ln -sfn ../.ds-sync/node_modules .design-sync/node_modules` on a fresh
clone (the fork imports `ts-morph` by bare name; the link is gitignored, the
fork is committed).

## Known render warns — expected, do not chase

- `[TOKENS_MISSING]` for ~19 custom properties (`--toast-index`,
  `--accordion-panel-height`, `--drawer-swipe-progress`, `--toast-swipe-*`,
  `--release-row`, …). Base UI sets these at runtime via inline style; they are
  correctly absent from a static stylesheet.
- `[RENDER_BLANK]` / `[RENDER_THIN]` on components whose floor card is
  genuinely near-empty (`Input`, `Textarea`, `StockSlider`) — resolved once a
  preview is authored, and not a defect before then.
- `[DTS_STYLE_SYSTEM] filtering @types/react props` — informational.
- `[RENDER_ERRORS]` on **LocationMaps**: `SecurityError: Blocked a frame at
  "https://www.google.com" from accessing a frame at "null"`. The Google Maps
  embeds are sandboxed iframes reaching for the parent window; both maps render
  correctly (verified visually — pins, addresses, directions CTA). Cross-origin
  sandbox noise, not a render failure. The component is flagged `bad` by the
  render check for this reason alone; `rootEmpty`, `blank` and `thin` are all
  false.
- `[GRID_OVERFLOW]` is presentation-only and is resolved via `cfg.overrides`:
  `cardMode: "column"` for the wide ones (PageHero, Footer, StockCalendar,
  StockCarousel, StockPagination, StockTabs) and `cardMode: "single"` for the
  two whose content escapes the cell entirely (StockProgress, LanguageChooser).

## Preview conventions

- Previews import from `"westchase-gi"`. Registry cards use aliased imports
  (`StockAccordion as Accordion`) so the vendored demo JSX needs no edits.
- `.design-sync/ds/preview-data.ts` (via `cfg.extraEntries`) re-exports the
  real EN/ES dictionaries, site config, a real education article and a real
  prep document. Cards therefore show the practice's own copy rather than
  invented filler. **This is repo data by reference, so it never rots.**
- `LanguageChooser` is evidence-gated: it opens only when the browser's top
  language differs from the served locale. A headless browser reports en-US, so
  the card renders the **es** locale — that is the honest way to see its open
  state, not a workaround.
- `Reveal` renders its settled state in a still frame by design (content is
  visible by default; the entrance only runs with JS + motion allowed).
- `style-vega:` / `style-nova:` / `style-lyra:` classes appear throughout the
  vendored registry demos. **They are inert** — no such Tailwind variant is
  defined anywhere in this repo or in `shadcn/dist/tailwind.css`, so they emit
  nothing here exactly as they emit nothing in the app. Not a bug.

## Re-sync risks — what can silently go stale

- **`npm run ds:stock` re-vendors the registry.** New or renamed exports change
  `entry.ts`, `compounds.json` and `aliases.json`. Re-run `build-ds.mjs`, then
  `port-examples.mjs` (it never overwrites an existing preview — pass `--force`
  deliberately, and re-grade what it rewrites). A new upstream duplicate name
  fails the build loudly with `[COLLISION]`, which is the intended behaviour.
- **`copy-assets.mjs` is a manual step after `package-build.mjs`.** Forget it
  and the logos break with no warning from validate.
- **The icon set and `JsonLd` are excluded from cards** via
  `componentSrcMap: null` (~31 entries). They remain importable and appear in
  the README index. If `src/components/icons.tsx` gains or loses an icon, that
  list needs regenerating.
- **Playwright/chromium pin.** This run used the repo's `playwright-core`
  1.62.1 with the cached `chromium-1234`, which matched. A repo playwright bump
  that outpaces the cache fails with `Executable doesn't exist`.
- **Preview compilation is slow at scale** — 56 registry previews exceeded a
  10-minute foreground timeout. Run `preview-rebuild.mjs` in the background or
  in chunks.
- **Node version.** `.nvmrc` pins 22; this run used the installed v26 and the
  declaration emit and Tailwind compile were both clean.
- **Changing `cfg.overrides` forces a FULL `package-build.mjs`.** A targeted
  `preview-rebuild.mjs` refuses with `[CONFIG_STALE]` because the full build is
  what re-stamps grade keys. Budget ~30 minutes for the preview compile when
  adding a `cardMode` override, and batch every override change into one pass.
- **Overlays only show their overlay because previews pass `defaultOpen`.**
  `.design-sync/ds/open-overlays.mjs` applies it to the first cell of each of
  the 15 overlay previews and writes the matching `cardMode: single` override.
  Re-run it after `port-examples.mjs --force`, or the dialogs, menus, sheets and
  tooltips all regress to bare trigger buttons.
- **`StockSidebar` cannot be ported by the generic porter.** Its demo renders
  the shell inline instead of listing child demo components, so cell extraction
  picks up icon tags and emits an empty preview. It is hand-maintained as a
  single `AppShell` cell — do not `--force` port over it.

## Close-out record — 2026-08-30

Final full sync completed. Project `6c62f245-61fc-4341-a386-9c5fbb5c9cde`
("Westchase GI"), 97 components.

**Build:** `_ds_bundle.js` 5,402 KB, `window.WestchaseGi`, 489 exports,
72 inlined externals. `_ds_bundle.css` 313 KB. All 97 `.d.ts` parse cleanly.
`_ds_sync.json` anchor matches the bundle; 97 render hashes recomputed clean.

**Render check: 96/97 clean.** `bad: 1, thin: 0, variantsIdentical: 0`,
6 iterations. Reported via `DesignSync report_validate`.

**The one remaining `bad` is triaged, not outstanding:** `LocationMaps` throws
`SecurityError` from Google's sandboxed maps iframe (`Blocked a frame at
https://www.google.com`). The maps themselves render correctly — verified
visually, and `rootEmpty`/`blank`/`thin` are all false. Nothing to fix; the
error is cross-origin frame access we neither cause nor control.

**`TOKENS_MISSING` (19 vars) is a false positive by construction.** Every one
(`--toast-index`, `--accordion-panel-height`, `--drawer-swipe-progress`,
`--toast-swipe-movement-x/y`, `--toast-height`, `--toast-offset-y`,
`--release-row`, …) is set at runtime by JS, which the validator itself calls
out as expected-absent. Do not chase these into `cfg.tokensPkg`.

**Upload shape (503 files + 2 anchors).** Ordering matters and was:
`_ds_needs_recompile` first → 18 (bundle/fonts/images/guidelines/README/styles)
→ 97 `_preview/*.js` → 388 `components/**` in two 194-file chunks →
`_ds_needs_recompile` re-armed → `_ds_sync.json` LAST, alone.
`write_files` caps at 256 files per call.

**Deliberately NOT uploaded** (local-only build artifacts, 124 files): the whole
`_screenshots/` tree plus `.ds-build-meta.json`, `.render-check.json`,
`.resync-verdict.json`, `.review.html`, `.stories-map.json`, `.sync-diff.json`.
The finalized plan's write globs exclude them, so a plan built from a raw
directory walk will try to push them and be rejected — filter first.

**No deletes were needed.** The 28 previously-uploaded components are a strict
subset of the 97; nothing was renamed. `finalize_plan` still *requires* a
`deletes` key — pass `[]`.

**Plan tokens expire.** The mid-sync `planId` was dead by close-out and
`write_files` failed with "Plan token is missing or does not match this
project." Re-run `finalize_plan` with the same globs; it is not an error state.

**App-managed remote files — never delete these:** `Canvas.dc.html`,
`_ds_manifest.json`, `_adherence.oxlintrc.json`, `support.js`. They are created
by the Design System pane, not by this pipeline, and are absent from `ds-bundle/`.
