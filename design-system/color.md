# Color

The palette is restrained: paper, navy ink, and one job for each practice hue. A hue that says
two things stops saying either. Token names and values are in [tokens.md](tokens.md#reference);
type sizes are in [typography.md](typography.md).

## Roles

| Hue | Tokens | Says | Where it paints |
| --- | --- | --- | --- |
| Neutrals | `paper`, `ink`, `body`, `muted-ink`, `line`, `line-2`, `line-3`, `on-dark`, `on-dark-muted`, `line-dark`; the `slate` ramp names the scale they sit on | Nothing | Headings in `ink`, copy in `body`, secondary text in `muted-ink`; hairlines in `line`, control boundaries in `line-3`; `on-dark` and `line-dark` on navy |
| Navy | `navy`, `navy-2` | Printed ink, the primary action | The task index, the sheet's head rule, a checked choice's dot, the settled stamp, `Button` `default`, the patient footer |
| Teal | `teal`, `teal-ink` | Current, and keyboard focus | `teal-ink` for current text and, through `--ring`, recipe focus rings; `teal` for marks that are not text, such as the field focus halo; the contacted stamp's teal glass |
| Amber | `amber`, `amber-soft`, `amber-deep` | Look here | Notices and the attention stamp (amber glass under `navy-900`), the warm call to action (`Button` `amber`), selected text |
| Mint | `mint`, `mint-2` | You can act here; settled | The wash under a hovered control or row (`mint`) and under an open, pressed or checked one (`mint-2`); saved confirmations; empty states; patient section bands. As glass, mint is settled: the scheduled stamp |
| Coral | `--destructive` (`coral-700`), `coral-600` | This input is invalid | `aria-invalid` fields and `FieldError`, in `coral-700`; `coral-600` only for borders and marks, never text. `Button` `destructive` has no consumer, and the portal's one removal confirmation (`.portal-confirm-dialog-destructive`) is attention amber. Any other red is drift |

```text
What does the color tell the reader?
├── Nothing: text, a page, a rule                  → a neutral
├── This is the primary action here                → navy (Button default)
├── This is current, or has keyboard focus         → teal-ink text; the --ring ring
├── Look here, or this removes something           → amber glass or amber-soft; amber-deep marks
├── You can act on this: hovered, open, checked    → a mint wash
├── A request's status                             → StatusBadge (stamps.md)
└── This input is invalid                          → --destructive (coral), with FieldError text
```

**Color never carries state alone.** A stamp always carries words; an error always has text.

**Amber text is chosen by size.** Measured from the OKLCH tokens against the portal canvas, the
portal surface, `paper`, the Home canvas, white and `mint`:

| Color | Contrast on those surfaces | Use it for |
| --- | --- | --- |
| `teal-ink` | 6.2 to 7.0 | Text at any size |
| `--portal-attention-ink` | 5.4 to 6.2 | Amber text at any size in the portal |
| `teal` | 3.4 to 3.9 | Rings and marks, never text |
| `amber-deep` | 3.3 to 3.7 | Large text (24px, or 18.7px bold), borders, hairline markers |
| `amber` | 1.8 to 2.0 | A fill behind `navy-2` text; never text or a line on a light surface |

**The warm call to action is rare.** On the patient site `Button` `amber` is the one warm action in
a section. In the portal the primary action is navy `default`. Four occasional portal panels use
`amber` for their one onward action: the help page, the release briefing, the tour's last step and
the flyer printer. They are recorded, not a pattern; new portal work uses `default`.

## Ramps

Six ramps carry each hue from step 50 (lightest) to 950 (deepest) as `--color-{hue}-{step}`
([tokens.md](tokens.md#reference)). They were generated in OKLCH and match the Figma variable
collection "WGI · Ramps". Four extend the brand hues: `navy`, `teal`, `mint` and `amber`. `coral` is
the warm red that belongs with the brand, and `slate` names the neutrals the brand already uses.
Every brand token sits on its step at its own value.

A ramp step inherits its hue's role: a `teal` step still says current, an `amber` step still says
look here. Reach for a step when a surface needs a tint the named tokens do not cover, such as the
two ends of a gradient; keep the named token where one exists.

## The glass gradient

One rule for every tinted surface that should read as a raised object: a status stamp, an applied
filter, any new tinted chip.

| Part | Rule |
| --- | --- |
| Fill | A vertical linear gradient, step *n* at the top to step *n+1* at the bottom |
| Highlight | `inset 0 1px 0` white, at 0.55 to 0.8 |
| Stroke | One step deeper than the bottom of the fill |
| Ink | The first step that clears 4.5:1 against both ends of the fill |

Loudness comes from where the gradient sits on the ramp, not from adding a hue: the New stamp's
`amber-300` → `amber-400` is louder than the Contacted stamp's `teal-100` → `teal-200`. A surface
that should recede is a ghost: no fill and no highlight, a `slate-300` outline around `slate-700`
words, so it still has an edge and never becomes color alone.

The staff home's applied filter pill is navy glass: `navy-50` → `navy-100` under a 1.2px `navy-800`
stroke and a white 0.8 highlight, with the key in `navy-700` (5.3 to 5.8), the value in `slate-950`
and the remove mark in `navy-800`. A suggestion beside it stays dashed and unfilled, so applied and
suggested differ in fill, border style and ink.

## Focus

**Focus is teal.** The patient site draws a 2px `teal-ink` outline at a 3px offset on every element
(`:focus-visible` in `@layer base`). Recipes draw their own ring and set `outline-none`:
`ring-ring/50` on `Button`, `Badge`, `Checkbox`, `Item` and `ScrollArea`; `border-teal-ink` with
`ring-teal/25` on `Input`, `Textarea`, `NativeSelect` and `TimePicker`. The staff home, its popovers
and its sheet draw one `teal` ring in unlayered `home.css`: a 2px `--portal-surface` gap and a 2px
band as `box-shadow`, restated inset where a control clips it (the list viewport, pills, answer and
editor rows) and as a `teal-strong` underline on the filter search. New focus styles use a recipe
ring or a `teal-ink` outline; a Home control copies the Home ring.

The portal still paints several focus indicators amber. Each row waits on
[roadmap item 13](roadmap.md#13-the-portal-focus-color).

| Where | Treatment |
| --- | --- |
| `.portal-scope :where(a, button, input, select, textarea, summary)` in `portal-workbench.css`, and three more workbench rules | A 3px `amber-deep` outline at a 3px offset. A recipe inside the portal still shows its teal ring, because `outline-none` sits in the utilities layer, which outranks this components-layer rule; one screen can show both colors. |
| `call-again-fieldset.tsx` | A 3px `amber` outline when a link lands focus on the correction group; the reopen group uses `teal-ink`. |

Contrast does not decide between them: on portal surfaces `amber-deep` measures 3.3 to 3.7 and
`teal` 3.4 to 3.9, both above the 3:1 a focus indicator needs, while `amber` measures 1.8 to 2.0.
Meaning does: amber already says "look here".

## Selection

**Selected text is amber.** The base `::selection` mixes 45% `amber` into white under `ink`;
`.portal-scope ::selection` uses `amber-soft` under `navy-2`.

## Surfaces

- **Patient site.** `paper` behind the page, `mint` section bands, white cards (`bg-white`),
  and `navy-2` under the footer with `on-dark-muted` text.
- **Staff portal.** `--portal-canvas` behind the work, `--portal-surface` for the paper the work
  sits on, `--portal-surface-muted` for a recessed well, `--portal-attention-ink` for amber text.
  The staff home re-points `--portal-canvas` for its own frame
  ([tokens.md](tokens.md#recorded-exceptions)). These four are OKLCH literals inside the scope:
  [roadmap item 10](roadmap.md#10-portal-surface-tints).
- **On navy.** `on-dark` for text, `on-dark-muted` for secondary text (4.5:1 or more on navy),
  `line-dark` for hairlines. White at an alpha is a keyword color, not drift.

## Display P3

The portal's Figma file has no color profile, so on a Display P3 Mac it shows each hex as a P3
color, richer than the browser's sRGB reading. On a wide-gamut screen `@media (color-gamut: p3)`
restates every color the portal paints as `color(display-p3 r g b)` with the channels of its sRGB
value (`navy-2`, `#1f374e`, becomes `color(display-p3 0.122 0.216 0.306)`); OKLCH anchors use the
pixel Chrome paints for them. `.portal-scope` restates the brand `--color-*` names, re-declares the
ramp aliases and the bridge's semantic mappings (a `var()` resolves where it is declared) and the
`--portal-*` literals; `home.css` restates the `--wgi-*` literals. sRGB screens and the patient site
are unchanged ([tokens.md](tokens.md#recorded-exceptions)). White, low-alpha shadows, print colors,
the form reds and the scrim stay sRGB. A new portal color is a custom property with a P3 line
beside the others. Every AA pair holds; the largest drop is `coral-700` on white, 6.70 to 6.50.

## Recorded drift

Counted with `node scripts/design-system-docs.mjs css` with 174f10e merged: color functions and hex
values outside `color-mix()`, and `color-mix()` calls, in declarations that are not custom
properties.

| Stylesheet | Literals | `color-mix()` | Where they sit, and the disposition |
| --- | --- | --- | --- |
| `portal-workbench.css` | 43 | 21 | The printed request sheet's `#172b39` and `#a6b3ba` inks; `--portal-nav-current`, the current sidebar row, in an off-palette green `rgb(80 168 165 / 20%)`; `.portal-request-form-alert` in a second red built from OKLCH literals; the confirm scrim; sidebar text at `rgb(226 239 240 / 58%)`; shadow colors. Mint washes mix at six strengths from 36% to 76%, where Home uses `mint` and `mint-2`. All wait on [roadmap item 10](roadmap.md#10-portal-surface-tints). |
| `globals.css` | 34 | 12 | Most sit in print blocks; the review flyer's inks are a [recorded exception](tokens.md#recorded-exceptions). The rest belong to the legacy feature blocks, among them `.list-avoid`'s red cross (`oklch(0.5 0.19 25)`, the same red as the workbench alert): [roadmap item 7](roadmap.md#7-the-legacy-feature-blocks) and [item 10](roadmap.md#10-portal-surface-tints). |
| `home.css` | 9 | 8 | Two shadow colors, three white alphas and four `#fff` fallbacks behind the teal focus ring in the approved Home frame, plus 36 literals inside its custom properties, including shared paints for the portaled `.wgi-record-card` and the `.wgi-sheet`'s own paints: a [recorded exception](tokens.md#recorded-exceptions). |

Route files carry one more: the invalid-field red `aria-[invalid=true]:border-[oklch(0.5_0.19_25)]`,
with a background mixed from a second OKLCH literal, in `outcome-choice-list.tsx`'s `fieldClass`
(`#L84`) and `call-again-fieldset.tsx#L114`. An invalid field is `--destructive`'s job
([Roles](#roles)); these move onto it with [roadmap item 3](roadmap.md#3-choice-lists).
