# Westchase GI — how to build with this design system

FDHS Westchase Gastroenterology: a gastroenterology practice in Tampa, Florida.
Two audiences share one token set — a multilingual patient site (older,
task-driven, often on a phone) and a staff portal.

## Two tiers. Reach for the brand tier.

Every component ships under one of two names, and the difference matters:

| | Names | Use |
|---|---|---|
| **Brand recipes** | `Button`, `Badge`, `Card`, `Field`, `Input`, `Item`, `Label`, `NativeSelect`, `Separator`, `Table`, `Textarea` | **Always prefer these.** Brand-adapted, contrast-verified, 44px touch floor. |
| **Registry** | `StockButton`, `StockDialog`, `StockSidebar`, `StockAccordion`, … (~69 more) | The unmodified shadcn `base-nova` registry — the "before". Nothing in a product surface imports from it. |

`Stock*` components exist so the un-adapted baseline stays visible and
adoptable. Reach for one **only** when no brand recipe covers the need (there
is no brand Dialog, Tabs, Accordion, Sidebar, Tooltip, Select or Checkbox yet).
They render through the brand token bridge, so they will look on-palette, but
they have not had a design pass. Never use `StockButton` where `Button` exists.

## No provider needed

The brand recipes are context-free — render them directly, no wrapper, no
theme provider. Tokens come from the stylesheet.

A few registry families need their own provider, and only those:
`StockSidebarProvider`, `StockToastProvider`, `StockTooltipProvider`,
`StockMessageScrollerProvider`, `StockDirectionProvider`.

## Styling: Tailwind v4 utilities over the brand `@theme`

Style your own layout with utility classes. The brand palette is real Tailwind
colors — every name below is generated and safe to use:

| Family | Classes |
|---|---|
| Surfaces | `bg-paper` (page), `bg-mint` / `bg-mint-2` (section bands, wells), `bg-navy` / `bg-navy-2` (dark bands, footer) |
| Accents | `bg-amber` (the one CTA colour), `bg-amber-soft` (notice tint), `bg-teal` |
| Text | `text-ink` (headings), `text-body` (copy), `text-muted-ink` (secondary), `text-teal-ink`, `text-amber-deep`, `text-on-dark` / `text-on-dark-muted` (on navy) |
| Lines | `border-line`, `border-line-2`, `border-line-3`, `border-line-dark` |
| Type | `font-display` (Trocchi serif — patient headings only), `font-body` (Lato) |
| Elevation | `shadow-soft`, `shadow-card` — **never paired with a visible border** |
| Radius | `rounded-sm`, `rounded-lg` |

Opacity modifiers work on the brand hues: `bg-navy/80`, `text-navy/60`.

Composition helpers, also real classes: `container-x` and `container-tight`
(page gutters), `section` / `section-sm` (vertical rhythm), `h1` / `h2` / `h3`
and `display` (type steps), `lead`, `measure` / `measure-sm` (reading width),
`card` / `card-lined`, `link-line` / `link-plain`, `list-check` / `list-plain` /
`list-steps`, `heading-tick` (the amber rule above a heading).

Three rules the system enforces:

- **`className` is for layout only** — never a component's own colour, type,
  radius or motion. Those are props.
- **Defaults produce the brand.** A forgotten prop renders the practice's look,
  never the generic. Stock behaviour is reachable by name (`motion="shadcn"`).
- **Axes are decoupled.** On `Button`, `variant` is paint
  (`default | amber | outline | secondary | ghost | ghost-light | destructive | link`),
  `size` is geometry (`sm | default | lg | icon`), `motion` is temperament
  (`wgi | commit | shadcn | none`). Any combination is legal.
- **`Badge` has no default `variant`** — it is required, and named for meaning:
  `attention` (new), `current` (in progress), `settled` (done), `quiet`
  (closed). There is no meaningless stamp.

## Forms

Every form composes `FieldGroup` + `Field`. `FieldLabel`, `FieldDescription`
and `FieldError` are slots; mark invalid state with `data-invalid` on the
`Field` **and** `aria-invalid` on the control. Patient-facing selects stay
native (`NativeSelect`) — the OS picker is the better control for this
audience.

## Where the truth is

- `_ds/<folder>/styles.css` and its `@import` closure — the compiled tokens,
  the shadcn bridge, every utility above.
- `guidelines/DESIGN.md` — the full design system reference: colour law,
  type scale, motion registry, accessibility floors, adoption workflow.
- `guidelines/component-tiers.md` — the tier contract in the team's own words.
- `components/<group>/<Name>/<Name>.prompt.md` — per component, including
  whether a registry item has a brand counterpart.

## A page, idiomatically

```jsx
<>
  <Header locale="en" dict={dict} />
  <PageHero
    title="Colonoscopy"
    lead="A screening colonoscopy finds and removes polyps before they can become cancer."
  />
  <section className="container-x section">
    <h2 className="h2 heading-tick">What to expect</h2>
    <p className="lead measure mt-4 text-body">
      Most patients are in and out in about two hours.
    </p>
    <div className="mt-8 grid gap-4 sm:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Before your visit</CardTitle>
          <CardDescription>Start the clear-liquid diet the day before.</CardDescription>
        </CardHeader>
        <CardFooter>
          <Button variant="amber">Download prep instructions</Button>
        </CardFooter>
      </Card>
    </div>
  </section>
  <TextBand locale="en" dict={dict} />
  <Footer locale="en" dict={dict} />
</>
```

`Header`, `Footer`, `TextBand`, `HoursTable`, `LocationCards`, `LocationMaps`,
`DocumentList`, `AppointmentForm` and `LanguageChooser` take the site's locale
dictionary as `dict`. The bundle exports the real one as `previewDict` (plus
`previewDictEs`) — use it rather than inventing copy.

## Accessibility floor

The patient site's older, multilingual audience sets the bar: 44px minimum
touch target, every text/background pair contrast-verified to WCAG AA, and the
site runs in five locales (en, es, vi, ko, ar — the last right-to-left). Do not
introduce a colour pair that is not in the table above.
