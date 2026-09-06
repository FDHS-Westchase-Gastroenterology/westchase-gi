# Design engineering: repo bindings

The craft itself lives in the global skills (apple-design, review-animations, improve-animations, find-animation-opportunities) and in DESIGN.md "Motion"; `.claude/rules/ui-skills.md` says which skill to invoke when. This file holds only what ties that craft to this repository: where the values live, which values are chosen, the mechanisms the code uses, and the conventions a review or summary follows here. The full craft guide this replaced is archived at `.claude/archive/design-eng.full.md`.

## Where the values live

The registry owns every curve and duration. Do not define an easing token, inline a bezier, or tune a spring by hand. A temperament the registry lacks is a design-partner consultation, not a commit (DESIGN.md "Motion"); once approved it is added to the registry and referenced from there.

- CSS: the brand `@theme` block in `src/app/globals.css`. Curves: `--motion-spring` (a `linear()` sampling of a ζ≈0.7 spring), `--motion-exit`, and for the patient site `--ease-out-quint` and `--ease-out-quart`. Durations: `--motion-spring-duration`, `--motion-exit-duration`, `--motion-micro-duration`. The portal modal reads the same values through its `--pm-*` aliases; the button recipe reads `--btn-ease`.
- JavaScript: `src/lib/motion.ts` exports the same temperaments for `motion/react`: `arrive`, `leave`, `micro`, `crossfade`, and `transitionFor(kind, reducedMotion)`.
- DESIGN.md "Where does this belong?" says where a component's motion is declared (the `motion` axis of its recipe in `src/components/ui/`; base strings carry none), and DESIGN.md "Motion" says which engine and temperament governs what.

## Chosen values

| Temperament | CSS | JS | Value |
| --- | --- | --- | --- |
| Surfaces entering (modals, drawers, sheets) | `--motion-spring` over `--motion-spring-duration` | `arrive` | 440ms spring, `{ type: "spring", duration: 0.44, bounce: 0.3 }`: lands in about 110ms, one 4.6% overshoot, no second bounce |
| Surfaces leaving | `--motion-exit` over `--motion-exit-duration` | `leave` | 160ms, `cubic-bezier(0.23, 1, 0.32, 1)`. Exits are faster than entrances. |
| Micro states (hover tint, pressed ink, focus ring) | `--motion-micro-duration` with an ease-out (`--motion-exit` in the button recipe) | `micro` | 150ms |
| Reduced motion | the blanket reset in `@layer base` | `crossfade` | 120ms opacity-only cross-fade, no travel |

- Press feedback: every pressable element has an `:active` state. Portal: `scale(0.98)` at the micro duration. Patient site: lift-then-settle (DESIGN.md "Buttons feel pressed"). The scale stays within 0.95–0.98.
- Entrances start at `scale(0.95)` to `scale(0.97)` with opacity, never `scale(0)`.
- Bounce is `arrive`'s and no more. More bounce is for drag-to-dismiss and playful interactions only.

```css
.button {
  transition: transform var(--motion-micro-duration) var(--motion-exit);
}
.button:active {
  transform: scale(0.98);
}
```

## Mechanisms the code uses

- Entry is `@starting-style` with `transition-behavior: allow-discrete`. Do not add a `useEffect` mounted-flag fallback unless a browser in the project's support list lacks it.
- Base UI state attributes drive enter, exit, and instant states in CSS: `[data-starting-style]`, `[data-ending-style]`, and `[data-instant]` for a tooltip that opens while a sibling is already open.
- Popovers grow from their trigger through Base UI's `var(--transform-origin)`; modals stay centered.
- Dialogs render through the shared `PortalModal` primitive on the native `<dialog>`, on the `--pm-*` registry aliases, with `--pm-origin-x/y` to grow from the opening control. The shadcn Dialog stays unadopted (DESIGN.md "Every modal is one modal").
- With `motion/react`, animate `transform` and `opacity` strings rather than the `x`/`y` shorthands so the work stays hardware-accelerated.
- Reduced motion is a temperament, not a switch. The blanket reset in `@layer base` of `globals.css` is the default; a surface with an authored reduced-motion temperament opts out there, next to the reset, because nowhere else can outrank it. In JS, `transitionFor` collapses every temperament to `crossfade`.

## Review Format

Findings from a UI or motion review are one markdown table with Before, After and Why columns, one row per issue, so each fix reads as a diff:

| Before | After | Why |
| --- | --- | --- |
| `transition: all 300ms` | `transition: transform var(--motion-micro-duration) var(--motion-exit)` | Name the property; read the registry |
| `transform-origin: center` on a popover | `transform-origin: var(--transform-origin)` | Popovers grow from their trigger; modals stay centered |

## Physical-device pass

Touch gestures (drawers, swipes) cannot be verified in a desktop browser or the Xcode Simulator. When you ship one, say in your summary that it still needs a pass on a physical device.
