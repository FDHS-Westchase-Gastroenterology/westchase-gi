# Surfaces

A surface is the paper the content sits on: a card, a table, a list of rows, the rules and
scrollbars between them. The portal's surfaces are white on the workbench tint; the patient
site's are the section bands in [layout.md](layout.md#page-structures).

Every branch of the tree below is a `ui/` recipe only the staff portal consumes, so the tree
answers a portal question. A patient page picks from the `.card` class and the content classes in
[patient-site.md](patient-site.md) instead.

```
Which portal surface?
├── Records with the same fields, compared down columns → Table
├── Entries read one after another, each a title and a line of detail → Item in an ItemGroup
├── One block of content that needs a heading, a body and actions → Card
└── A short status word → Badge
```

## Cards

| Component | When | Real uses |
| --- | --- | --- |
| `Card` `CardContent` | The surface and its body | `line-list.tsx`, `(home)/loading.tsx`, `auth-card.tsx` |
| `CardHeader` `CardDescription` | A title block above the body | `auth-card.tsx` |
| `CardFooter` | The row under the body: counts, pagers, actions | `line-list.tsx`, `(home)/loading.tsx` |

`CardTitle` and `CardAction` have no consumer today. The recipe carries the radius, the border and
the padding; a call site adds layout only. The staff home's list card and the signed-out
`AuthCard` both repaint theirs — the home through its `.wgi-list-*` hooks, `AuthCard` through a
`className` that resets padding, radius and shadow ([item 1](roadmap.md#1-card-surfaces)).

```tsx
// Correct (line-list.tsx): the recipe is the surface; the class is the route's paint hook
<CardContent className="wgi-list-body">
```

```tsx incorrect
// Incorrect: a hand-built card re-invents the radius, border and shadow
<div className="rounded-xl border bg-white p-6 shadow">
```

## Tables

| Component | When | Real uses |
| --- | --- | --- |
| `Table` `TableHeader` `TableBody` `TableRow` | The grid itself | `line-list.tsx`, `audit/page.tsx`, `release-engagement.tsx` |
| `TableHead` `TableCell` | A column heading; a cell | `line-list.tsx`, `audit/page.tsx`, `release-engagement.tsx` |

- **Every column heading is a `TableHead`, and the recipe supplies `scope="col"`.** A call site
  passes `scope` only for a header that labels a row. The staff home's list adds `data-cell` as
  well, which names its columns in `home.css`.
- **A pressable row holds a button.** `TableRow` is not the control; the staff home's open action
  is a button inside the row's cell ([accessibility.md](accessibility.md#targets)).
- **`TableCaption` and `TableFooter` have no consumer today.** A table that needs a summary row
  uses `CardFooter` under it, as the staff home does.
- **A wide table brings its own scroll container.** `Table` sets no width and no overflow. A table
  too wide for its column sits in a `div` with `overflow-x-auto` plus `role="region"`,
  `aria-labelledby` and `tabIndex={0}`, so a keyboard can reach and scroll it: `audit/page.tsx`
  wraps a `min-w-[640px]` table that way. `release-engagement.tsx` answers the same width the
  other way, hiding its table below `md` and repeating the rows as a list.

Eleven audit cells set their own ink and size through `className`
([styling.md](styling.md#recorded-call-site-restyles)); those looks wait on
[item 17](roadmap.md#17-call-site-restyles), and a new table takes the recipe's.

## Lists

| Component | When | Real uses |
| --- | --- | --- |
| `Item` `ItemGroup` `ItemContent` `ItemTitle` `ItemDescription` | Entries read in sequence: notes, an activity trail | `full-record-sheet-body.tsx` |

The full record sheet renders its notes and history as `size="xs"` items inside an `ItemGroup`.
`variant` (`default`, `outline`, `muted`), the other sizes, and `ItemMedia`, `ItemActions`,
`ItemHeader`, `ItemFooter` and `ItemSeparator` have no consumer today. The sheet's own
`.wgi-sheet-items` hook adds the entry states (`data-undone`, `data-attention`); its hover
transition is a recorded literal ([item 16](roadmap.md#16-motion-literals)).

## Rules and scrolling

| Component | When | Real uses |
| --- | --- | --- |
| `Separator` | A rule between sections of one surface | `full-record-sheet-body.tsx` |
| `ScrollArea` `ScrollAreaViewport` `ScrollBar` `ScrollAreaThumb` | The staff home's request list, which needs a rail that survives its own row states | `line-list.tsx` |

The platform scrollbar is the default everywhere else: `ScrollArea` is adopted for the staff
home's list alone ([adoption.md](adoption.md#standing-findings)), and its viewport keeps the
region role and label that make the list reachable from the keyboard.

```tsx
// Correct (line-list.tsx): the viewport is the scrolling region, named for a screen reader
<ScrollAreaViewport role="region" aria-label="Appointment requests" tabIndex={0} className="wgi-list-viewport">
```

```tsx incorrect
// Incorrect: a custom rail nobody can reach, over content that already scrolls natively
<div className="overflow-y-scroll [&::-webkit-scrollbar]:hidden">
```

## Badges

A badge is a status word on a colored ground. The word always rides with the color: the color
repeats what the word says and never carries the meaning alone.

| Component | When | Real uses |
| --- | --- | --- |
| `Badge` | The recipe: four brand variants, no default | `status-badge.tsx` |

| Variant | Paint | Says |
| --- | --- | --- |
| `attention` | Amber | Waiting on the practice: a new request |
| `current` | Mint | In hand: someone has made contact |
| `settled` | Navy | Done and dated: the appointment is scheduled |
| `quiet` | Grey | Closed, out of the queue |

`variant` is required, because a color with no status is a guess. `motion` is `none` by default;
`shadcn` has no consumer.

Two route-owned wrappers map product status to these words
([components.md](components.md#route-owned-compositions)): `StatusBadge` for the requests queue
and detail page, and `LineStatusBadge` for the staff home's rows and its record sheet, repainted
in `home.css` under `.wgi-badge*`. A new surface that shows request status imports one of them
rather than choosing a variant itself.

```tsx
// Correct (status-badge.tsx): status picks the variant, and the word stays in the badge
<Badge data-status={status} variant={STATUS_VARIANTS[status]}>
```

```tsx incorrect
// Incorrect: no variant, and a dot that leaves the color carrying the meaning
<Badge><span className="size-2 rounded-full bg-amber-500" /></Badge>
```

## Empty states

Nothing to show is still a surface, and which one depends on how much is empty. All four are
hand-built classes today; `Empty` (`stock/empty.tsx`) replaces them under
[roadmap item 5](roadmap.md#5-empty-states-callouts-and-pagers).

| Class | What it is | Where |
| --- | --- | --- |
| `.portal-empty-state` | The whole route has nothing: 19rem tall, start-aligned between hairlines, an optional teal icon, an `h2`, a 58ch line and a row of actions | `error.tsx`, `not-found.tsx`, four states in `requests/print/page.tsx` |
| `.portal-queue-empty` | A list panel came back empty: 18rem, centered, an `h2`, a 52ch line and one `.portal-inline-link` | `request-queue-empty.tsx` |
| `.portal-empty` | Hairlines on a `mint` ground and nothing else; the call site brings its own padding and centering | `audit/page.tsx`, `recent-work.tsx` |
| `.portal-request-notes-empty` `.portal-request-history-empty` | One muted 0.9rem line inside a section that is already open, with no box around it | `[id]/page.tsx`, `request-notes.tsx` |

An emptiness that is a refusal rather than a resting state also carries `role="alert"`: four of
the six `.portal-empty-state` uses do, because the packet route was asked for something it cannot
print ([accessibility.md](accessibility.md#announcements)).
