# Motion

Motion is a small registry of temperaments, not a library of effects: a component picks one by
name and never writes a curve or a duration. Token names are in [tokens.md](tokens.md#reference);
a review reports in the [design-eng.md](../.claude/rules/design-eng.md#review-format) table.

## The registry

**Two engines read one registry.** CSS reads the `--motion-*` tokens in the brand `@theme` of
`src/app/globals.css` for state CSS can see (`@starting-style`, `[data-starting-style]`,
`[data-ending-style]`, `:hover`, `:active`) and runs off the main thread. `motion/react` reads the
presets in `src/lib/motion.ts` when motion must keep its velocity through a retarget, as a thrown
time wheel does; it animates `transform` and `opacity` strings, not `x` and `y`.

| Temperament | CSS | `motion/react` | Value | Worn by |
| --- | --- | --- | --- | --- |
| Arriving | `--motion-spring` over `--motion-spring-duration` | `arrive` | 440ms; a spring that lands in about 110ms and overshoots 4.6% once | `.portal-confirm-dialog`, the full-record sheet's scale, `Toaster`, the time picker's sheet and wheels |
| Leaving | `--motion-exit` over `--motion-exit-duration` | `leave` | 160ms, `cubic-bezier(0.23, 1, 0.32, 1)` | Every exit; the staff home popover's entrance; the portal `Button` |
| Tinting | `--motion-micro-duration` on `--motion-exit` | `micro` | 150ms | `Checkbox`, the time wheels' rows, Home's washes and scroll thumb, `Toaster`'s icon swap |
| Reduced | opt-outs beside the reset in `@layer base` | `crossfade` | 120ms, opacity only | [Reduced motion](#reduced-motion) |
| Patient-site ease | `--ease-out-quint`, `--ease-out-quart` | none | Curves only; each use writes its duration | `Button` outside the portal, link underlines, `Reveal` |

The portal reads these through the `--pm-*` aliases on `.portal-scope`, which also point the
`Button` knobs `--btn-duration` and `--btn-ease` at leaving. The two time pickers are the only
`motion/react` consumers (`arrive`, `leave`, `crossfade`); nothing imports `micro` or `transitionFor`.

**A temperament the registry lacks is a conversation, not a value.** Discuss it with Jason, then add
its token and preset together. Never inline a curve, tune a spring by hand or write a duration at a
call site. [Roadmap item 14](roadmap.md#14-the-staff-home-temperament-and-companion-surfaces) proposes
a staff home temperament; until it lands, Home wears the temperaments above.

**A recipe's `motion` axis owns a component's motion.** The base string carries none. `hover:` and
`active:` are triggers: the hovered paint belongs to `variant`, the journey to it to `motion`.

- `Button`: **`wgi`**, `commit`, `shadcn`, `none`.
- `Input`, `Textarea`, `NativeSelect`, `Checkbox`: **`wgi`**, `shadcn`, `none`.
- `Badge`: **`none`**, `shadcn`.
- `TimePickerColumn`: **`wgi`**, the spring under the wheel and the tint on its rows; `none`, neither.

Nothing else exists — an unlisted temperament is a bug, not an option. Only `login-form.tsx` sets
the axis at a call site. `Item` has none; its `duration-100` is [recorded](#recorded-motion-literals).

## Deciding whether and how to animate

```text
Should this move, and on which temperament?
├── The keyboard started it, staff repeat it all day, or it only looks nice → nothing moves
├── A surface enters                                                        → arriving
├── A surface leaves                                                        → leaving
├── A paint changes: hover, pressed ink, checked                            → tinting
├── A wait with no known end                                                → a stateless loop
└── Something on screen travels, or anything else                           → ask Jason
```

**Frequency decides first.** Keyboard actions, filter changes and moving through the list happen
hundreds of times a day and do not animate. Modals, sheets and toasts wear the registry. A rare
moment may carry delight: `AuthCard`'s single amber glint as a sign-in page arrives.

**Never ease-in.** It holds back the moment a person is watching.

**Exits are faster than entrances.** Judge a temperament against these bands: press feedback
100–160ms, small popovers 125–200ms, dropdowns 150–250ms, modals and drawers 200–500ms.

## Rules of use

**Micro state changes stay micro.** A hover tint, pressed ink or checked paint rides tinting or a
button's release, never the spring. A focus ring lands with the keypress, so recipes never animate
`box-shadow`; the fields' 200ms halo and `commit`'s ring are [recorded](#recorded-motion-literals).

**Buttons feel pressed.** Every pressable element has an `:active` state.

- `wgi` presses to 0.98 at once and releases on the button's duration: leaving, with no lift, in
  the portal; 200ms on `--ease-out-quint` after a 2px hover lift on the patient site.
- `commit` sinks to 0.96 with an inset shadow over 90ms, holds 0.98 with depth over 110ms while
  `data-pending` is set, and releases over 140ms on the exit curve.
- Home's buttons scale to 0.96–0.98 in `home.css`. Its filter pills and the full-record sheet's
  footer link press to `mint-2` instead: the footer spans the sheet, and a scale would open gaps.

```tsx
// Correct (login-form.tsx): the press holds until the server answers
<Button type="submit" motion="commit" data-pending={pending || undefined}>Sign in</Button>
```

```tsx incorrect
// Incorrect: a press that writes its own duration and scale
<button className="transition-transform duration-150 active:scale-[0.97]">Save</button>
```

**Nothing appears from `scale(0)`.** An entrance starts between 0.95 and 0.97 with opacity; each
overlay's values are in [overlays.md](overlays.md). Popovers grow from their trigger through Base
UI's `var(--transform-origin)`; modals stay centered.

**Keyboard-initiated actions never animate.** An overlay the keyboard opens or closes carries
`data-instant`, which removes its transition; a click outside still animates. Two of the four
native dialogs do not set it yet: [roadmap item 9](roadmap.md#9-a-native-dialog-component). An arrow
key steps a time wheel straight to its row; a click or a throw settles the wheel on the spring.

**Scroll has mass, not decoration.** Scroll regions keep the platform scrollbar and draw no rail or
progress fill. The one drawn rail is the staff home list's `ScrollArea` scrollbar: a resting track
and thumb whenever rows overflow, stronger ink while rows move or under a fine pointer, strongest
while held, each change on tinting. The thumb is a pure function of scroll position, read on every
scroll event: height is the visible share, offset the scroll offset, and neither transitions. The
browser owns overscroll: where it reports its rubber band through the scroll offset (Safari) the
thumb shortens against the pushed end in lockstep; where it clamps (Chromium) the thumb stays put.
Scroll position never animates; nothing gives the thumb a body, a spring or a clock (issue #302).

**Transitions over keyframes.** A transition retargets from where it is; a keyframe restarts. A
second recorded outcome retargets the staff home row's mint wash instead of cutting it. Keyframes
are for stateless loops: Home's loading pulse, a spinner.

## Reduced motion

**Reduced motion is a temperament, not a switch.** Travel goes; feedback stays. A reset in
`@layer base` of `globals.css` cuts every animation and transition to 0.001ms with `!important`.
Among `!important` declarations an earlier layer wins, so a surface with its own reduced temperament
opts out beside the reset, where nothing can outrank it.

| Surface | Under reduced motion |
| --- | --- |
| `.portal-confirm-dialog`, `.wgi-popover`, `.wgi-sheet` | A 120ms cross-fade on `--pm-reduced-duration`; rise and scale go; a keyboard open or close stays instant |
| `Toaster` | A 120ms fade; the rise and the stack's height change land at once |
| Home's loading placeholders | The pulse slows to 3.2s instead of freezing mid-frame |
| `Button`, Home's buttons, the time picker | Paint and depth change at once; scale, lift and wheel travel go; the picker's sheet cross-fades on `crossfade` |
| `Reveal`, `AuthCard` | Content shows at once; the glint does not run |
| The release briefing, request notes | 100ms and 120ms fades: [roadmap item 7](roadmap.md#7-the-legacy-feature-blocks) |

A change that adds motion states its reduced temperament in the same change.

## Recorded motion literals

Counted with `node scripts/design-system-docs.mjs css` on commit e7734a4, over `transition` and
`animation` declarations outside `@keyframes` (one can hold both literals), and by searching class
strings in `src` outside `src/components/stock/` for `duration-*`, `ease-*` and bare `transition-*`.

| Stylesheet | Declarations | Literal duration | Literal curve | Tokens only |
| --- | --- | --- | --- | --- |
| `globals.css` | 71 | 44 | 23 | 6 |
| `portal-workbench.css` | 19 | 10 | 10 | 5 |
| `home.css` | 37 | 7 | 6 | 24 |

| What | Disposition |
| --- | --- |
| The reset's 0.001ms | Stays: it is the reset, not a temperament |
| Home's loading pulse, 1.6s on `ease-in-out` and 3.2s reduced | Stays: [a standing finding](adoption.md#standing-findings) |
| `AuthCard`'s glint, 2.4s once | Stays: a rare arrival |
| Home's 120ms popover close; the row wash's 240ms exhale on its own curve | Stay: the approved Home frame, named by [roadmap item 14](roadmap.md#14-the-staff-home-temperament-and-companion-surfaces) |
| The fields' 200ms `ease`; `Item`'s 100ms; the `Button` knob fallbacks; `commit`'s fading ring; `--pm-reduced-duration` and `--pm-scrim-duration`; workbench hover tints at 150ms and 160ms that write the exit curve out; `.portal-submit-label` at 180ms; call-site `transition-colors` and `transition-opacity` on Tailwind's default 150ms curve; `duration-150` on the recent-work pills, the settings tabs, the login form's recovery link, which writes the exit curve out, and the request-note buttons ([recorded](styling.md#recorded-call-site-restyles)); the patient site's link, reveal, review, tile and menu-chevron durations | [Roadmap item 16](roadmap.md#16-motion-literals) |
| `.portal-choice-reveal`'s 180ms keyframes | [Roadmap item 3](roadmap.md#3-choice-lists) |
| The language, tour and provider-card dialogs on `overlay-rise`; the provider card's progress, spinner and hint; the release briefing's and request notes' choreography, including a `grid-template-rows` transition; `ProfileCardViewer`; `.request-note-add-trigger`'s press | [Roadmap item 7](roadmap.md#7-the-legacy-feature-blocks) |
