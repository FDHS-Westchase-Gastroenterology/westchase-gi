# 004 — Confirm a calendar pick with a micro settle

- **Status**: DONE
- **Commit**: 08bd929
- **Severity**: LOW (polish / additive)
- **Category**: Missed opportunity — feedback
- **Estimated scope**: 2 files, ~20 lines

## Problem

In the portal calendar (`src/app/admin/(portal)/portal-calendar.tsx`), picking a
day changes only color: the pressed day fills navy via a 150ms background/color
transition, and pointer users get a `:active` dip. But the fill is a *state*
change (150ms ease-out), not a *confirmation* — the newly chosen day reads the
same as a hover that settled. Pointer users at least get the `:active`
`scale(0.96)` dip at
`src/app/admin/portal-workbench.css:1387-1390`; keyboard activation (Enter/Space)
gets neither dip nor settle on some platforms.

The design system's own register (DESIGN.md, "Micro state changes stay micro")
blesses a ~150ms ease-out confirmation; the line modal's triggers already use
exactly that (`:active { transform: scale(0.98) }` at
`portal-workbench.css:2804-2807`).

Current day button CSS:

```css
/* src/app/admin/portal-workbench.css:1355-1397 — current (relevant parts) */
.portal-calendar-day {
  /* ... */
  transition:
    background-color 150ms cubic-bezier(0.23, 1, 0.32, 1),
    color 150ms cubic-bezier(0.23, 1, 0.32, 1),
    transform 150ms cubic-bezier(0.23, 1, 0.32, 1);
}

.portal-calendar-day:active:enabled {
  transform: scale(0.96);
  transition-duration: 0s, 0s, 0s;
}

.portal-calendar-day[data-selected] {
  background: var(--color-navy);
  color: white;
  font-weight: 600;
  box-shadow: none;
}
```

## Target

A one-shot settle on the day that was just picked — a tiny release from 0.97 to
1 on the micro ease-out — applied via a `data-picked` attribute so it fires only
on an actual pick, never on mount or on month re-render:

```css
/* src/app/admin/portal-workbench.css — add directly after the
   .portal-calendar-day[data-selected] rule (~line 1397) — target */
/* The pick itself: one settle on the day just chosen, distinct from the
   fill's state transition. Keyed by data-picked, so it never replays on
   re-render and never fires for a day that arrived pre-chosen. */
.portal-calendar-day[data-picked] {
  animation: portal-day-pick 150ms cubic-bezier(0.23, 1, 0.32, 1);
}

@keyframes portal-day-pick {
  from {
    transform: scale(0.97);
  }
}
```

Reduced motion needs nothing extra: the blanket reset in
`src/app/globals.css:176-182` already collapses `animation-duration` to
0.001ms, which is correct — reduced motion keeps the fill, drops the settle.

## Repo conventions to follow

- The workbench reduced-motion block at ~3564-3568 restricts
  `.portal-calendar-day` transitions to `background-color, border-color, color`
  under reduce; the new keyframe is handled by the blanket reset instead. Do
  not add anything to that block.
- Exemplar for a keyed one-shot animation:
  `.portal-calendar-weeks[data-turn]` (`portal-workbench.css:1336-1357`) —
  attribute set in React state, keyframe with only a `from`, ease-out curve
  `cubic-bezier(0.23, 1, 0.32, 1)`, sub-200ms.

## Steps

1. In `src/app/admin/(portal)/portal-calendar.tsx`, add state next to
   `focusDay` (~line 121):

   ```tsx
   const [pickedDay, setPickedDay] = useState<string | null>(null);
   ```

2. In the day button's `onClick` (~line 257-259), record the pick:

   ```tsx
   onClick={() => {
     setPickedDay(day);
     onSelect(day);
   }}
   ```

3. On the same button (~line 248-262), add the attribute:

   ```tsx
   data-picked={day === pickedDay || undefined}
   ```

4. Do NOT clear `pickedDay` on month turn: the attribute is keyed per day
   string, and a month turn remounts the weeks (the rowgroup has
   `key={view}`), so the animation cannot replay for a day that is not
   re-picked. Verify this in the feel check.
5. In `src/app/admin/portal-workbench.css`, add the target CSS block after the
   `.portal-calendar-day[data-selected]` rule.

## Boundaries

- Do NOT change the `:active` dip, the `[data-selected]` colors, or any
  transition on `.portal-calendar-day`.
- Do NOT animate anything on mount or on `aria-selected` — the animation must
  be attributable to a click only.
- Do NOT add new dependencies.
- If `portal-calendar.tsx` does not match the excerpts (day button at ~248-262,
  `onSelect` in `onClick`), STOP and report.

## Verification

- **Mechanical**: `npx oxlint`, `npx oxfmt --check`, `npx react-doctor@latest --verbose`
  (score 100), `npm run build` all clean.
- **Feel check**: open a line modal → day dialog:
  - Click any day: it dips (existing `:active`), fills navy, and settles from
    ~0.97 to 1 — one motion, no bounce.
  - Click a different day: only the new day settles.
  - Arrow-key to a day and press Enter: the same settle plays.
  - Open the dialog with a pre-chosen day: the pre-chosen day does NOT settle
    on mount.
  - Turn the month and back: no stray settles.
  - Emulate `prefers-reduced-motion: reduce`: the settle disappears; the fill
    remains.
  - In DevTools Animations panel at 10%: the keyframe is a single clean
    scale from 0.97, ending exactly at rest (no overshoot — the spring is
    reserved for surfaces, not cells).
- **Done when**: a pick reads as confirmed without the calendar feeling playful.
