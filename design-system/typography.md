# Typography

Two registers share one family system. The patient site pairs a display serif with a sans body on
a fluid scale. The staff portal sets everything in the sans on a fixed scale. Token names are
listed in [tokens.md](tokens.md#reference); text color is [color.md](color.md).

## Families

`--font-display` is the serif and `--font-body` the sans. The faces behind them are next/font
variables, and the `:lang()` blocks in `src/app/globals.css` swap them per locale.

| Locale | `--font-display` | `--font-body` | Script adjustments |
| --- | --- | --- | --- |
| EN, ES | Trocchi | Lato | none |
| VI | Aleo | Be Vietnam Pro | none |
| KO | Noto Serif KR | Noto Sans KR | `word-break: keep-all`, so Hangul words stay whole |
| AR | Noto Naskh Arabic | Noto Sans Arabic | line-height 1.75; right to left through `dir` |

Choose the family by register, never by taste:

```text
Is the text inside .portal-scope (every /admin page)?
├── Yes → --font-body: headings, labels, data, controls
│         The serif appears only in the brand mark (Recorded exceptions)
└── No, a patient-site page
    ├── h1–h3, .display → --font-display at 400 (the element defaults set both)
    └── everything else → --font-body
```

**The portal is Lato only.** Operational content never wears the display serif. The portal's heading
reset, `.portal-scope :where(h2, h3, h4, h5)`, covers h2 to h5, so a portal `h1` names
`--font-body` in its own rule, as `.wgi-home .portal-sheet-day` does in `home.css`.

## Sizes

**Patient site: fluid steps.** Each step is a brand token on a ratio of at least 1.25.

| Token | Value | Helper |
| --- | --- | --- |
| `--step-hero` | `clamp(2.4rem, 1.35rem + 4vw, 4rem)` | `.display` (line-height 1.06, -0.015em) |
| `--step-1` | `clamp(2rem, 1.5rem + 2.2vw, 3rem)` | `.h1` |
| `--step-2` | `clamp(1.6rem, 1.3rem + 1.4vw, 2.25rem)` | `.h2` |
| `--step-3` | `clamp(1.3rem, 1.12rem + 0.8vw, 1.6rem)` | `.h3` |
| `--step-lead` | `clamp(1.1rem, 1.02rem + 0.4vw, 1.28rem)` | `.lead` (line-height 1.6) |

Body text is 1.0625rem / 1.65 on `body`, a 17px floor for an older audience. `.measure` (68ch)
and `.measure-sm` (54ch) cap line length. Print shrinks `.h1` to 20pt and `.lead` to 11.5pt.

**Staff portal: fixed steps, never fluid.** `.portal-scope` declares six rem steps, a 1.2 ratio on
a 15px floor. A `clamp()` never sets a portal size: a fluid heading is what let a count sentence
outrank the page title.

| Token | Value | Role |
| --- | --- | --- |
| `--pt-2xs` | 0.6875rem | tracked uppercase column heads |
| `--pt-xs` | 0.8125rem | meta and timestamps |
| `--pt-sm` | 0.9375rem | the body floor |
| `--pt-base` | 1.0625rem | the datum on a line, such as a patient's name |
| `--pt-lg` | 1.25rem | group headings |
| `--pt-xl` | 1.75rem | the sheet's day |

A size between two steps does not exist; a heading that wants one is a hierarchy question. The
staff home is the recorded exception: the approved Home frame sets its date at 2.25rem / 1.1 with
-0.015em tracking, and its 18.5px name, 15.5px phone and 14.5px table-heading sizes as `--wgi-*`
tokens in `home.css`, read nowhere else.

## Weights

**Request only a loaded face.** `.portal-scope` sets `font-synthesis: none`, so the browser never
fakes a weight: it substitutes the nearest loaded face, and the number in the stylesheet stops
describing the screen.

| Register | Loaded faces | Loaded by |
| --- | --- | --- |
| Patient site | Lato 400, 700, 900; Trocchi 400; Be Vietnam Pro 400, 700, 900; Aleo 400; the Noto families | `src/lib/fonts.ts` |
| Staff portal | Lato 400, 500, 600, 700, self-hosted; Trocchi 400 for the brand mark | `src/lib/portal-fonts.ts` |

The portal's four weights follow the selected
[calmer Lato treatment](https://www.figma.com/design/GrBLYZSAxioZ8syWPHChlb?node-id=44-260).
Hierarchy comes from size and space, not from heavier weights.

```text
What does the portal text do?
├── Supports: meta, helper text, a lede        → 400
├── Greets, or heads a table column            → 500
├── Names a person, labels a field, is a control → 600
└── Heads the page or a prominent group         → 700
```

```css
/* Correct (portal-workbench.css): a closed step and a loaded weight */
.portal-sheet-greeting {
  color: var(--color-muted-ink);
  font-size: var(--pt-sm);
  font-weight: 400;
}
```

```css incorrect
/* Incorrect (recorded drift, portal-workbench.css): 800 is not loaded, so 700 renders */
.portal-sheet-notice h2 {
  font-size: var(--pt-lg);
  font-weight: 800;
}
/* Incorrect (recorded drift): a fluid portal size */
.portal-page-title {
  font-size: clamp(1.75rem, 5vw, 2.4rem);
}
```

## Numerals and tracking

- **Counts, phone numbers, dates and times use tabular numerals** (`tabular-nums`, or
  `font-variant-numeric: tabular-nums` in a stylesheet), so a column of times aligns and a
  changing count does not shift its neighbors.
- **Negative tracking is a Latin-only affordance.** Patient headings track -0.01em and `.display`
  -0.015em. `:lang(ko)` and `:lang(ar)` reset heading tracking to 0 and open heading leading to
  1.3, because tightened Hangul and Arabic collide. The portal heading reset also sets tracking to 0.
- **Names keep normal tracking** in the portal; only the Home date tightens.

## Recorded exceptions

| Where | What | Disposition |
| --- | --- | --- |
| `.portal-sidebar-mark`, `.portal-mobile-brand > span` in `portal-workbench.css` | The practice monogram in the display serif | Stays: a brand mark, not operational content. |
| `.portal-print-sheet-header p` in `portal-workbench.css` | The printed sheet's practice line in the display serif | The serif stays as a brand mark on paper; its 650 weight is counted in the drift below. |
| `--wgi-*` sizes in `home.css` | Three sizes between `--pt-*` steps and a 2.25rem date | Stays: the approved Home frame. |

## Recorded drift

Measured on commit e7734a4 with the compiled stylesheet in headless Chromium at 1440 and 390 wide,
and by counting `font-weight` values and `font-[NNN]`, `font-extrabold` and `font-black` classes
under `src/app/admin`. Each row waits on
[roadmap item 12](roadmap.md#12-portal-type-weights-and-heading-family).

| Where | Measured | Consequence |
| --- | --- | --- |
| `.portal-queue-title`, the Requests page `h1` | Computed family is the display serif; 880 requested | Trocchi renders at 400, the only face loaded. |
| `.portal-page-title` | `clamp(1.75rem, 5vw, 2.4rem)`: 38.4px at 1440, 28px at 390; 900 requested | A fluid heading at a weight that renders as 700. |
| `.portal-auth-title` in `globals.css` | 900 requested | Renders as 700. |
| 93 weight requests outside 400 to 700 in 13 files | 900 ×41, 800 ×23, 850 ×8, 740 ×5, 780 ×4, and twelve more between 650 and 880 | Each renders as the nearest loaded face, mostly 700. `portal-workbench.css` holds 57 and `help/page.tsx` 14. |
