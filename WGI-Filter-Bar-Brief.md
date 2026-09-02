# Westchase GI staff portal — Homepage filter bar brief

**Scope.** The filter bar on the staff portal homepage (`/admin`) and nothing else: the **Add filter** button, the active chips, the ghost (suggested) chips, the five editors (Status, Attention, Location, Received, Search), what they write to the URL, and the empty state the bar produces. The target is the interaction model of the filter bar on Vercel's Deployments dashboard; the gap between that and the portal's bar today is the whole job.

Off-limits, even where this brief mentions them: the row popover, the detail sheet ("Full record"), the Add appointment modal, the rows themselves (their columns, tooltips, and stamps), the Appointments page (`/admin/requests`), the request page (`/admin/requests/<id>`), Settings, Help, the sidebar, and Print appointments. Those are briefed separately.

Also out of scope: Vercel's natural-language search (typing a sentence into Add filter and having filters applied for you). The portal is not there yet.

Visual design is not part of this brief. The bar keeps the portal's existing design system — type, color, spacing, components — exactly as it is. Where a behavior needs an element the bar lacks today (the editor header, the calendar grid), build it from components the repo already has; restyle nothing.

**Audience.** The implementing agent. This brief says what must happen and which kinds of interaction to use. Internals are the agent's call; the repo already carries the portal's conventions.

**Base branch.** All work branches off PR 224 (`portal/appointment-workflow-experience`). Test login: `admin` / `123`. Preview of the base branch: `https://westchase-gi-git-portal-appoi-dce1f5-jasongitdev-1290s-projects.vercel.app/admin`. The floating dark button on the right edge of the preview is Vercel's toolbar, not the portal; ignore it.

Walk the portal yourself (the preview above, or the repo run locally) with Stagehand; section 3 describes Vercel's side. Where the text is silent, section 4's "verified fine" list means "as today".

---

## 1. Rules (apply to everything below)

1. **Never clean up, merge, or alter existing records or data as a side effect of a UI change.** Repeated or odd-looking data may be something staff did that the old UX allowed. Report it in your hand-off notes; Jason decides.
2. **Use the portal's own vocabulary, exactly, in every label, hint, and message.** The vocabulary is pinned in section 2. Do not introduce synonyms.
3. **Section 6 is checked by walking the UI**, not by reading code or config. If a box can't be met as written, say so in hand-off notes rather than quietly building something adjacent.
4. **Build what is asked; don't add guardrails, rules, or scope beyond it.** If something seems missing, ask in hand-off notes.

---

## 2. Words the bar uses (use exactly)

| Thing | Word the portal uses |
|---|---|
| A row in the list | **request** (an appointment request). The list is "the line". |
| The person | **patient** (name, phone) |
| The button that opens the category list | **Add filter** |
| The category list's search box | "Filter by…" |
| Each editor's search box | "Filter to…" |
| An active filter in the bar | **chip**, showing the dimension and the value: STATUS New |
| A suggested, not-yet-active filter in the bar | **ghost chip** (same shape, dashed, no ×) |
| The escape row at the top of every editor | **Any status** · **Any attention** · **Any location** · **Any date** |
| Status values | **New**, **Call again**, **Scheduled**, **Closed** |
| Attention values | **New**, **Follow-up due**, **Gone quiet**, **Later days** — and no others |
| Location values | **Tampa**, **Lutz**, **Either office** |
| Received presets | **Today**, **Last 7 days**, **Last 30 days**, **This month**, then **Custom range** |
| Search | placeholder "Name or phone…", hint "Matches name or phone. Applies as you type." |
| Hover actions inside a checkbox editor | **Only** (isolate this value) · **Check all** (bring every value back) |
| Resetting the bar | **Clear filters** |

The Attention list above is complete. **AFTER HOURS** and **OVERDUE** are row stamps, not Attention options; the rows keep those stamps exactly as they are (rows are off-limits in this brief).

---

## 3. The gap: Vercel's filter bar vs. the portal's, today

Vercel's side was verified live on Sept 2 (Deployments page of this repo's own Vercel project). The portal's side was verified live the same day on the PR 224 preview, then confirmed against the branch.

| Behavior | Vercel | Portal today | Gap |
|---|---|---|---|
| Bar layout: Add filter → active chips in URL order → ghost chips | Yes | Yes | None |
| Ghost chip: one click activates it (chip turns solid, moves before the remaining ghosts, list and URL update); removing the chip returns its ghost to the end; a context-aware ghost appears from the filtered data | Yes | Yes (context ghost is the office most present in the filtered rows) | None |
| Chip anatomy: the label opens the editor, × removes the filter | Yes | Yes | None |
| Chip value: single value inline; several values inline up to a point, then "N selected" | Up to three inline ("Ready \| Error \| Building"), "4 Selected" from four | Up to two inline, "3 selected" from three | None — keep the portal's rule (F4) |
| Editor header on the Add Filter path: "Status ⌄" beside the "Filter to…" box; clicking it returns to the category list, so you can hop to another dimension without closing. An editor opened from a chip has no header — just "Filter to…", scoped to that chip's dimension | Yes | No header anywhere. A submenu opened from Add filter has no way back | **F3** |
| Checkbox editor with nothing filtered | The values the page shows by default are checked; hovering a row's label offers **Check All**; the checkbox itself toggles that one value (hint reads Check / Uncheck) | Every box empty; "Any status" never shows a check; first hover affordance is **Check** | **F1** |
| Checkbox editor with a filter active | Hovering a row's label offers **Only**; on the sole checked value it offers **Check All**; when every value is checked, the Any row shows ✓ | **Only** on checked rows, **Check** on unchecked; no **Check all**; the Any row never shows ✓ | **F1** |
| Single-choice editor (Attention here; Created presets there) | The Any row shows ✓ when nothing is chosen; choosing a value moves the ✓ | Any row is plain text, never checked | **F1** |
| Every toggle applies instantly (URL, chip, list); Esc closes | Yes | Yes | None |
| Custom date range | Calendar grid with month navigation, Start and End fields, an explicit **Apply**; nothing changes until Apply is pressed; a timezone selector (not needed here) | "Custom range" applies a 14-day range the moment it is chosen; two native date inputs each apply on change, so a half-edited range applies itself | **F5** |
| URL: one param per filter, comma-joined multi-select, raw epoch range for dates, param order is chip order, refresh and shared links reproduce the bar | Yes | Yes | None |
| Empty state | "No Results", a sentence naming the responsible filter, Clear Filters | "No results", a sentence naming the responsible filter **and how many requests removing it would show**, Clear filters | None — portal is better; keep |
| Bar renders from the URL before rows arrive | Yes | Yes | None |
| Default ghost chips combine to a non-empty list | Vercel's ghosts are different dimensions (Author, Environment, Status), so they combine | ATTENTION Follow-up due + STATUS New together give "No results" | **F2** |
| Natural-language search from Add filter | Yes | No | Out of scope |

---

## 4. Findings (evidence)

Each finding can be reproduced live on the preview as `admin`; the steps are the evidence.

**F1 — The checkbox editors don't say what is selected.** Fresh load of `/admin` → Add filter → Status: "Filter to…", then "Any status" as plain text, then New / Call again / Scheduled / Closed with every box empty, even though the list is showing all four statuses. Hovering a row offers **Check**. There is no **Check all** anywhere; after isolating a value with **Only**, the only way back to everything is "Any status", which removes the chip and closes the editor. Location behaves the same. Attention (single choice) never puts a check on "Any attention". On Vercel the editor always shows the current selection: default values checked, Any ✓ when everything is selected, **Only** to isolate, **Check All** to restore.

**F2 — The two default ghost chips contradict each other.** ATTENTION Follow-up due selects requests that have been contacted and are due for a call; STATUS New selects requests nobody has contacted. Click both ghosts → "No results" and a sentence naming whichever chip went on first as the one to remove. The empty state explains it well, but a pair of suggestions that cancel each other is the wrong offer.

**F3 — Submenus reached through Add filter have no header and no way back.** Add filter → Status shows only the "Filter to…" box above the options; to pick a different dimension you must close and reopen. Vercel shows "Status ⌄" beside the box on that path, and clicking it returns to the category list. An editor opened from a chip is the same on both sides — a bare "Filter to…" box scoped to that chip's dimension — so nothing changes there.

**F4 — Chip value collapse: not a gap.** Portal: two values inline, "3 selected" from three. Vercel: three inline, "4 Selected" from four. Once section 5.3 lands, all values checked means no chip, so a Status chip can hold at most three values and a Location chip at most two. Keep the portal's rule as it is: the bar is narrower than Vercel's, and "3 selected" is the only case where the two rules differ.

**F5 — Custom range applies before you've chosen it.** Received → Custom range immediately applies a two-week range (chip "RECEIVED <14 days ago> – <today>", list narrows) and reveals From / To native date inputs. Editing From applies at once against the old To; a range typed halfway applies itself. Nothing in the editor lets you set both ends and then commit.

**Verified fine, no action:** ghost chips activate and return as Vercel's do; the context-aware LOCATION ghost; chip label reopens the editor, × removes; live filtering while an editor is open; deep links restore chips and list in param order; Clear filters resets to `/admin` and brings the ghosts back; the empty state names the filter to blame and counts what removing it would show (keep — better than Vercel's); Esc closes every editor; Search applies as you type; the bar renders from the URL before rows arrive.

---

## 5. Required behavior

### 5.1 The bar

- Layout, chip anatomy, ghost chip behavior, live filtering, URL contract, empty state, Clear filters: as today (section 4, "verified fine").
- The two default ghost chips are **ATTENTION Follow-up due** and **ATTENTION New**, in that order. ATTENTION New selects the same requests STATUS New did (a request nobody has contacted), so nothing is lost. Both ghosts live on one single-choice dimension, so they can never be active together: with one of them active, clicking the other ghost switches the chip to that value, and the value just replaced returns to the bar as a ghost. Removing the chip with × returns its ghost to the end of the bar, as today.
- The context-aware LOCATION ghost stays as today.

### 5.2 Every editor

- In an editor reached through Add filter, a header row "**<Dimension> ⌄**" sits beside the "Filter to…" box. Clicking it shows the category list; choosing a category opens that editor in place. An editor opened from a chip stays as today: the "Filter to…" box only. The "Filter by…" box in the category list and "Filter to…" in each editor keep working as today.
- Every toggle applies instantly, as today. The one exception is Custom range (5.5).
- Escape closes the editor and focus returns to the chip or Add filter button that opened it.

### 5.3 Status and Location (checkbox editors)

- With no filter on that dimension, every value shows checked and the Any row shows ✓. No chip is shown and no URL param is written. This is the resting state, not a filter.
- Each row has two targets. The **checkbox** toggles that one value; hovering near it the hint reads **Check** or **Uncheck**. The **label** carries a quick action on hover: **Only** — leaving only that value checked — or, when that value is the sole one checked, **Check all** — restoring every value.
- Unchecking values produces a chip listing what remains checked. Unchecking the last value, or choosing the Any row, restores every value and removes the chip.
- Chip value, as today: one value as itself ("New"); two values inline ("New | Call again"); three or more as "3 selected".

### 5.4 Attention (single choice)

- Options: **New**, **Follow-up due**, **Gone quiet**, **Later days**. Nothing else; in particular no After hours and no Overdue.
- With nothing chosen the Any attention row shows ✓. Choosing a value moves the ✓ to it and writes the chip; choosing the Any row removes the chip.

### 5.5 Received

- Presets as today: Today, Last 7 days, Last 30 days, This month. With nothing chosen the Any date row shows ✓; a preset moves it.
- **Custom range** opens a calendar grid with month navigation, a Start and an End, and an **Apply** button. Choosing days highlights them; nothing — not the list, not the chip, not the URL — changes until Apply. Apply writes the chip as today ("RECEIVED Aug 23 – 30") and the raw range to the URL. No timezone control (single-zone clinic).
- Reopening the editor with a custom range active shows Custom range as the chosen row and the calendar with the current Start and End.

### 5.6 Search

- As today: applies as you type, chip reads the quoted text.

### 5.7 URL

- As today. No param is written for the Any state of any dimension. Deep links, param order, and Clear filters keep working exactly as they do now.

---

## 6. Acceptance criteria

Each box is pass/fail by walking `/admin` as `admin` on your own build (local, or your PR's preview, not the base-branch preview above). Walk every box before hand-off and report each as passed or not, with what you saw.

**Resting state**
- [ ] On a fresh load of `/admin`, Add filter → Status shows all four values checked and a ✓ on "Any status"; no STATUS chip is shown; the URL has no `status` param.
- [ ] Add filter → Location shows all three values checked and a ✓ on "Any location"; no chip.
- [ ] Add filter → Attention shows a ✓ on "Any attention" and offers exactly New, Follow-up due, Gone quiet, Later days.
- [ ] Add filter → Received shows a ✓ on "Any date".

**Checkbox editors**
- [ ] In Status, hovering a row's label shows "Only"; clicking it leaves only that value checked, the chip reads that value, and the URL reads `status=<value>`.
- [ ] Hovering the label of the sole checked value shows "Check all"; clicking it checks all four, removes the chip, and drops the `status` param.
- [ ] With all four checked, clicking the checkbox of one value unchecks it and the chip reads "3 selected"; unchecking a second value makes the chip read the two remaining values inline, e.g. "New | Call again".
- [ ] Unchecking the last checked value restores all four and removes the chip.
- [ ] Choosing "Any status" with two values checked restores all four and removes the chip.

**Header and navigation**
- [ ] Every editor reached through Add filter shows "<Dimension> ⌄" beside "Filter to…"; an editor opened from a chip shows only "Filter to…".
- [ ] Clicking that header shows the category list; picking Location from there opens the Location editor in place, without anything closing.

**Attention**
- [ ] Choosing "Gone quiet" moves the ✓ from "Any attention" to "Gone quiet", writes the chip ATTENTION Gone quiet, and filters the list.
- [ ] Choosing "Any attention" removes the chip and the `attention` param.

**Received**
- [ ] Custom range shows a calendar grid, Start, End, and Apply; picking a Start and an End changes nothing in the list, chip, or URL until Apply is pressed.
- [ ] Apply produces a chip "RECEIVED <start> – <end>", narrows the list, and writes `received=<from>-<to>` to the URL.
- [ ] No timezone control is shown anywhere in the Received editor.
- [ ] Reopening the RECEIVED chip after Apply shows Custom range as the chosen row with the same Start and End.

**Ghost chips**
- [ ] On a fresh load the bar shows exactly two ghost chips, ATTENTION Follow-up due then ATTENTION New; no STATUS ghost.
- [ ] Clicking the Follow-up due ghost writes the chip ATTENTION Follow-up due; clicking the New ghost then switches that chip to ATTENTION New, and Follow-up due reappears as a ghost. At no point are two ATTENTION chips shown.
- [ ] Removing an activated ghost's chip with × returns its ghost to the end of the bar.

**Unchanged behavior still holds**
- [ ] Pasting `/admin?status=new%2Ccontacted&location=tampa` into a fresh tab shows chips STATUS New | Call again and LOCATION Tampa in that order with the list filtered; swapping the two params in the URL swaps the chips.
- [ ] Filtering to an empty list shows "No results", a sentence naming the responsible filter and how many requests removing it would show, and Clear filters; Clear filters returns to `/admin` with the ghost chips back.
- [ ] Escape closes any open editor and focus returns to the chip or Add filter button.

**Rules**
- [ ] No existing request's data changed during the walk.

---

## 7. Hand-off notes required from the agent

Return these with the PR, in plain language:

1. Anything in section 5 you could not build as written, and what you built instead.
2. The exact option list each editor shows, in order.
3. Anything in the seeded data that looked wrong or repeated (you did not change it).
4. Any acceptance box you believe cannot be checked as written, and what you built for it.
5. Anything this brief left ambiguous that you had to decide.
