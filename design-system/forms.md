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
├── A date → a date input (below)
└── A time of day → TimePicker
```

## Choices

Staff choose outcomes and follow-ups from visible rows, not a menu. The record card renders them
with `RadioGroup` and `ToggleGroup` from `stock/`, a
[recorded import](components.md#recorded-stock-imports); `outcome-choice-list.tsx` and
`workflow-panel.tsx` hand-roll the same rows in `.portal-choice-*`. Both stay as they render until
[item 3](roadmap.md#3-choice-lists) adopts the two primitives into `ui/`. Until then, a new choice
list copies `outcome-choice-list.tsx`.

## Dates

A date is `<input type="date">`, practice-local, in the `YYYY-MM-DD` strings the portal passes
around: the record's call-again day, an outcome's day, the Received editor's custom range.
The Received editor pairs its Start and End inputs with a month grid; the staff home's grids are
`HomeRangeCalendar` and `HomeDayCalendar` on the stock
`Calendar` ([item 6](roadmap.md#6-the-calendar)). A new date control is a date input.

## Time

`TimePicker` and `TimePickerColumn` in `ui/time-picker.tsx` are the wheel: columns of options that
scroll with momentum (`time-picker-physics.ts`) and settle on a row, operable by keyboard. Paint
and motion axes live in `time-picker-variants.ts`.

| Component | When | Real uses |
| --- | --- | --- |
| `TimePicker` `TimePickerColumn` | The wheel itself, composed with hour, minute and meridiem columns | `parts/time-picker.tsx` |

The staff home wraps the wheel for the record card: the wrapper supplies the Hour, Minute and
"AM or PM" columns at `size="sm"` and a full-width Done
([components.md](components.md#route-owned-compositions)). A second time field composes the wheel
from `ui/` the same way; the wrapper stays the staff home's.

## Saving

A portal save shows its progress in one toast that follows the save's promise: the working verb
while it runs, the saved sentence only once the server confirmed. `Toaster` (Sonner, from
`stock/sonner.tsx`) is mounted once, in the portal layout; the patient site has no toasts.

| Component | When | Real uses |
| --- | --- | --- |
| `Toaster` | The one toast region for the portal | `(portal)/layout.tsx` |

```ts
// Correct (created-toast.ts): toast.promise follows the attempt through followed()
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
home record card keeps its own follower, `record-card-save.ts`.
