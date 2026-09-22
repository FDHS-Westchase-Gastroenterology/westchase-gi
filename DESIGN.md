# Design

The design system for the two products in this repository: the five-language patient site and the
staff portal at `/admin`. Product truth is [`PRODUCT.md`](PRODUCT.md); this file is how that truth
is drawn, and a map: each guide below owns one concern and is self-sufficient. The system may be
deep while using it stays shallow — a surface composes from named parts with named defaults, so
adding a button, a field or a modal never decides a color, a duration or a radius.

## The guides

- [Vocabulary](design-system/vocabulary.md) — the words: token, recipe, variant, pattern, slot.
- [Tokens](design-system/tokens.md) — the brand theme, the portal scopes, the semantic bridge.
- [Color](design-system/color.md) — the palette, ink pairs, status colors, focus.
- [Typography](design-system/typography.md) — the two families, the steps, the loaded weights.
- [Layout](design-system/layout.md) — page structures, spacing scales, shape and elevation.
- [Patient site](design-system/patient-site.md) — the route contract, the content classes, the rhythm.
- [Components](design-system/components.md) — the tiers, the recipe API, what earns extraction.
- [Modules](design-system/modules.md) — import specifiers, the locale pair, the portal route contract.
- [Buttons](design-system/buttons.md) — variants, sizes, motion, icons, disabled and pending.
- [Forms](design-system/forms.md) — fields, controls, choices, saving, results.
- [Dates and times](design-system/dates-and-times.md) — the date input, practice-local days, the time wheel.
- [Surfaces](design-system/surfaces.md) — cards, tables, lists, rules, scrolling, badges.
- [Overlays](design-system/overlays.md) — dialogs, popovers, the record sheet, the time sheet.
- [Motion](design-system/motion.md) — the two engines, the temperaments, reduced motion.
- [Accessibility](design-system/accessibility.md) — targets, focus, announcements, landmarks.
- [Styling](design-system/styling.md) — the styling model, global CSS, call-site restyles.
- [Adoption](design-system/adoption.md) — the workflow, standing findings, testing, the bundle.
- [Inventory](design-system/inventory.md) — every `src/components/ui/` export and its options.
- [Roadmap](design-system/roadmap.md) — recorded drift and gaps, numbered, each with a status.

## Where does this belong?

| You are adding… | It belongs in |
| --- | --- |
| A color, radius, shadow, family, curve or duration | The brand `@theme` block in `src/app/globals.css`; nothing else declares one ([tokens](design-system/tokens.md)) |
| A portal type or spacing step | The `.portal-scope` block (`--pt-*`, `--ps-*`). The scale is closed; a new step is a decision |
| Brand color for a registry component | The semantic bridge at the bottom of `globals.css`, mapped onto a brand token, never a literal |
| A component's look, or a variant of one | That component's recipe in `src/components/ui/` ([components](design-system/components.md)) |
| A component's motion | The `motion` axis of its recipe, on the `--motion-*` tokens ([motion](design-system/motion.md)) |
| A composition two surfaces share | `src/components/patterns/`, composed from `src/components/ui/` and tokens |
| Something one route renders | Beside that route under `src/app`, until a second consumer appears |
| Layout inside a component tree | `className` at the call site: utilities for layout, never a component's own paint |
| A page-level structure | The layout classes in `globals.css`, or a layout component in `src/components/patterns/` |
| Interaction state (open, pending, selected) | The component that owns it: React state, or a `data-*` attribute the CSS reads |
| Durable state (a request's status, a note) | Not the design system. Server actions and `src/lib/portal/` ([`ARCHITECTURE.md`](ARCHITECTURE.md)) |
| Registry source to look at | `src/components/stock/`, which is bundle input only ([adoption](design-system/adoption.md)) |
| Global CSS | Only what [styling](design-system/styling.md#global-css) permits; if it names a component, it wants a recipe |

## What the practice owns

The brand anchors are the practice's, and only Jason moves them: the four hues — navy, teal, amber
and mint — with their ink pairs; Trocchi for patient-site display and Lato for everything else; the
radius ramp `--radius-sm`, `--radius`, `--radius-lg`; the shadow set; and the motion registry.

They live in the brand `@theme` block of `src/app/globals.css`, which is hands-off for agents and
for every registry command — the reconciliation procedure in
[AGENTS.md](AGENTS.md#design-authority-and-brand-protection) runs after each one. A surface that
needs a value the anchors lack records it on the [roadmap](design-system/roadmap.md) and brings
rendered evidence, rather than inventing a literal.

## Floors

Both products meet these. A change that breaks one is not finished.

- Text and meaningful marks clear 4.5:1, and color never carries a meaning on its own.
- A pressable thing is at least 44px tall, which is `Button`'s default size
  ([accessibility](design-system/accessibility.md#targets)).
- Focus is always visible, and focus moves with the work: overlays return it, a refused submit
  sends it to the problem.
- Every animation has a reduced-motion answer, and nothing autoplays.
- Platform semantics first: a native select, a date input, a native dialog. Replacing one means
  re-earning its keyboard, locale and assistive behavior; the staff home's time wheel is the one
  replacement, and its open gap is [roadmap item 18](design-system/roadmap.md#18-time-picker-name).

## Motion

Two engines, one registry. CSS reads the `--motion-*` tokens; `motion/react` reads the presets in
`src/lib/motion.ts`; they are the same temperaments, and neither invents a curve or a duration.
Surfaces arrive on a spring and leave faster than they came; micro states settle in 150ms; reduced
motion cross-fades in place ([motion](design-system/motion.md)).

A temperament the registry lacks is a conversation with Jason, then a registry entry — never an
inline value. Any diff that adds or changes motion carries a `review-animations` verdict in the
Before / After / Why table from `.claude/rules/design-eng.md`, beside the standing gates.

## Adoption

Reuse an existing recipe first, then adapt registry source into `src/components/ui/`, recording
provenance and what the adoption changed. Claude Design is for exploration and exchange; its
approval is not required to implement, review or merge. The workflow, the standing findings this
system has already decided, and the testing each kind of change owes are in
[adoption](design-system/adoption.md).

## Local bundle pipeline

`.ds-sync/`, `.design-sync/` and `ds-bundle/` are machine-local and untracked. They generate the
Claude Design bundle from the repository's own components; generation exports the implementation
and never applies remote edits. The commands and the rules are in
[adoption](design-system/adoption.md#local-bundle-pipeline).
