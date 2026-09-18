# Components

Where a component lives decides who may change it and who may import it. Find the tier before
writing markup: most UI a screen needs already exists in `src/components/ui/` or beside a route
that renders it. The per-component guides are [buttons.md](buttons.md), [forms.md](forms.md),
[surfaces.md](surfaces.md) and [overlays.md](overlays.md).

## Component tiers

| Tier | Holds | Imports |
| --- | --- | --- |
| `src/components/stock/` | Registry source and examples kept as inputs to the local design bundle. Provenance is `MANIFEST.json`. Not approved design. | Its own packages |
| `src/components/ui/` | Approved components: one recipe per component, brand defaults, consumer maps in the recipe comments. | `cn`, Base UI, `src/lib/` |
| `src/components/patterns/` | Compositions of `ui/` parts that two or more routes render. | `ui/` |
| Beside the route in `src/app/` | Compositions one route renders, or one workflow's routes share. | `ui/`, `patterns/` |

A tier never imports a tier above it in this table, and nothing imports `stock/` except the three
exceptions below. Two recorded departures: `ui/checkbox.tsx` and `patterns/TextBand.tsx` import
`src/components/icons.tsx`, and the 16 files of `src/components/*.tsx` predate the tiers. Both wait on
[roadmap item 15](roadmap.md#15-the-patient-site-shared-layer). Code generated from the registry
becomes the project's once it lands in `ui/`: edit it there, never in `stock/`.

```
Where does this component go?
├── A control or surface any screen could use (a button, a field, a table)
│   ├── ui/ already has it → use it with an existing option
│   ├── The registry has it → adopt it into ui/ (adoption.md#workflow)
│   └── Neither → build it in ui/ with a recipe and bring the reason to Jason
├── A composition of ui/ parts that two routes render → patterns/
├── A composition one route renders, or one workflow's routes share → beside that route
└── Registry source kept for the bundle → stock/, imported by nothing new
```

### Recorded stock imports

The staff home imports three registry components directly. Preserve them as they render until
the roadmap item beside each adopts it into `ui/`; a new consumer waits for that recipe.

| Component | When | Real uses |
| --- | --- | --- |
| `Calendar` | The Received editor's custom range and the record card's return day, through `HomeRangeCalendar` and `HomeDayCalendar` ([item 6](roadmap.md#6-the-calendar)) | `parts/calendar.tsx` |
| `RadioGroup` `RadioGroupItem` `ToggleGroup` `ToggleGroupItem` | The record card's outcome rows and follow-up choices ([item 3](roadmap.md#3-choice-lists)) | `record-card.tsx` |

## Route-owned compositions

These live beside the routes that render them, because each holds one workflow's copy, data or
state. A second route of the same workflow imports it from there; extraction waits for the rules
below.

| Component | When | Real uses |
| --- | --- | --- |
| `AuthCard` | The signed-out staff screens: sign-in, reset request, set password, confirmation ([item 1](roadmap.md#1-card-surfaces)) | `login/page.tsx`, `forgot-password/page.tsx`, `set-password/page.tsx`, `confirm/page.tsx` |
| `StatusBadge` | A request's status in the queue and on its detail page ([surfaces.md](surfaces.md#badges)) | `requests/page.tsx`, `[id]/page.tsx` |
| `PrintChooser` | Choosing what to print, from the staff home and the requests output actions ([overlays.md](overlays.md#modal-dialogs)) | `home-workbench.tsx`, `requests-output-actions.tsx` |
| `followed` | The promise a save toast follows ([forms.md](forms.md#saving)) | `created-toast.ts`, `request-notes.tsx`, `use-workflow-panel.ts` |

The staff home keeps its converted registry parts in `(home)/parts/`, repainted in `home.css`
under `.wgi-*`. They are route-owned: nothing outside the staff home imports them.

| Component | When | Real uses |
| --- | --- | --- |
| `HomePopover` `HomePopoverTrigger` `HomePopoverContent` | The filter bar's editors and the list's row menus ([overlays.md](overlays.md#popovers)) | `filter-bar.tsx`, `line-list.tsx` |
| `HomeSheet` `HomeSheetContent` `HomeSheetTitle` `HomeSheetClose` | The non-modal full-record sheet ([overlays.md](overlays.md#the-full-record-sheet)) | `full-record-sheet.tsx` |
| `LineStatusBadge` | A request's status on a Home row and in the sheet ([surfaces.md](surfaces.md#badges)) | `line-list.tsx`, `full-record-sheet.tsx` |
| `HomeRangeCalendar` `HomeDayCalendar` | A custom received range; a return day | `filter-bar.tsx`, `record-card.tsx` |
| `PhoneGlyph` `ChevronGlyph` `CloseGlyph` | Home's stroke glyphs at the design's weights | `line-list.tsx`, `record-card.tsx`, `full-record-sheet.tsx` |
| `TimePicker` in `parts/time-picker.tsx` | The record card's start time, wrapping `ui/time-picker.tsx` ([forms.md](forms.md#time)) | `record-card.tsx` |

## Patterns

| Component | When | Real uses |
| --- | --- | --- |
| `PageHero` | The band that opens a patient-site page; 11 routes wear it | `about/page.tsx`, `contact/page.tsx`, `services/page.tsx` |
| `TextBand` | The statement band that closes a patient-site page, with its call to action; 14 routes wear it | `about/page.tsx`, `services/page.tsx`, `resources/page.tsx` |
| `Reveal` | Content that rises in on scroll: `variant` `up` (default), `fade` or `right`, `delay` 0-4 for a 90ms-per-step stagger ([motion.md](motion.md)); 12 routes wear it | `procedure-prep/page.tsx`, `physicians/page.tsx`, `contact/page.tsx` |
| `revealDelay` in `patterns/reveal-delay.ts` | Clamps a computed index to the four `Reveal` steps, so a long list stops staggering rather than running late | `office-gallery/page.tsx`, `procedure-prep/page.tsx` |

## What qualifies for extraction

A composition moves from beside its route into `patterns/`, or a pattern into `ui/`, when all four
hold:

1. **Two real consumers on different routes**, or one plus a second recorded on the
   [roadmap](roadmap.md). A guessed future consumer does not count.
2. **A stable API.** The props have not changed shape in the consumers' last changes.
3. **Nothing route-specific.** No route copy, data loader, workflow state or route stylesheet.
4. **It fits a recipe.** Its looks are variants on axes, not a `className` per call site.

A scoped CSS block moves into a recipe when it names a component (`.card`), when its
declarations repeat under two names, or when call sites use `className` to change its color or
type. Until then it stays where [styling.md](styling.md#global-css) records it.

## Component API rules

- **Axes are decoupled.** `variant` is paint, `size` is geometry, `motion` is temperament. A
  size never changes color; a variant never changes height.
- **Defaults produce the brand.** `<Button>` with no options is the navy action. A registry
  default that is not brand design is not a default here.
- **Meaning props are required.** `Badge` has no default `variant`, because a status color
  without the status is a guess.
- **One string per job.** A recipe is an array of class strings, each under a comment naming its
  job (paint, hover, focus, motion).
- **The consumer map lives at the definition.** A variant's comment names the files that wear
  it, or says "no consumer today"; the change that adds or removes a wearer updates it.
- **Knobs over overrides.** A scope retunes a recipe through a custom property with a fallback,
  as `.portal-scope` sets `--btn-radius`; a call site never overrides the recipe's classes.
- **Server-safe recipes.** A recipe that server components call sits in its own module without
  `"use client"`: `button-variants.ts` beside `button.tsx`.
- **Slots and icons are attributes.** Every part sets `data-slot`; an icon inside a control sets
  `data-icon="inline-start"` or `data-icon="inline-end"` and no size classes.
- **Custom triggers use `render`.** Base UI has no `asChild`. Items stay inside their group, and
  every dialog has a title.
- **Pending is state, not a prop.** No `isLoading`: a pending control is `disabled` with a
  pending label, and a save follows its promise ([forms.md](forms.md#saving)).
- **`className` is layout.** Width, gap, grid, margin and placement only
  ([styling.md](styling.md#styling-model)). Every recipe opens with a prose comment.

```tsx
// Correct (filter-bar.tsx): the trigger renders the element that carries the styling hook
<HomePopoverTrigger render={<button type="button" className="wgi-add-filter" />}>
```

```tsx incorrect
// Incorrect: asChild is the Radix API; Base UI ignores it and nests a button in a button
<HomePopoverTrigger asChild>
  <button type="button" className="wgi-add-filter">Add filter</button>
</HomePopoverTrigger>
```
