# Styling

Three mechanisms, each with one job, and a fourth for what the three cannot express. Mixing them
produces a class for every call site and paint that no recipe owns.

## Styling model

1. **Tokens** hold decisions. CSS custom properties in `src/app/globals.css`, declared in
   Tailwind v4 `@theme` so every token is also a utility (`bg-navy`, `text-muted-ink`,
   `rounded-lg`, `ease-[var(--motion-exit)]`). See [tokens.md](tokens.md).
2. **Recipes** hold component appearance. One `cva` definition per component in
   `src/components/ui/`, written as arrays — one string per job, each under a comment naming the
   job — with decoupled axes and brand defaults. See [components.md](components.md).
3. **Call-site utilities** hold layout. `className` on a component instance sets width, gap,
   grid, alignment, margin and responsive placement. It never sets the component's own color,
   type, radius, shadow or motion: a different paint is a variant, a different feel is a
   temperament or a scope knob. The call sites that still do are
   [recorded](#recorded-call-site-restyles).
4. **Scoped CSS** is the last resort, for composition that utilities and recipes cannot
   express: print layouts, `::backdrop`, `@starting-style` entrances, a primitive's state
   attributes. The portal's sheet is `src/app/admin/portal-workbench.css`; the staff home's is
   `home.css` beside its route. A rule that carries a literal color, a raw `rem` step, or a
   component's look is drift; [roadmap.md](roadmap.md) lists what is being extracted.

## What a recipe or scoped rule may name

Literals live only in the brand `@theme`. A recipe or a scoped rule names a token for every
color, radius, shadow, font family, easing and duration. Two kinds of token utility are correct:

- a brand utility, which names the hue: `bg-navy`, `text-muted-ink`, `border-line-2`;
- a semantic utility, which names the role and reaches the brand through the bridge: `bg-card`,
  `bg-primary`, `ring-ring`.

The `ui/` recipes use both. `text-muted-foreground` is the semantic text ink; `bg-muted` is a
surface tint, not text, because shadcn owns `--color-muted` and the brand's secondary ink is
`--color-muted-ink`. Check every semantic utility a stock component brings for that collision.

Geometry that has no token is written once, in the recipe that owns it: `border-[1.5px]` on
fields, a component's own type size such as the Button `sm` size's `text-[0.9rem]`. White is the
CSS keyword, not a brand token: `bg-white` paints fields and patient-site cards.

```tsx
// Correct (ui/button-variants.ts): a brand paint by name; a knob with a fallback where a scope retunes
"bg-amber text-navy-2",
"hover:bg-[color-mix(in_oklch,var(--color-amber)_90%,white)] hover:shadow-[var(--btn-hover-shadow,var(--shadow-soft))]",
"transition-[background-color,border-color,color,translate,scale] duration-[var(--btn-duration,200ms)] ease-[var(--btn-ease,var(--ease-out-quint))]",
```

```tsx incorrect
// Incorrect: a literal hue where navy is meant
"bg-[#2e4a61] text-white",
// Incorrect (recorded drift, ui/input.tsx): a duration and curve no temperament names
"transition-[border-color,box-shadow] duration-200 ease-[ease]",
```

Recorded departures in recipes, each with its disposition:

- `ui/input.tsx`, `ui/textarea.tsx`, `ui/native-select.tsx`: the `wgi` motion is
  `duration-200 ease-[ease]`, off the registry ([motion.md](motion.md#recorded-motion-literals)).
- `ui/item.tsx`: the base string carries `transition-colors duration-100`, and base strings
  carry no motion ([motion.md](motion.md#recorded-motion-literals)).
- `ui/button-variants.ts`: the `wgi` and `commit` knob fallbacks write their own durations
  ([motion.md](motion.md#recorded-motion-literals)). `ghost-light` writes its inset stroke as an
  `rgba()` white; it stays, because white is a keyword color and the stroke needs an alpha.
- `ui/card.tsx` `rounded-xl` (Tailwind's 0.75rem) and `ui/checkbox.tsx` `rounded-[4px]` sit off
  the radius set ([roadmap item 8](roadmap.md#8-the-radius-ramp)).

## Recorded call-site restyles

The call sites below set a `ui/` component's paint, type, shape or motion, against point 3 of the
model. Each keeps its look until the roadmap item beside it lands; none is a pattern to copy. A new
look is a recipe option, not a row.

```tsx
// Correct (reset-request-form.tsx): the variant picks the look; the call site sizes and places it
<Button type="button" variant="outline" onClick={changeEmail} className="min-h-11 w-full">
```

```tsx incorrect
// Incorrect (recorded drift, staff-manager.tsx): a disabled strength the recipe does not own
<Button type="submit" disabled={pending} className="self-end disabled:opacity-60">
```

The census, on commit e7734a4, is every literal class in `src/**/*.tsx` outside `ui/` and
`stock/` that sets a look on an element imported from `ui/`, beside a call to a `ui/` recipe as
in `cn(buttonVariants(), "bg-white")`, or in a recipe call's `className`.
`npm run design-system:check` repeats it and fails on a restyle this table does not hold or a row
the code no longer matches.

| Component | Classes | Call sites | Disposition |
| --- | --- | --- | --- |
| `Card` | `rounded-[var(--radius-lg)]` `bg-white` `text-base` `leading-[1.55]` `shadow-[var(--shadow-card)]` `ring-0` | `auth-card.tsx` | [Item 1](roadmap.md#1-card-surfaces) |
| `CardDescription` | `text-[0.9rem]` `text-[var(--color-muted-ink)]` | `auth-card.tsx` | [Item 1](roadmap.md#1-card-surfaces) |
| `Button` | `disabled:opacity-60` | `call-again-fieldset.tsx`, `request-notes.tsx`, `workflow-panel.tsx`, `staff-request-form-footer.tsx`, `recipients-manager.tsx`, `maintainer-access.tsx`, `staff-manager.tsx` | [Item 17](roadmap.md#17-call-site-restyles) |
| `Button` | `aria-disabled:opacity-60` | `request-current-feedback.tsx`, `print-controls.tsx` | [Item 17](roadmap.md#17-call-site-restyles) |
| `buttonVariants` | `aria-disabled:opacity-60` | `print-chooser.tsx`, `review-flyer-printer.tsx` | [Item 17](roadmap.md#17-call-site-restyles) |
| `Button` | `disabled:opacity-65` | `confirm-form.tsx`, `reset-request-form.tsx`, `password-form.tsx` | [Item 17](roadmap.md#17-call-site-restyles) |
| `Button` | `disabled:opacity-70` | `AppointmentForm.tsx` | [Item 17](roadmap.md#17-call-site-restyles) |
| `Button` | `disabled:opacity-100` | `login-form.tsx` | [Item 17](roadmap.md#17-call-site-restyles) |
| `Button` | `transition-transform` `duration-150` `active:scale-[0.97]` `motion-reduce:transition-none` `motion-reduce:active:scale-100` | `request-notes.tsx` | [Item 16](roadmap.md#16-motion-literals) |
| `buttonVariants` | `bg-white` | `ReviewHub.tsx` | [Item 17](roadmap.md#17-call-site-restyles) |
| `TableCell` | `text-[var(--color-body)]` | `audit/page.tsx`, `release-engagement.tsx` | [Item 17](roadmap.md#17-call-site-restyles) |
| `TableCell` | `text-[var(--color-muted-ink)]` | `audit/page.tsx` | [Item 17](roadmap.md#17-call-site-restyles) |
| `TableCell` | `font-bold` `text-[var(--color-ink)]` | `audit/page.tsx` | [Item 17](roadmap.md#17-call-site-restyles) |
| `TableRow` | `text-[0.88rem]` | `release-engagement.tsx` | [Item 17](roadmap.md#17-call-site-restyles) |
| `FieldLabel` | `text-[0.8125rem]` | `request-search-form.tsx` | [Item 17](roadmap.md#17-call-site-restyles) |
| `Input` | `text-[0.85rem]` | `recipient-row.tsx` | [Item 17](roadmap.md#17-call-site-restyles) |
| `NativeSelect` | `font-bold` `text-[var(--color-body)]` | `staff-manager.tsx` | [Item 17](roadmap.md#17-call-site-restyles) |

## Global CSS

`src/app/globals.css` contains these blocks, in this order, and nothing else:

| Block | Contains |
| --- | --- |
| Brand `@theme` | Every brand token: colors, fonts, radii, shadows, easings, durations, z-index, the patient fluid type scale. |
| `:lang()` blocks | Per-locale font family swaps and script-specific leading and tracking. Unlayered on purpose. |
| `@layer base` | Element defaults (`html`, `body`, headings, links, `::selection`, `:focus-visible`, `img`) and the reduced-motion posture with every authored opt-out ([motion.md](motion.md#reduced-motion)). |
| `@layer components` | Layout primitives (`.container-x`, `.section`), typography helpers (`.display`, `.h1`–`.h3`, `.lead`, `.measure`), link and list styles, the `.portal-scope` token assignment, the `overlay-rise` keyframes the legacy dialogs share, and legacy feature blocks queued for extraction. |
| Print blocks | `@page` and `@media print` compositions for printed patient-site pages, the request detail and the review flyer. The request packet prints from `portal-workbench.css` and the staff home list from `home.css`. |
| The semantic bridge | `@theme inline` mapping `--color-*` onto semantic names, then `:root` and `.dark` mapping semantic names onto brand tokens. The one literal is `--destructive`. |

A new rule in `globals.css` answers "which block, and why not a recipe?". A rule named after a
component (`.card`, `.card-lined`) is a recipe that has not been extracted yet
([roadmap.md](roadmap.md#1-card-surfaces)).

The legacy feature blocks in `@layer components` each serve one surface: the release briefing
(`.release-signal*`, `.release-summary*`), the language chooser (`.language-dialog*`), the
first-login tour (`.tour-dialog`), request notes (`.request-note-*`), procedure prep
(`.prep-schedule*`, `.prep-table*`) and the provider-card viewer (`.pc-*`). The three dialogs
among them enter on the shared `overlay-rise` keyframes, shaped per dialog by `--overlay-rise` and
`--overlay-scale`. The blocks are queued for extraction; new rules do not join them.
