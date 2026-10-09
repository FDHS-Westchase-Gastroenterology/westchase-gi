# Status stamps

A stamp is a status badge: it carries words beside its color. Its paint follows the roles and the
glass gradient in [color.md](color.md#the-glass-gradient); this guide maps statuses to stamps.

`Badge` (`src/components/ui/badge.tsx`) makes the roles executable. A request's status renders
through `LineStatusBadge` (`src/app/admin/(portal)/(home)/parts/badge.tsx`), a `<span>` that wears
each status's paint under `.wgi-badge-*` with the status word as its words; use it for a request.
An appointment's status on the Schedule wears `Badge` itself: `statusBadge()` in
`schedule/week-card-model.ts` picks the variant and label, and `BADGE_PAINT` lays the same
`.wgi-badge-*` paint over it. A new stamp wears `Badge` and picks its variant by role, never by
paint.

Variants: `attention`, `current`, `settled`, `quiet`. Nothing else exists — an unlisted variant is
a bug, not an option. `variant` is required: there is no default, because a stamp without a
meaning is not a stamp.

Four lowercase `RequestStatus` keys drive a request's stamp — `new`, `contacted`, `scheduled`,
`closed` (`workflow/contracts.ts`). `LineStatusBadge` maps each to its paint and `STATUS_WORDS`
(`src/lib/portal/filters/status.ts`) supplies the word, so no call site writes either; a durable
`RequestState` of `booked` becomes `scheduled` first, through `presentationStatus`.

| Status | Variant | Paint | Words |
| --- | --- | --- | --- |
| `new` | `attention` | Amber glass: `amber-300` → `amber-400`, `amber-500` stroke, `navy-900` words | New |
| `contacted` | `current` | Teal glass: `teal-100` → `teal-200`, `teal-300` stroke, `teal-800` words | Call again |
| `scheduled` | `settled` | Mint glass: `mint-100` → `mint-200`, `mint-300` stroke, `mint-800` words | Scheduled |
| `closed` | `quiet` | Slate ghost: no fill, `slate-300` stroke, `slate-700` words | Closed |

`.wgi-badge-*` (`home.css`) wears each variant's paint on its own 30px geometry. Contrast, top and bottom of the fill: New 7.1 and 6.0, Contacted 7.8
and 6.7, Scheduled 7.3 and 6.6; Closed 6.8 on white and 6.0 on the Home row band.

```tsx
// Correct (line-row.tsx): the status picks the paint; the label is the words
<LineStatusBadge status={line.status} />
```

```tsx incorrect
// Incorrect: a paint instead of a role
<Badge className="bg-teal text-white">New</Badge>
// Incorrect: color carrying state alone
<span aria-label="New" className="size-2 rounded-full bg-amber" />
```
