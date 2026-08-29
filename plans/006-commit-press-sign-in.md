# 006 — Give the staff sign-in press a committed beat

- **Status**: DONE
- **Commit**: fe088fd
- **Severity**: MEDIUM
- **Category**: Interruptibility / asymmetric timing + missed opportunity (feedback)
- **Estimated scope**: 2 files (`button-variants.ts`, `login-form.tsx`), ~30 lines

## Problem

Pressing "Sign in" on `/admin/login` produces two soft, symmetric events and
then nothing. The button is the default `wgi` motion temperament, which inside
`.portal-scope` resolves to a 0.98 press on a 160ms `transition-all`, identical
in both directions:

```ts
/* src/components/ui/button-variants.ts:58-66 — current */
wgi: [
  "transition-all duration-[var(--btn-duration,200ms)] ease-[var(--btn-ease,var(--ease-out-quint))]",
  "hover:translate-y-[var(--btn-lift,-2px)] active:translate-y-0 active:scale-[var(--btn-active-scale,1)]",
  "motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:active:scale-100",
],
```

```css
/* src/app/globals.css:1230-1238 — the portal knobs that resolve it */
.portal-scope {
  --btn-lift: 0px;
  --btn-active-scale: 0.98;
  --btn-duration: 160ms;
  --btn-ease: var(--motion-exit);
}
```

Three problems, all in how the commit *feels*:

1. **Symmetric press and release.** 160ms down, 160ms up, on the same curve, is
   one smooth blend — there is no down beat and no up beat. AUDIT.md §4 calls
   symmetric press-and-release a finding: the press should be deliberate, the
   release should snap.
2. **The press releases before the commit lands.** On pointer-up the button
   returns to full size, then `pending` flips and the only remaining signal is
   the label crossfading to "Signing in…" through the blur veil
   (`src/app/globals.css:1381-1397`) while `disabled:opacity-65`
   (`src/app/admin/login/login-form.tsx:103`) fades the button toward inert.
   The button visually *lets go* at the exact moment the system takes over, and
   then looks weaker while the user waits. Nothing says "this landed".
3. **`transition-all`.** AUDIT.md §5: `all` animates unintended properties off
   the GPU. The submit press is the one control on this page whose smoothness
   the user is watching directly.

There is also no touch feedback: on a phone, a tap produces only the label
swap.

## Target

A new named motion temperament, `commit`, registered on the Button's existing
`motion` axis (DESIGN.md "Register legibility rules": motion is a decoupled
axis, temperaments are named, defaults stay the brand). Three discrete beats
instead of one blend:

| Beat | Trigger | Transform | Duration | Curve |
| --- | --- | --- | --- | --- |
| Down | `:active` | `scale(0.96)` + inset depth | 90ms | `--motion-exit` |
| Up (no commit) | pointer-up | `scale(1)`, depth off | 140ms | `--motion-exit` |
| Held (commit) | `data-pending` | `scale(0.98)` + inset depth | 110ms | `--motion-exit` |

The held beat is the point: when the action commits, the button does not travel
back to idle. It settles from the deep press to a shallower held state, keeps
its depth shadow, and stays there — at full opacity — until the server answers.
Release from the hold happens on the base 140ms snap when `data-pending` drops.

```ts
/* target — src/components/ui/button-variants.ts, new entry in the `motion` axis */
commit: [
  // Journey: transform and depth only, never `all` — the press stays on the GPU.
  "transition-[transform,box-shadow] duration-[var(--btn-release-duration,140ms)] ease-[var(--btn-ease,var(--motion-exit))]",
  // Down beat: deeper than the register press, landing in 90ms.
  "active:duration-[var(--btn-press-duration,90ms)] active:scale-[var(--btn-press-scale,0.96)] active:shadow-[var(--btn-press-depth,inset_0_2px_3px_-1px_oklch(0_0_0_/_0.32))]",
  // Held beat: the press does not release until the action resolves.
  "data-pending:duration-[var(--btn-commit-duration,110ms)] data-pending:scale-[var(--btn-commit-scale,0.98)] data-pending:shadow-[var(--btn-press-depth,inset_0_2px_3px_-1px_oklch(0_0_0_/_0.32))]",
  // Reduced motion: the depth cue alone carries press and commit.
  "motion-reduce:transition-[box-shadow] motion-reduce:active:scale-100 motion-reduce:data-pending:scale-100",
],
```

Depth is an inset shadow rather than a second transform, so
`prefers-reduced-motion` can drop every scale and still leave a real
confirmation: the button darkens inward on press and stays darkened while
committed. AUDIT.md §6 — reduced motion means gentler, not none.

Call site (`src/app/admin/login/login-form.tsx`): `motion="commit"`,
`data-pending={pending || undefined}`, `disabled:opacity-100` in place of
`disabled:opacity-65` so the committed button holds its weight, and a haptic
tick on pointer-down for touch:

```tsx
/* target */
<Button
  type="submit"
  motion="commit"
  disabled={pending}
  data-pending={pending || undefined}
  onPointerDown={() => {
    if ("vibrate" in navigator) navigator.vibrate(8);
  }}
  className="min-h-11 w-full disabled:cursor-wait disabled:opacity-100"
>
```

The label's blur-veil crossfade (`.portal-submit-label`) stays exactly as it
is. It is no longer the only signal, which is the whole point.

## Repo conventions to follow

- The motion axis is the only place a transition may live; base strings carry no
  motion (DESIGN.md:264-272). Exemplar: the `wgi` entry at
  `src/components/ui/button-variants.ts:57-72`, including its per-line job
  comments and its `motion-reduce:` line.
- Temperaments resolve through `--btn-*` knobs with inline defaults, so a scope
  can retune without fighting the cascade. Exemplar:
  `--btn-radius,var(--radius)` in the base string; the scope side is
  `.portal-scope` at `src/app/globals.css:1230-1238` and
  `.review-flyer-screen` at `src/app/globals.css:2158-2161`.
- Every variant carries a one-line consumer map naming surfaces by file path,
  never line numbers; a variant with no consumer says "no consumer today"
  (DESIGN.md:259-263).
- Long class strings are arrays, one line per job, each under its comment.
- Bare boolean `data-*` Tailwind v4 variants are already in use:
  `data-horizontal:` in `src/components/ui/separator.tsx:14`.
- Curves come from the `globals.css` motion registry (`--motion-exit`,
  `--ease-out-quint`); never hand-type a new cubic-bezier here.

## Steps

1. In `src/components/ui/button-variants.ts`, add the `commit` entry to the
   `motion` axis after `wgi` and before `shadcn`, exactly as in Target, with a
   block comment naming the three beats and the consumer
   (`src/app/admin/login/login-form.tsx`).
2. Update the register's header comment (the `motion` bullet, around line 13) so
   it names `commit` alongside `wgi`, `shadcn`, and `none`.
3. In `src/app/admin/login/login-form.tsx`, apply the call-site changes from
   Target on the submit `Button`.
4. Update `docs/COMPONENT-INVENTORY.md` (the paragraph under the
   `src/components/ui/` table, ~line 58) so the named temperaments it lists
   include `commit`.

## Boundaries

- Do NOT touch `.portal-submit-label` or its `@starting-style` block.
- Do NOT add a spinner, a progress bar, or any new element to the button.
- Do NOT change the `wgi` temperament, the `--btn-*` values in `.portal-scope`,
  or any other button on any other surface.
- Do NOT change `variant`/`size` axes or any color token — the held state is
  transform and inset depth only.
- Do NOT add a dependency; the haptic is `navigator.vibrate` behind an
  `in` guard.
- If the excerpts above do not match the code you find, STOP and report.

## Verification

- **Mechanical**: `npx oxlint` (zero warnings/errors), `npx oxfmt --check`,
  `npx react-doctor@latest --verbose` (100), `npm run build` — all clean.
- **Feel check** at `/admin/login`, 1440×900 and 390×844:
  - Press and hold the button without releasing: it drops to a clearly deeper
    press than before and darkens inward, landing fast (~90ms).
  - Drag off the button and release (no submit): it snaps back to idle in one
    fast beat, no bounce.
  - Submit with a wrong password: on release the button does **not** return to
    idle — it settles to the held state, keeps its depth, keeps full opacity,
    and stays there until the error renders, then snaps back.
  - In DevTools Animations at 10% speed, confirm three distinct beats
    (down 90ms → settle 110ms → release 140ms), not one blend.
  - Emulate `prefers-reduced-motion: reduce`: no scaling at all, but the inward
    darkening still appears on press and persists while committed.
  - On a real phone (or a touch-emulated device with vibration support), a tap
    produces a single short haptic tick and no double-fire on scroll.
- **Done when**: the click reads as a press that landed and stayed committed,
  the label swap is a supporting detail rather than the only signal, and the
  temperament is reachable by name from the register.
