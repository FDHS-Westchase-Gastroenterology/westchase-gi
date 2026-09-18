# Buttons

`Button` (`ui/button.tsx`) is a Base UI button wearing the `buttonVariants` recipe
(`ui/button-variants.ts`). The recipe sits in its own module so server components and links can
wear it without a client boundary. Three axes, each with a default: `variant` paints, `size` sets
geometry, `motion` sets the temperament.

## Button or link

```
What does pressing it do?
├── Submits, toggles, opens or runs something on this page → <Button> with an explicit type
├── Goes to another URL → Link wearing buttonVariants(), with data-slot="button"
└── Runs a form action from a server component → <button> wearing buttonVariants(), with data-slot="button"
```

- **A link stays a link.** Base UI's button renders a native `<button>`; asked to render an
  anchor it logs a development error, and `nativeButton={false}` adds `role="button"`, which tells
  a screen reader that navigation is an action and drops "open in new tab" from its menu.
- **Every element wearing the recipe sets `data-slot="button"`**, as `Button` does itself. Scoped
  rules find buttons by slot: the request form footer, the confirm dialog actions and the commit
  shelf in `portal-workbench.css`. A link without the slot misses them.
- **Every `Button` writes its `type`.** `type="submit"` or `type="button"` says what the press
  does inside a form without reading the primitive's defaults.

```tsx
// Correct (staff-request-form-footer.tsx): navigation wears the recipe and keeps link semantics
<Link href="/admin/requests?status=new" data-slot="button" className={buttonVariants()}>
```

```tsx incorrect
// Incorrect: a link rendered through Button announces itself as a button
<Button render={<Link href={returnHref} />} nativeButton={false} variant="outline">
```

## Variants

| Variant | Paint | When | Worn by |
| --- | --- | --- | --- |
| `default` | Navy, white label; hover deepens to `navy-2` with `--shadow-soft` | The one primary action of a form, dialog or screen. The default. | 36 files: search, save, sign in, add request |
| `amber` | `amber` with a `navy-2` label | The patient site's appointment call to action; in the portal, the warm step that leaves for more work: help's "Open appointments", the release briefing's "Open requests", the tour's "Finish tour" | 10 files, and `PortalTour` on its last step |
| `outline` | Transparent, `ink` label, a 1.5px `line-2` inset stroke | The action beside a primary one: cancel, clear, change email, go back | 26 files; four more switch between `default` and `outline` |
| `ghost-light` | 12% white with a 34% white stroke | The second action on a navy band | The home page, the appointment page, `Footer`, `TextBand` |

`secondary`, `ghost`, `destructive` and `link` are registry paints with no consumer today and no
approved brand look; choosing one is a design decision for Jason. Nothing else exists — an
unlisted variant is a bug, not an option.

```
Which variant?
├── On a navy band → ghost-light for the second action; amber for the call to action
├── The screen's one primary action → default
│   └── It leads the patient to booking, or the staff member out to a queue of work → amber
└── Beside a primary action → outline
```

## Sizes

| Size | Geometry | When |
| --- | --- | --- |
| `default` | `min-h-11` (44px), 1.5rem by 0.75rem padding through the `--btn-px` and `--btn-py` knobs | Every button not listed below |
| `lg` | `min-h-13` (52px), 2rem by 1rem, 1.02rem label | Patient-site calls to action in the hero, `Header`, `TextBand`, `ReviewHub` and `AppointmentForm` |
| `sm` | `min-h-9` (36px), 1rem by 0.5rem, 0.9rem label, 14px icons | Compact rows: `Footer`'s review links, `Header`, `LocationMaps`, the full-record sheet's "Try again", the time picker's Done |
| `icon` | `size-11` | No consumer today |

`sm` sits below the [44px target floor](accessibility.md#targets). Its six consumers stay as
they render until [roadmap item 11](roadmap.md#11-button-sm-targets) decides; a new compact
button keeps `default` and takes its padding back through the knobs.

`--btn-px` and `--btn-py` are custom properties the `default` size reads with its own values as
fallbacks, so anything that sets them retunes padding without touching the recipe. `.portal-scope`
is the only thing that does (`src/app/globals.css#L1270`), which is why every portal button is
already tighter than a patient-site one. A compact area retunes the same way, by setting the pair
on the container that owns it. No call site overrides them on a single button, so there is no
example of that narrower move.

## Motion

| Motion | Behavior | When |
| --- | --- | --- |
| `wgi` | Hover lifts 2px over 200ms on the patient site's quint ease-out; press drops back and scales to 0.98 with no delay. `.portal-scope` retunes it through `--btn-duration`, `--btn-ease`, `--btn-lift` and `--btn-active-scale`. | Every button. The default. |
| `commit` | Press sinks to 0.96 with an inset shadow in 90ms; `data-pending` holds 0.98 over 110ms; release returns in 140ms | The sign-in submit in `login-form.tsx`, where the press starts an authentication round trip |
| `shadcn`, `none` | Registry nudge; no transition | No consumer today |

Reduced motion keeps the color change and drops the travel ([motion.md](motion.md#reduced-motion)).
The durations are recorded literals ([item 16](roadmap.md#16-motion-literals)).

## Icons

An icon inside a button sets `data-icon="inline-start"` or `data-icon="inline-end"`; the recipe
trims that side's padding and sizes the icon at 16px, 14px in `sm`. The icon carries no size
class.

```tsx
// Correct (print-chooser.tsx)
<Printer data-icon="inline-start" />
```

```tsx incorrect
// Incorrect (recorded drift, AppointmentForm.tsx): a size class and no data-icon
<Phone className="h-4 w-4" /> {dict.common.callUs}
```

At least 27 button icons lack `data-icon`, and `AppointmentForm`'s contact actions carry inert
`h-4 w-4` classes. Adding the attribute moves their labels, so it waits on
[item 17](roadmap.md#17-call-site-restyles) with the rest of the call-site looks.

## Disabled and pending

The recipe dims `disabled` to 50% and leaves `aria-disabled` alone. A pending button is disabled
and says what it is doing; there is no loading prop.

```tsx
// Correct (login-form.tsx): pending state rides the commit temperament
<Button type="submit" motion="commit" disabled={pending} data-pending={pending || undefined}>
```

```tsx incorrect
// Incorrect: no such prop, and the label never says the work started
<Button type="submit" isLoading={pending}>
```

Twenty-four call sites dim to 60, 65, 70 or 100% instead
([styling.md](styling.md#recorded-call-site-restyles)); a new button takes the recipe's 50% until
[item 17](roadmap.md#17-call-site-restyles) decides.
