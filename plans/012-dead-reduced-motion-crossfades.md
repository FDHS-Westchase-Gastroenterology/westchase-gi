# 012 — Move five dead reduced-motion cross-fade durations into `@layer base`

- **Status**: DONE
- **Commit**: a303135
- **Severity**: MEDIUM
- **Category**: Accessibility / cascade
- **Estimated scope**: 1 file (`src/app/globals.css`), ~45 lines touched

## Problem

Five reduced-motion overrides in `@layer components` author cross-fade
durations that can never apply. The blanket reset
(`globals.css:207-214`) is `!important` inside `@layer base`; for important
declarations the cascade reverses layer order, so an earlier layer wins and
nothing in `@layer components` can override it — with or without
`!important`. The repo documents this rule itself (`globals.css:220-226`)
and plan 001 already fixed the same bug for the calendar. These five sites
remain:

```css
/* src/app/globals.css:1731-1736 — current (duration dead) */
    .release-summary,
    .release-summary[data-open="true"] {
      transform: none;
      transition-property: opacity, visibility;
      transition-duration: 120ms, 0s !important;
    }
```

```css
/* src/app/globals.css:1756-1759 — current (duration dead) */
    .release-signal :where(.release-signal__list, .release-signal__row, .release-signal__check) {
      transition-property: opacity;
      transition-duration: 100ms !important;
    }
```

```css
/* src/app/globals.css:1841-1847 — current (duration dead) */
    .request-note-add-trigger,
    .request-note-add-trigger[data-open="true"] {
      transform: none;
      transition-property: opacity, visibility !important;
      transition-duration: 120ms, 0s !important;
      transition-delay: 0s !important;
    }
```

```css
/* src/app/globals.css:1854-1860 — current (duration dead) */
    .request-note-composer,
    .request-note-disclosure[data-open="true"] .request-note-composer {
      transform: none;
      transition-property: opacity;
      transition-duration: 120ms !important;
      transition-delay: 0s;
    }
```

```css
/* src/app/globals.css:1899-1902 — current (shorthand duration dead) */
    .request-status-action-label[data-confirmed="true"][data-animate="true"] {
      transform: none;
      transition: opacity 100ms cubic-bezier(0.23, 1, 0.32, 1);
    }
```

In every case the `transition-property` / `transform: none` parts are live
(those properties aren't in the reset) — so under reduced motion these
surfaces correctly drop their travel, but the intended comprehension-aiding
fade collapses to 0.001ms: the release briefing, the note composer, and the
status confirmation all pop instead of fading.

## Target

The property lists and travel-drops stay where they are; **only the
durations move** into the `@layer base` reduced-motion block, where
`!important` later in the same layer beats the reset. Authored values are
preserved exactly (120ms cases use the registry token with its 120ms
fallback, matching the existing opt-outs; the two 100ms cases stay literal
— they were authored faster on purpose).

```css
/* target — src/app/globals.css, inside the @media (prefers-reduced-motion:
   reduce) block in @layer base, appended after the last existing opt-out
   (after plan 011's additions if it has run; otherwise after the
   .portal-calendar-weeks[data-turn] rule at lines 240-244) */

    /* The release briefing and the request-notes surfaces author their
       reduced-motion cross-fades next to their rules in @layer components,
       where a duration can never outrank the reset above. The property
       lists stay there; the durations live here. */
    .release-summary,
    .release-summary[data-open="true"] {
      transition-duration: var(--pm-reduced-duration, 120ms), 0s !important;
    }

    .release-signal :where(.release-signal__list, .release-signal__row, .release-signal__check) {
      transition-duration: 100ms !important;
    }

    .request-note-add-trigger,
    .request-note-add-trigger[data-open="true"] {
      transition-duration: var(--pm-reduced-duration, 120ms), 0s !important;
    }

    .request-note-composer,
    .request-note-disclosure[data-open="true"] .request-note-composer {
      transition-duration: var(--pm-reduced-duration, 120ms) !important;
    }

    .request-status-action-label[data-confirmed="true"][data-animate="true"] {
      transition-duration: 100ms !important;
    }
```

The five `@layer components` rules each lose their duration line and gain a
one-line pointer comment. The status-label shorthand is unpacked so its
property and easing survive without re-declaring a (dead) duration:

```css
/* target — src/app/globals.css:1899-1902 rewritten */
    .request-status-action-label[data-confirmed="true"][data-animate="true"] {
      transform: none;
      /* Duration lives in the @layer base reduced-motion block. */
      transition-property: opacity;
      transition-timing-function: cubic-bezier(0.23, 1, 0.32, 1);
    }
```

## Repo conventions to follow

- **Exemplar**: `src/app/globals.css:227-244` — the existing per-surface
  opt-outs (`.portal-confirm-dialog`, `.portal-line-reveal`,
  `.portal-calendar-weeks[data-turn]`), and plans 001/002 which established
  the move-duration-to-base + leave-a-pointer-comment pattern.
- `var(--pm-reduced-duration, 120ms)` for 120ms values (token authored on
  `.portal-scope`, `globals.css:1198` — all five surfaces render inside the
  portal). Literal `100ms` where 100ms was authored.
- Pointer-comment wording exemplar: `portal-workbench.css` ~3376-3378.

## Steps

1. In `src/app/globals.css`, append the Target block (comment + five rules)
   to the end of the `@media (prefers-reduced-motion: reduce)` block in
   `@layer base`.
2. At lines 1731-1736, delete the line
   `transition-duration: 120ms, 0s !important;` and add the comment
   `/* Duration lives in the @layer base reduced-motion block. */` above
   the `transition-property` line.
3. At lines 1756-1759, delete `transition-duration: 100ms !important;` and
   add the same pointer comment.
4. At lines 1841-1847, delete `transition-duration: 120ms, 0s !important;`
   and add the same pointer comment. Leave `transition-delay: 0s !important;`
   untouched (delay is not reset; it is live as authored).
5. At lines 1854-1860, delete `transition-duration: 120ms !important;` and
   add the same pointer comment. Leave `transition-delay: 0s;` untouched.
6. At lines 1899-1902, replace the `transition: opacity 100ms
   cubic-bezier(0.23, 1, 0.32, 1);` shorthand with the unpacked form from
   Target (property + timing-function + pointer comment, no duration).
7. Run `npx oxfmt` on the file if the formatter flags it.

## Boundaries

- Do NOT touch the blanket reset or the existing opt-outs at 227-244.
- Do NOT touch the `.request-note-disclosure { transition: none; }` rule
  (lines 1849-1852) — no duration is authored there; it is a deliberate
  full stop.
- Do NOT touch the `@starting-style` block after the status-label rule.
- Do NOT change any authored value — 120ms stays 120ms (as the token +
  fallback), 100ms stays 100ms, and the `, 0s` second values are kept
  (they hold `visibility` at zero duration on purpose).
- One file only. If line contents don't match the excerpts (drift since
  a303135, or plan 011 shifting the insertion point), locate the rules by
  selector, and STOP if a rule's declarations differ from the excerpts.

## Verification

- **Mechanical**: `npx oxlint` (zero warnings/errors), `npx oxfmt --check`
  clean, `npm run build` succeeds.
- **Feel check**: DevTools → Rendering → emulate `prefers-reduced-motion:
  reduce`:
  - Portal → open the release briefing (the "What's new" summary): the
    panel **fades** in/out over ~120ms in place — no pop, no travel; its
    rows appear together with a quick 100ms fade, no stagger travel.
  - Portal → a request's notes: revealing the composer fades ~120ms; the
    add-trigger swap fades ~120ms.
  - Confirm a request status change: the confirmation label fades in over
    ~100ms rather than popping.
  - Emulation off: all five surfaces behave byte-identically to before.
- **Done when**: all five durations render under reduced-motion emulation
  (visible fades in the Animations panel), and the components-layer rules
  contain no `transition-duration` lines.
