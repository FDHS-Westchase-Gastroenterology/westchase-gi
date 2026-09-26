# Forms

Every form composes the `Field` family from `ui/field.tsx` around a `ui/` control. The family
owns label placement, description and error text, and group spacing, so a form never lays out
its own label stack.

## Fields

| Component | When | Real uses |
| --- | --- | --- |
| `Field` `FieldLabel` | One labeled control. `orientation` is `vertical` (default), `horizontal` or `responsive`. | `staff-request-form.tsx`, `request-search-form.tsx`, `record-card.tsx` |
| `FieldGroup` | The stack of fields in one form | `login-form.tsx`, `password-form.tsx`, `reset-request-form.tsx` |
| `FieldSet` `FieldLegend` `FieldTitle` | A named group of related choices | `print-chooser.tsx` |
| `FieldDescription` `FieldError` | The hint under a control; the reason it was refused | `staff-request-form.tsx`, `AppointmentForm.tsx` |

- **An invalid control sets `aria-invalid`** and its `FieldError` says what to change, in the
  words the staff member or patient uses. Color is never the only signal.
- **The label is a `FieldLabel` with `htmlFor`**, never placeholder text. `Label` exists for
  `Field`'s own use; no route imports it.
- **`orientation="horizontal"` is for a control that reads as one line with its label**, like the
  record card's start time. Everything else stacks.

```tsx
// Correct (staff-request-form.tsx): the control carries the state; FieldError carries the words
aria-invalid={errors.name === null ? undefined : true}
```

```tsx incorrect
// Incorrect: a hand-built label stack and a red border that says nothing to a screen reader
<div className="space-y-1"><label>Name</label><input className="border-red-500" /></div>
```

## Controls

| Component | When | Real uses |
| --- | --- | --- |
| `Input` | Single-line text, email, phone, search | `staff-request-form.tsx`, `recipient-row.tsx` |
| `Textarea` | Multi-line text | `staff-request-form.tsx`, `AppointmentForm.tsx` |
| `NativeSelect` | Choosing one of a fixed list | `staff-manager.tsx`, `AppointmentForm.tsx` |
| `Checkbox` | An independent yes or no, including each row of a multi-select list | `print-chooser.tsx` |

The four controls share one `motion` axis: `wgi` (default), `shadcn` and `none`, and only `wgi`
has consumers. `Input`, `Textarea` and `NativeSelect` fade their border and ring over 200ms
`ease`, a recorded literal ([item 16](roadmap.md#16-motion-literals)). `Checkbox` draws a 4px
corner off the radius steps ([item 8](roadmap.md#8-the-radius-ramp)).

Selects stay native. A native `<select>` opens the platform picker on phones, speaks every
locale the site serves and needs no portal layer, so `NativeSelect` is the only select until a
surface needs search inside the list.

```
Which control?
├── Free text → Input; more than one line → Textarea
├── One of a fixed list
│   ├── A request's outcome or follow-up → a choice list (below)
│   └── Anything else → NativeSelect
├── An independent yes or no → Checkbox
├── A date → a date input (dates-and-times.md)
└── A time of day → TimePicker (dates-and-times.md)
```

Dates and times have their own guide, [dates-and-times.md](dates-and-times.md): the raw date
input, practice-local days and instants, and the `TimePicker` wheel.

## Choices

Staff choose outcomes and follow-ups from visible rows, not a menu. The record card renders them
with `RadioGroup` and `ToggleGroup` from `stock/`, a
[recorded import](components.md#recorded-stock-imports); `outcome-choice-list.tsx` and
`workflow-panel.tsx` hand-roll the same rows in `.portal-choice-*`. Both stay as they render until
[item 3](roadmap.md#3-choice-lists) adopts the two primitives into `ui/`. Until then, a new choice
list copies `outcome-choice-list.tsx`.

## Saving

A save on a request — from the staff home, the queue or a request's page — shows its progress in
one toast that follows the save's promise: the working verb
while it runs, the saved sentence only once the server confirmed. `Toaster` (Sonner, from
`src/components/ui/toaster.tsx`) is mounted once, in the portal layout, so a result outlives the
surface that started it; the patient site has none. Toasts sit bottom center, 26rem wide, on
`--popover` paper with `--shadow-popover` and no `richColors`; they arrive on the spring, leave on
leaving, follow a swipe, and under reduced motion fade over 120ms.
`followed` (`(portal)/toast-follow.ts`) narrows that promise on a **type guard**, not a value; its
module and full signature are in [modules.md](modules.md#portal-modules).

| Component | When | Real uses |
| --- | --- | --- |
| `Toaster` | The one toast region for the portal | `(portal)/layout.tsx` |

```ts
// Correct (new/created-toast.ts): `created` is that file's own guard on the result
toast.promise(followed(attempt, created), {
  id: `${CREATED_TOAST_TEST_ID}:${key}`,
  testId: CREATED_TOAST_TEST_ID,
  loading: "Adding appointment request…",
  success: (result) => `${result.name} is on the line under New.`,
});
```

```ts incorrect
// Incorrect: success is announced before the server answered
toast.success("Request added");
void createStaffRequestAction(input);
```

A form that can show its own failure beside the fields gives the toast no error branch; a surface
with nothing to point at, like the request work panel, reads the failure off the rejection. The
home record card keeps its own follower, `record-card-save.ts`, which `use-record-commit.ts` hands
to `toast.promise`.

Settings saves do not toast. A settings form is a `<form action={action} noValidate
aria-labelledby>` opened by its own heading: a `border-t border-[var(--color-line)] pt-5` edge where
it follows a list, every control `disabled={pending}`, and a submit `Button` at `self-end` whose
label turns to the working verb. A refused submit focuses the field, marks it `aria-invalid` with a
`FieldError`, and shows one `role="alert"` `.portal-settings-form-summary` line between the heading
and the fields (`recipients-manager.tsx#L348`, `staff-manager.tsx#L336`). The server's actions
return no field errors, so a failure the server reports is an inline result line, below.

## Reporting a result

The portal answers an action in three places, and they are not interchangeable.

| Mechanism | When | Real uses |
| --- | --- | --- |
| `toast.promise` | A save with a promise to follow, in the portal's one toast region | `created-toast.ts`, `request-notes.tsx`, `use-workflow-panel.ts` |
| `PortalFeedbackMessage` | A result with no promise to follow, or one that has to outlive a toast | `requests-output-actions.tsx`, `print-controls.tsx`, `request-current-feedback.tsx` |
| An inline `role="status"` or `role="alert"` line | A settings manager's result, beside the list or form it changed. The manager calls `router.refresh()` to reload its rows and mounts no provider | `recipients-manager.tsx`, `staff-manager.tsx`, `software/maintainer-access.tsx` |

`PortalFeedbackProvider` (`portal-feedback.tsx`) holds a single current result per page, so a
later note, workflow command or output handoff replaces the banner instead of stacking a second
one. Five surfaces mount it: the staff home, the requests queue, a request's detail page, the
print packet and the review-flyer printer. An island calls `publish({ source, tone, message })`; a
`PortalFeedbackMessage`, which takes `source` and an optional `testId` and `className`, renders only
while the current result carries its own `source`, and
`dismiss(source)` clears only its own. `tone` is `status` or `alert`, and it is both the element's
`role` and its paint: mint on a teal hairline, or `amber-soft` on amber.

An export, print or other handoff has no promise, so it publishes instead of toasting. A save that
already toasts still publishes, because the toast leaves and the banner is what staff come back
to: `request-notes.tsx` and `use-workflow-panel.ts` do both, and clear the banner when the
composer or the panel reopens.
