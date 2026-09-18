# Color

The palette is restrained: paper, navy ink, and one job for each practice hue. A hue that says
two things stops saying either. Token names and values are in [tokens.md](tokens.md#reference);
type sizes are in [typography.md](typography.md).

## Roles

| Hue | Tokens | Says | Where it paints |
| --- | --- | --- | --- |
| Neutrals | `paper`, `ink`, `body`, `muted-ink`, `line`, `line-2`, `line-3`, `on-dark`, `on-dark-muted`, `line-dark` | Nothing | Headings in `ink`, copy in `body`, secondary text in `muted-ink`; hairlines in `line`, control boundaries in `line-3`; `on-dark` and `line-dark` on navy |
| Navy | `navy`, `navy-2` | Printed ink, the primary action | The task index, the sheet's head rule, a checked choice's dot, the settled stamp, `Button` `default`, the patient footer |
| Teal | `teal`, `teal-ink` | Current, and keyboard focus | `teal-ink` for current text and, through `--ring`, recipe focus rings; `teal` for marks that are not text, such as the field focus halo |
| Amber | `amber`, `amber-soft`, `amber-deep` | Look here | Notices and the attention stamp (`amber-soft` under `ink`), the warm call to action (`Button` `amber`), selected text |
| Mint | `mint`, `mint-2` | You can act here | The wash under a hovered control or row (`mint`) and under an open, pressed or checked one (`mint-2`); saved confirmations; empty states; patient section bands |
| Red | `--destructive` | This input is invalid | `aria-invalid` fields and `FieldError`. `Button` `destructive` has no consumer, and the portal's one removal confirmation (`.portal-confirm-dialog-destructive`) is attention amber. Any other red is drift |

```text
What does the color tell the reader?
├── Nothing: text, a page, a rule                  → a neutral
├── This is the primary action here                → navy (Button default)
├── This is current, or has keyboard focus         → teal-ink text; the --ring ring
├── Look here, or this removes something           → amber-soft under ink; amber-deep marks
├── You can act on this: hovered, open, checked    → a mint wash
├── A request's status                             → StatusBadge (Status stamps)
└── This input is invalid                          → --destructive, with FieldError text
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

## Status stamps

`Badge` (`src/components/ui/badge.tsx`) makes the roles executable, and `StatusBadge`
(`src/app/admin/(portal)/requests/status-badge.tsx`) maps each request status to a variant with
the status label as its words. Use `StatusBadge` for a request; use `Badge` only for a stamp that
is not a request status.

Variants: `attention`, `current`, `settled`, `quiet`. Nothing else exists — an unlisted variant is
a bug, not an option. `variant` is required: there is no default, because a stamp without a
meaning is not a stamp.

- `attention` — `amber-soft` under `ink`. New requests.
- `current` — `mint-2` under `teal-ink`. Contacted requests, being worked.
- `settled` — `navy` under `on-dark`. Scheduled requests.
- `quiet` — `line` under `muted-ink`. Closed requests.

```tsx
// Correct: the status picks the paint; the label is the words
<StatusBadge status={request.status} />
// Correct: a stamp that is not a request status names its role
<Badge variant="attention">Needs a call</Badge>
```

```tsx incorrect
// Incorrect: a paint instead of a role
<Badge className="bg-teal text-white">New</Badge>
// Incorrect: color carrying state alone
<span aria-label="New" className="size-2 rounded-full bg-amber" />
```

## Focus

**Focus is teal.** The patient site draws a 2px `teal-ink` outline at a 3px offset on every
element (`:focus-visible` in `@layer base`). Recipes draw their own ring and set `outline-none`:
`ring-ring/50` on `Button`, `Badge`, `Checkbox`, `Item` and `ScrollArea`; `border-teal-ink` with
`ring-teal/25` on `Input`, `Textarea`, `NativeSelect` and `TimePicker`. New focus styles use a
recipe ring or a `teal-ink` outline.

The portal still paints several focus indicators amber. Each row waits on
[roadmap item 13](roadmap.md#13-the-portal-focus-color).

| Where | Treatment |
| --- | --- |
| `.portal-scope :where(a, button, input, select, textarea, summary)` in `portal-workbench.css`, and three more workbench rules | A 3px `amber-deep` outline at a 3px offset. A recipe inside the portal still shows its teal ring, because `outline-none` sits in the utilities layer, which outranks this components-layer rule; one screen can show both colors. |
| `home.css`: the list viewport, the line trigger, answer rows, the time trigger | A 3px `amber-deep` outline. The filter editor's input underlines in `teal` instead. |
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

## Recorded drift

Counted with `node scripts/design-system-docs.mjs css` on commit e7734a4: color functions and hex
values outside `color-mix()`, and `color-mix()` calls, in declarations that are not custom
properties.

| Stylesheet | Literals | `color-mix()` | Where they sit, and the disposition |
| --- | --- | --- | --- |
| `portal-workbench.css` | 43 | 21 | The printed request sheet's `#172b39` and `#a6b3ba` inks; `.portal-nav-link[aria-current="page"]` in an off-palette green `rgb(80 168 165 / 20%)`; `.portal-request-form-alert` in a second red built from OKLCH literals; the confirm scrim; sidebar text at `rgb(226 239 240 / 58%)`; shadow colors. Mint washes mix at six strengths from 36% to 76%, where Home uses `mint` and `mint-2`. All wait on [roadmap item 10](roadmap.md#10-portal-surface-tints). |
| `globals.css` | 34 | 12 | Most sit in print blocks; the review flyer's inks are a [recorded exception](tokens.md#recorded-exceptions). The rest belong to the legacy feature blocks: [roadmap item 7](roadmap.md#7-the-legacy-feature-blocks) and [item 10](roadmap.md#10-portal-surface-tints). |
| `home.css` | 5 | 9 | Two shadow colors and three white alphas in the approved Home frame, plus 25 literals inside its custom properties: a [recorded exception](tokens.md#recorded-exceptions). |
