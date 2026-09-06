# UI skills

The global skills under `~/.claude/skills` carry the method for UI work in this repo. A task usually meets more than one trigger below. Invoke each skill at the point its trigger is met, not only the first one at the start: two of the triggers (review-animations, and apple-design for enter/exit motion) are met by the diff, not by the brief, so re-read this list when a new user turn begins and again before every commit. This applies to advice-only requests that touch no file. Loading a skill is your decision, so this rule names when to make it.

## Which skill, when

Claude Code owns frontend implementation and verification; Codex owns backend work, as defined
in AGENTS.md "Agent responsibilities". Frontend source uses `import { cn } from "cn";`.
Apply AGENTS.md "Class-name helper" and CONTRIBUTING.md "Class-name helper updates" when
migrating or syncing components, including registry inputs and the local design bundle.

- **shadcn** (model-invoked only; it has no slash command): before adding, fixing, styling, or composing any component, and before any `shadcn` CLI command. Pair it with AGENTS.md "shadcn/ui": Claude Design is canonical, `src/components/stock/` is bundle input rather than approved design, and every CLI operation that touches CSS runs the `globals.css` reconciliation procedure. `init`, `apply`, and anything with `--preset` never run here without that review.
- **apple-design**: before implementing a sheet, drawer, drag, swipe, or gesture, and before changing how a popover, dialog, or sheet enters, exits, flips, or is dismissed. It supplies the physics (velocity handoff, momentum projection, rubber-banding, clean interruption); the registry supplies the values. Hover, press, and checked micro-transitions on buttons and rows do not need it.
- **review-animations**: after the diff exists and before `git commit`, whenever the diff adds or changes a `transition`, `animation`, `@starting-style` or `[data-starting-style]` rule, a `--motion-*` token use, or a `motion/react` call, even when the brief never mentioned motion. Treat it as a gate beside the standing gates in AGENTS.md: the commit waits for its verdict. DESIGN.md "Motion" names this skill as the review method. Report in the Before / After / Why table from `design-eng.md` and state the reduced-motion behavior of every new rule.
- **improve-animations**: when asked to audit or polish existing motion across a surface or the portal, and the deliverable is findings and plans rather than a verdict on one change.
- **find-animation-opportunities**: when asked where a surface should animate and doesn't yet. Its daily-use bias applies with extra force here: staff see the portal all day.
- **animation-vocabulary**: when an effect needs a name before it can be specified or briefed.
- **pick-ui-library**: only for a component category that neither the `src/components/ui/` recipes nor the shadcn registry covers. The stack is decided: Next 16, React 19, Tailwind 4, shadcn `base-nova` on Base UI primitives, `motion/react`.

## Precedence

AGENTS.md hard rules outrank the skills. DESIGN.md and `design-eng.md` outrank a skill's generic values. The skills bring method and judgment; the registry brings every number: the `--motion-*` tokens in `src/app/globals.css` and the presets in `src/lib/motion.ts` own curves, durations, and springs. Where a skill's values differ (its default spring, its duration tables, an easing it suggests), use the registry's. A temperament the registry lacks is a design-partner consultation per DESIGN.md "Motion", not an inline value. Where a skill's output format differs from `design-eng.md` "Review Format", the repo's format wins and the skill's standards and escalation rules still apply.

Read DESIGN.md "Where does this belong?" before placing any UI code, as AGENTS.md requires. The skills do not know this repo's layout.
