# 010 — Rebuild the Button `wgi` temperament: named properties, a real touch press, an instant down-beat

- **Status**: DONE
- **Commit**: a303135
- **Severity**: HIGH
- **Category**: Performance / Physicality / Interruptibility / Accessibility
- **Estimated scope**: 1 file (`src/components/ui/button-variants.ts`), ~8 lines

## Problem

Every `<Button>` in the app (and every anchor CTA wearing the recipe via
className) defaults to the `wgi` motion temperament, and its three class
strings carry four defects:

```ts
/* src/components/ui/button-variants.ts:60-67 — current */
        wgi: [
          // Journey: what animates, how long, on which curve
          "transition-all duration-[var(--btn-duration,200ms)] ease-[var(--btn-ease,var(--ease-out-quint))]",
          // Physics: the hover lift and the knob-driven press
          "hover:translate-y-[var(--btn-lift,-2px)] active:translate-y-0 active:scale-[var(--btn-active-scale,1)]",
          // Reduced motion: everything flattens
          "motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:active:scale-100",
        ],
```

1. **`transition-all`** animates unintended properties off the GPU — most
   visibly the keyboard focus ring (`focus-visible:ring-3` is box-shadow):
   every Tab press fades the ring in over 200ms. Keyboard-initiated actions
   never animate. The sibling `commit` temperament states the repo's own
   standard at line 77: *"transform and depth only, never `all`"*.
2. **No press feedback on touch, anywhere on the patient site.**
   `--btn-active-scale` is assigned only by `.portal-scope`
   (`globals.css:1236`, `0.98`) and `.review-flyer-screen`
   (`globals.css:2160`, `0.98`); everything under `src/app/[locale]/` takes
   the `1` fallback. On touch the hover lift never applies (Tailwind v4
   gates `hover:` behind `@media (hover: hover)`), so `active:translate-y-0`
   and `active:scale-[1]` are both no-ops — the site's conversion CTAs give
   zero response to a tap. The repo already diagnosed this once, for one
   screen only (`globals.css:2163-2167` zeroes `--btn-lift` under
   `@media (hover: none)` and sets a 0.98 press).
3. **The press is symmetric.** Down-beat and release both run the 160/200ms
   journey. The portal's documented convention is the opposite
   (`portal-workbench.css:775-782`: *"Pressed arrives instantly — easing
   into a press is just the lag it looks like — and releases on the ease-out"*).
4. **`motion-reduce:transition-none` removes color feedback too**, not just
   travel. Reduced motion means gentler, not zero — hover/press tints aid
   comprehension. `commit` does this correctly at line 84
   (`motion-reduce:transition-[box-shadow]`).

## Target

```ts
/* target — src/components/ui/button-variants.ts, replacing lines 60-67 */
        wgi: [
          // Journey: paint and travel by name — never `all`. Box-shadow is
          // deliberately not listed: the keyboard focus ring must land
          // instantly (a Tab press repeats all day and never animates), and
          // the hover shadows snap with it.
          "transition-[background-color,border-color,color,translate,scale] duration-[var(--btn-duration,200ms)] ease-[var(--btn-ease,var(--ease-out-quint))]",
          // Physics: the hover lift and the knob-driven press. Down arrives
          // instantly (easing into a press is the lag it looks like);
          // release rides the journey above. 0.98 is the default press so
          // touch — which never sees the hover-gated lift — still gets an
          // answer.
          "hover:translate-y-[var(--btn-lift,-2px)] active:translate-y-0 active:scale-[var(--btn-active-scale,0.98)] active:duration-0",
          // Reduced motion: travel flattens, paint feedback stays
          "motion-reduce:hover:translate-y-0 motion-reduce:active:scale-100 motion-reduce:transition-[background-color,border-color,color]",
        ],
```

Exactly three changed lines (plus their comments):

- `transition-all` → `transition-[background-color,border-color,color,translate,scale]`
  (Tailwind v4 uses the individual `translate` and `scale` CSS properties
  for `translate-y-*` and `scale-*` utilities — do not write `transform`).
- `active:scale-[var(--btn-active-scale,1)]` → fallback `0.98`, and append
  `active:duration-0`.
- `motion-reduce:transition-none` → `motion-reduce:transition-[background-color,border-color,color]`.

Knock-on effects, all intended — do not "fix" them:

- The hover shadow on `default`/`amber` (`hover:shadow-[var(--btn-hover-shadow,…)]`)
  and the outline variant's inset hairline now snap instead of fading.
  That is the accepted cost of an instant focus ring; both share the
  box-shadow property.
- The portal (`--btn-active-scale` already 0.98) visibly changes only in
  gaining the instant down-beat and the instant focus ring.

## Repo conventions to follow

- Exemplar in the same file: the `commit` temperament, lines 76-85 — named
  transition properties, an `active:duration-*` down-beat override, and a
  `motion-reduce:transition-[…]` list that keeps comprehension feedback.
- Instant-down/eased-release is also the authored CSS convention:
  `portal-workbench.css:775-782` and
  `src/app/admin/(portal)/(home)/home.css:573-577` (`.wgi-outcome:active`
  → `transition-duration: 0s`).
- Class strings in this file are arrays, one line per job, each with a
  comment — keep that structure.

## Steps

1. In `src/components/ui/button-variants.ts`, replace lines 60-67 (the
   whole `wgi:` array, comments included) with the target block above.
2. Update the file-header comment (lines 14-17) where it describes `wgi` as
   "the authored .btn physics (200ms quint, the -2px hover lift, the
   knob-driven press)" to mention the instant down-beat and the 0.98
   default press, e.g.: "the authored .btn physics (200ms quint journey,
   the -2px hover lift, an instant 0.98 press)".
3. Run `npx oxfmt` on the file if the formatter flags it.

## Boundaries

- Do NOT touch the `commit`, `shadcn`, or `none` temperaments, any
  `variant`/`size` entries, or `defaultVariants`.
- Do NOT touch `globals.css` — the `.portal-scope` and
  `.review-flyer-screen` knob blocks stay exactly as they are (the 0.98
  fallback makes them redundant-but-harmless; removing them is not this
  plan's business).
- Do NOT add `box-shadow` to either transition list.
- Do NOT add new dependencies.
- If the current code at lines 60-67 doesn't match the excerpt (drift since
  a303135), STOP and report instead of improvising.

## Verification

- **Mechanical**: `npx oxlint` (zero warnings/errors), `npx oxfmt --check`
  clean, `npm run build` succeeds.
- **Feel check**:
  - Marketing home (`/en`): Tab to "Request an appointment" — the focus
    ring appears **instantly**, no fade. Click and hold the CTA — it
    compresses to 0.98 with zero lag; release — it eases back over ~200ms.
  - In responsive/touch emulation (or a real phone): tap the CTA — the
    0.98 compression is visible during the tap. Before this plan it did
    nothing.
  - Portal (`/admin`): press any toolbar/save Button — down-beat is
    instant, release eased at 160ms; hovering still tints with no lift.
  - DevTools → Animations panel at 10% playback on a hover: only colors
    (and translate) animate — the shadow and ring change without a
    transition entry.
  - DevTools → Rendering → emulate `prefers-reduced-motion: reduce`: press
    and hover still change color; nothing travels or scales.
- **Done when**: the three class strings match the target, Tab focus is
  instant everywhere, and a touch tap visibly compresses buttons on the
  patient site.
