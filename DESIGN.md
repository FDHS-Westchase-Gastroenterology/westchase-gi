# Design Charter: Westchase Gastroenterology

The v2 frame. Fidelity to the previous vendor site is no longer the mission. This document
records what the practice owns, the floors that bind every surface, and the guardrails each
register keeps. Everything else is free: typefaces (Lato and Trocchi are v1 incumbents, not
commitments), token values and their roles, layout system, component vocabulary, motion
grammar, header treatment, and composition. The v1 rulebook is retired without archive and
carries no authority anywhere.

Visual worlds are chosen at build kickoff, per surface effort, through a full direction
derivation. They are never inherited from this file. When a first build settles a world, its
surviving tokens and rules are recorded here. Until then this charter carries no palette
table, no component vocabulary, and no motion spec.

## What the practice owns

Anchors: fixed points every future world composes around. Amending one is a practice
decision, never a design judgment.

1. **The brand hues.** Navy, teal, amber, and the mint family remain the identity. Both
   products visibly carry them. The commitment binds the hues, not the retired token
   table: a world may re-weight them, re-derive values, and re-decide their roles.
2. **The team greets you.** The full-staff photograph opens the patient site. The
   practice wants its real people meeting visitors. Composition around that fixed point
   is free.
3. **The hero is static** (practice decision, 2026-07-07). Auto-rotating heroes were
   reviewed and emphatically declined. Recompose freely; never rotate.
4. **Real people, real places.** Photography is the practice's own; stock stand-ins for
   its people or places never ship. Authored illustration and iconography remain open to
   the build era.
5. **FDHS affiliation is present and credible** on every patient-facing surface.
   Referring physician offices come to verify it. The treatment (today's header strip)
   is free.
6. **Essential text is localizable HTML** (practice direction, 2026-07-07). Provider
   names, credentials, and patient information render as real translatable text in every
   locale, never carried solely by imagery.

## Floors

Non-negotiable in every world, both registers:

- **WCAG 2.1 AA**, with every text/background pair verified, not assumed, at AA or
  better. Accessibility specifics (tap targets, focus, landmarks) live in `PRODUCT.md`.
- **Reduced motion is honored globally**: gentler, never broken.
- **Five locales are one design.** Any chosen typeface serves English, Spanish,
  Vietnamese, Korean, and Arabic, or names script companions, and layout holds under
  RTL. Type is free; the languages are not.
- **Content is visible without JavaScript.** No world may hide content behind script
  that might not run.
- **Provenance.** Harvested practice artifacts (official provider-card graphics,
  source mirrors in `public/images/`) remain byte-exact as preserved; the six published
  headshot derivatives remain the documented exception. No re-encoding, no unapproved
  replacement.

## Patient site guardrails (brand register)

The scene: adults 45 and older, often anxious, usually on phones, in waiting rooms and
kitchens. The scene, not category habit, keeps the site light-themed, generously typed,
and high-contrast until the scene itself changes. Interruption and ask policies are
product law in `PRODUCT.md`.

## Staff portal guardrails (product register)

Operate posture: scanability, consistency, and native expectations outrank expression;
brand lives in precise details, used with restraint. Motion is state-conveying only, within
ordinary UI budgets. Task vocabulary and workflow truths are product law in `PRODUCT.md`.

## Committed staff-portal world — The Day Sheet (2026-08-25)

The staff portal is the practice's daily call sheet: the ruled, columnar worksheet a medical
front office actually runs its day from. It is not a dashboard, and it is not a dashboard wearing
paper vocabulary. This world replaces The Front Desk Ledger (2026-08-09), which named a paper
metaphor and shipped cards, colored summary bands, and count sentences instead. It governs the
complete `/admin` surface until deliberately re-chartered.

The unit of every operational surface is **the line**: one patient, one next action, one time.
Counts are column headers, never headlines. The largest text on a working page is the day it
describes; the second largest is a patient's name. A number nobody can act on never outranks a
name somebody must call.

### Composition and navigation

- The persistent desktop task index is 17rem wide and carries four destinations: Home,
  Appointments, Settings, and Help. At narrow widths the same destinations become a fixed,
  thumb-reachable bottom index; the mobile header carries identity and account actions.
- The working canvas is a cool near-white field (`--portal-canvas`). Rows sit on white paper
  (`--portal-surface`) and are divided by hairlines and space. Cards are not a page scaffold;
  shadow is reserved for overlays.
- **Figure and ground come from value alone, and the separation is deliberately slight.** No
  shadow, no filter, no border on a row: white rows on the cool field are about a 1.12:1
  luminance step, which reads as ruled bands recessed into the desk rather than as cards
  floating above it. Headings and names, sitting directly on the field at full ink contrast, are
  the forward layer. This quietness is the decision, not an oversight — do not "fix" it by
  adding depth. The rule against filled regions is about color washes carrying meaning, not
  about the paper the rows are printed on.
- Every operational page opens with a **sheet header**: the day or the page's subject set large,
  identity as small print above it, the primary action at the opposite end, and a closing rule.
  It is a title block on a form, not a hero.
- Sections are ruled groups introduced by a heading and a count. Rows carry no internal card
  chrome; the hairline between them is the ruling.
- Staff-authored intake and other multi-field tasks remain ruled worksheets in the working
  canvas, laid out as one linear task on desktop and mobile.
- Settings tabs and appointment filters preserve location with `aria-current` rather than
  inventing navigation behavior.

### Type

- One family: the body sans-serif carries interface text, headings, labels, and data. The
  display serif never dresses operational content.
- A fixed rem scale, never fluid. `clamp()` headings do not serve product UI, and a fluid size
  on a count sentence is what inverted figure and ground in the previous world. The steps, at a
  1.2 ratio on a 15px body floor:
  `--pt-2xs` 0.6875rem tracked uppercase column heads, `--pt-xs` 0.8125rem meta and timestamps,
  `--pt-sm` 0.9375rem body floor, `--pt-base` 1.0625rem the datum on a line (a patient's name),
  `--pt-lg` 1.25rem group headings, `--pt-xl` 1.75rem the sheet's day.
- Exactly three weights: 400 body and meta, 600 names and labels, 800 the day and group heads.
  Hierarchy comes from size and space. Stacking many near-identical sizes and pushing hierarchy
  onto weight is the failure this replaces.
- Counts, phone numbers, and times use tabular numerals.

### Space

- A 4px base. Space, not color, performs grouping: 32px above a group heading and 8px below it,
  rows separated by hairlines with no gap, sheet padding 24px desktop and 16px mobile.
- More space above a heading than below it, everywhere.

### Color

Restrained: white paper and navy ink, with each practice hue holding exactly one role. The four
hues remain the identity (see anchor 1); this world re-weights and reassigns them.

- **Navy** (`--color-navy`, `--color-navy-2`) is the form's printed ink: the task index, sheet
  rules, and primary actions.
- **Teal** (`--color-teal`, `--color-teal-ink`) means current, selected, or hovered — the finger
  tracking a line. Nothing else.
- **Amber** (`--color-amber`, `--color-amber-deep`, `--portal-attention-ink`) means attention,
  and appears only as a stamp, a tag, or a hairline marker **on a line**, plus the focus ring.
  Amber never washes a region. Filling whole bands with competing amber tints is what drained the
  one color reserved for attention.
- **Mint** (`--color-mint`) is the only hue permitted to tint a large area, and only for a
  settled or cleared state.
- Color never carries state alone; a stamp always carries words.

### Interaction, motion, and adaptation

- Every actionable target is at least 44px. Keyboard focus uses a two-pixel teal outline with
  offset — focus is the tracked line, which is teal's one role — turned inward on full-bleed
  rows so the hairline above and below cannot clip it. Landmarks and headings stay semantic, and
  the shell exposes a skip link.
- Motion is state feedback only: 150–160ms color transitions on a strong ease-out. Navigation
  and keyboard-triggered work never slide, scale, or delay. Reduced motion keeps color and
  opacity cues and drops movement.
- **Lists are never clipped, and they never scroll inside the page.** A fixed-height scroll box
  is not disclosure: it makes eighteen rows look exactly like four, hides its own size behind an
  overlay scrollbar, captures the wheel from the page that already scrolls, sends keyboard focus
  to rows nobody can see, and prints as whatever fit the clipped height. A long group instead
  holds six lines open and **expands the rest in place**, and its heading's count states the true
  total whether open or closed. Only past a render ceiling does a remainder link out. The reason
  to cap is that a long first group must not bury the groups below it — never to conceal how much
  work is waiting.
- Desktop prioritizes scan density and a persistent working location. Mobile becomes one
  readable column with destinations and account actions in reach; it never clips a row or drops
  workflow truth. Print is a third authored mode, and screen and paper are the same material:
  US Letter worksheets, one request per sheet, full contact and request context, a paper routing
  area, no application chrome.
- Pending, success, empty, partial-read, unavailable, conflict, unauthorized, completion, and
  recovery states use the same page and action contracts. A failed read reports that it failed;
  it never renders as a zero. Printing is non-mutating, and the live queue stays authoritative
  before and after a paper handoff.

## Transition

Until a surface is rebuilt under a committed world, maintenance matches the surface's
existing implementation. The code is the reference; consistency with the surrounding
surface is the rule. No incumbent grammar constrains a rebuild, and no future world's
grammar half-adopts into a surface that has not been rebuilt.
