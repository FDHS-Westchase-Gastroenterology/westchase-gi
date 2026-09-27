# Surfaces

A surface is the paper the content sits on: a card, a table, a list of rows, the rules and
scrollbars between them. The tree answers a portal question: every branch but the settings rows
is a `ui/` recipe only the portal consumes, white on the workbench tint. A patient page uses the
section bands in [layout.md](layout.md#page-structures) and the `.card` and content classes in
[patient-site.md](patient-site.md) instead.

```
Which portal surface?
├── Records with the same fields, compared down columns → Table
├── Entries read one after another, each a title and a line of detail → Item in an ItemGroup
├── Settings rows, each carrying its own controls → a ruled <ul> (see Lists)
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
| `TableHead` `TableCell` | A column heading; a cell | `line-list.tsx`, `line-row.tsx`, `audit/page.tsx`, `release-engagement.tsx` |

- **Every column heading is a `TableHead`, and the recipe supplies `scope="col"`.** A call site
  passes `scope` only for a header that labels a row. The staff home's list adds `data-cell` as
  well, which names its columns in `home.css`.
- **A pressable row holds a button.** `TableRow` is not the control; the staff home's open action
  is a button inside the row's cell ([accessibility.md](accessibility.md#targets)).
- **`TableCaption` and `TableFooter` have no consumer today.** A table that needs a summary row
  uses `CardFooter` under it, as the staff home does.
- **A wide table brings its own scroll container.** `Table` sets no width or overflow, so
  `audit/page.tsx` wraps its `min-w-[640px]` table in a `div` with `overflow-x-auto`,
  `role="region"`, `aria-labelledby` and `tabIndex={0}`, which a keyboard can reach and scroll.
  `release-engagement.tsx` instead hides its table below `md` and repeats the rows as a list.

Eleven audit cells set their own ink and size ([recorded](styling.md#recorded-call-site-restyles),
waiting on [item 17](roadmap.md#17-call-site-restyles)); a new table takes the recipe's.

## Lists

| Component | When | Real uses |
| --- | --- | --- |
| `Item` `ItemGroup` `ItemContent` `ItemTitle` `ItemDescription` | Entries read in sequence: notes, an activity trail | None in product since the full record's redesign |
| A ruled `<ul>` of settings rows, plain markup | Rows that each carry their own controls: a recipient, a staff member, a maintainer | `recipients-manager.tsx` with `recipient-row.tsx`, `staff-manager.tsx`, `software/maintainer-access.tsx` |

The full record's history (`full-record-history.tsx`) is one-line rows under sticky days, not
`Item`s. It is the sheet's one scroll region until it would show under three rows. Undone events
are struck through; a failed notification email escalates in amber. A row's detail is one popover
beside the sheet, arrow on the row: it opens on a resting pointer, at once while warm, and on
keyboard focus without taking it; a click pins it, and it takes the first Escape.

`Item` waits for a consumer. Its `duration-100` color transition is a recorded literal
([item 16](roadmap.md#16-motion-literals)). `ItemGroup` renders `role="list"`, so each `Item` is
announced as a list entry. `size="sm"` pads exactly like `default`; choose `default` or `xs`.
`ItemTitle` is 14px `font-medium` with `line-clamp-1` and `ItemDescription` clamps at two lines;
14px sits below the portal's 15px floor ([typography.md](typography.md#sizes)), so a consumer
repaints them or adds a size ([adoption](adoption.md#workflow)).

Settings rows are plain markup, written the same way in all three lists:
`<ul className="divide-y divide-[var(--color-line)]">`, each
`<li className="flex flex-wrap items-center justify-between gap-3 py-3.5">` holding the name as
`truncate font-bold text-[var(--color-ink)]` and the controls. Copy it; the `<ul>`'s top margin
follows its place in the panel. A second line under the name is `truncate` muted ink at
`text-[length:var(--pt-xs)]`, not the `0.85rem` [item 2](roadmap.md#2-workbench-tokenization)
records. A new control wears `Button` ([buttons.md](buttons.md#button-or-link)); the rows'
hand-built buttons wait on [item 17](roadmap.md#17-call-site-restyles).

## Rules and scrolling

| Component | When | Real uses |
| --- | --- | --- |
| `Separator` | A rule between sections of one surface | `FieldSeparator` in `ui/field.tsx` |
| `ScrollArea` `ScrollAreaViewport` `ScrollBar` `ScrollAreaThumb` | The staff home's request list and the full record's history, which need a rail that survives their own row states | `line-list.tsx`, `full-record-history.tsx` |

`ScrollArea` is adopted for those two staff home regions
([adoption.md](adoption.md#standing-findings)); each viewport keeps the region role and label that
make it reachable from the keyboard. Every other list grows and the page scrolls natively.

A rule that opens the block below it belongs to that block: the add forms under the recipient,
staff and maintainer lists open with `mt-5 border-t border-[var(--color-line)] pt-5`. A rule that
stands alone between two sections of one surface is a `Separator`.

```tsx
// Correct (line-list.tsx): the viewport is the scrolling region, named for a screen reader
<ScrollAreaViewport role="region" aria-label="Appointment requests" tabIndex={0} className="wgi-list-viewport">
```

```tsx incorrect
// Incorrect: a custom rail nobody can reach, over content that already scrolls natively
<div className="overflow-y-scroll [&::-webkit-scrollbar]:hidden">
```

## Badges

| Component | When | Real uses |
| --- | --- | --- |
| `Badge` | A status word on a colored ground: four brand variants, `variant` required | `status-badge.tsx` |

The variants, the status each one stamps and the rule that color never speaks alone are in
[stamps.md](stamps.md). Two route-owned wrappers map product status to them
([components.md](components.md#route-owned-compositions)): `StatusBadge` for the requests queue
and detail page, and `LineStatusBadge` for the staff home's rows and its record sheet, repainted
in `home.css` under `.wgi-badge*`. A new surface that shows request status imports one of them
rather than choosing a variant itself. `motion` is `none` by default; `shadcn` has no consumer.

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

A settings list with no rows keeps its `<ul>` and says so in one muted `<li>` at `py-4`
(`recipients-manager.tsx#L642`); a new one writes `text-[length:var(--pt-sm)]`, not its `0.95rem`.

An emptiness that is a refusal rather than a resting state also carries `role="alert"`: four of
the six `.portal-empty-state` uses do, because the packet route was asked for something it cannot
print ([accessibility.md](accessibility.md#announcements)).
