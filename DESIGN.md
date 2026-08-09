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

## Committed staff-portal world — The Front Desk Ledger (2026-08-09)

The staff portal is a calm clinical workbench modeled on the practice's paper-routing stack,
not a generic software dashboard. Appointment requests are the visual and operational center;
administration recedes without becoming hard to find. This world governs the complete `/admin`
surface until it is deliberately re-chartered.

### Composition and navigation

- The persistent desktop task index is 17rem wide and carries four destinations: Home,
  Appointments, Settings, and Help. At narrow widths, the same destinations become a fixed,
  thumb-reachable bottom index; the mobile header carries identity and account actions.
- The working canvas is a cool near-white field (`--portal-canvas`), and its white work surfaces
  (`--portal-surface`) read as ruled sheets rather than floating cards. Borders establish
  sequence and grouping; shadow is reserved for overlays and temporary depth.
- Home is a triage and handoff workbench, not a metric dashboard. Appointments is one ordered
  ledger that recomposes from a dense desktop row into a readable mobile record without hiding
  status, next action, or recovery.
- Page titles, descriptions, status context, and the primary action form one repeated header
  contract. Settings tabs and appointment filters preserve location with `aria-current` rather
  than inventing new navigation behavior.

### Color, type, and state

- Deep navy (`--color-navy-2`) carries the task index and primary actions. Steel teal
  (`--color-teal`, `--color-teal-ink`) means selected, active, or ready. Amber
  (`--color-amber`, `--color-amber-soft`, `--portal-attention-ink`) is reserved for work that
  needs attention and for the visible focus ring. Color never carries state alone.
- The portal uses the body sans-serif for both interface text and headings. Hierarchy comes from
  weight, size, spacing, and density; display serif remains a restrained brand mark, never a
  costume for operational content. Counts and times use tabular numerals.
- Corners stay compact (`--radius-sm` through `--radius-lg`) and controls retain familiar native
  shapes. Pills are limited to counts and compact status tags, never used as page structure.

### Interaction, motion, and adaptation

- Every actionable target is at least 44px. Keyboard focus uses a three-pixel amber outline with
  offset, landmarks and headings remain semantic, and the shell exposes a skip link.
- Routine portal motion is limited to 150–160ms color feedback using a strong ease-out curve.
  Navigation and keyboard-triggered work do not slide, scale, or delay. Reduced motion keeps the
  state-changing color and opacity cues while removing nonessential movement.
- Desktop prioritizes scan density and a persistent working location. Mobile becomes one readable
  column with the primary destinations and account actions still in reach; it never clips a table
  or removes workflow truth. Print is a third authored mode: US Letter worksheets, one request per
  sheet, complete contact and request context, a paper routing area, and no application chrome.
- Pending, success, empty, partial-read, unavailable, conflict, unauthorized, completion, and
  recovery states use the same page and action contracts. Printing is explicitly non-mutating;
  the live queue remains authoritative before and after the paper handoff.

## Transition

Until a surface is rebuilt under a committed world, maintenance matches the surface's
existing implementation — the code is the reference, consistency with the surrounding
surface is the rule. No incumbent grammar constrains a rebuild, and no future world's
grammar half-adopts into a surface that has not been rebuilt.
