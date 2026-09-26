# Status stamps

A stamp is a status badge: it carries words beside its color. Its paint follows the roles and the
glass gradient in [color.md](color.md#the-glass-gradient); this guide maps statuses to stamps.

`Badge` (`src/components/ui/badge.tsx`) makes the roles executable, and `StatusBadge`
(`src/app/admin/(portal)/requests/status-badge.tsx`) maps each request status to a variant with
the status label as its words. Use `StatusBadge` for a request. No stamp outside a request status
exists today; the first one wears `Badge` and picks its variant by role, never by paint.

Variants: `attention`, `current`, `settled`, `quiet`. Nothing else exists — an unlisted variant is
a bug, not an option. `variant` is required: there is no default, because a stamp without a
meaning is not a stamp.

Four lowercase `RequestStatus` keys drive it — `new`, `contacted`, `scheduled`, `closed`
(`workflow/contracts.ts`). `STATUS_VARIANTS` maps each to a variant and `STATUS_LABELS`
(`requests/format.ts`) supplies the capitalized word, so no call site writes either; a durable
`RequestState` of `booked` becomes `scheduled` first, through `presentationStatus`.

| Status | Variant | Paint | Words |
| --- | --- | --- | --- |
| `new` | `attention` | Amber glass: `amber-300` → `amber-400`, `amber-500` stroke, `navy-900` words | New |
| `contacted` | `current` | Teal glass: `teal-100` → `teal-200`, `teal-300` stroke, `teal-800` words | Contacted |
| `scheduled` | `settled` | Mint glass: `mint-100` → `mint-200`, `mint-300` stroke, `mint-800` words | Scheduled |
| `closed` | `quiet` | Slate ghost: no fill, `slate-300` stroke, `slate-700` words | Closed |

The staff home's `.wgi-badge-*` (`home.css`) wears the same paint on its own 30px geometry, where
Contacted reads "Call again". Contrast, top and bottom of the fill: New 7.1 and 6.0, Contacted 7.8
and 6.7, Scheduled 7.3 and 6.6; Closed 6.8 on white and 6.0 on the Home row band.

```tsx
// Correct (requests/page.tsx): the status picks the paint; the label is the words
<StatusBadge status={request.status} />
```

```tsx incorrect
// Incorrect: a paint instead of a role
<Badge className="bg-teal text-white">New</Badge>
// Incorrect: color carrying state alone
<span aria-label="New" className="size-2 rounded-full bg-amber" />
```
