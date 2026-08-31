# 011 — Register the home dashboard's reduced-motion opt-outs where they can win

- **Status**: DONE
- **Commit**: a303135
- **Severity**: HIGH
- **Category**: Accessibility / cascade
- **Estimated scope**: 2 files (`src/app/globals.css`, `src/app/admin/(portal)/(home)/home.css`), ~30 lines

## Problem

The home dashboard's entire reduced-motion block is dead code, and the
portal charter's promise — reduced motion keeps a ~120ms cross-fade, it
never goes to zero — is broken on the busiest page.

The blanket reset lives in `@layer base` with `!important`:

```css
/* src/app/globals.css:207-214 — current (do not edit) */
    *,
    *::before,
    *::after {
      animation-duration: 0.001ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.001ms !important;
      scroll-behavior: auto !important;
    }
```

`home.css` is intentionally **unlayered** (its header, lines 9-11) and its
reduced-motion block uses **no `!important`**. Important author declarations
beat normal author declarations regardless of layers, so every duration it
authors loses to the reset:

```css
/* src/app/admin/(portal)/(home)/home.css:1260-1265 — current (dead durations) */
@media (prefers-reduced-motion: reduce) {
  .wgi-popover,
  .wgi-sheet,
  .wgi-sheet-overlay {
    transition-duration: 1ms;
  }
```

```css
/* src/app/admin/(portal)/(home)/home.css:1288-1292 — current (dead, and the
   reset's iteration-count 1 freezes the pulse entirely) */
  .wgi-skeleton-list > li,
  .wgi-loading-head > span,
  .wgi-loading-head > i {
    animation-duration: 3.2s;
  }
```

Net effect under `prefers-reduced-motion: reduce`: the record popover and
the full-record sheet snap in and out with zero cross-fade (the charter and
the file's own section header — "gentler, never zero comprehension" —
promise otherwise), and the loading shimmer freezes mid-pulse as a static
mottled list.

The `transform: none` rules in the same block (lines 1267-1272 and the
`:active` list at 1280-1286) **do** work — `transform` is not in the reset —
and stay untouched.

The repo already has the correct mechanism: the only reduced-motion
durations that can win live in the `@layer base` media block itself,
registered per surface (`globals.css:227-244` — `.portal-confirm-dialog`,
`.portal-line-reveal`, `.portal-calendar-weeks[data-turn]`). The home
surfaces were never registered there.

(Related: plan `007-sync-sheet-overlay-motion-and-exit.md` step 4 originally
claimed the home media block wins by specificity — that note has been
corrected; specificity cannot beat importance.)

## Target

1. The home surfaces join the registry of opt-outs in `@layer base`,
   directly after the `.portal-calendar-weeks[data-turn]` rule:

```css
/* target — src/app/globals.css, inside the @media (prefers-reduced-motion:
   reduce) block in @layer base, after the .portal-calendar-weeks rule
   (lines 240-244) */

    /* The home dashboard (home.css) is authored unlayered, so — like the
       workbench — nothing it declares can outrank the reset above. Its
       surfaces register here: the record popover and the full-record sheet
       keep the charter's cross-fade (their travel is already dropped by
       home.css's transform: none rules), and the loading shimmer keeps a
       slowed pulse instead of freezing mid-frame. */
    .wgi-popover,
    .wgi-sheet,
    .wgi-sheet-overlay {
      transition-duration: var(--pm-reduced-duration, 120ms) !important;
    }

    .wgi-skeleton-list > li,
    .wgi-loading-head > span,
    .wgi-loading-head > i {
      animation-duration: 3.2s !important;
      animation-iteration-count: infinite !important;
    }
```

2. The dead rules leave `home.css`, replaced by a pointer comment; the live
   `transform` rules stay:

```css
/* target — src/app/admin/(portal)/(home)/home.css, the reduced-motion block.
   Lines 1260-1265 are replaced by the comment below + the transform rules
   that followed them; lines 1288-1292 are deleted. */
@media (prefers-reduced-motion: reduce) {
  /* Durations are authored in globals.css's @layer base reduced-motion
     block — the blanket reset there is !important, and important
     declarations outrank everything non-important regardless of layers, so
     nothing this (unlayered) file declares can restore a duration. Only
     the travel is dropped here. */
  .wgi-popover[data-starting-style],
  .wgi-popover[data-ending-style],
  .wgi-sheet[data-starting-style],
  .wgi-sheet[data-ending-style] {
    transform: none;
  }
  …
```

## Repo conventions to follow

- **Exemplar for step 1**: `src/app/globals.css:227-244` — the
  `.portal-confirm-dialog` / `.portal-line-reveal` /
  `.portal-calendar-weeks[data-turn]` opt-outs. Same block, same
  `!important` mechanism, `var(--pm-reduced-duration, 120ms)` for 120ms
  values (the token is authored on `.portal-scope`, `globals.css:1198`; the
  home page renders inside it).
- **Exemplar for step 2's comment**: `portal-workbench.css` ~3376-3378 —
  "The 120ms duration is authored in globals.css's reduced-motion block —
  this layer cannot outrank the blanket reset." (plans 001/002 established
  this pattern).
- The 3.2s skeleton value is the file's own authored intent (currently
  dead) — preserve it verbatim, don't invent a different pace.

## Steps

1. In `src/app/globals.css`, inside the `@media (prefers-reduced-motion:
   reduce)` block in `@layer base`, directly after the
   `.portal-calendar-weeks[data-turn]` rule (lines 240-244), add the
   comment and two rules from Target 1.
2. In `src/app/admin/(portal)/(home)/home.css`, delete the
   `.wgi-popover, .wgi-sheet, .wgi-sheet-overlay { transition-duration: 1ms; }`
   rule (lines 1261-1265) and place the Target 2 comment at the top of the
   media block in its place.
3. In the same block, delete the skeleton rule (lines 1288-1292:
   `.wgi-skeleton-list > li, .wgi-loading-head > span, .wgi-loading-head > i { animation-duration: 3.2s; }`).
4. Run `npx oxfmt` on both files if the formatter flags them.

## Boundaries

- Do NOT touch the `.wgi-line-row[data-settled]` rule at home.css
  ~1274-1278 — it belongs to plan 009 (execute 009 first; if it already
  ran, that rule is a comment — leave it).
- Do NOT touch the `transform: none` rules or the `:active` list in
  home.css's media block.
- Do NOT touch the blanket reset (globals.css:207-214) or the three
  existing opt-outs above the insertion point.
- Do NOT touch plan 007's target rules (`.wgi-sheet-overlay` transitions
  outside the media block) whether or not 007 has run.
- Do NOT add `!important` anywhere in `home.css` — the fix lives in
  `@layer base`, full stop.
- If the code at the cited lines doesn't match (drift since a303135), STOP
  and report instead of improvising.

## Verification

- **Mechanical**: `npx oxlint` (zero warnings/errors), `npx oxfmt --check`
  clean, `npm run build` succeeds.
- **Feel check**: DevTools → Rendering → emulate `prefers-reduced-motion:
  reduce`, on the portal home:
  - Open a row's record card: it **cross-fades in over ~120ms** — a
    perceptible fade, not an instant pop, and with no scale/travel.
  - Open the full record sheet: same — a ~120ms fade in place, no slide.
    Close: a ~120ms fade out.
  - Reload the page and watch the loading state: the skeleton **pulses
    slowly** (3.2s breathing), never frozen mid-fade.
  - Turn emulation **off**: popover 160ms in / 120ms out with scale, sheet
    200ms slide — byte-identical to before this plan.
- **Done when**: reduced-motion emulation shows fades (not pops) on
  popover and sheet, a breathing skeleton, and non-reduced behavior is
  unchanged.
