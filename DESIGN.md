# Design

The design system for the two products in this repository: the five-language patient site and
the staff portal at `/admin`. Product truth is in [`PRODUCT.md`](PRODUCT.md); this file is how
that truth is drawn, built, and kept consistent.

The organizing promise: **the underlying system may be deep, but using it should feel shallow.**
A surface should compose from named parts with named defaults, and a person adding a button, a
field, or a modal should never have to decide a color, a duration, or a radius. Those decisions
were made once, below, and the parts carry them.

Read in this order: the ownership table answers "where does this go"; the vocabulary makes the
rest legible; the sections after it are the rules, one concern each.

The rendered evidence for everything here is **the gallery**: run `npm run dev` and open
**`http://localhost:3000/design`** (also on every Vercel Preview; a 404 in Production). Every
token live, every registry component before and after. Note the URL — it is a top-level route,
not under `/admin`.

---

## Where does this belong?

| You are adding…                                                  | It belongs in                                                                                                                      |
| ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| A color, radius, shadow, font family, easing curve, or duration  | The brand `@theme` block in `src/app/globals.css`. Nowhere else may declare one.                                                   |
| A type step or spacing step for the portal                       | The `.portal-scope` token block in `globals.css` (`--pt-*`, `--ps-*`). The scale is closed; a new step is a design decision.       |
| How a shadcn component gets brand colors                         | The semantic bridge at the bottom of `globals.css` — map the semantic token onto a brand token, never a literal.                   |
| A button, field, stamp, table… appearance or a new variant of one | The component's recipe in `src/components/ui/` (the cva file). Variants are named for meaning.                                  |
| A component's motion (hover, press, enter, exit)                 | The `motion` axis of its recipe, using the `--motion-*` tokens. Base strings carry no motion.                                    |
| A reusable composition (hero, text band, timestamp, stamp+word)  | `src/components/patterns/`, composed from `ui/` and tokens. Reuse in two places earns the promotion.                             |
| Something only one route renders                                 | Next to that route (`src/app/**`). Colocated until a second consumer appears.                                                      |
| Layout inside a component tree (gap, width, grid, alignment)     | `className` at the call site — Tailwind utilities for layout only, never for a component's own colors or type.                     |
| A page-level structure (container width, section rhythm)         | The layout classes in `globals.css` `@layer components` (`.container-x`, `.section`) or a `patterns/` layout component.          |
| Interaction state (open, pending, selected)                      | The component that owns the element: React state in a client component, or a `data-*` attribute the CSS reads.                    |
| Durable state (a request's status, a note)                       | Not the design system. Server actions and the workflow in `src/lib/portal/` (`ARCHITECTURE.md`).                                   |
| Motion written in JavaScript (a gesture, a spring, a layout move, orchestration) | `motion/react` with the presets in `src/lib/motion.ts` — the same temperaments as the CSS tokens. Either engine is fine; both read the registry. |
| A stock shadcn component you want to look at                     | It is already in `src/components/stock/`; open `/design/<name>`. Adopting it into `ui/` is the workflow in "Adoption".            |
| Global CSS                                                       | Only what "Global CSS" below permits. If it names a component, it wants a recipe instead.                                        |

---

## Vocabulary

- **Token** — a named CSS custom property that holds one design decision (`--color-navy`,
  `--motion-exit-duration`). Values live in tokens; code refers to names.
- **Brand token** — a token in the brand `@theme` block. The practice's own decisions.
- **Semantic token** — one of shadcn's role names (`--primary`, `--muted`, `--ring`). Never holds
  a literal here; each is mapped onto a brand token by the **bridge**.
- **Recipe** — a component's complete vocabulary of appearance, written as a `cva` definition
  with named **axes**: `variant` (paint), `size` (geometry), `motion` (temperament). "The Button
  recipe" is `src/components/ui/button-variants.ts`. (Called a "register" before 2026-08-30;
  renamed because that word already meant two other things below.)
- **Registry** — shadcn's word for a remote catalog of component source (`ui.shadcn.com/r`).
  `shadcn add` downloads from it; `src/components/stock/` vendors it. This project publishes no
  registry of its own; the brand lives in recipes, tokens, and the bridge — one place each.
- **Register** — reserved for `PRODUCT.md`'s meaning: the voice and product a surface belongs
  to. The patient site speaks in the brand register; the staff portal in the product register.
  Each register assigns the theme through a scope (see "Theme model"). Never used for a
  component's appearance — that is a recipe.
- **Temperament** — a named motion physics on the `motion` axis: `wgi` (the brand's), `commit`
  (the held press), `shadcn` (stock, verbatim), `none`.
- **Scope** — a CSS class on an ancestor that re-tunes tokens for everything inside it
  (`.portal-scope`, `.review-flyer-screen`). A scope assigns; it never redefines a brand token.
- **Knob** — a per-scope override a recipe reads with a fallback (`--btn-lift`, `--btn-radius`).
  Knobs let a scope change a recipe's feel without fighting utility classes.
- **Tier** — where a component lives and what that implies: `stock/` (upstream, untouched),
  `ui/` (brand recipes), `patterns/` (brand compositions), domain (colocated with a route).
- **Stamp** — a Badge. A stamp always carries words beside its color.
- **The Line** — the staff portal's world: one patient's request is one line on a sheet.
- **The bridge** — the `@theme inline` + `:root` block at the end of `globals.css` that maps
  semantic tokens onto brand tokens. The only place shadcn's tokens exist.
- **The gallery** — `/design`. Tokens rendered live; every registry item stock, bridged, and
  brand-adapted.

---

## What the practice owns

Anchors: fixed points every future world composes around. Amending one is a practice decision,
never a design judgment.

1. **The brand hues.** Navy, teal, amber, and the mint family remain the identity. Both products
   visibly carry them. The commitment binds the hues, not any particular token table: a world
   may re-weight them, re-derive values, and re-decide their roles.
2. **The team greets you.** The full-staff photograph opens the patient site. Composition around
   that fixed point is free.
3. **The hero is static** (practice decision, 2026-07-07). Auto-rotating heroes were reviewed and
   emphatically declined. Recompose freely; never rotate.
4. **Real people, real places.** Photography is the practice's own; stock stand-ins for its
   people or places never ship. Authored illustration and iconography remain open.
5. **FDHS affiliation is present and credible** on every patient-facing surface. Referring
   physician offices come to verify it. The treatment is free.
6. **Essential text is localizable HTML** (practice direction, 2026-07-07). Provider names,
   credentials, and patient information render as real translatable text in every locale, never
   carried solely by imagery.

## Floors

Non-negotiable in every world, both registers:

- **WCAG 2.1 AA**, with every text/background pair verified, not assumed. Accessibility specifics
  are in "Accessibility" below and in `PRODUCT.md`.
- **Five locales are one design.** Any typeface serves English, Spanish, Vietnamese, Korean, and
  Arabic, or names script companions, and layout holds under RTL. Type is free; the languages are
  not.
- **Provenance.** Harvested practice artifacts (official provider-card graphics, source mirrors in
  `public/images/`) remain byte-exact; the six published headshot derivatives are the documented
  exception.

---

## Styling model

Three mechanisms, each with one job. Mixing them is how the old CSS grew to 6,500 lines with a
class for every call site.

1. **Tokens** hold decisions. CSS custom properties in `src/app/globals.css`, Tailwind v4
   `@theme` so every token is also a utility (`bg-navy`, `text-muted-ink`, `rounded-lg`,
   `ease-[var(--motion-exit)]`).
2. **Recipes** hold component appearance. A `cva` definition per component in
   `src/components/ui/`, written as arrays — one string per job, each under a comment naming the
   job — with decoupled axes and brand defaults. Utilities inside a recipe refer to tokens,
   never raw values (`bg-navy`, not `bg-[#2e4a61]`; `duration-[var(--btn-duration,200ms)]`, not
   `duration-200`, when a scope may retune it).
3. **Call-site utilities** hold layout. `className` on a component instance may set width, gap,
   grid, alignment, margin, responsive placement. It may not set a component's own color,
   type, radius, or motion; if a surface needs a different paint it needs a variant, and if it
   needs a different feel it needs a temperament or a scope knob.

Scoped CSS is the fourth mechanism and the last resort: a route may ship a stylesheet
(`src/app/admin/portal-workbench.css`, `src/app/design/design.css`) for surface composition
that utilities and recipes cannot express — print layouts, `::backdrop`, `@starting-style`
entrances, a windowed group cut in row units. Every rule in a scoped sheet reads tokens. A rule
that carries a literal color, a raw `rem` step, or a component's look is drift; the roadmap at
the end of this file lists what is being extracted.

### Global CSS

`src/app/globals.css` may contain, in this order and nothing else:

| Block                                    | May contain                                                                                                         |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Brand `@theme`                           | Every brand token: colors, fonts, radii, shadows, easings, durations, z-index, the patient fluid type scale.        |
| `:lang()` blocks                         | Per-locale font family swaps and script-specific leading and tracking. Unlayered on purpose.                        |
| `@layer base`                            | Element defaults (`body`, headings, links, `:focus-visible`, `::selection`, `img`) and the reduced-motion posture.  |
| `@layer components`                      | Layout primitives (`.container-x`, `.section`), typography helpers (`.display`, `.h1`–`.h3`, `.lead`, `.measure`), link styles, list styles, the `.portal-scope` token assignment, and legacy feature blocks queued for extraction (see Roadmap). |
| Print blocks                             | `@page` and `@media print` compositions for the handouts and the request packet.                                    |
| The semantic bridge                      | `@theme inline` mapping `--color-*` onto semantic names, then `:root` / `.dark` mapping semantic names onto brand tokens. The one literal is `--destructive`. |

A new rule in `globals.css` must answer "which block, and why not a recipe?". A rule named
after a component (`.card`, `.btn`, `.field-*`) is a recipe that has not been extracted yet.

---

## Token hierarchy

Three levels. Each level may only reference the level above it.

```text
1. Brand tokens          @theme { --color-navy, --radius-lg, --motion-spring … }
        │                the practice's decisions; the only literals
        ▼
2. Register scopes     .portal-scope { --pt-*, --ps-*, --pm-*, --btn-* }
        │                a product's assignment of the brand: fixed type scale,
        │                closed space scale, motion aliases, recipe knobs
        ▼
3. Semantic bridge       :root { --primary: var(--color-navy) … }
                         shadcn's role names resolved onto the brand
```

Rules:

- **Literals live at level 1.** A `#hex`, `oklch()`, raw `rem`, or `ms` in a register scope or
  the bridge is drift. (`--destructive` and the portal surface tints `--portal-canvas`,
  `--portal-surface` are the recorded exceptions; the roadmap closes the latter.)
- **Names describe role, not value.** `--color-teal-ink` (teal as text on light), not
  `--color-teal-dark`. `--pt-base` (the datum on a line), not `--font-size-17`.
- **Namespaces are owned.** The brand owns `--color-*`, `--radius-*`, `--shadow-*`, `--font-*`,
  `--motion-*`, `--ease-*`, `--z-*`, `--step-*`. The portal owns `--pt-*`, `--ps-*`, `--pm-*`,
  `--portal-*`. Recipes own their knob prefix (`--btn-*`). shadcn owns the semantic names and
  nothing else — the bridge re-declares no radius, no font, no color literal.
- **Collisions are checked before adoption.** shadcn's `--color-muted` (a surface) collided with
  the brand's secondary ink, now `--color-muted-ink`. Before adopting a component, list its
  `bg-*`/`text-*`/`border-*` utilities and check them against the brand `@theme`.
- **Radius is a known gap.** The brand declares `--radius-sm` 0.375, `--radius` 0.625, and
  `--radius-lg` 0.875rem; Tailwind's defaults fill `md` (0.375) and `xl` (0.75), so `rounded-xl`
  is smaller than `rounded-lg`. Recipes use `rounded-sm`, `rounded-[var(--radius)]`, and
  `rounded-lg` until the ramp is completed (Roadmap).

### Reference: the tokens

Color (`--color-*`): `paper`, `mint`, `mint-2` (surfaces); `navy`, `navy-2`; `teal`, `teal-ink`;
`amber`, `amber-soft`, `amber-deep`; `ink`, `body`, `muted-ink`, `on-dark`, `on-dark-muted`
(ink); `line`, `line-2`, `line-3`, `line-dark`. Every text/background pair is contrast-verified
in the comment beside its value.

Type: `--font-display` (Trocchi; Aleo / Noto Serif KR / Noto Naskh Arabic by locale),
`--font-body` (Lato; Be Vietnam Pro / Noto Sans KR / Noto Sans Arabic). Patient fluid steps
`--step-hero`, `--step-1`…`--step-3`, `--step-lead`. Portal fixed steps `--pt-2xs`…`--pt-xl`.

Space: `--ps-1`…`--ps-12` (portal). Shape: `--radius-sm`, `--radius`, `--radius-lg`. Elevation:
`--shadow-soft`, `--shadow-card`. Motion: `--motion-spring` + duration, `--motion-exit` +
duration, `--motion-micro-duration`, `--ease-out-quint`, `--ease-out-quart`; portal aliases
`--pm-spring`, `--pm-exit`, `--pm-reduced-duration`, `--pm-fade-duration`,
`--pm-scrim-duration`. Stacking: `--z-header` 50, `--z-dropdown` 60, `--z-overlay` 70,
`--z-drawer` 80.

---

## Theme model

There is one theme — light, the practice's palette — and several **registers** that assign it:

| Register          | Scope                                  | What it changes                                                                                             |
| ------------------- | -------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Patient site        | the root (no class)                    | Display serif on headings, fluid type, section rhythm, the button lift.                                     |
| Staff portal        | `.portal-scope` on `<body>`            | Lato-only, fixed type and space scales, `--pm-*` motion aliases, flattened button knobs (no lift, 0.98 press). |
| Review flyer screen | `.review-flyer-screen`                 | Calmer button timing.                                                                                       |
| Print               | `@media print` / `@page`               | Paper: windowed groups unscrolled, ink-only palette.                                                        |
| Locale              | `:lang(vi|ko|ar)`                      | Font families, leading, tracking; Arabic is RTL through `dir`.                                              |

A register **assigns**: it sets knobs and aliases and may set its own scale tokens. It never
redefines a brand token. Dark mode is not a shipped surface; the `.dark` mapping exists only so
an accidental `dark:` utility lands on brand darks. A real dark theme is a practice decision
under anchor 1.

The gallery's stock palette (`[data-palette="stock"]` in `src/app/design/design.css`) is the one
place shadcn's neutral literals exist, so the before is the true before. It never reaches
`globals.css`.

---

## Color

Restrained: white paper and navy ink, with each practice hue holding exactly one role.

- **Navy** (`navy`, `navy-2`) is printed ink: the task index, sheet rules, primary actions.
- **Teal** (`teal`, `teal-ink`) means current, selected, or hovered — the finger tracking a line.
  Nothing else. It is also the focus ring.
- **Amber** (`amber`, `amber-deep`, `amber-soft`) means attention: a stamp, a tag, a hairline
  marker on a line — and on the patient site, the one warm call to action.
- **Mint** (`mint`, `mint-2`) is the only hue permitted to tint a large area, and only for a
  settled or cleared state, or a patient-site section band.
- **Destructive** is shadcn's red, permitted for `--destructive` only. No other literal reaches
  a semantic token.
- **Color never carries state alone.** A stamp always carries words; an error always has text.

The Badge recipe makes the law executable: its `variant` axis is `attention | current |
settled | quiet`, required, with no default.

---

## Typography

Two registers, one family system.

**Patient site.** The display serif (Trocchi) carries `h1`–`h3` at weight 400 with negative
tracking (Latin only); Lato carries everything else. Sizes are the fluid `--step-*` scale; body
is 1.0625rem / 1.65 — a 17px floor for an older audience. `.display`, `.h1`–`.h3`, `.lead`,
`.measure` are the helpers.

**Staff portal.** One family: Lato carries interface text, headings, labels, and data. The
display serif never dresses operational content. A fixed rem scale, never fluid — a `clamp()`ed
heading is what let a count sentence outrank the page title. The steps, a 1.2 ratio on a 15px
floor: `--pt-2xs` 0.6875rem tracked uppercase column heads, `--pt-xs` 0.8125rem meta and
timestamps, `--pt-sm` 0.9375rem body floor, `--pt-base` 1.0625rem the datum on a line (a
patient's name), `--pt-lg` 1.25rem group headings, `--pt-xl` 1.75rem the sheet's day. Exactly
three weights: 400 body and meta, 600 names and labels, 800 the day and group heads. Hierarchy
comes from size and space, never from stacking near-identical sizes and leaning on weight.

Both: counts, phone numbers, and times use tabular numerals. Negative tracking is a Latin-only
affordance; Korean and Arabic headings reset it.

---

## Space and layout

**Portal.** A seven-step rem scale carries every gap: `--ps-1` 0.25, `--ps-2` 0.5, `--ps-3` 0.75,
`--ps-4` 1, `--ps-6` 1.5, `--ps-8` 2, `--ps-12` 3rem. Values between steps do not exist; a gap that
wants one is a hierarchy question, not a spacing one. Space separates; hairlines (`--color-line`)
divide. A group owns its lines with a rule and breathing room, never a card wash or a border box.

**Patient site.** Tailwind's 4px scale for component internals; page rhythm through `.section`
(`clamp(3.25rem, 6.5vw, 6.5rem)` block padding), `.section-sm`, `.container-x` (76rem, fluid
inline padding) and `.container-tight` (48rem for prose).

**Page structures.**

- Patient page: `Header` → `PageHero` → alternating `.section` bands (some on mint) → `TextBand`
  call-to-action → `Footer`. One clear action per section; a short path to phone, forms, portal,
  directions.
- Portal page: a persistent 17rem task index (Home, Appointments, Settings, Help) beside a working
  canvas (`--portal-canvas`); at narrow widths the same four destinations become a fixed bottom
  index. Work sits on white paper (`--portal-surface`) as lines divided by hairlines.
- **Groups window, they do not grow.** Five lines or fewer stand open. Taller groups hold a
  fixed window — four and a half rows on desktop, three and a half on mobile — cut in row units
  (`calc()` on the row height plus its hairline), and scroll within it. The half-cut row is the
  whole affordance. The heading's count always states the true total; rendering caps at forty
  lines and the remainder is a link ("6 more in Appointments"). Print renders every line.

---

## Shape and elevation

Three radii: `rounded-sm` fields, `var(--radius)` buttons, `rounded-lg` cards. One shadow at a
time, never paired with a visible border: `--shadow-soft` for hovered controls, `--shadow-card`
for lifted cards. The portal prefers hairlines to shadows everywhere but the modal.

---

## Motion

### Ownership

- **The registry owns every curve and duration.** `--motion-spring` (440ms, a ζ≈0.7 spring
  sampled into `linear()`: lands in ~110ms, overshoots 4.6% once, settles without a second
  bounce), `--motion-exit` (160ms, a strong ease-out), `--motion-micro-duration` (150ms). The
  patient site also uses `--ease-out-quint` / `--ease-out-quart` for its lift and underline.
- **A recipe's `motion` axis owns a component's motion.** The base string carries none.
  Temperaments are named; the default is the brand's. `hover:` is a trigger, not motion: the
  hovered paint belongs to `variant`, the journey there to `motion`.
- **Two engines, one registry.** CSS (`@starting-style`, `transition` with `allow-discrete`,
  hover, press, focus rings) reads the `--motion-*` tokens; `motion/react` reads the presets in
  `src/lib/motion.ts` (`arrive`, `leave`, `micro`, `crossfade`, `transitionFor`). They are the
  same temperaments, so a surface may use either — or both — without changing character. Pick by
  fit, not by rule: CSS runs off the main thread and keeps moving while a page loads; motion.dev
  keeps velocity when a spring is retargeted, handles gestures, layout and shared-element moves,
  and orchestration (`AnimatePresence`, `useSpring`, `useScroll`) that CSS cannot express. When
  using motion.dev, animate `transform`/`opacity` strings rather than the `x`/`y` shorthands so
  the work stays hardware-accelerated.
- **Reduced motion is a temperament, not a switch.** Nothing is withheld, only the physics:
  modals cross-fade in ~120ms with no travel, skeletons hold still, pressed buttons keep their
  depth cue and lose the scale. The blanket reset in `@layer base` is the default; a surface with
  an authored reduced-motion temperament opts out there, next to the reset (the cascade reverses
  layer order for `!important`, so nowhere else can).

### Deciding whether and how to animate

1. **How often will a person see it?** Hundreds of times a day (keyboard actions, the gallery
   switch, list navigation): no animation. Occasionally (modals, sheets): the registry.
   First-time or rare (a tour, a celebration): delight is allowed.
2. **What is it for?** Spatial consistency, state indication, feedback, or preventing a jarring
   change. "It looks nice" is not a reason on a surface staff see all day.
3. **Which curve?** Entering or exiting → the registry spring / exit. Moving on screen →
   ease-in-out. Tinting → `ease` at the micro duration. Constant motion → linear. Never ease-in.
4. **How fast?** Press feedback 100–160ms; tooltips and small popovers 125–200ms; dropdowns
   150–250ms; modals and drawers 200–500ms (ours: 440 in, 160 out). Exits are faster than
   entrances.

### Rules of use

- **Every modal is one modal.** Dialogs render through the shared dialog primitive
  (`PortalModal` on the native `<dialog>`) and the shared dialog class: rise 12px, grow from 97%,
  on the registry spring; leave on the registry exit; a close mid-entrance reverses from wherever
  the surface is; a dialog can grow from the control that opened it (`--pm-origin-x/y`); dialogs
  nest. A portalled Dialog cannot transition the `overlay` property or style `::backdrop`, so the
  shadcn Dialog stays unadopted for it — a fit-checked keep, not a debt.
- **A modal that must fetch still opens on the spring's schedule** and shimmers a skeleton while
  it waits. The surface is never late, only its facts.
- **Scroll has mass, not decoration.** Windowed groups are nested overflow boxes with
  `overscroll-behavior: contain`. No rail, no progress fill.
- **Micro state changes stay micro.** Hover tints, pressed ink, and focus rings keep the 150ms
  ease-out; the spring and exit govern surfaces that move.
- **Buttons feel pressed.** Every pressable element has an `:active` state (the portal's 0.98
  scale; the patient site's lift-then-settle). `commit` holds the press until the server answers.
- **Nothing appears from `scale(0)`.** Entrances start at 0.95–0.97 with opacity.
- **Popovers grow from their trigger; modals stay centered.**
- **Keyboard-initiated actions never animate.** Escape closes instantly; the row's press target
  is a real button and focus returns to the line.
- **Transitions over keyframes** for anything that can be re-triggered mid-flight.

Motion in a diff is reviewed against these rules with the `review-animations` skill; a new
temperament is a design-partner consultation, not a commit.

---

## Component tiers

```text
src/components/stock/       the registry, byte-exact (the before)     never edited, regenerated
src/components/ui/          brand recipes (the after)               shadcn-generated, then adapted
src/components/patterns/  brand compositions                        authored on ui/ + tokens
src/app/**/                 domain components                         colocated with their route
```

- **`stock/`** — every shadcn item and its example, vendored by `npm run ds:stock`
  (`scripts/design-system/sync-stock.mjs`), exempt from the project lint bar as upstream code,
  imported only by the gallery. Its `README.md` and `MANIFEST.json` are the contract.
- **`ui/`** — the design system's components. The CLI generates them; the project owns them the
  moment they land, and every one is brand-adapted before its first merge (recipe axes, brand
  defaults, consumer maps, the repo's lint bar).
- **`patterns/`** — reusables composed from `ui/` and tokens with no registry counterpart:
  heroes, text bands, reveals, stamps-with-words, timestamps.
- **Domain** — stays with the route that owns it. A domain component that gains a second consumer
  or proves genuinely generic is promoted into `patterns/` (or rebuilt on `ui/`). Central
  placement is earned by reuse, never granted by category.

### What qualifies for extraction

A pattern moves **up a tier** when all of these hold:

1. **Two real consumers** on different routes, or one consumer plus a documented second on the
   roadmap.
2. **A stable API** — its props are the design decisions (variant, size, motion) and content
   slots, not a bag of booleans.
3. **Nothing route-specific inside** — no data fetching, no workflow knowledge, no copy.
4. **It fits the recipe** — variants map onto the color law, sizes onto the scales, motion onto
   the registry. If it cannot, it is a scope or a domain component, not a primitive.

A CSS block moves **into a recipe** when it names a component (`.card`, `.field-*`), when the
same declarations appear under two class names, or when a surface reaches for `className` to
change its color or type — the tell that a variant is missing.

### Defaults are scaffolding, not design

shadcn supplies behavior, accessibility, and velocity; this document supplies appearance. A
component shipped at its registry defaults is an unfinished adoption. The gallery's "Stock
through the bridge" view shows exactly what an unfinished adoption looks like.

---

## Component API rules

- **Axes are decoupled by concern.** `variant` is color and surface; `size` is geometry; `motion`
  is temperament. Never welded together. A surface can wear one variant's paint with another's
  physics without inventing classes.
- **Defaults produce the brand.** A forgotten prop renders the brand, never the generic. Stock
  behavior is reachable only by name (`motion="shadcn"`).
- **Meaning props are required when the law says so.** Badge's `variant` has no default: there
  is no meaningless stamp.
- **Recipes are written one line per job.** Arrays of strings under comments naming the job
  (layout, shape, typography, focus, states); `cva` joins them. Parity after a restructure is
  verified mechanically — emit every combination's sorted class set before and after, and diff.
- **Consumer maps live at the definition.** Each variant carries a one-line comment naming the
  surfaces that wear it — file paths and surface names, never line numbers. A variant with no
  consumer says "no consumer today". Unconsumed scaffolding is labeled or pruned with the date.
- **Knobs over overrides.** A recipe that a scope may retune reads `var(--btn-*, fallback)`
  rather than expecting the scope to out-specify utilities.
- **Server-safe recipes.** The cva lives apart from the client component
  (`button-variants.ts` / `button.tsx`) so zero-JS anchors can wear the recipe through
  `className`.
- **Icons ride `data-icon`.** `data-icon="inline-start" | "inline-end"` on the icon; the recipe
  sets padding and size. No sizing classes on icons inside components.
- **Slots are `data-slot`.** Every part announces itself (`data-slot="card-header"`) so a parent
  can style composition (`has-data-[slot=card-footer]:pb-0`) without extra props.
- **Base UI conventions.** Custom triggers use `render`, not `asChild`. Items live inside their
  Group. Dialogs, sheets, and drawers always carry a title (`sr-only` if hidden). Buttons have no
  `isLoading`; compose `Spinner` + `data-icon` + `disabled`.
- **Forms compose `FieldGroup` + `Field`.** Labels, descriptions, errors are slots; `data-invalid`
  on the Field, `aria-invalid` on the control. Patient-facing selects stay native.
- **`className` is for layout.** Never a component's own color, type, radius, or motion.
- **Legibility for non-coders.** Every recipe opens with a prose comment explaining its axes,
  its defaults, and where its consumers are. The recipe is the documentation.

---

## Accessibility

Floors for both products; the patient site's older, multilingual audience sets the bar.

- WCAG 2.1 AA everywhere; every text/background pair verified (the token comments carry the
  ratios). Body text ≥ 17px on the patient site; 15px floor in the portal.
- **Targets:** 44px minimum, including dismiss controls and every Button size; icon buttons are
  `size-11`.
- **Focus:** visible everywhere (`:focus-visible` outline in teal-ink; recipes carry a ring).
  Async outcomes move focus to the outcome — success, failure, unknown — never leaving a keyboard
  user on a detached control. A modal returns focus to the line that opened it.
- **Semantics before styling:** route navigation is `nav` + `aria-current` links (never Tabs);
  the row press target is a real `button`; groups are `role="group"`; a status line is
  `role="status"`, an error `role="alert"`; landmarks and a skip link on every page.
- **Language:** every locale sets `lang`; Arabic sets `dir="rtl"` and layout holds; Latin-order
  islands (phone numbers) use `.bidi-ltr`. Adopted Base UI overlays render inside the `Direction`
  provider when they reach an RTL locale.
- **Motion:** full reduced-motion alternatives (see Motion). No autoplay, no auto-rotation.
- **Color never carries meaning alone.** Stamps carry words; errors carry text; charts carry
  labels.
- **Native where native is better:** selects, dates, and the `<dialog>` top layer on the patient
  site and the portal alike.

---

## Folder and import boundaries

```text
src/app/globals.css            tokens, base, layout helpers, bridge — imported by every root layout
src/app/<surface>/*.css        route-scoped composition, imported only by that surface's layout
src/lib/utils.ts               cn()
src/lib/motion.ts              motion.dev presets bound to the registry
src/lib/fonts.ts               next/font loaders → --font-* variables
src/components/stock/          registry, vendored          ← imported only by src/app/design
src/components/ui/             brand recipes             ← may import ui/, lib/; never app/
src/components/patterns/     brand compositions          ← may import ui/, lib/; never app/
src/components/*.tsx           patient-site shared components (the pre-tier layer; see Roadmap)
src/app/**/                    routes and their domain components ← may import anything above
src/app/design/                the gallery ← the only consumer of stock/
```

- Imports use the `@/` alias; relative parent imports (`../`) are a lint error.
- Lower tiers never import higher ones: `ui/` and `patterns/` never reach into `src/app`.
- `stock/` is a leaf from the product's point of view. A product surface importing it is a
  review-blocking finding.
- A route-scoped stylesheet is imported once, by the surface's root layout, and scoped by a class
  on `<body>`.
- Generated files are project-owned on landing: top-level type-only imports, the documented
  disable-comment convention for framework-typed props, block comments for paragraphs.

---

## Testing requirements

The standing gates in `AGENTS.md` apply to every change: `npx oxlint` clean, `npx oxfmt --check`
clean, React Doctor at 100, `npm run build` green, visual evidence in the pull request for every
UI-visible change (before/after screenshots at 1440×900 and 390×844; a video for a multi-step
path). On top of those, by tier:

| Change                                   | Also required                                                                                                      |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| A brand token value                      | Contrast re-verified for every pair that uses it (note the ratio in the token comment); `ui-reference/` refreshed. |
| A recipe (new variant, axis, default)  | The gallery page for that component updated (`src/app/design/brand/<slug>.tsx`); parity diff if restructuring.     |
| A new `ui/` adoption                     | A gallery brand example; consumer map comments; the reconciliation diff on `globals.css` is clean.                 |
| Motion                                   | `review-animations` pass; reduced-motion state captured; frequency justified in the PR.                            |
| A primitive                              | Two consumers named; rendered in the gallery if it has variants.                                                   |
| A portal workflow surface                | The Playwright specs under `e2e/` for that path; the `ui-reference` portal atlas refreshed with the seed identity.  |
| The stock tier                           | Regenerated only by `npm run ds:stock`; `MANIFEST.json` in the diff; `globals.css` unchanged.                      |

The gallery doubles as the visual regression surface for the system itself: a token change is
visible on `/design` before it is visible anywhere else.

---

## The gallery

**`http://localhost:3000/design`** with `npm run dev` running (and on every Vercel Preview
deployment; a 404 in Production). A top-level route beside the patient site, the portal, and the
review hub — not under `/admin`.

- **Foundations** — color with the semantic bridge table, both type scales, the space scale,
  radii and shadows, the motion registry with a CSS-versus-motion.dev demo.
- **Components** — one page per registry item with a three-way switch: **Stock** (shadcn's own
  neutral palette), **Stock through the bridge** (what `shadcn add` produces here untouched), and
  **Brand** (the `ui/` recipe). The stamp on each row is its standing: brand-adapted, stock
  through the bridge, fit-checked and kept out, or no product need — with the finding behind it.
- Adding a brand adaptation means adding its example to `src/app/design/brand/` so the
  before/after exists from the first merge. The catalog is `src/app/design/catalog.ts`.

---

## Adoption

### The design-partner protocol

Design decisions are made with the human director, not for them. Before adopting a registry
component, meaningfully adapting an existing one, or composing a new surface, an agent brings:

1. What the system already has that fits ("the registry spring and the shared dialog treatment
   exist — this modal rides them").
2. The reasoned directions the adaptation could take: motion, size, variants, recipe.
3. Its own recommendation, with the reasoning.
4. An honest "nothing we have fits" when that is true.

Mechanical call-site migrations onto an already-decided adaptation need no new consultation; a
new appearance decision always gets one.

### Workflow

1. Open `/design/<component>` and look at stock, bridged, and (if any) brand.
2. Design-partner consultation, as above.
3. `npx shadcn@latest add <component>` only when a real consumer is ready to render it; React
   Doctor fails the loop on unused generated files. Run `add --dry-run` / `--diff` first when the
   file already exists.
4. Reconciliation diff on `src/app/globals.css` (procedure in `AGENTS.md` "shadcn/ui"). Nothing
   the CLI writes to the bridge merges.
5. Brand adaptation pass: axes decoupled, variants mapped onto the color law, sizes onto the
   scales, motion onto the registry, consumer maps written, lint bar met.
6. A brand example in the gallery; standing gates; before/after evidence.

### Standing findings

- Route navigation keeps `nav` + `aria-current`; shadcn Tabs serves in-page panel switching only.
- The portal modal keeps the native `<dialog>` top layer (Motion, "one modal").
- The authored skeletons are structured shapes with one sweep; a generic pulse is a downgrade.
- The hero is static; Carousel is not a fit. The testimonial rail is scroll-snap.
- Windowed groups keep the platform scrollbar; ScrollArea is not a fit.
- Sonner is Radix-era; Base UI projects use Toast.
- The chat family has no product need: the practice's differentiator is a staffed human line.

---

## Roadmap — the extraction queue

Ranked by the reuse it unlocks. Each is a session of its own with the design-partner protocol.

1. **Card surfaces → the Card recipe.** `.card` / `.card-lined` (globals.css) become `variant`
   values on `ui/card.tsx`; the patient site's nine call sites migrate.
2. **`portal-workbench.css` tokenization.** 238 spacing declarations use raw `rem` against 65 on
   `--ps-*`; 98 of 135 font sizes bypass `--pt-*`; ~50 color values are literals or `color-mix`.
   Mechanical, measurable, and it turns the sheet into something a recipe can absorb.
3. **Choice lists → RadioGroup / Checkbox.** `.portal-choice-*` and the print chooser hand-roll
   the checked indicator.
4. **The task index → Sidebar.** `.portal-sidebar-*` / `.portal-nav-*` (~37 selectors); the bridge
   already maps the sidebar tokens onto navy.
5. **Empty states → Empty; callouts → Alert; pagers → Pagination.**
6. **The calendar.** `portal-calendar.tsx` versus a `react-day-picker` adoption that keeps the
   month turn and the day-pick settle.
7. **The patient-site shared layer** (`src/components/*.tsx`) sorted into `patterns/` and
   domain; then the patient site's own re-charter (`PRODUCT.md`, issue #202).
8. **The radius ramp** completed in the brand `@theme` so `md` and `xl` sit in order.
9. **A modal pattern API.** `PortalModal` stays native; it gains a documented recipe (size,
    origin, skeleton) and the confirm/day/line modal classes collapse into it.

Descriptive census: [`docs/COMPONENT-INVENTORY.md`](docs/COMPONENT-INVENTORY.md); importer
paths: [`docs/COMPONENT-REFERENCE.md`](docs/COMPONENT-REFERENCE.md). Regenerate them as tiers
fill rather than letting them drift.
