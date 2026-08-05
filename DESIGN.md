# Design Charter — Westchase Gastroenterology

The v2 frame. Fidelity to the previous vendor site is no longer the mission. This document
records what the practice owns, the floors that bind every surface, and the guardrails each
register keeps. Everything else is free: typefaces (Lato and Trocchi are v1 incumbents, not
commitments), token values and their roles, layout system, component vocabulary, motion
grammar, header treatment, and composition. The v1 rulebook is retired without archive and
carries no authority anywhere.

Visual worlds are chosen at build kickoff, per surface effort, through a full direction
derivation — never inherited from this file. When a first build settles a world, its
surviving tokens and rules are recorded here; until then this charter deliberately carries
no palette table, no component vocabulary, and no motion spec.

## What the practice owns

Anchors: fixed points every future world composes around. Amending one is a practice
decision, never a design judgment.

1. **The brand hues.** Navy, teal, amber, and the mint family remain the identity — both
   products visibly carry them. The commitment binds the hues, not the retired token
   table: a world may re-weight them, re-derive values, and re-decide their roles.
2. **The team greets you.** The full-staff photograph opens the patient site — the
   practice wants its real people meeting visitors. Composition around that fixed point
   is free.
3. **The hero is static** (practice decision, 2026-07-07). Auto-rotating heroes were
   reviewed and emphatically declined. Recompose freely; never rotate.
4. **Real people, real places.** Photography is the practice's own; stock stand-ins for
   its people or places never ship. Authored illustration and iconography remain open to
   the build era.
5. **FDHS affiliation is present and credible** on every patient-facing surface —
   referring physician offices come to verify it. The treatment (today's header strip)
   is free.
6. **Essential text is localizable HTML** (practice direction, 2026-07-07). Provider
   names, credentials, and patient information render as real translatable text in every
   locale, never carried solely by imagery.

## Floors

Non-negotiable in every world, both registers:

- **WCAG 2.1 AA**, with every text/background pair verified — not assumed — at AA or
  better. Accessibility specifics (tap targets, focus, landmarks) live in `PRODUCT.md`.
- **Reduced motion is honored globally**: gentler, never broken.
- **Five locales are one design.** Any chosen typeface serves English, Spanish,
  Vietnamese, Korean, and Arabic — or names script companions — and layout holds under
  RTL. Type is free; the languages are not.
- **Content is visible without JavaScript.** No world may hide content behind script
  that might not run.
- **Provenance.** Harvested practice artifacts (official provider-card graphics,
  source mirrors in `public/images/`) remain byte-exact as preserved; the six published
  headshot derivatives remain the documented exception. No re-encoding, no unapproved
  replacement.

## Patient site guardrails (brand register)

The scene: adults 45 and older, often anxious, usually on phones, in waiting rooms and
kitchens. The scene — not category habit — keeps the site light-themed, generously typed,
and high-contrast until the scene itself changes. Interruption and ask policies are
product law in `PRODUCT.md`.

## Staff portal guardrails (product register)

Operate posture: scanability, consistency, and native expectations outrank expression;
brand lives in precise details, at restraint. Motion is state-conveying only, within
ordinary UI budgets. Task vocabulary and workflow truths are product law in `PRODUCT.md`.

### Committed portal world — The Day Sheet (2026-08-04)

Derived through the full direction derivation inside the staff-portal v2 prototype
([issue #220](https://github.com/FDHS-Westchase-Gastroenterology/westchase-gi/issues/220),
seed key `0064b225`) and approved by the driving dev. The portal renders as the front
desk's own paper day sheet: the queue is a ruled page whose order *is* the working
order, the request detail is the request's own page, and history is a ledger —
append-only, corrected by strike-through, never erased. First build:
`src/app/admin/v2/` (prototype). Incumbent portal surfaces keep the transition rule
until rebuilt under this world; the patient site is untouched.

Durable system rules:

- **Palette roles.** Brand hues carry as desk materials: paper page on a mint-washed
  desk ground; navy is ink (text, rules, structure); teal is the pen (actions, links,
  the acting hand); amber is the margin flag (attention, overdue, NEW); mint is the
  confirmation wash. Terminal states stamp — Booked in teal, Closed in slate-navy —
  with the date inside the stamp.
- **The attention gutter.** Every queue row reserves a left gutter column for one
  mark: a NEW flag, a due chip, an attempt tally, or a mini stamp. Attention is
  structural (position on the page plus the gutter), never a bell or a badge pile.
- **Ledger grammar.** Ruled section heads carry a label and a count sitting on the
  rule; rows separate with fine rules, not cards; dates, times, phones, and counts
  set in tabular figures. No card grids, no nested containers.
- **Type.** One workhorse family, Public Sans, with weight doing hierarchy and
  `tabular-nums` on every figure column. The staff-facing state vocabulary renders
  Booked, never BOOKED; Scheduled remains the action label only.
- **Motion.** State-conveying, ≤300ms, strong ease-out, never ease-in. The stamp
  settle on a terminal save is the single standard-tier moment (~220ms scale
  1.06→1 + opacity). Reduced motion keeps opacity and color, drops movement.
- **Corrections strike, never erase.** Undo renders the compensated entry struck
  through with a compensating line beneath — the visual contract of the machine's
  append-only history.
- **Honest paper.** The grammar stays grammar: rules, stamps, tabular figures.
  No paper textures, no skeuomorphic shadows, no handwriting faces.

## Transition

Until a surface is rebuilt under a committed world, maintenance matches the surface's
existing implementation — the code is the reference, consistency with the surrounding
surface is the rule. No incumbent grammar constrains a rebuild, and no future world's
grammar half-adopts into a surface that has not been rebuilt.
