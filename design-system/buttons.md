# Buttons

`Button` (`ui/button.tsx`) is a Base UI button wearing `buttonVariants` (`ui/button-variants.ts`), a
separate module so server components and links wear it without a client boundary. Three defaulted
axes: `variant` paints, `size` sets geometry, `motion` the temperament.

## Button or link

```
What does pressing it do?
├── Submits, toggles, opens or runs something on this page → <Button> with an explicit type
├── Goes to another URL → Link wearing buttonVariants(), with data-slot="button"
├── Runs a form action from a server component → <button> wearing buttonVariants(), with data-slot="button"
└── Hands a file to the browser → <a href download>, never Link and never Button
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

## Outputs: print and download

A download has a URL, so it is a plain `<a href download>`: `Link` is for route transitions, and an
`onClick` `Button` loses middle-click and save-as. Printing stays a `Button` calling
`window.print()` (`print-controls.tsx`). An occasional output wears `REQUESTS_OUTPUT_UTILITY_CLASS`,
not a variant: `.portal-utility-link` is a quiet `--pt-xs` weight-600 `--color-body` label that
turns teal on hover, with a 1rem leading icon, and `min-h-11` adds the target floor. The export
anchor and `PrintChooser`'s trigger wear it, without `data-slot`.

- **`useOutputGuard()`** (`output-feedback.ts`) locks 1.5 seconds against a double press:
  `begin()` returns false while locked, shown as `aria-disabled`; an anchor calls
  `event.preventDefault()`. `releaseOnAfterPrint` lifts a print's lock when its dialog closes.
- **An `sr-only` span** named by `aria-describedby` says which rows the file actually covers.
- **`publish()`** puts the result in the page's one `PortalFeedbackMessage`, read out by its tone.

```tsx
// Correct (requests-output-actions.tsx): an anchor, guarded, described and announced
<a href={exportHref} download aria-describedby="request-export-scope"
   aria-disabled={exportGuard.locked || undefined} className={REQUESTS_OUTPUT_UTILITY_CLASS}>
```

A patient-site download exists only when the documents registry (`src/lib/documents.ts`) holds a
real file; `public/documents/` holds only `.gitkeep`. Until then the slot offers the practice's text
line: an `outline` anchor on `site.textLine.href` in `patient-education/[slug]/page.tsx:90-102`, or
a mint pill in `DocumentList.tsx:56-83`. The real anchor reads `dict.common.docs.download`;
`DocumentList`'s carries `data-telemetry-event="doc_download"`.

## Variants

| Variant | Paint | When | Worn by |
| --- | --- | --- | --- |
| `default` | Navy, white label; hover deepens to `navy-2` with `--shadow-soft` | The one primary action of a form, dialog or screen. The default. | 36 files: search, save, sign in, add request |
| `amber` | `amber` with a `navy-2` label | The patient site's appointment call to action; in the portal, the warm step that leaves for more work: help's "Open appointments", the release briefing's "Open requests", the tour's "Finish tour" | 10 files, and `PortalTour` on its last step |
| `outline` | Transparent, `ink` label, a 1.5px `line-2` inset stroke | The action beside a primary one: cancel, clear, change email, go back | 26 files; four more switch between `default` and `outline` |
| `ghost-light` | 12% white with a 34% white stroke | The second action on a navy band | The home page, the appointment page, `Footer`, `TextBand` |

`secondary`, `ghost`, `destructive` and `link` are registry paints with no consumer and no approved
brand look; choosing one is Jason's call. An unlisted variant is a bug, not an option.

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
| `sm` | `min-h-9` (36px), 1rem by 0.5rem, 0.9rem label, 16px icons (the recipe asks 14px; see [Icons](#icons)) | Compact rows: `Footer`'s review links, `Header`, `LocationMaps`, the full-record sheet's "Try again", the time picker's Done |
| `icon` | `size-11` | No consumer today |

`sm` sits below the [44px target floor](accessibility.md#targets); its six consumers stay until
[item 11](roadmap.md#11-button-sm-targets) decides. A new compact button keeps `default` and sets
padding through `--btn-px` and `--btn-py`, which `default` reads, falling back to its own values.
Only `.portal-scope` sets them (`src/app/globals.css#L1270`), so portal buttons are tighter; a
compact area sets the pair on its container, never on a single button.

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
trims that side's padding and sizes the icon at 16px, so it carries no size class. `sm` icons render
16px too: its `size-3.5` rule matches the base `size-4`'s specificity but comes first, so it loses
(measured on `Footer`'s review links), and an `h-*` or `w-*` class is inert the same way.

```tsx
// Correct (print-chooser.tsx)
<Printer data-icon="inline-start" />
```

```tsx incorrect
// Incorrect (recorded drift, AppointmentForm.tsx): a size class and no data-icon
<Phone className="h-4 w-4" /> {dict.common.callUs}
```

At least 27 button icons lack `data-icon`; adding it moves their labels, so they wait on
[item 17](roadmap.md#17-call-site-restyles).

## Disabled and pending

The recipe dims `disabled` to 50% and leaves `aria-disabled` alone. A pending button is disabled
and says what it is doing; there is no loading prop.

```tsx
// Correct (settings/recipients-manager.tsx): disabled while pending, and the label says so
<Button type="submit" disabled={pending} className="self-end disabled:opacity-60">
  {pending ? "Saving…" : "Add recipient"}
</Button>
```

```tsx incorrect
// Incorrect: no such prop, and the label never says the work started
<Button type="submit" isLoading={pending}>
```

That `disabled:opacity-60` is one of 24 [recorded restyles](styling.md#recorded-call-site-restyles)
dimming to 60, 65, 70 or 100%; a new button keeps the recipe's 50% until
[item 17](roadmap.md#17-call-site-restyles) decides. Only the sign-in submit adds `motion="commit"`
and `data-pending={pending || undefined}`: its press starts a round trip ([Motion](#motion)).
