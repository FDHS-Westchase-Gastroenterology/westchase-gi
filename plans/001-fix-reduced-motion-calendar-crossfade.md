# 001 — Fix the dead reduced-motion calendar crossfade

- **Status**: TODO
- **Commit**: 08bd929
- **Severity**: MEDIUM
- **Category**: Accessibility / cascade
- **Estimated scope**: 2 files, ~15 lines

## Problem

Under `prefers-reduced-motion: reduce`, the calendar's month-turn crossfade never
runs: the month swaps instantly instead of the documented 120ms fade.

The repository keeps a blanket reduced-motion reset in `@layer base` of
`src/app/globals.css`:

```css
/* src/app/globals.css:176-182 — current */
*,
*::before,
*::after {
  animation-duration: 0.001ms !important;
  animation-iteration-count: 1 !important;
  transition-duration: 0.001ms !important;
  scroll-behavior: auto !important;
}
```

`src/app/admin/portal-workbench.css` is authored entirely inside
`@layer components` (its first line is `@layer components {`). For `!important`
declarations the cascade reverses layer order, so an earlier layer (`base`)
beats `components` — a non-important override in the workbench file can never
outrank the reset. The diff itself documents this exact rule at
`src/app/globals.css:186-197`.

The calendar's reduced-motion override therefore does nothing:

```css
/* src/app/admin/portal-workbench.css:3570-3574 — current (dead duration) */
/* The month still changes; it just stops travelling to say so. */
.portal-calendar-weeks[data-turn] {
  animation-name: portal-calendar-turn-still;
  animation-duration: 120ms;
}
```

`animation-duration: 120ms` (normal, `components` layer) loses to
`animation-duration: 0.001ms !important` (`base` layer). The
`animation-name` swap works only because the reset does not set names — but the
name it now selects points at a fade whose duration is force-collapsed to
0.001ms.

## Target

The workbench rule keeps only the name swap; the duration moves into the
authoritative reduced-motion block in `globals.css`, alongside the two existing
portal opt-outs, as an `!important` declaration later in source in the same
layer:

```css
/* src/app/globals.css — inside the same @media (prefers-reduced-motion: reduce)
   block, after the .portal-line-reveal rule — target */
/* The calendar's month turn keeps its 120ms cross-fade and gives up the
   travel, same temperament as the modals above. */
.portal-calendar-weeks[data-turn] {
  animation-duration: 120ms !important;
}
```

```css
/* src/app/admin/portal-workbench.css — target (durations removed) */
/* The month still changes; it just stops travelling to say so. The 120ms
   duration is authored in globals.css's reduced-motion block — this layer
   cannot outrank the blanket reset. */
.portal-calendar-weeks[data-turn] {
  animation-name: portal-calendar-turn-still;
}
```

## Repo conventions to follow

- Exemplar: `src/app/globals.css:190-205` — the existing `.portal-confirm-dialog`
  and `.portal-line-reveal` reduced-motion opt-outs. Same block, same
  `!important` mechanism, same "value stays a registry token where one exists"
  discipline. 120ms is used literally here to match the sibling overrides
  (`var(--pm-reduced-duration, 120ms)` is also acceptable; prefer the `var()`
  form for consistency with lines 197 and 205).
- `@keyframes portal-calendar-turn-still` (workbench, ~3576) is a fade-only
  keyframe; it stays untouched.

## Steps

1. In `src/app/globals.css`, inside the `@media (prefers-reduced-motion: reduce)`
   block that contains the portal opt-outs (after the `.portal-line-reveal`
   rule ending near line 205), add:

   ```css
   .portal-calendar-weeks[data-turn] {
     animation-duration: var(--pm-reduced-duration, 120ms) !important;
   }
   ```

2. In `src/app/admin/portal-workbench.css`, edit the rule at ~3570-3574 to
   remove `animation-duration: 120ms;` and extend the comment to note the
   duration lives in `globals.css` because of layer-important cascade rules.
3. Run `npx oxfmt` on both files if the formatter flags them.

## Boundaries

- Do NOT touch `@keyframes portal-calendar-turn` / `portal-calendar-turn-still`.
- Do NOT change any non-reduced-motion calendar rule.
- Do NOT move or restructure the `@layer` organization of either file.
- Do NOT add new dependencies.
- If the code at these locations does not match the excerpts above, STOP and
  report.

## Verification

- **Mechanical**: `npx oxlint` and `npx oxfmt --check` clean; `npm run build`
  succeeds.
- **Feel check**: run the app, open a line modal, open the day dialog, click
  "Next month":
  - With DevTools → Rendering → `prefers-reduced-motion: reduce` emulated: the
    month content cross-fades for ~120ms (visible fade, not an instant swap)
    with no horizontal travel.
  - With reduce **off**: the turn still travels 0.5rem over 160ms as before.
- **Done when**: reduced-motion emulation shows a perceptible 120ms fade on
  month turn; non-reduced behavior is byte-identical to before.
