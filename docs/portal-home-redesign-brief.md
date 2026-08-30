# Staff portal home — redesign brief

**Direction: the redesigned Vercel dashboard, adapted to the portal register.**
Audience: the design agent implementing this. Scope: the portal home page and a reusable
filter system for the portal. Status: direction is decided; this brief is the spec of the
reference, the adaptation rules, and the architecture to follow.

Evidence behind this brief: Jason's reference screenshots; the public write-up by Vercel's
head of design on how the filter system is built; and a hands-on audit of the live Vercel
dashboard (deployments list of this repo's own project, 2026-08-30) driving every
interaction described below. Nothing in "Reference anatomy" is guessed — each behavior was
exercised and observed, URL bar included.

---

## 1. The direction in one paragraph

Home becomes a working list under the header it already has. The current header — the
small-print greeting, the date as the headline, Print appointments and Add appointment
opposite, the rule beneath — **stays exactly as marked** in
[`current-portal-home-header-annotated.png`](./portal-home-redesign-brief/current-portal-home-header-annotated.png);
it is part of home's identity, not the redesign's target. What the Vercel reference
reshapes is everything *below* that rule: a filter bar, then a dense, hairline-ruled
list of lines — no metric tiles, no analytics chrome. (The prose in this brief is a
rough map of how the dashboard works; the images in §6 are the faithful reference.
Where words and image disagree, the image wins.) The filter bar
is the centerpiece: filters appear as pills whose whole state lives in the URL, likely
filters are pre-offered as ghost suggestions one click from active, and every list surface
in the portal eventually speaks this same filter language. The job of home does not change:
who has to be called, in what order. The Vercel dashboard is the reference for *how that
list carries itself*, not for what it says.

**One list, no sections.** The page is not broken into groups — no New, no Call Again,
no section headings. Filters are the organizing principle: what the list shows, and how
it is sliced, is whatever the filter bar says, nothing more. State moves into the lines
themselves: each appointment's badges (`new`, `overdue`, `after hours`, and kin) give
staff immediate signal about that line's standing, so the list never needs to pre-sort
lines into boxes to communicate it.


## 2. Reference anatomy (audited)

### 2.1 Page structure

Sidebar nav (icon + label rows, chevrons on sections) · content column with a plain
`Deployments` page title · filter bar · full-width list. The list is the page; everything
else stays quiet. While loading, skeleton rows occupy the exact geometry of real rows, and
the filter bar renders instantly — filter state is computable from the URL alone, before
any data arrives (verified: pills render fully on a hard reload while rows are still
skeletons).

### 2.2 The filter bar

Left to right: an **Add Filter** button, then **active filter pills** in order, then
**suggestion pills**.

- **Active pill**: solid border, quiet background. Two segments, two buttons: the label
  (`Status Error`) opens an editor popover anchored beneath it; a small `×` removes the
  filter. Label renders as muted key + emphasized value. Multi-select shows up to two
  values inline (`Status Ready | Error`), then collapses to a count (`Status 7 Selected`).
- **Suggestion pill**: same shape, dashed border, muted text, no `×`. It is a *complete,
  pre-filled filter* the page thinks you'll want (`Environment Production`,
  `Status Error`, `Author <team>`), not an empty prompt. One click activates it: the pill
  turns solid, moves before the remaining suggestions, and the URL and list update
  immediately. Removing an active filter returns its suggestion to the end of the bar.
- Suggestions are **context-aware**: after filtering to errors on `main`, the bar offered
  an `Author` suggestion drawn from the authors actually present in the filtered data.

### 2.3 The editor popover

Anchored under the pill (also reachable through Add Filter → category). Anatomy:

1. A search input at top (`Filter to…`) that narrows the option list.
2. An "Any Status" / "Any Date" row — the escape back to unfiltered, doubling as
   select-all state.
3. The options. Two shapes, visually distinct:
   - **multi-select** (Status): checkbox rows; hovering a row reveals a right-aligned
     quick action — `Only` on a checked row, `Check` on an unchecked one.
   - **select** (Created): plain rows with a single ✓; presets (`Last Hour`,
     `Last 24 Hours`, `Last 7 Days`, `Last 30 Days`, `This Month`) plus
     `Custom Date Range`.

Every toggle applies **instantly** — URL, pill label, and list update per click; there is
no Apply button and no dirty state. Esc closes.

### 2.4 Add Filter

Opens the same popover with a `Filter by…` input and the category list (`Branch`,
`Author`, `Environment`, `Status`, `Created`), each opening its submenu. Typing a query
that doesn't match a category collapses the menu to a single AI row echoing the query.
Enter hands the query to the natural-language path; while it resolves, the Add Filter
button itself becomes the pending indicator (`Filtering…`) — no modal, no spinner over
the list. Audited example: with
`status=ready,error & environment=production` already active, the query
"failed deploys on main from last week" produced `status=error & branch=main &
created=<epoch-range>` — it **edited the existing status filter's value** rather than
stacking a contradiction, added two new filters, and left environment alone.

### 2.5 The URL contract

- One param per filter: `?status=ready%2Cerror&environment=production&branch=main`.
- Multi-select joins values with commas in a single param.
- Date ranges travel raw: `created=1787457600000-1788148799999` (epoch ms), displayed as
  `Created Aug 23 – 30` after client-side parsing in the viewer's timezone.
- **Param order is pill order** (first occurrence wins). Verified: hand-reordering the
  params and hard-reloading reordered the pills to match. Refreshing or sharing the link
  reproduces the bar exactly.

### 2.6 The list rows

One line per deployment, generous horizontal rhythm, hairline separators, no card chrome:
title (link) · status as **colored dot + word** + duration (`● Ready 52s`) · secondary
action (`Preview`) · monospace commit hash · branch name with icon · relative time ·
author avatar · overflow `…` menu. Notable details: the *current* production deployment's
badge renders filled/accented while the rest are outlined (state distinguishes the one
that matters); a `Redeploy of …` annotation replaces the commit cell where true; columns
appear contextually (the Production badge column showed once environment was filtered).

### 2.7 Empty and edge states

Zero results: centered `No Results`, a sentence that **names the responsible filter**
("No deployments on the `main` branch match the current filters" — branch name styled as
code), and a `Clear Filters` link. Filtering by branch also surfaced a contextual card
above the list (the branch's domain link) — the page uses the filter as context, not just
as a predicate.

## 3. Adaptation to WGI

The portal already has its world: white paper, navy printed ink, hairline rules, tracked
small caps; amber only as a stamp, teal only as the tracked line; stamps always carry
words. **Take the reference's bones — density, one-line rows, dot+word status, the filter
bar — and paint them entirely with the portal's existing color tokens through the
bridge** (motion is the exception: it is developed fresh for this surface, per §4.5). Do
not import Vercel's dark palette, radii, or type; a Vercel-dark screen inside the portal
is a failure of this brief. The dot+word status pattern is the portal's existing stamp
discipline and needs no new component, only the row context.

### 3.1 Domain mapping

| Vercel | Portal home |
| --- | --- |
| Deployment row | A line: one patient's request |
| Commit message (title) | Patient name, dialable phone beside it |
| Status dot + word (`● Error`) | Status stamp word (`new` / `contacted` / `scheduled` / `closed`) |
| Environment | Location (existing `LOCATION_LABELS`) |
| Branch | Preferred time (existing `TIME_LABELS`) / request kind |
| Author | Staff member who last acted |
| Created | Received (`created_at`) |
| Build duration | Waiting-since (existing `waitingSince` derivation) |
| Preview button | The line's own outcome actions (same outcomes as today's lines, rebuilt fresh per §4.5) |
| Current-production accent | The attention bucket that must be called today |

### 3.2 Filters to define (initial set)

- `status` — multi-select over `REQUEST_STATUSES` (`new`, `contacted`, `scheduled`,
  `closed`), replacing the tab chips on Appointments in time.
- `attention` — select over the derived buckets (`new`, `follow_up`, `stale`,
  `upcoming`): this is the filter home itself runs on.
- `location` — multi-select over `LOCATION_LABELS`.
- `received` — date presets + custom range, encoded as a raw epoch range like the
  reference, parsed for display in `America/New_York`.
- `search` — text (name/phone), sharing the same definition shape so it lives in the
  same URL and bar.

Default home = no params, but the bar opens with **suggestion pills tuned to the job**:
e.g. `Attention Needs call`, `Status New`, `Received Last 7 Days`. There are no group
headers left to carry counts — the flat, badge-signaled list replaces the old New /
Call Again sections (§1) — and counts never grow into metric cards.

### 3.3 What home keeps

The header, verbatim. Greeting as small print, the date large as the headline, Print
appointments and Add appointment opposite, the rule beneath — this is the red-marked
region of
[`current-portal-home-header-annotated.png`](./portal-home-redesign-brief/current-portal-home-header-annotated.png)
and it is **kept, not redesigned**. Where the Vercel reference shows a bare page title,
home's equivalent is this header; do not swap it for a `Deployments`-style label.

Home's job survives with it: the page lists the calls and takes them, outcomes recorded
on the line. The old New / Call Again sections do not survive — below the rule sits the
filter bar, then one flat, attention-ordered list whose lines adopt the reference's row
anatomy, the portal-wide filter language, and per-line badges for state. It does not
turn home into an analytics page.

## 4. Filter-system architecture (build it this way)

This is the part of the reference its head of design published precisely so others could
implement it. Follow it; it is also why agents can extend the system safely later.

### 4.1 One type-safe definition per filter

Each filter is a single exported object — the one source of truth for its key, its UI
shape, its options, and its URL encoding. From the reference (verbatim shapes):

```ts
export const status: FilterParam<string[]> = {
  type: "multi-select",
  key: "Status",
  options: ["Ready", "Error" /* … */],
  // encode, decode, etc.
};

export const author: FilterParam<string> = {
  // …
  encode: (value: string) => ({ author: value }),
  decode: (searchParams) => searchParams.author,
};
```

The filter bar is one component that accepts an array of these definitions. From the
definitions plus the current search params it derives everything: which pills are active,
which suggestions to show, what each editor contains. Adding a filter to a page is adding
one object to an array.

### 4.2 Encoding, decoding, order

- `encode` returns the search-param patch for a value; `decode` reads the value back out
  of the params. When a filter's value changes, first compute the *previous* encoded
  value to know which props to replace or remove (if the old value set `status` and the
  new one doesn't, delete `status`).
- Preserve search-param order by first occurrence when writing. The params are not just
  state — they are the display order of the bar. This is what makes refresh and shared
  links reproduce the exact experience.
- Multi-select values comma-join into one param. Date ranges encode raw (epoch ms) and
  render through the practice clock.

### 4.3 Hooks

Verbatim from the reference (third code slide):

```ts
import { authorFilter } from "#/filters/author";
import { useFilterParam } from "#/filters";

export function useDeployments() {
  const [author, setAuthor] = useFilterParam(authorFilter);
  // …
}
```

Here that reads as, e.g.:

```ts
export function useRequestLines() {
  const [status, setStatus] = useFilterParam(statusFilter);
  // …
}
```

`useFilterParam(def)` has the `useState` DX, needs **no context provider** (value is a
pure function of the current search params), and is type-safe because `FilterParam` is
generic. Under Next this sits on `useSearchParams` + router replace.

### 4.4 Natural language (phase 2, design for it now)

The definitions are isomorphic: importable in client code *and* in the API route. The NL
path: when a typed query has no simple match, generate a zod schema from the relevant
filter definitions, have the model produce an object matching that schema, then
server-side snap select/multi-select values to their closest valid option; a special
sequence lets the model mean "the current user" (here: the signed-in staff member); dates
come back raw so the client parses them in its own timezone. Phase 1 ships without this,
but nothing in phase 1 may preclude it — which costs nothing if the definitions rule.

### 4.5 Component sourcing: start from stock, on purpose

Nearly everything this dashboard needs already exists in the stock shadcn registry, and
the repo vendors that registry in `src/components/stock/` — `popover`, `command`,
`checkbox`, `badge`, `separator`, `skeleton`, `item`, `button`, and the rest. **Build the
dashboard from those stock components, converting each one fresh for this surface — not
from the components already adapted for other surfaces** (`ui/button`, `ui/item`,
`sheet-line`, and kin). Even where an adapted twin exists, take the stock part and do the
conversion again, for the dashboard's own needs.

This will duplicate some work, and that is accepted — deliberately. Components adapted
for other surfaces carry those surfaces' decisions, and reaching for them first forces
the dashboard down their corridor before it has found its own shapes. Starting from
stock is starting from scratch without actually being from scratch.Let the pieces fall where they may;
whether the dashboard's conversions later consolidate with `ui/` is a decision to make
*after* the dashboard has settled, never before.

The freedom is in shape, composition, and animation/interactive behavior — not in paint.
Motion is developed **from scratch** for this surface: do not reach for the existing
`motion` tokens or temperaments; the dashboard finds its own physics, durations, and
easings. What cannot be sacrificed is the brand itself — its geometry, its colors, its
load-bearing aspects: every fresh conversion still draws its colors through the semantic
bridge and keeps the brand's radii and type, adding no new colors, radii, or type steps.
If a part seems to need one of those, the answer is an existing token, or the design is
drifting.

### 4.6 Placement (per DESIGN.md's ownership table)

- Filter definitions: with the portal's domain logic (e.g. `src/lib/portal/filters/`),
  one module per filter — they are contracts, not styling.
- The dashboard's converted components: theirs, colocated with the dashboard until a
  second consumer exists, per the ownership table's colocation rule.

## 5. Interaction contract (acceptance checklist)

The implementation is done when all of these hold:

1. Every filter state is a URL; paste it in a fresh session and the bar, pill order, and
   list reproduce exactly.
2. Reordering the params reorders the pills (first occurrence rules).
3. Toggling any option applies instantly — no Apply button, no dirty state.
4. Active pill = label button (opens editor) + `×` button (removes); removing a filter
   returns its suggestion pill to the end of the bar.
5. Multi-select pills show up to two values inline, then `N Selected`.
6. Editors: search input, an "Any …" escape row, checkboxes for multi-select with
   hover-revealed `Only`/`Check`, single-✓ rows for selects, date presets + custom range.
7. Suggestion pills are complete pre-filled filters, dashed/muted, one click to active,
   and context-aware where data allows.
8. Zero-result state names the responsible filter in plain language and offers
   Clear Filters.
9. Skeleton rows match final row geometry; the filter bar never skeletons.
10. Keyboard + AA: pills and editor rows are real buttons/menu items, focus visible per
    the portal's ring tokens, Esc closes editors, and every text/background pair passes
    WCAG 2.1 AA in the portal palette.
11. Nothing in the build violates DESIGN.md's floors or the practice anchors.
12. The page renders one flat list — no section headings, no groups; state reads from
    each line's badges, and organization comes only from the filter bar.
13. Every dashboard component is a fresh conversion from `stock/`, not a borrow of a
    component adapted for another surface. Its colors come only from the bridge, its
    geometry and type from the brand; its motion and interactive behavior are its own,
    built from scratch for this surface.

## 6. Reference assets

Everything named below is checked in beside this brief, in
`docs/portal-home-redesign-brief/`. Open the images before designing; they are the
reference, this text is the commentary.

| File | What it shows | What to notice |
| --- | --- | --- |
| [vercel-deployments-westchase-suggestions.png](./portal-home-redesign-brief/vercel-deployments-westchase-suggestions.png) | The real Vercel deployments page for this repo's own project, no filters active | The resting state: three ghost suggestion pills already offered (`Author`, `Environment`, `Status`), dense one-line rows, dot+word status, monospace hash, hairline separators |
| [vercel-demo-active-environment-pill.png](./portal-home-redesign-brief/vercel-demo-active-environment-pill.png) | Frame from Vercel's demo video: cursor on an active `Environment Production` pill | Active pill anatomy — solid border, muted key + emphasized value — beside a dashed `Status Error` suggestion; skeleton rows holding the final row geometry |
| [vercel-demo-remove-pill-error-list.png](./portal-home-redesign-brief/vercel-demo-remove-pill-error-list.png) | Demo frame: removing the `Environment` pill via its `×` while `Status Error` stays | The two-button pill (label vs `×`), and the list already narrowed to error rows |
| [vercel-demo-status-pill-suggestions.png](./portal-home-redesign-brief/vercel-demo-status-pill-suggestions.png) | Demo frame: `Status Error` active, `Author` still a suggestion | Active-then-suggestions ordering in the bar |
| [vercel-demo-add-filter-menu.png](./portal-home-redesign-brief/vercel-demo-add-filter-menu.png) | Demo frame: Add Filter popover open | `Filter by…` input on top, category list (`Branch`, `Author`, `Environment`, `Status`, `Created`) with chevrons; list visible behind |
| [code-slide-1-filter-definition-status.jpg](./portal-home-redesign-brief/code-slide-1-filter-definition-status.jpg) | Code slide: the `status` filter definition | `FilterParam<string[]>`, `type: 'multi-select'`, options, encode/decode noted — transcribed in §4.1 |
| [code-slide-2-encode-decode-author.jpg](./portal-home-redesign-brief/code-slide-2-encode-decode-author.jpg) | Code slide: `author` definition's `encode`/`decode` | The param patch shape — transcribed in §4.1 |
| [code-slide-3-use-filter-param-hook.jpg](./portal-home-redesign-brief/code-slide-3-use-filter-param-hook.jpg) | Code slide: `useFilterParam` in a `useDeployments` hook | Provider-less, `useState` DX — transcribed in §4.3 |
| [current-portal-home-header-annotated.png](./portal-home-redesign-brief/current-portal-home-header-annotated.png) | The portal home as it ships today, header red-marked | The marked header (greeting, date headline, actions, rule) is **kept as-is** — it replaces the reference's bare page title. The redesign applies below the rule: filter bar, then the line list |

### 6.1 Audit captures (live walkthrough, full resolution)

Sequential captures from the hands-on audit — the same session §2 describes, on this
repo's own Vercel project. The browser chrome isn't in frame, so each row records the
URL the page carried at that moment; read them as pairs (what you see ↔ what the URL
says).

| File | State | URL at capture |
| --- | --- | --- |
| [audit-01-resting-suggestion-pills.jpg](./portal-home-redesign-brief/audit-01-resting-suggestion-pills.jpg) | Resting state: no filters active, three ghost suggestions offered (`Author`, `Environment`, `Status`), full row list | `/deployments` (no params) |
| [audit-02-status-editor-open.jpg](./portal-home-redesign-brief/audit-02-status-editor-open.jpg) | `Status Error` activated from its suggestion; editor popover open — `Filter to…` input, `Any Status` row, checkboxes, `Error` checked; list already narrowed to error rows | `?status=error` |
| [audit-03-multiselect-uncheck-hover.jpg](./portal-home-redesign-brief/audit-03-multiselect-uncheck-hover.jpg) | `Ready` added: pill reads `Status Error \| Ready`, both boxes checked, hover on the `Ready` row revealing the `Uncheck` quick action; list updated instantly | `?status=error%2Cready` |
| [audit-04-add-filter-categories.jpg](./portal-home-redesign-brief/audit-04-add-filter-categories.jpg) | Add Filter popover: `Filter by…` input over the category list (`Branch`, `Author`, `Environment`, `Status`, `Created`) | `?status=error%2Cready` |
| [audit-05-nl-query-ai-row.jpg](./portal-home-redesign-brief/audit-05-nl-query-ai-row.jpg) | "failed deploys on main from last week" typed; the category list collapses to a single AI row echoing the query | `?status=error%2Cready` |
| [audit-06-nl-filtering-pending.jpg](./portal-home-redesign-brief/audit-06-nl-filtering-pending.jpg) | Enter pressed: the Add Filter button itself shows the pending state (`Filtering…`); note the `Author` suggestion already updated to the team name | `?status=error%2Cready` (about to change) |
| [audit-07-nl-result-empty-state.jpg](./portal-home-redesign-brief/audit-07-nl-result-empty-state.jpg) | The AI result: `Status` rewritten to just `Error`, `Branch main` and `Created Aug 23 – 30` added as pills; a contextual branch-link card above the list; `No Results` empty state naming the `main` branch, with `Clear Filters` | `?status=error&branch=main&created=1787457600000-1788148799999` |
| [audit-08-created-date-editor.jpg](./portal-home-redesign-brief/audit-08-created-date-editor.jpg) | The `Created` pill's editor: single-select rows (`Any Date`, `Last Hour`, `Last 24 Hours`, `Last 7 Days`, `Last 30 Days`, `This Month`), the AI's range shown as `Custom Date Range` ✓ | `?status=error&branch=main&created=1787457600000-1788148799999` |

## 7. Sources

- Reference screenshots (Vercel dashboard, deployments view; filter bar states; three
  code slides), provided 2026-08-30.
- Public write-up by Vercel's head of design on the filter system: definitions as
  type-safe objects; encode/decode with order preservation; provider-less `useState`-DX
  hooks; isomorphic definitions powering a zod-schema NL route. (Paraphrased in §4.)
- Live audit of vercel.com project `westchase-gi`, 2026-08-30: every behavior in §2
  exercised directly — activation/removal/suggestion-return, multi-select URL encoding,
  `Only`/`Check` hover actions, NL query rewriting an active filter, epoch date ranges,
  param-order/pill-order round trip, contextual suggestions, empty state.
