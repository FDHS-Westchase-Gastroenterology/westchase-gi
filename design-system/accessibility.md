# Accessibility

Two audiences, two floors. The patient site is read by older patients in five languages, often on a
phone; the staff portal is worked all day by a few people on a desktop keyboard. A change that
meets one floor still has to meet the other's.

## Targets

A pressable thing is at least 44px tall. The `Button` recipe holds that floor for you:
`default` is `min-h-11`, `lg` is `min-h-13`, and `icon` is `size-11`.

```
Which size?
├── The page's main action, or anything on the patient site → default (44px)
├── A hero or a full-width mobile action → lg (52px)
├── An icon with no label → icon (44px square, plus an accessible name)
└── A control packed into a dense portal row → sm (36px, below the floor)
```

`sm` is the one size under the floor: it measures 36px, and six surfaces use it
([buttons.md](buttons.md#sizes)). 36px clears the WCAG 2.1 AA minimum of 24px and misses the 44px
comfort floor this system sets, so it stays a recorded question
([item 11](roadmap.md#11-button-sm-targets)) rather than a silent default.

A row that opens something holds a real button in its own cell — the staff home's open control
sits in the row's last cell, not on the `TableRow` — so the target is reachable, nameable, and
does not swallow a text selection.

## Text

| Where | Floor | Source |
| --- | --- | --- |
| Patient site body | 1.0625rem (17px) at line-height 1.65 | `body` in `globals.css` |
| Staff portal body | `--pt-sm`, 0.9375rem (15px) | `.portal-scope` steps |
| Portal meta | `--pt-xs`, 0.8125rem | timestamps and labels, never a sentence |

`.measure` (68ch) and `.measure-sm` (54ch) keep patient-site lines short enough to track.
[typography.md](typography.md#sizes) owns the steps; nothing sits between them.

## Focus

Focus is always visible, and the two products show it differently:

- **Patient site** — a 2px `--color-teal-ink` outline at 3px offset, on `:focus-visible` for
  everything, set once in `globals.css`.
- **Staff portal** — a 3px `--color-amber-deep` outline at 3px offset on every link, button,
  input, select, textarea and summary inside `.portal-scope`. The color question is recorded as
  [item 13](roadmap.md#13-the-portal-focus-color).

Both shells open with a skip link: `#main` on the patient site, `#portal-main` on the portal,
whose `<main>` carries `tabIndex={-1}` so the jump lands somewhere focusable.

Focus moves with the work:

- An overlay traps Tab while it is open and returns focus to the control that opened it —
  `add-appointment-dialog.tsx`, `print-chooser.tsx`, `portal-tour.tsx`, and the day editor in
  `call-again-fieldset.tsx` all do.
- A refused submit sends focus to the first invalid control, or to the error summary when the
  failure belongs to the form ([staff-request-form.tsx](../src/app/admin/(portal)/requests/new/staff-request-form.tsx)).
- A finished inline edit hands focus back to the control that started it, as `request-notes.tsx`
  returns to its Add button.

```tsx
// Correct (add-appointment-dialog.tsx): the trigger gets focus back when the dialog closes
triggerRef.current?.focus();
```

```tsx incorrect
// Incorrect: the dialog closes and focus falls back to <body>, losing the reader's place
setOpen(false);
```

## Announcements

- `role="status"` for progress and counts a reader may hear late: the search form's result line,
  the settings managers' save feedback.
- `role="alert"` for a failure that has to be read now: `staff-request-error.tsx`, the note
  editor's error, the day editor's correction.
- `FieldError` for a message that belongs to one control, next to `aria-invalid` on the control
  itself ([forms.md](forms.md#fields)).
- A save that has no place to report itself uses the one toast ([forms.md](forms.md#saving)).

```tsx
// Correct (request-search-form.tsx): the result count is a live status, not a silent repaint
<p id={REQUEST_SEARCH_STATUS_ID} role="status" aria-live="polite" aria-atomic="true" className="sr-only">
```

```tsx incorrect
// Incorrect: an alert for an ordinary success interrupts whatever the reader was doing
<div role="alert">Saved</div>
```

## Color is never the only signal

Every status carries its word. `Badge` prints the status text ([surfaces.md](surfaces.md#badges)),
an invalid field sets `aria-invalid` and writes the reason, and the staff home's overdue stamp —
which a sighted reader sees as a red cell in the Received column — appends the stamp as `sr-only` text so a
screen reader hears it too. A new state that means something adds a word, an icon with a name, or
both; a hue on its own is decoration.

## Navigation and landmarks

Each shell has one `<main>` with the skip link's id. Every navigation region is a `<nav>` with an
`aria-label`: "Portal sections", "Filter by status", "Settings sections", and the paginators'
own labels. The active link carries `aria-current="page"`. These are links that change the URL,
which is why they stay links and never become a tab widget
([adoption.md](adoption.md#standing-findings)).

## Language and direction

The patient site's routes are locale-scoped: the layout sets `lang` and `dir` from `localeDir`,
which returns `rtl` for Arabic. Two rules keep that honest — `.bidi-ltr` wraps phone numbers,
domains and other LTR runs so they are not reordered in an RTL sentence, and directional glyphs
flip with `rtl:-scale-x-100`. The staff portal ships in English only; nothing in it is translated.

## Motion

The blanket `prefers-reduced-motion` reset in `@layer base` removes travel from everything by
default, and `transitionFor` collapses every JS temperament to `crossfade`. A surface that needs a
different reduced-motion answer states it beside the reset, never in its own file
([motion.md](motion.md#reduced-motion)). Nothing autoplays.

## Native controls

Selects are `NativeSelect`, dates are `<input type="date">`, and modals are native `<dialog>`
elements. Each brings platform semantics, platform keyboard handling and the platform's own
locale support at no cost ([forms.md](forms.md#controls), [overlays.md](overlays.md#modal-dialogs)).
Replacing one with a custom widget means re-earning all of it.
