# Animation plans — staff portal + patient site

Three audit passes so far, all on branch `portal/appointment-workflow-experience`:

- **001–006** — stamp `08bd929`. Scope: the modal work in the then-current
  diffs (`PortalModal`, `PortalCalendar`, `sheet-line.tsx`,
  `portal-workbench.css`, `globals.css` motion registry). All DONE (001
  verified fixed at `a303135` and reconciled).
- **007–008** — stamp `a303135`. Scope: the home dashboard's popover and
  sheet. Two LOW grip-polish findings (animated `height` on the grip pill;
  ungated grip `:hover` on touch) were audited but not selected for plans.
  007's step-4 cascade note was corrected during the 009–013 audit
  (specificity cannot beat the `!important` base reset; see plan 011).
- **009–013** — stamp `a303135`, whole-repo audit (purpose/frequency,
  easing/duration, physicality/origin, interruptibility, performance,
  accessibility, cohesion/tokens, opportunities). Three HIGH findings this
  pass: the broken outcome-settle acknowledgement, the default Button
  temperament (`transition-all`, no touch press), and the home surface's
  dead reduced-motion story. Vetted-but-unselected findings (MEDIUM: row
  trigger `:active`, symmetric home presses, teleporting account/nav menus,
  feedback-banner entry, home token sprawl; LOW: hover durations, loop
  easings, keyframe dialogs, token hygiene; plus two additive
  opportunities: filter-swap crossfade, appointment success moment) are
  recorded in the session audit and can be planned on request.

| # | Plan | Severity | Status |
|---|------|----------|--------|
| 001 | Fix the dead reduced-motion calendar crossfade | MEDIUM | DONE |
| 002 | Remove dead durations from reduced-motion reveal overrides | LOW | DONE |
| 003 | Tokenize the reveal's hardcoded 200ms fade | LOW | DONE |
| 004 | Confirm a calendar pick with a micro settle | LOW | DONE |
| 005 | Confirm the day commit on the trigger | LOW | DONE |
| 006 | Give the staff sign-in press a committed beat | MEDIUM | DONE |
| 007 | Sync the sheet backdrop to the drawer curve; faster exit | MEDIUM | DONE |
| 008 | Sheet call/chart links: hover transitions + press feedback | MEDIUM | DONE |
| 009 | Rebuild the outcome settle as a retargetable transition | HIGH | DONE |
| 010 | Rebuild the Button `wgi` temperament (no `transition-all`, touch press, instant down-beat) | HIGH | DONE |
| 011 | Register the home dashboard's reduced-motion opt-outs in `@layer base` | HIGH | DONE |
| 012 | Move five dead reduced-motion cross-fade durations into `@layer base` | MEDIUM | DONE |
| 013 | Stop animating the skip link | MEDIUM | DONE |

## Recommended execution order

1. **010** — one file, self-contained, the widest-felt fix (every Button on
   both registers); no interactions with anything else.
2. **013** — trivial, self-contained (`globals.css` only, two deletions).
3. **009** — the highest-severity behavioral bug (the settle wash);
   touches `home.css` + `home-dashboard.tsx`.
4. **007** then **008** — both edit `home.css`; sequential, 007 first.
5. **011** — after 009 (it must not touch 009's `[data-settled]` rule) and
   after 007 (007's reduced-motion verification changes once 011 lands).
   Edits `globals.css` + `home.css`.
6. **012** — after 011 (both append to the same `@layer base`
   reduced-motion block; 012's insertion point is "after the last opt-out").

## Dependencies

- **009 → 011**: 011's home.css edits skirt the `[data-settled]` rule that
  009 rewrites; run 009 first so 011 finds the block in its final shape.
- **011 → 012**: both append opt-outs to the `@layer base` reduced-motion
  block in `globals.css`; sequential execution only.
- **007/008/009/011** all edit `home.css`; never run two of them in
  parallel worktrees. Line numbers drift after each — the code excerpts in
  each plan are the source of truth, not the line numbers.
- **010** and **013** are independent of everything.

## Verification bar

Every plan inherits the repository's standing gates: `npx oxlint` (zero
warnings/errors), `npx oxfmt --check`, `npx react-doctor@latest --verbose`
(100), `npm run build`, and — for UI-visible plans — visual evidence in the
PR conversation (before/after screenshots; video for the settle wash in 009
and the reduced-motion fades in 011/012).
