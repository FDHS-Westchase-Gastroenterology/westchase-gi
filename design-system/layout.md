# Layout

Space, page structure, radius and elevation for both registers. Token names are listed in
[tokens.md](tokens.md#reference); what a surface's color says is in [color.md](color.md).

## Space

**Portal: seven steps.** `.portal-scope` declares `--ps-1` 0.25rem, `--ps-2` 0.5rem, `--ps-3`
0.75rem, `--ps-4` 1rem, `--ps-6` 1.5rem, `--ps-8` 2rem and `--ps-12` 3rem. A space between two
steps does not exist; a layout that wants one is a hierarchy question, not a spacing one.

**Space groups; hairlines divide.** The scale's own comment states the rule: space, not color,
performs grouping. Lines that belong together sit a small step apart, and the next group starts
after a `line` hairline and a larger step.

```text
How is this content set apart from its neighbor?
├── It belongs to the same group → a small --ps-* gap
├── It starts the next group     → a line hairline and a larger --ps-* step
├── It is paper on the page      → --portal-surface on --portal-canvas, no shadow
└── It floats above the page     → a shadow (Shape and elevation)
```

**Patient site: Tailwind spacing utilities inside a component, layout classes around it.**

| Class | Value | Use |
| --- | --- | --- |
| `.section` | block padding `clamp(3.25rem, 6.5vw, 6.5rem)` | A page band |
| `.section-sm` | block padding `clamp(2.25rem, 4.5vw, 4rem)` | A short band |
| `.container-x` | 76rem wide at most, inline padding `clamp(1.25rem, 4vw, 3rem)` | The page width |
| `.container-tight` | 48rem wide at most, the same padding | Prose |

Print collapses `.section` and `.section-sm` to 0.75rem of block padding.

## Page structures

**Patient page.** `Header` → `PageHero` → `.section` bands, some on `mint` → a `TextBand` call to
action → `Footer`. Every section offers one clear action and a short path to the phone, the forms,
the portal and directions ([PRODUCT.md](../PRODUCT.md)).

**Portal page.** At 60rem and wider, a 17rem task index (`.portal-sidebar`: Home, Requests,
Settings, Help) sits beside the work; narrower, the same four destinations become a bar fixed to
the bottom of the screen. Work sits in `.portal-content`, 92rem wide at most, as paper
(`--portal-surface`) on `--portal-canvas`, divided by hairlines.

**The staff home request list is sized to the viewport, not to a row count.** On Home the content
column fills the viewport, and `line-list.tsx` composes one floating surface: `Card` →
`ScrollArea`, whose `ScrollAreaViewport` is a named, focusable region → `Table` under a sticky
`TableHeader` → a `CardFooter`. The card takes the height the header and filters leave, so the rows
scroll inside it and the page does not move. It is never shorter than the column labels, six and a
half rows and the footer, so a short window scrolls the page instead of crushing the list. A drawn
rail inside the card tracks the scroll, and the footer names the rows fully in view ("1–12 of 40").
Print drops the rail and the shadow and lets the viewport grow to every line.

## Shape and elevation

**Three radii, by what the shape holds, and a pill.**

| Radius | Value | Holds | Worn by |
| --- | --- | --- | --- |
| `--radius-sm` (`rounded-sm`) | 0.375rem | A control or a mark inside a surface | `Input`, `Textarea`, `NativeSelect`, `TimePicker`; Home's triggers, answer rows (`.wgi-answer`) and Overdue stamp (`.portal-stamp`); the skip link |
| `--radius` (`rounded`) | 0.625rem | A button; portal paper, and a portal menu, popover or toast | `Button`, which the portal retunes to 0.5rem through `--btn-radius` ([recorded exception](tokens.md#recorded-exceptions)); `.portal-queue-workbench`, `.portal-request-record`, `.portal-account-menu > div`, `.wgi-popover`, `Toaster` |
| `--radius-lg` (`rounded-lg`) | 0.875rem | A card, a choice card, an image, a modal, a patient-site menu | `.card`, `AuthCard`, `Item`, a `FieldLabel` that wraps a `Field`, patient images and tiles, `Header` navigation menus, `.portal-confirm-dialog`, the tour dialog |
| `rounded-full` or 999px | A pill | A badge, a count, a chip, a bullet, a scroll thumb | `Badge`, the `ScrollArea` thumb, `.wgi-pill`, `.portal-nav-count`, list bullets |

```text
What does the shape hold?
├── A field, trigger, answer row or Overdue stamp inside a surface → --radius-sm
├── A button; portal paper; a portal menu, popover or toast         → --radius
├── A card, choice card, Item, image, modal or patient-site menu    → --radius-lg
└── A badge, count, chip, bullet or scroll thumb                    → rounded-full
```

**Use the brand names, never Tailwind's defaults.** Name a step as `rounded-sm`, `rounded`,
`rounded-lg` or `rounded-[var(--radius-lg)]`. Tailwind still supplies `rounded-md`, which renders
the `rounded-sm` corner under a name the brand does not own, and `rounded-xl`, a 0.75rem corner
the brand does not have.

```tsx
// Correct: a brand step by name; the shadow is the card's edge
<div className="rounded-[var(--radius-lg)] bg-white shadow-[var(--shadow-card)]" />
```

```tsx incorrect
// Incorrect: Tailwind's rounded-xl, and a border beside the card's shadow
<div className="rounded-xl border border-[var(--color-line-2)] bg-white shadow-[var(--shadow-card)]" />
```

**A shadow marks a layer above the page.** Paper resting on the canvas is flat, and hairlines
divide it. Each shadow token has one role, and a surface wears one at a time.

| Shadow | Role | Worn by |
| --- | --- | --- |
| `--shadow-soft` | A tile or control that lifts | `Button` `default` and `amber` on hover; the patient home's wayfinding tiles and physician cards, which also rise 4px on hover; office gallery images; `LocationMaps` |
| `--shadow-card` | A card, image or modal lifted off the page | Patient images, the physicians page's navy panel, `AuthCard`, `.card`, `ProfileCardViewer`'s shell and toolbar, `Header` menus, the tour dialog, `.portal-confirm-dialog`, `.wgi-time-sheet` |
| `--shadow-popover` | A layer floating over same-white paper, where `--shadow-card`'s negative spread would hide inside the paper's edge | `.wgi-popover`, `Toaster` |

**A card's shadow is its edge; a portal layer floating over paper adds a hairline.** A card or
modal never pairs its shadow with a border: `AuthCard` removes the `Card` ring, `.wgi-list-card`
draws no stroke ("the lift is the edge"), and `.portal-confirm-dialog` sets `border: 0`. A portal
menu, popover, sheet, shelf or toast draws a `line` or `line-2` hairline beside its shadow, as the
approved Home frame does: `.wgi-popover`, `.wgi-sheet`, `.wgi-time-sheet`, `Toaster`, the account
menu and the commit shelf.

**An inset shadow is a drawn line, not elevation.** `Button` `outline` and `ghost-light` draw
their 1.5px boundary as an inset shadow, the `commit` press adds inset depth, and Home paints its
row tints the same way. None of them lifts a surface.

**Recorded drift.** Counted with `node scripts/design-system-docs.mjs css` on commit e7734a4, and
by searching `rounded-*` and `shadow-*` classes under `src`.

| Where | What | Disposition |
| --- | --- | --- |
| `portal-workbench.css` spacing | 233 of 273 margin, padding and gap declarations are literal rem; 16 read only `--ps-*` | [Roadmap item 2](roadmap.md#2-workbench-tokenization) |
| `portal-workbench.css` radii | Seven literals from 0.35rem to 0.7rem: nav links, the sidebar mark, tools and account actions, the account menu's summary, the mobile brand mark, loading placeholders | [Roadmap item 8](roadmap.md#8-the-radius-ramp) |
| `portal-workbench.css` shadows | `.portal-sidebar` at both widths, `.portal-account-menu > div` and `.portal-commit-shelf` write literal shadows | [Roadmap item 10](roadmap.md#10-portal-surface-tints) |
| `.portal-panel`, `.portal-help`, `.portal-flyer-list` in `globals.css` | A `line-2` border box at 0.75rem around the settings managers, the help page and the flyer list | The box: [roadmap item 1](roadmap.md#1-card-surfaces); the radius: item 8 |
| `Header.tsx`, `NoticeBanner.tsx`, `ProfileCardViewer.tsx` | `rounded-md` (eleven in `Header`, one in `NoticeBanner`); the language menu's `rounded-[var(--radius-md)]`; `rounded-[5px]` | [Roadmap item 8](roadmap.md#8-the-radius-ramp) |
| `ui/card.tsx`, `ui/checkbox.tsx` | `rounded-xl` on the card, its header and footer; the registry's `rounded-[4px]` checkbox, smaller than any step | [Roadmap item 8](roadmap.md#8-the-radius-ramp) |
| Base `:focus-visible` in `globals.css` | A 3px radius | [Roadmap item 8](roadmap.md#8-the-radius-ramp) |
| `.release-signal`, `.release-summary`, `.language-dialog` in `globals.css` | `calc()` offsets of `--radius-sm` and a border paired with a shadow on the release signal; literal shadows on the summary and the dialog | [Roadmap item 7](roadmap.md#7-the-legacy-feature-blocks) |
| The shadow tokens' comment in the brand `@theme` | Says a shadow is never paired with a visible border, while six portal floating layers pair one | An open decision on the comment's scope: [roadmap item 10](roadmap.md#10-portal-surface-tints). Until it is settled, follow the rule above, which the approved Home frame sets. |
| `home.css` | 93 of 141 spacing declarations literal rem; `--wgi-row-radius`, `--wgi-badge-radius`, the 1.4375rem list card, the 6px rail and thumb; `--wgi-card-shadow`, `--wgi-cmd-shadow`, the filter and sheet shadows | Stays: the approved Home frame ([recorded exceptions](tokens.md#recorded-exceptions)) |
| The review flyer's `@media print` block in `globals.css` | 14pt and 6pt corners | Stays: the block reproduces the approved flyer on letter paper ([recorded exceptions](tokens.md#recorded-exceptions)) |
