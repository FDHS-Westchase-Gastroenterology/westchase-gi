# Dates and times

A date field stays the platform's own input; a time of day on the staff home is the one control
that replaces a native input. Both sit inside the `Field` family in [forms.md](forms.md), which
owns labels, errors and saving.

## Dates

A date is a raw `<input type="date">`, not the `Input` recipe, practice-local, in the
`YYYY-MM-DD` strings the portal passes around: the record's call-again day, an outcome's day, the
Received editor's custom range. Each call site styles its own. The request detail's date fields
write the `Input` geometry by hand (`fieldClass` in `outcome-choice-list.tsx#L84`, and
`call-again-fieldset.tsx#L114`), and the Received editor's wear `.wgi-editor-range-fields` in
`home.css`. `practiceLocalDay(offsetDays)` (`requests/appointment-input.ts`) gives a practice-local
`min` or `max`. The Received editor pairs its Start and End inputs with a month grid; the staff
home's grids are `HomeRangeCalendar` and `HomeDayCalendar` on the stock
`Calendar` ([item 6](roadmap.md#6-the-calendar)). A new date control is a date input that copies the
request detail's, and the copy joins [item 3](roadmap.md#3-choice-lists) with them.

An instant — when a request arrived, when a follow-up is due — formats in `PRACTICE_TIME_ZONE`
(`America/New_York`, `src/lib/portal/scheduling/time.ts`); `requests/format.ts` writes the same zone
into each of its formatters. A calendar day or a clock time has no instant behind it, so it formats
in UTC from a UTC anchor, as `clockLabel` in `(home)/record-card-time.ts` does, and day math
anchors `${day}T00:00:00Z`. `format.ts` has no plain-day formatter; a new one follows `clockLabel`.

## Time

`TimePicker` and `TimePickerColumn` in `ui/time-picker.tsx` are the wheel: columns of options that
scroll with momentum (`time-picker-physics.ts`) and settle on a row, operable by keyboard. Paint
and motion axes live in `time-picker-variants.ts`.

| Component | When | Real uses |
| --- | --- | --- |
| `TimePicker` `TimePickerColumn` | The wheel itself, composed with hour, minute and meridiem columns | `parts/time-picker.tsx` |

`TimePicker` is the frame. It takes `size` and any `div` prop and has no role of its own, so the
caller names it with `aria-label` (`aria-label="Start time"` in the staff home). `TimePickerColumn`
is one wheel and takes no element props:

| Prop | What it carries |
| --- | --- |
| `label` | The wheel's accessible name; the column renders `role="listbox"` named by it |
| `options` | `readonly TimePickerOption[]`, each `{ value, label }` |
| `value` | The selected `value`; one the options do not carry parks the wheel on its first row |
| `onValueChange` | `(value: string) => void` |
| `disabled`, `className` | Optional |
| `motion` | The row temperament; `wgi` is the default |

The staff home wraps the wheel for the record card: the wrapper supplies the Hour, Minute and
"AM or PM" columns at `size="sm"` and a full-width Done
([components.md](components.md#route-owned-compositions)), inside the start-time panel in
[overlays.md](overlays.md#the-start-time-panel). Its columns are cut from `TIME_SLOTS`,
every minute from `TIME_MIN` to `TIME_MAX`, in `(home)/record-card-time.ts`: `MERIDIEMS`,
`hourOptions(meridiem)` and `minuteOptions(meridiem, hour)` return strings that the wrapper's
`labelled()` turns into options, and `joinTime` returns `""` for a time outside the slots. The
model and the wrapper both belong to the staff home. A second time field composes the wheel from
`ui/` the same way, and first moves the model into `src/lib/portal/`, so one route never imports
another's.

Two gaps wait on [item 18](roadmap.md#18-time-picker-name): whether the frame's `aria-label` reaches
a screen reader, and the request detail's outcome time, still a native `<input type="time">`
(`outcome-choice-list.tsx#L125`) against the control tree in [forms.md](forms.md#controls).
