# 009 — Rebuild the outcome settle as a retargetable transition

- **Status**: DONE
- **Commit**: a303135
- **Severity**: HIGH
- **Category**: Interruptibility / Purpose & frequency
- **Estimated scope**: 2 files (`src/app/admin/(portal)/(home)/home.css`, `src/app/admin/(portal)/(home)/home-dashboard.tsx`), ~40 lines

## Problem

The mint wash that acknowledges a recorded call outcome — the confirmation
for the portal's single most-repeated action — is broken four ways.

The animation is a keyframe driven by a `data-settled` attribute:

```css
/* src/app/admin/(portal)/(home)/home.css:182-195 — current */
/* A recorded outcome lands: the row exhales mint, then settles. */
@keyframes wgi-settle {
  from {
    background-color: var(--color-mint-2);
  }

  to {
    background-color: transparent;
  }
}

.wgi-line-row[data-settled] {
  animation: wgi-settle 480ms cubic-bezier(0.19, 1, 0.22, 1) both;
}
```

The attribute comes from a `settledId` state that is set and **never
cleared**:

```tsx
/* src/app/admin/(portal)/(home)/home-dashboard.tsx:41 — current */
const [settledId, setSettledId] = useState<string | null>(null);
```

```tsx
/* src/app/admin/(portal)/(home)/home-dashboard.tsx:100 — current */
onSettled={setSettledId}
```

```tsx
/* src/app/admin/(portal)/(home)/line-list.tsx:88 — current (do not edit) */
<li data-row={line.id} className="wgi-line-row" data-settled={settled || undefined}>
```

Consequences:

1. **A second outcome on the same row never animates.** `setSettledId(id)`
   with the same id is a no-op, the attribute never cycles, the keyframe
   never replays. Staff get silence on the exact action the animation
   exists to confirm.
2. **Settling row B cuts row A's wash mid-flight.** The attribute moves to
   the new row; keyframes cannot retarget, so row A snaps to transparent.
3. **480ms exceeds the UI budget** (under 300ms) on the highest-frequency
   surface in the product — this fires every time staff record an outcome,
   tens to 100+ times a day.
4. **Under reduced motion the row stays mint forever.** The reduced-motion
   override pins the color, and since `data-settled` never clears, it never
   lets go:

```css
/* src/app/admin/(portal)/(home)/home.css:1274-1278 — current */
  .wgi-line-row[data-settled] {
    animation: none;
    background-color: var(--color-mint-2);
    transition: background-color 1ms;
  }
```

## Target

A transition, not a keyframe — transitions retarget from their current
value mid-flight instead of restarting or cutting. The tint arrives
instantly with the settle (the portal's "pressed arrives instantly"
temperament), holds ~200ms while the popover closes and the eye finds the
row, then a timed state clear removes the attribute and the 240ms exhale
runs. Total animated movement: 240ms — inside the budget.

```css
/* target — src/app/admin/(portal)/(home)/home.css, replacing lines 182-195 */
/* A recorded outcome lands: the tint arrives with the settle, holds while
   the popover closes, and exhales over 240ms once the timed clear in
   home-dashboard.tsx removes the attribute. A transition, not a keyframe,
   so a second outcome retargets the wash mid-flight instead of cutting it,
   and the attribute cycling off and back on lets it replay. */
.wgi-line-row {
  transition: background-color 240ms cubic-bezier(0.19, 1, 0.22, 1);
}

.wgi-line-row[data-settled] {
  background-color: var(--color-mint-2);
  transition-duration: 0s;
}
```

```tsx
/* target — src/app/admin/(portal)/(home)/home-dashboard.tsx */
const [settledId, setSettledId] = useState<string | null>(null);
const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

/* One timer, not one per row: a new outcome on another row moves the tint
   and lets the previous row's transition retarget on its own. The clear at
   200ms is what arms the exhale (CSS handles the 240ms fade) and what lets
   the same row acknowledge a second outcome later. */
const markSettled = (id: string) => {
  if (settleTimer.current !== null) clearTimeout(settleTimer.current);
  setSettledId(id);
  settleTimer.current = setTimeout(() => {
    settleTimer.current = null;
    setSettledId(null);
  }, 200);
};

useEffect(() => {
  return () => {
    if (settleTimer.current !== null) clearTimeout(settleTimer.current);
  };
}, []);
```

And the reduced-motion rule shrinks to a comment — the timed clear now
carries the acknowledgement (tint appears for ~200ms, then leaves), and the
blanket reset in `globals.css` `@layer base` zeroes the fade durations, which
is the correct reduced-motion behavior here: the change is never withheld,
only the physics.

```css
/* target — src/app/admin/(portal)/(home)/home.css, replacing lines 1274-1278 */
  /* The settle wash needs no override: the timed clear in
     home-dashboard.tsx shows the mint tint for ~200ms either way, and the
     blanket reset in globals.css @layer base already collapses the 240ms
     exhale to an instant change. */
```

## Repo conventions to follow

- **Instant press, eased release** is the portal's documented temperament —
  exemplar: `src/app/admin/(portal)/(home)/home.css:573-577`
  (`.wgi-outcome:active` sets `transition-duration: 0s`; release rides the
  base transition). The `[data-settled]` rule above uses the same mechanism.
- The curve `cubic-bezier(0.19, 1, 0.22, 1)` is this surface's authored
  strong ease-out (home.css header, lines 4-7) — copy it verbatim.
- "Transitions over keyframes for anything that can be re-triggered
  mid-flight" is DESIGN.md "Motion" — this plan brings the file into
  compliance with the repo's own rule.
- React state + timers in this file follow plain `useState`/`useRef`
  patterns; `useEffect` cleanup for timers.

## Steps

1. In `src/app/admin/(portal)/(home)/home.css`, replace lines 182-195 (the
   comment, the `@keyframes wgi-settle` block, and the
   `.wgi-line-row[data-settled]` rule) with the target CSS above. The
   `@keyframes wgi-settle` block is deleted entirely.
2. In the same file's `@media (prefers-reduced-motion: reduce)` block,
   replace the `.wgi-line-row[data-settled]` rule (lines 1274-1278) with the
   target comment above (no rule remains).
3. In `src/app/admin/(portal)/(home)/home-dashboard.tsx`:
   - Extend the React import at line 4 to
     `import { useEffect, useMemo, useRef, useState } from "react";`
   - Directly after the `settledId` state declaration (line 41), add the
     `settleTimer` ref, the `markSettled` function, and the cleanup
     `useEffect` from the target above.
   - Change `onSettled={setSettledId}` (line 100) to
     `onSettled={markSettled}`.
4. Run `npx oxfmt` on both files if the formatter flags them.

## Boundaries

- Do NOT touch `line-list.tsx` — the `settle()` flow (`onSettled` →
  `onClose` → `router.refresh()`) and the `data-settled` wiring stay as they
  are.
- Do NOT touch the popover, sheet, or filter rules in `home.css`.
- Do NOT add exit animations for rows that an active filter removes after
  `router.refresh()` — known seam, out of scope here.
- Do NOT add new dependencies.
- If the code at the cited lines doesn't match the excerpts (drift since
  a303135), STOP and report instead of improvising.

## Verification

- **Mechanical**: `npx oxlint` (zero warnings/errors), `npx oxfmt --check`
  clean, `npm run build` succeeds.
- **Feel check**: run the portal home, open a row's record card, record
  "Reached — follow up later" (or any outcome):
  - The row tints mint the moment the card closes, holds a beat, then
    exhales back to transparent — the whole acknowledgement reads under
    half a second.
  - Record an outcome on row A, then quickly on row B: A's tint fades
    smoothly from wherever it was (no snap to transparent), B tints.
  - Record a second outcome on the **same** row (reopen its card, record
    again): the wash plays again. This is the bug that motivated the plan.
  - DevTools → Animations panel at 10% playback: the fade is a transition
    (retargets when interrupted), and the tint's arrival is instant, never
    eased.
  - DevTools → Rendering → emulate `prefers-reduced-motion: reduce`: the
    tint appears instantly, stays ~200ms, disappears — and critically, no
    row stays mint permanently.
- **Done when**: all three code sites match the targets, the same-row
  replay works, and no permanent mint row exists under reduced motion.
