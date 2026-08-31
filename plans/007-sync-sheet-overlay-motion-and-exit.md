# 007 — Sync the sheet backdrop to the drawer curve and give the pair a faster exit

- **Status**: DONE
- **Commit**: a303135
- **Severity**: MEDIUM (merges a MEDIUM overlay-desync finding and a LOW symmetric-exit finding — same file, same rule blocks, interdependent values)
- **Category**: Easing & duration / Cohesion
- **Estimated scope**: 1 file (`src/app/admin/(portal)/(home)/home.css`), ~10 lines

## Problem

The full-record sheet and its backdrop animate out of sync, and the sheet
exits as slowly as it enters.

1. The backdrop runs 150ms on the browser's weak built-in `ease` while the
   sheet runs 200ms on the iOS drawer curve. The dim + blur finish 50ms before
   the panel both ways; on close, the backdrop is fully gone while the sheet
   is still leaving, so the sheet momentarily floats over an undimmed page.

```css
/* src/app/admin/(portal)/(home)/home.css:953-959 — current */
.wgi-sheet-overlay {
  position: fixed;
  inset: 0;
  z-index: 50;
  background: rgb(0 0 0 / 10%);
  transition: opacity 150ms ease;
}
```

```css
/* src/app/admin/(portal)/(home)/home.css:987-989 — current (inside .wgi-sheet) */
  transition:
    transform 200ms cubic-bezier(0.32, 0.72, 0, 1),
    opacity 200ms cubic-bezier(0.32, 0.72, 0, 1);
```

2. The sheet's enter and exit are both 200ms. The popover in the same file
   already establishes the asymmetric convention — deliberate enter, snappy
   exit (160ms in / 120ms out, a 75% ratio). The sheet should follow: exits
   are the system responding, and they should be faster than entrances.

```css
/* src/app/admin/(portal)/(home)/home.css:992-996 — current */
.wgi-sheet[data-starting-style],
.wgi-sheet[data-ending-style] {
  opacity: 0;
  transform: translateX(2.5rem);
}
```

(There is no `.wgi-sheet[data-ending-style]` duration override today — exit
inherits the 200ms.)

## Target

Backdrop and sheet share the drawer curve and the same clock. Both enter in
200ms; both exit in 150ms (the popover's 75% ratio applied to 200ms).

```css
/* target — .wgi-sheet-overlay base rule, only the transition line changes */
.wgi-sheet-overlay {
  position: fixed;
  inset: 0;
  z-index: 50;
  background: rgb(0 0 0 / 10%);
  transition: opacity 200ms cubic-bezier(0.32, 0.72, 0, 1);
}

/* target — new rule, placed directly after the existing
   .wgi-sheet-overlay[data-starting-style], [data-ending-style] block */
.wgi-sheet-overlay[data-ending-style] {
  transition-duration: 150ms;
}

/* target — new rule, placed directly after the existing
   .wgi-sheet[data-starting-style], [data-ending-style] block */
.wgi-sheet[data-ending-style] {
  transition-duration: 150ms;
}
```

The sheet's own transition block (lines 987–989) does not change.

## Repo conventions to follow

- All motion for this surface lives in `src/app/admin/(portal)/(home)/home.css`;
  Base UI drives enter/exit via `[data-starting-style]` / `[data-ending-style]`.
- The drawer curve is `cubic-bezier(0.32, 0.72, 0, 1)` — already used by
  `.wgi-sheet` at `home.css:988`. Copy it verbatim; do not substitute another
  curve.
- **Exemplar for the asymmetric-exit pattern** — imitate this structure
  exactly (`home.css:457-478`):

```css
.wgi-popover {
  /* … */
  transition:
    transform 160ms cubic-bezier(0.23, 1, 0.32, 1),
    opacity 160ms cubic-bezier(0.23, 1, 0.32, 1);
}

.wgi-popover[data-starting-style],
.wgi-popover[data-ending-style] {
  opacity: 0;
  transform: scale(0.95);
}

.wgi-popover[data-ending-style] {
  transition-duration: 120ms;
}
```

## Steps

1. In `src/app/admin/(portal)/(home)/home.css`, in the `.wgi-sheet-overlay`
   rule (lines 953–959), replace
   `transition: opacity 150ms ease;` with
   `transition: opacity 200ms cubic-bezier(0.32, 0.72, 0, 1);`.
2. Directly after the `.wgi-sheet-overlay[data-starting-style], .wgi-sheet-overlay[data-ending-style]`
   block (lines 961–964), add:

   ```css
   .wgi-sheet-overlay[data-ending-style] {
     transition-duration: 150ms;
   }
   ```

3. Directly after the `.wgi-sheet[data-starting-style], .wgi-sheet[data-ending-style]`
   block (lines 992–996), add:

   ```css
   .wgi-sheet[data-ending-style] {
     transition-duration: 150ms;
   }
   ```

4. Do **not** edit the `@media (prefers-reduced-motion: reduce)` block at the
   end of the file. (Correction to this plan's original note: under reduced
   motion, none of this file's durations apply — the blanket reset in
   `globals.css` `@layer base` is `!important`, and important declarations
   outrank everything non-important regardless of layer or specificity, so
   the new 150ms exits are flattened along with everything else. Plan 011
   registers the sheet/overlay/popover opt-outs in `@layer base`, which is
   the only place a reduced-motion duration can win. Either way, this
   plan's edits are correct for the non-reduced path and need no
   reduced-motion companion here.)

## Boundaries

- Only touch `src/app/admin/(portal)/(home)/home.css`, and only the three
  edits above.
- Do NOT touch `parts/sheet.tsx`, `full-record-sheet.tsx`, or any markup.
- Do NOT change the sheet's enter offset (`translateX(2.5rem)`) — the
  nudge-plus-fade entrance is a documented design decision
  (portal-home-redesign-brief §4.5).
- Do NOT change the popover rules or the reduced-motion block.
- Do NOT add new dependencies or tokens.
- If the current code at the cited lines doesn't match the excerpts above
  (drift since commit a303135), STOP and report instead of improvising.

## Verification

- **Mechanical**: `npx oxlint` (zero warnings/errors), `npx oxfmt --check`
  (clean), `npm run build` (succeeds).
- **Feel check**: run the portal home, open a call's full record (the right
  sheet), and confirm:
  - Opening: backdrop dim/blur and sheet slide start and finish together —
    no moment where one has settled and the other is still moving.
  - Closing (press Escape): the close reads snappier than the open, and the
    page never shows the sheet floating over an already-undimmed background.
  - In DevTools → Animations panel at 10% playback: overlay opacity and sheet
    transform curves are the same shape and length on enter; both end
    together on exit.
  - Spam open/close rapidly: transitions retarget smoothly from their
    current position, never restarting from zero.
  - DevTools → Rendering → emulate `prefers-reduced-motion: reduce`: the
    sheet no longer slides (appears in place). Before plan 011 lands, enter
    and exit are both effectively instant (the `!important` base reset
    flattens every duration this file authors); after 011, both are a
    ~120ms cross-fade.
- **Done when**: all three edits are in place, the mechanical gates pass, and
  the enter/exit timings observed in the Animations panel are 200ms in /
  150ms out for both `.wgi-sheet` and `.wgi-sheet-overlay`.
