# Vocabulary

The words the other guides use. Each names one thing in the code, and the file that defines it
is given where one exists. When a guide and this list disagree, fix the guide.

## System terms

- **Token** — a named CSS custom property that holds one design decision (`--color-navy`,
  `--motion-exit-duration`). Values live in tokens; code refers to names.
- **Brand token** — a token in the brand `@theme` block of `src/app/globals.css`. The practice's
  own decisions; every other layer refers to them.
- **Semantic token** — one of shadcn's role names (`--primary`, `--muted`, `--ring`). Each maps
  onto a brand token in the **bridge**. The one literal is `--destructive`.
- **The bridge** — the `@theme inline`, `:root` and `.dark` blocks at the end of `globals.css`.
  The only place shadcn's tokens are defined.
- **Recipe** — a component's complete vocabulary of appearance, written as a `cva` definition
  with named **axes**: `variant` (paint), `size` (geometry), `motion` (temperament), and
  `orientation` where a part lays out in two directions. "The Button recipe" is
  `src/components/ui/button-variants.ts`.
- **Temperament** — a named motion physics. On a recipe's `motion` axis the names are `wgi`
  (the brand's), `commit` (the held press), `shadcn` (stock, verbatim) and `none`. In the motion
  registry they are `arrive`, `leave`, `micro` and `crossfade`.
- **Motion registry** — the `--motion-*` tokens in the brand `@theme` plus the presets in
  `src/lib/motion.ts`. It owns every curve and duration; see [motion.md](motion.md).
- **shadcn registry** — shadcn's remote catalog of component source (`ui.shadcn.com/r`).
  `shadcn add` downloads from it and `src/components/stock/` keeps the source. This project
  publishes no registry of its own. Write "registry" alone only where the context makes the
  meaning certain.
- **Register** — `PRODUCT.md`'s word for the voice and product a surface belongs to. The patient
  site speaks in the brand register; the staff portal in the product register. Each register
  assigns its theme through a scope. Never a component's appearance; that is a recipe.
- **Scope** — a CSS class on an ancestor that re-tunes tokens for everything inside it
  (`.portal-scope`, `.wgi-home`). A scope assigns values to its own namespace or to a recipe's
  knobs; it never redefines a brand token. The `:lang()` blocks, which re-point the font tokens
  for a language, are the one exception ([tokens.md](tokens.md#recorded-exceptions)).
- **Knob** — a per-scope override a recipe reads with a fallback (`--btn-lift`, `--btn-radius`).
  Knobs let a scope change a recipe's feel without fighting utility classes.
- **Tier** — where a component lives and what that implies: `stock/` (registry source kept for
  the local bundle), `ui/` (brand recipes), `patterns/` (brand compositions), domain (colocated
  with a route). See [components.md](components.md#component-tiers).
- **Route-owned part** — a component that lives beside the one route that renders it and is
  not a tier of its own: the staff home's `parts/` folder holds `HomePopover`, `HomeSheet`,
  `LineStatusBadge`, `HomeDayCalendar` and its `TimePicker` wrapper.
- **Recorded exception** — a place the code departs from a rule on purpose, written down with
  its reason in the guide that owns the rule. A departure that no guide records is drift.
- **Drift** — code that breaks a rule without a recorded exception. Drift is fixed or added to the
  [roadmap](roadmap.md), and it is not copied, with one exception: a guide may name a drifting
  pattern as the one to copy until its roadmap item lands, because nothing better exists yet. Three
  do — the request detail's date input ([dates-and-times.md](dates-and-times.md#dates), item 3),
  `PrintChooser` ([overlays.md](overlays.md#modal-dialogs), item 9) and `.portal-panel` for a
  settings section ([modules.md](modules.md#a-settings-page), item 1). A copy joins that item.

## Product terms

- **Stamp** — a status badge: `Badge` in `ui/`, worn by `StatusBadge` on the requests pages, and
  `LineStatusBadge` on the staff home. A stamp always carries words beside its color.
- **The Line** — the staff portal's world: one patient's request is one line on a sheet.
- **Staff home** — the portal's first page, `src/app/admin/(portal)/(home)/`. Its section wears
  `.wgi-home` and its scoped stylesheet is `home.css`.
- **Line list** — the staff home's table of lines, `line-list.tsx`.
- **Line row** — one line and the record card it opens, `line-row.tsx`.
- **Record card** — the popover a line opens on the staff home, `record-card.tsx`, rendered in
  `HomePopoverContent`. Dragged by its head it detaches into a floating panel
  ([overlays.md](overlays.md#the-full-record-sheet)).
- **Full-record sheet** — the side sheet the record card opens beside itself,
  `full-record-sheet.tsx`, rendered in `HomeSheetContent`. It is not a modal; see
  [overlays.md](overlays.md#the-full-record-sheet).
- **Claude Design project** — an optional workspace for design exploration and exchange.
  `ds-bundle/` is the generated exchange bundle; using it does not require remote approval.
