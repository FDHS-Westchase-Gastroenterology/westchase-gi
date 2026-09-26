# Tokens

A token is a CSS custom property that holds one design decision. This guide says which block may
declare a token, who owns each namespace, and which literals outside the brand `@theme` stay and
why. What the families mean is in [color.md](color.md), [typography.md](typography.md),
[layout.md](layout.md) and [motion.md](motion.md); how recipes and stylesheets use tokens is in
[styling.md](styling.md).

## Token hierarchy

Values enter in one block. Scopes and the semantic bridge name brand tokens and never each other,
so tuning a brand token reaches every register at once.

```text
Brand @theme                   first block of src/app/globals.css
│   --color-* hues and ramps, --font-display, --font-body, --radius-*, --shadow-*,
│   --ease-*, --motion-*, --z-*, --step-*
├── Scopes                     re-tune the brand for one register or surface
│   ├── .portal-scope          --portal-*, --pt-*, --ps-*, --pm-*, and the --btn-* knobs
│   ├── .wgi-home              --wgi-* (home.css)
│   └── portaled Home surfaces .wgi-record-card and .wgi-sheet --wgi-* (home.css)
└── Semantic bridge            last blocks of src/app/globals.css
        @theme inline          --color-primary: var(--primary) …, --font-sans, --font-heading
        :root, .dark           --primary: var(--color-navy) …
```

Recipes, scoped stylesheets and call sites sit below the hierarchy. They name tokens and declare
nothing but a recipe's own knobs.

## Rules

**Literals live in the brand `@theme`.** Every color, font stack, radius, shadow, easing,
duration, z-index and fluid type step is written there once, so tuning one is a one-line change.
A scope writes numbers only for its own scale steps and for knob geometry (`--pt-base: 1.0625rem`,
`--ps-4: 1rem`, `--btn-px: 1.2rem`, `--btn-active-scale: 0.98`) and names a brand token for
everything else (`--pm-exit: var(--motion-exit)`). The bridge names a brand token for every role.
Any other literal is drift unless [Recorded exceptions](#recorded-exceptions) lists it.

**A name never states its value.** A token is named for its job (`--color-teal-ink`, teal tuned
for text on light surfaces) or its rank in a family (`--color-line-2`, `--pt-lg`, `--ps-4`). A name
like `--font-size-17` stops being true the first time the value is tuned.

**Each namespace has one owner.** A declaration outside the owner's block is drift.

| Namespace | Owner, and where it is declared |
| --- | --- |
| `--color-*` hues, `--font-display`, `--font-body`, `--radius-*`, `--shadow-*`, `--ease-*`, `--motion-*`, `--z-*`, `--step-*` | Brand: the `@theme` block |
| `--background`, `--primary`, `--ring`, `--chart-*`, `--sidebar-*` and the other roles | shadcn: `:root` and `.dark` in the bridge |
| `--color-*` role utilities (`--color-primary`), `--font-sans`, `--font-heading` | shadcn: `@theme inline` in the bridge |
| `--font-lato`, `--font-trocchi` and the locale face variables | next/font: `src/lib/fonts.ts` (patient site, review hub), `src/lib/portal-fonts.ts` (portal) |
| `--portal-*`, `--pt-*`, `--ps-*`, `--pm-*` | Staff portal: `.portal-scope` in `globals.css` |
| `--wgi-*` | Staff home: `.wgi-home` and its portaled `.wgi-record-card` and `.wgi-sheet` in `home.css` |
| `--btn-*` | Button recipe knobs, read with fallbacks in `button-variants.ts`. `.portal-scope` assigns eight: radius, both paddings, lift, hover shadow, press scale, duration and ease. The `commit` motion's `--btn-press-*`, `--btn-commit-*` and `--btn-release-duration` are assigned nowhere, so their fallbacks are the values |
| `--tp-row`, `--tp-rows`, `--card-spacing` | TimePicker and Card recipes: set by their own sizes |
| `--overlay-rise`, `--overlay-scale` | The `overlay-rise` keyframes in `@layer components`: set per legacy dialog |
| `--release-row` | The release briefing's stagger index: set inline per row |
| `--normal-bg`, `--normal-text`, `--normal-border`, `--border-radius`, `--width`, `--cell-size`, `--tw-ring-shadow` | Third-party names: Sonner in `toaster.tsx`, the calendar, Tailwind's ring shadow |

A scope never assigns a brand name; the `:lang()` blocks, the staff home's three `.portal-scope`
interaction aliases and the portal's Display P3 layer are the exceptions, recorded below.

**Check the shared `--color-*` namespace before adopting.** shadcn and the brand both declare
`--color-*`, and the later `@theme` block wins without a warning. `--color-muted` is shadcn's
surface tint; the brand's secondary text ink is `--color-muted-ink`. List every `bg-*`, `text-*`
and `border-*` utility a stock component uses and check each name against the brand block first.

**Radius is a known gap.** The brand declares three radii: `--radius-sm` 0.375rem,
`--radius` 0.625rem and `--radius-lg` 0.875rem. Tailwind's defaults still supply `rounded-md`
(0.375rem) and `rounded-xl` (0.75rem), so `rounded-xl` is smaller than `rounded-lg`. Use the three
brand steps ([layout.md](layout.md#shape-and-elevation)); the bridge never re-declares a radius.
[Roadmap item 8](roadmap.md#8-the-radius-ramp) orders the ramp.

## Recorded exceptions

Each literal or assignment below breaks a rule above on purpose or waits on a roadmap item. A
departure missing from this table is drift.

| Where | What | Disposition |
| --- | --- | --- |
| Bridge `.dark` | `--destructive` is an OKLCH literal | Stays: dark mode is not a shipped surface. The light `--destructive` reads `coral-700`. |
| `:lang(vi)`, `:lang(ko)`, `:lang(ar)` | Re-point `--font-display` and `--font-body` | Stays: an island in another language (the review hub shows five on one page) must switch faces, which one class on `<html>` cannot do. |
| Bridge `@theme inline` | `--font-sans` and `--font-heading` repeat the Lato stack | Stays: `--font-sans` is Tailwind's default family and the Toaster's font. `--font-heading` has no rendered consumer. |
| `.portal-scope`; `.portal-workspace` in `portal-workbench.css` | `--portal-canvas` (hex), `--portal-surface`, `--portal-attention-ink` and `--portal-surface-muted` (OKLCH), and `--portal-nav-current`, the sidebar's current row in an off-palette `rgb()` green, are literals | Move into the brand `@theme`: [roadmap item 10](roadmap.md#10-portal-surface-tints). |
| `.wgi-home`, `.wgi-record-card` and `.wgi-sheet` in `home.css` | Home paints, shadows, radii and type sizes; `.wgi-record-card` receives shared frame paints outside `.wgi-home`, and `.wgi-sheet` repeats paints its portal cannot inherit; literal corners, shadows and sizes in Home rules ([layout.md](layout.md#shape-and-elevation), [typography.md](typography.md#recorded-drift)); `.wgi-home` re-points `--portal-canvas` | Stays: these names belong to the staff home and its portaled overlays, with their contrast measurements here. |
| `.portal-scope` in `globals.css` | `--color-mint-hover` (`mint`), `--color-mint-press` (`mint-2` mixed 10% toward `navy`) and `--color-teal-strong` (`teal-ink`) declare `--color-*` names outside the brand `@theme` | Stays: the staff home's hover, press and focus inks from PR #304, set on `<body>` so the portaled card and sheet read them. Whether they join the brand `@theme` is Jason's call; nothing else reads them. |
| `@media (color-gamut: p3)` on `.portal-scope` in `globals.css`, on `.portal-workspace` in `portal-workbench.css`, and on Home's four paint selectors in `home.css` | The Display P3 layer: every brand `--color-*`, the bridge's semantic mappings, and the portal and Home paint literals restated as `color(display-p3 …)` with the channels of their sRGB value | Stays: the Figma file shows each hex as Display P3 on a P3 Mac, and this is how the portal matches it (issue #327). The brand `@theme` keeps the values; the layer derives from them and is regenerated when one changes. Aliases and semantic mappings are declared again because a `var()` resolves where it is declared. See [color.md](color.md#display-p3). |
| `.portal-scope` | `--pm-reduced-duration: 120ms`, `--pm-scrim-duration: 220ms` | Stays until the registry names a reduced-motion cross-fade and a scrim fade: [motion.md](motion.md#recorded-motion-literals). |
| `.portal-scope` | `--btn-radius: 0.5rem` sits off the radius set | [Roadmap item 8](roadmap.md#8-the-radius-ramp). |
| `.portal-scope`; `.wgi-answer` in `home.css` | `--btn-hover-shadow: 0 0 #0000`, `--tw-ring-shadow: 0 0 #0000` | Stays: Tailwind's empty shadow. `none` would invalidate the comma-separated shadow list Tailwind composes. |
| `button-variants.ts` | `wgi` and `commit` knob fallbacks: durations, the -2px lift, press scales, the press inset | The knob pattern stays; the fallback durations are off the registry: [motion.md](motion.md#recorded-motion-literals). |
| The review flyer's `@media print` block in `globals.css` | Hex inks: navy, amber and teal written as hex beside four print-only inks | Stays: the block reproduces the approved EN/ES flyer on letter paper. A screen surface never copies these values. |
| `time-picker-variants.ts`, `toaster.tsx` | `--tp-row` rem heights; Sonner's `--width: 26rem` | Stay: recipe geometry, set once by the component that owns it. |

## Theme model

There is one theme, light, in the practice's palette. Each register assigns it through a scope.

| Register | Scope | What it assigns |
| --- | --- | --- |
| Patient site | the root, no class (`src/app/[locale]/layout.tsx`) | Display serif headings, the fluid `--step-*` type, section rhythm, the button lift. |
| Staff portal | `.portal-scope` on `<body>` (`src/app/admin/layout.tsx`) | Lato only, the closed `--pt-*` and `--ps-*` scales, `--pm-*` motion aliases, the flattened button knobs. |
| Staff home | `.wgi-home` on the section, plus portaled `.wgi-record-card` and `.wgi-sheet` (`home.css`) | The approved Home frame's `--wgi-*` sizes, paints and canvas; its popover and sheet receive their Home paints outside the section. |
| Print | `@page` and `@media print` | Paper: screen chrome hides, scrolled regions open to print every line, backgrounds drop to white. The request detail, the request packet and the review flyer each name their own `@page`. |
| Locale | `:lang(vi)`, `:lang(ko)`, `:lang(ar)` | Font faces, leading, tracking; Arabic reads right to left through `dir`. |

Dark mode is not a shipped surface. The `.dark` mapping exists only so a stray `dark:` utility lands
on brand darks; a real dark theme is a practice decision.

## Reference

- **Color** (`--color-*`): `paper`, `mint`, `mint-2` (surfaces); `navy`, `navy-2`; `teal`,
  `teal-ink`; `amber`, `amber-soft`, `amber-deep`; `ink`, `body`, `muted-ink`, `on-dark`,
  `on-dark-muted` (ink); `line`, `line-2`, `line-3`, `line-dark`. Portal surfaces: `--portal-canvas`,
  `--portal-surface`, `--portal-surface-muted`, `--portal-attention-ink`.
- **Ramps** (`--color-{hue}-{step}`): `navy`, `teal`, `mint`, `amber`, `coral` and `slate`, each at
  steps 50, 100, 200 … 900, 950. A step that is a brand anchor is `var()` of its brand token:
  `navy-800` is `navy` and `navy-900` is `navy-2`; `teal-600` is `teal` and `teal-700` is
  `teal-ink`; `mint-50` is `mint` and `mint-100` is `mint-2`; `amber-100` is `amber-soft`,
  `amber-400` is `amber` and `amber-600` is `amber-deep`; `slate-50` is `paper`, `slate-200` `line`,
  `slate-300` `line-2`, `slate-600` `line-3`, `slate-700` `muted-ink`, `slate-900` `body` and
  `slate-950` `ink`. `slate`, `amber` and `teal` replace Tailwind's default palettes of the same
  names. What each ramp is for is in [color.md](color.md#ramps).
- **Type**: `--font-display`, `--font-body`; patient fluid steps `--step-hero`, `--step-1` to
  `--step-3`, `--step-lead`; portal steps `--pt-2xs`, `--pt-xs`, `--pt-sm`, `--pt-base`, `--pt-lg`,
  `--pt-xl`.
- **Space**: `--ps-1`, `--ps-2`, `--ps-3`, `--ps-4`, `--ps-6`, `--ps-8`, `--ps-12` (portal).
- **Shape and elevation**: `--radius-sm`, `--radius`, `--radius-lg`; `--shadow-soft`,
  `--shadow-card`, `--shadow-popover`.
- **Motion**: `--motion-spring`, `--motion-spring-duration`, `--motion-exit`,
  `--motion-exit-duration`, `--motion-micro-duration`; the staff home's `--motion-standard` over
  `--motion-fast-duration`, `--motion-base-duration`, `--motion-sheet-duration`; `--ease-out-quint`,
  `--ease-out-quart`; portal aliases `--pm-spring`, `--pm-spring-duration`, `--pm-exit`,
  `--pm-exit-duration`, `--pm-reduced-duration`, `--pm-scrim-duration`.
- **Stacking**: `--z-header` 50, `--z-dropdown` 60, `--z-overlay` 70, `--z-drawer` 80.
- **Staff home**: the `--wgi-*` block at the top of `.wgi-home` in `home.css`, each value with its
  source and contrast note.
