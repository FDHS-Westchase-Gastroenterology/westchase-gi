# 002 — Remove dead durations from the reduced-motion reveal overrides

- **Status**: DONE
- **Commit**: 08bd929
- **Severity**: LOW
- **Category**: Maintenance trap
- **Estimated scope**: 1 file, ~12 lines changed

## Problem

`src/app/admin/portal-workbench.css:3530-3555` rewrites `.portal-line-reveal`'s
transition under `prefers-reduced-motion: reduce`:

```css
/* src/app/admin/portal-workbench.css:3539-3552 — current (durations are dead) */
/* Reduced motion keeps the fade that says "something unfolded" and
   drops the fold and the settle: sections appear at full height. */
.portal-line-reveal,
.portal-line-reveal[data-open="true"] {
  transition:
    grid-template-rows 0s,
    opacity 120ms ease-out,
    visibility 0s linear 120ms;
}

.portal-line-reveal[data-open="true"] {
  transition:
    grid-template-rows 0s,
    opacity 120ms ease-out,
    visibility 0s;
}
```

The authoritative mechanism is the `!important` per-property duration override
in `src/app/globals.css:201-206`:

```css
/* src/app/globals.css:201-206 — current, and what actually runs */
.portal-line-reveal {
  transition-duration: 0s, var(--pm-reduced-duration, 120ms), 0s !important;
}
```

Because the blanket reset in `@layer base` uses `!important` and
`portal-workbench.css` lives in `@layer components` (important declarations
reverse layer order; earlier layer wins), the `120ms` and `linear 120ms`
durations in the workbench shorthand are dead: the globals override supplies
`0s, 120ms, 0s`. An executor editing these numbers will see no effect.

## Target

Keep only the declarations that take effect (the transition *property list* —
the globals override indexes durations positionally, so the list must survive
— plus the transform removal), and document where the durations come from:

```css
/* target */
/* Reduced motion keeps the fade that says "something unfolded" and drops the
   fold and the settle: sections appear at full height. The per-property
   durations (0s, 120ms, 0s) are authored once in globals.css's
   reduced-motion block — this layer cannot outrank the blanket reset, so only
   the property list is repeated here. */
.portal-line-reveal,
.portal-line-reveal[data-open="true"] {
  transition-property: grid-template-rows, opacity, visibility;
}

.portal-line-reveal[data-open="true"] {
  transition-property: grid-template-rows, opacity, visibility;
}
```

(`visibility`'s delay behavior is preserved by the globals duration list
combined with the base rules' existing `transition-delay` values; verify in the
feel check that a closing fold stays invisible until the fade ends.)

## Repo conventions to follow

- Exemplar: `src/app/globals.css:186-206` — the comment there already explains
  the layer-important mechanism; reference it rather than re-deriving it.

## Steps

1. In `src/app/admin/portal-workbench.css`, replace the two transition
   declarations at ~3539-3552 with the two `transition-property` declarations
   in the target above, and replace the comment text.
2. Do not touch `.portal-line-reveal > div { transform: none; transition: none; }`
   at ~3556-3559 — the `transform: none` works; `transition: none` sets
   `transition-property: none`, which also takes effect (it kills the inner
   settle ride).

## Boundaries

- Do NOT edit `src/app/globals.css`.
- Do NOT change any non-reduced-motion `.portal-line-reveal` rule.
- If the excerpts do not match, STOP and report.

## Verification

- **Mechanical**: `npx oxlint`, `npx oxfmt --check`, `npm run build` all clean.
- **Feel check**: emulate `prefers-reduced-motion: reduce`, open a line modal,
  pick "No answer":
  - The voicemail section appears at full height with a ~120ms opacity fade —
    identical to before the refactor.
  - Switching to "Reached, follow-up" closes the old section with no visible
    fold and no flash of hidden-then-visible content.
  - With reduce off, behavior is unchanged (spring fold, 5px settle).
- **Done when**: reduced-motion unfold looks pixel-identical to the pre-change
  behavior while the dead duration values are gone.
