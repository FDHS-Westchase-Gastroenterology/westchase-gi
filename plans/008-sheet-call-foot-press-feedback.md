# 008 — Give the sheet's call and chart links hover transitions and press feedback

- **Status**: DONE
- **Commit**: a303135
- **Severity**: MEDIUM
- **Category**: Physicality & origin (press feedback) / Cohesion
- **Estimated scope**: 1 file (`src/app/admin/(portal)/(home)/home.css`), ~12 lines

## Problem

Inside the full-record sheet, the two most important links are the only
pressables on the surface with no motion at all:

- `.wgi-sheet-call` — the patient phone link (`<a href="tel:…">` in
  `src/app/admin/(portal)/(home)/full-record-sheet.tsx:170`), the sheet's
  primary action.
- `.wgi-sheet-foot` — the "open full chart" footer link
  (`full-record-sheet.tsx:197`).

Both snap their hover colors with no transition, and the call link gives no
press feedback. Every sibling pressable in this file transitions its hover
and compresses on press (`.wgi-sheet-close` scales to 0.94, `.wgi-empty-clear`
to 0.97). The mismatch makes the sheet's primary action feel dead — the UI
doesn't confirm it heard the press.

```css
/* src/app/admin/(portal)/(home)/home.css:1130-1146 — current */
.wgi-sheet-call {
  display: flex;
  align-items: center;
  gap: var(--ps-2);
  padding: 0.7rem 0.9rem;
  border-radius: var(--radius-sm);
  background: var(--color-mint);
  color: var(--color-teal-ink);
  font-size: var(--pt-base);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.wgi-sheet-call:hover {
  background: var(--color-mint-2);
  color: var(--color-teal-ink);
}
```

```css
/* src/app/admin/(portal)/(home)/home.css:1214-1228 — current */
.wgi-sheet-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-top: 1px solid var(--color-line);
  padding: 0.7rem 1.4rem;
  color: var(--color-teal-ink);
  font-size: var(--pt-xs);
  font-weight: 700;
}

.wgi-sheet-foot:hover {
  background: var(--color-mint);
  color: var(--color-teal-ink);
}
```

## Target

The call link gets the full sibling treatment: transitioned hover plus a
subtle press compression. It is a full-width bar (the sheet body is ~39rem
wide), so use `scale(0.98)` — the subtle end of the 0.95–0.98 press band;
0.94 is for compact icon buttons like `.wgi-sheet-close`.

The footer gets a hover transition only — it is a full-width navigation row,
and rows in this codebase do not scale on press.

```css
/* target — .wgi-sheet-call: add the transition to the base rule,
   add a new :active rule after the :hover rule */
.wgi-sheet-call {
  /* …existing declarations unchanged… */
  transition:
    background-color 130ms ease,
    transform 130ms cubic-bezier(0.23, 1, 0.32, 1);
}

.wgi-sheet-call:active {
  transform: scale(0.98);
}

/* target — .wgi-sheet-foot: add to the base rule */
.wgi-sheet-foot {
  /* …existing declarations unchanged… */
  transition: background-color 130ms ease;
}
```

And the reduced-motion block registers the new `:active` transform alongside
its siblings:

```css
/* target — inside @media (prefers-reduced-motion: reduce),
   home.css:1280-1286: add .wgi-sheet-call:active to the existing list */
.wgi-add-filter:active,
.wgi-sug:active,
.wgi-outcome:active,
.wgi-empty-clear:active,
.wgi-sheet-call:active,
.wgi-sheet-close:active {
  transform: none;
}
```

## Repo conventions to follow

- All motion for this surface lives in `src/app/admin/(portal)/(home)/home.css`.
- Color transitions use `130ms ease`; transform transitions use
  `130ms cubic-bezier(0.23, 1, 0.32, 1)` (the strong ease-out). Copy both
  verbatim.
- **Exemplar** — `.wgi-sheet-close` (`home.css:1097-1121`) is the pattern to
  imitate:

```css
.wgi-sheet-close {
  /* … */
  transition:
    background-color 130ms ease,
    transform 130ms cubic-bezier(0.23, 1, 0.32, 1);
}

.wgi-sheet-close:hover {
  background: var(--color-mint);
  color: var(--color-ink);
}

.wgi-sheet-close:active {
  transform: scale(0.94);
}
```

- Every `:active` scale in this file is neutralized in the
  `@media (prefers-reduced-motion: reduce)` block at the end of the file —
  new ones must join that list.

## Steps

1. In `src/app/admin/(portal)/(home)/home.css`, add to the `.wgi-sheet-call`
   base rule (lines 1130–1141), as the last declaration:

   ```css
   transition:
     background-color 130ms ease,
     transform 130ms cubic-bezier(0.23, 1, 0.32, 1);
   ```

2. Directly after the `.wgi-sheet-call:hover` rule (lines 1143–1146), add:

   ```css
   .wgi-sheet-call:active {
     transform: scale(0.98);
   }
   ```

   Keep it above the existing `.wgi-sheet-call > svg` rule.

3. Add to the `.wgi-sheet-foot` base rule (lines 1214–1223), as the last
   declaration:

   ```css
   transition: background-color 130ms ease;
   ```

4. In the `@media (prefers-reduced-motion: reduce)` block, find the selector
   list ending in `.wgi-sheet-close:active { transform: none; }`
   (lines 1280–1286) and add `.wgi-sheet-call:active,` to the list,
   immediately before `.wgi-sheet-close:active`.

## Boundaries

- Only touch `src/app/admin/(portal)/(home)/home.css`, and only the four
  edits above.
- Do NOT touch `full-record-sheet.tsx`, `parts/sheet.tsx`, or any markup —
  motion properties only.
- Do NOT add a press scale to `.wgi-sheet-foot` (navigation row, not a
  button) and do NOT change either element's hover colors.
- Do NOT gate the hovers behind `@media (hover: hover)` — color-only hovers
  are ungated throughout this file; that is a separate, unselected finding.
- Do NOT add new dependencies or tokens.
- If the current code at the cited lines doesn't match the excerpts above
  (drift since commit a303135), STOP and report instead of improvising.

## Verification

- **Mechanical**: `npx oxlint` (zero warnings/errors), `npx oxfmt --check`
  (clean), `npm run build` (succeeds).
- **Feel check**: run the portal home, open a call's full record, and
  confirm:
  - Hovering the phone-number bar: the mint deepens over ~130ms instead of
    snapping.
  - Press and hold the phone-number bar: it compresses slightly (edges move
    a few px) and springs back on release — matching the feel of pressing
    the sheet's × button.
  - Hovering the footer chart link: background fades in over ~130ms.
  - In DevTools → Animations panel at 10% playback: the press compression
    starts immediately on pointerdown (strong ease-out — fast start, gentle
    settle), never slow-then-fast.
  - DevTools → Rendering → emulate `prefers-reduced-motion: reduce`: the
    press no longer scales, but hover color transitions still work.
- **Done when**: all four edits are in place, the mechanical gates pass, and
  the call link's press feels indistinguishable in character from
  `.wgi-sheet-close`'s (same timing, same curve, subtler amplitude).
