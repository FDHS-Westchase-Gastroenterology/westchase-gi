# Design 

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
- **Five locales are one design.** Any chosen typeface serves English, Spanish,
  Vietnamese, Korean, and Arabic, or names script companions, and layout holds under
  RTL. Type is free; the languages are not.
- **Provenance.** Harvested practice artifacts (official provider-card graphics,
  source mirrors in `public/images/`) remain byte-exact as preserved; the six published
  headshot derivatives remain the documented exception. No re-encoding, no unapproved
  replacement.

## Staff portal — The Line

The world itself is product law in [`PRODUCT.md`](PRODUCT.md#north-star). This section is how
that world is composed.

### Composition and navigation

- The persistent desktop task index is 17rem wide and carries four destinations: Home,
  Appointments, Settings, and Help. At narrow widths the same destinations become a fixed,
  thumb-reachable bottom index; the mobile header carries identity and account actions.
- The working canvas is a cool near-white field (`--portal-canvas`). Rows sit on white paper
  (`--portal-surface`) and are divided by hairlines and space.

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

- A seven-step rem scale carries every gap: `--ps-1` 0.25rem, `--ps-2` 0.5rem, `--ps-3`
  0.75rem, `--ps-4` 1rem, `--ps-6` 1.5rem, `--ps-8` 2rem, `--ps-12` 3rem. Values between
  steps do not exist; a gap that wants one is a hierarchy question, not a spacing one.
- Space separates; hairlines (`--color-line`) divide. A group owns its lines with a rule
  and breathing room, never a card wash or a border box.
- **Groups window, they do not grow.** A group of five lines or fewer stands fully open.
  A taller group holds a fixed window — four and a half rows on desktop, three and a half
  on mobile — and scrolls within it. The deliberately half-cut row at the window's edge is
  the whole affordance: a reader who can see half a line knows there is more, the way a
  paper tray does. No Show-all control, no disclosure caret, no reflow. This overturns the
  earlier contract that lists are never clipped to a scroll box; that rule guarded against
  hidden truth, and the guard survives it — the heading's count always states the group's
  true total, so nothing scrolled out of view is ever unaccounted for.
- The window is cut in row units (`calc()` on the row's authored height plus its
  hairline), never in pixels of viewport, so the half-cut line lands on a line at every
  size.
- The page still refuses unbounded documents: rendering caps at forty lines per group,
  and a group past the cap says its exact remainder as a link into Appointments
  ("6 more in Appointments").
- Print is paper: a windowed group prints every rendered line, unscrolled.

### Color

Restrained: white paper and navy ink, with each practice hue holding exactly one role. The four
hues remain the identity (see anchor 1); this world re-weights and reassigns them.

- **Navy** (`--color-navy`, `--color-navy-2`) is the form's printed ink: the task index, sheet
  rules, and primary actions.
- **Teal** (`--color-teal`, `--color-teal-ink`) means current, selected, or hovered — the finger
  tracking a line. Nothing else.
- **Amber** (`--color-amber`, `--color-amber-deep`, `--portal-attention-ink`) means attention.
  Current use is a stamp, a tag, or a hairline marker on a line, plus the focus ring.
- **Mint** (`--color-mint`) is the only hue permitted to tint a large area, and only for a
  settled or cleared state.
- Color never carries state alone; a stamp always carries words.

### Interaction, motion, and adaptation

The world's thesis — the line is where work is read and recorded — now includes how the
work opens. A patient's line is one press target end to end: press anywhere on it and the
line lifts into a modal that carries the same facts (name, stamp, preference, timing, the
dialable number) plus the outcome decision. The phone number stays a live `tel:` link
inside the row and inside the modal; Record remains as a labeled synonym for the same
press. The old behavior — the row navigating to a detail page — is demoted to a quiet
"Open full record" link at the modal's foot. This amends the earlier contract that work
about one patient never covers the page: the modal is the line, lifted; it opens over the
sheet it came from, returns focus to the line that opened it, and never navigates.

**The motion registry.** Four tokens in the portal scope carry every authored movement,
so surfaces cannot each invent a temperament:

- `--pm-spring` / `--pm-spring-duration` (440ms) — arrival. A ζ≈0.7 spring sampled into
  CSS `linear()`: the visible move lands in the first ~110ms, overshoots 4.6% once, and
  settles without a second bounce. Alive, never playful — this is a clinic.
- `--pm-exit` / `--pm-exit-duration` (160ms) — departure. A strong ease-out, faster than
  arrival, back along the entrance path.

Rules of use:

- **Every modal is one modal.** Dialogs render through the shared native-`<dialog>`
  primitive and the shared dialog class: rise 12px, grow from 97%, on the registry spring;
  leave on the registry exit. A modal learned once is learned everywhere. Entrances and
  exits are transitions, not keyframes, so a close mid-entrance reverses from wherever the
  surface is.
- **A modal that must fetch still opens on the spring's schedule** and shimmers a
  skeleton while it waits. The surface is never late, only its facts.
- **Scroll is tracked, not decorated.** A windowed group carries a 2px teal rail that
  fills with scroll progress — teal's one meaning, the finger tracking the sheet, driven
  by `scroll-timeline` with no script. Browsers without scroll-driven animations get no
  rail; the half-cut row alone carries the affordance.
- **Micro state changes stay micro.** Hover tints, pressed ink, and focus rings keep
  their own ~150ms ease-out; the registry tokens govern surfaces that move, not surfaces
  that tint.
- **Reduced motion is a first-class temperament, not a disability switch:** modals cross-
  fade in ~120ms with no travel, skeletons hold still, the rail does not animate. Nothing
  is withheld; only the physics are.
- Keyboard is whole: the row press target is a real button, Escape cancels a modal,
  and focus returns to the line. Adaptation holds the same grammar at every width —
  the mobile window is shorter, the modal is near-full-width, the targets stay 44px.

## shadcn/ui and the committed tokens

shadcn/ui is the approved component source for velocity. It never becomes a second identity:
components adopt **through** the committed token system, never around it.

- **The bridge.** Every shadcn component resolves color through semantic tokens
  (`--background`, `--primary`, `--muted`, …). In `src/app/globals.css` those tokens are mapped
  one-to-one onto the committed brand tokens — primary to navy, secondary/accent to the mint
  family, surfaces to paper, lines to the line family, ring to teal-ink. A shadcn component
  dropped in unmodified renders in the practice's palette because the bridge says so.
- **The one non-brand hue is destructive.** Destructive actions have no brand hue; shadcn's
  red is permitted for `--destructive` only. Any other literal color reaching the semantic
  blocks is palette drift (see the reconciliation procedure in
  [`AGENTS.md`](AGENTS.md#shadcnui)).
- **Brand owns the shared namespaces.** The brand `@theme` block keeps the last word on colors
  and the radius scale (`--radius` 0.625rem, sm 0.375rem, lg 0.875rem); the bridge re-declares
  neither. Presets and `apply --preset` overwrite this wholesale and never run without a
  palette-diff review.
- **Composition rules still govern.** A shadcn Dialog in the portal rides the motion registry
  like every modal — one modal, registry spring, reduced-motion cross-fade — and restyling
  happens on the component or through `className`, never by re-pointing the semantic tokens
  away from the brand.
- **Dark mode is not a shipped surface.** The `.dark` mapping exists only so an accidental
  `dark:` utility still lands on brand darks (the navy family). A real dark theme is a
  practice decision under anchor 1.


