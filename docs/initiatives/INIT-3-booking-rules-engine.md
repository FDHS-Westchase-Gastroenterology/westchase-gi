# INIT-3 · Booking rules engine

## Progress

**Status:** Not started. Waits on INIT-1 (the engine is built on its Drizzle setup).

**Last updated:** 2026-10-13

To keep this current: when a PR finishes a step, tick its box in that same PR, add the PR number next to it (like `(#412)`), and update **Status** and **Last updated**.

Steps (from "Order"):

- [ ] 1. The engine and the six bug fixes, with every existing booking path going through `check_booking`.
- [ ] 2. The new rule types and resources.
- [ ] 3. Overrides.
- [ ] 4. "Find next available" and the hover reasons.
- [ ] 5. The rule editor.

Waiting on Jason:

- [ ] Collect the clinic's real rules (per-provider durations, blocks, caps, chair count, lead times, overbooking habits), then enter or approve them.
- [ ] Decide which staff get the override toggle.

## The ask

Give the portal one rulebook that decides what can be booked, for every channel: the front desk today, and patient self-scheduling and a phone agent later.

- Staff should only ever be offered valid times.
- Every "no" should say why and suggest the nearest yes.
- Someone with permission should be able to override a soft rule with a recorded reason.

The rules live in the database, the same way the double-booking guard does today.

## Why

Today most of the clinic's booking rules live in staff memory. The leaders here (Relatient Dash, NextPatient) win because:
- every channel asks one engine
- rules are layered
- a rule change applies everywhere at once

This is also the prerequisite for online self-booking and any AI booking later, since both have to obey the same rules as the front desk.

## What you're walking into

- **Strong core.** The database already blocks overlapping visits for a provider or patient, using exclusion constraints with buffers that stay safe under concurrent booking. Saves are versioned, idempotent and undoable.
- **Rules that exist:**
  - provider weekly hours with dated exceptions
  - office hours and closed days
  - one duration and buffer per visit type
  - which providers see which visit type
  - the Tampa/Lutz preference
  - "not in the past"
- **Missing:** per-provider durations, reserved blocks, caps, resources (rooms, infusion chairs), overbooking, lead times, overrides, and search across providers.
- **Bugs to fix along the way:**
  - "That time was just taken" shows for out-of-hours and time-off refusals.
  - Openings appear only on practice-wide clock marks, so a provider starting at 8:30 shows no 8:30 opening.
  - Buffers are counted twice between neighboring visits.
  - No-shows keep holding their time.
  - The drag preview skips the patient-overlap check.
  - Undo skips the closed-day, on/off and eligibility checks.
- The benchmark checklist is RUL-01 to RUL-14 in `benchmark/catalog/RUL-booking-rules.md` in the project.

## The rulebook

Layers are checked in this order. **Hard** rules can never be overridden. **Soft** rules can be overridden by a permitted user who gives a reason.

| # | Rule | Example | Hard/soft |
|---|---|---|---|
| 1 | Visit type and duration, per provider | New patient: 40 min with Dr. Chang, 30 with Dr. Awad | Hard |
| 2 | Eligibility: who sees which visit types where | Infusion only with Juliet Oliva at Tampa | Hard |
| 3 | Working time: weekly hours, dated exceptions, time off, closed days | Dr. Chang: Lutz on Tuesdays | Hard |
| 4 | Reserved blocks for certain visit types | Tue 8–10: procedure consults only | Soft |
| 5 | Caps per session, day or week | Max 2 new patients per morning | Soft |
| 6 | Resources a visit type needs, each with its own no-overlap guard | Infusion needs one of 2 chairs for 120 + 15 min | Hard |
| 7 | Overbooking allowance | 1 overbook per hour, never the first slot | Soft |
| 8 | Lead time: minimum notice, maximum horizon | No new-patient booking under 24 hours' notice or beyond 90 days | Soft |
| 9 | Live availability: provider, patient and resources free, buffers counted once | Database exclusion constraints | Hard |

Rules carry effective dates, so seasonal templates and future changes can be entered ahead of time.

## Already decided

- **One door.** Two database functions:
  - `find_openings(criteria)` returns valid start times across providers, offices and dates.
  - `check_booking(proposal)` returns OK, or a list of refusals.

  Every booking, reschedule, drag, undo and staff-entered request goes through `check_booking`, and nothing writes appointments around it.
- **Refusals.** Each one carries a code, the layer, plain-language text and whether it can be overridden. Where possible it also suggests the nearest valid alternative.
- **Resources.**
  - A resources table (type, office, count) plus visit-type requirements.
  - A database exclusion constraint per resource, so two infusions can never share a chair.
  - Start with infusion chairs; rooms use the same model.
- **Overrides.**
  - Admins can always override soft rules.
  - Admins can grant a "can override booking rules" toggle to any other staff account, such as a front-desk lead.
  - A reason is always required.
  - The override (who, which rules, why) goes to the audit log and shows on the appointment.
  - Hard rules never offer "Book anyway."
- **Finding slots.**
  - A "Find next available" panel searches across all matching providers. Pick a visit type, and optionally a provider, office, time of day or date range.
  - In day and week views, unavailable times explain themselves on hover ("Reserved for procedure consults", "Cap reached: 2 new patients this morning") instead of silently disappearing.
- **Rule editor.**
  - Admins edit rules as plain sentences with effective dates.
  - Before publishing, a preview shows which future bookings would break (they stay booked, flagged for review) and how openings change over a sample week.
  - Every change is versioned, audited and restorable.
- **Design.**
  - Follow the existing "Line" charter and component library, with no new visual language.
  - No dead ends.
  - Rules are visible on the calendar before anyone clicks.
  - Rules read as sentences in the clinic's own words.
  - An override takes one deliberate extra step.
  - The calendar, appointment card, editor and refusal messages share one vocabulary.
- **Example rules.** Until the clinic's real rules are collected, seed realistic example rules (like the table above) so everything is testable.
- **Database code.** Uses Drizzle from INIT-1, with the engine functions and constraints as SQL migrations inside it.

## Order

1. Start with the engine and the bug fixes, routing every existing path through `check_booking`.
2. Then the new rule types and resources.
3. Then overrides.
4. Then "Find next available" and the hover reasons.
5. Then the editor.

This runs alongside INIT-2. You both touch the appointment card.

## Effort

Big, and correctness matters more than polish. A rules engine that's 98% right is a liability, because staff stop trusting it.

Invest heavily in tests:
- every layer and every refusal code
- allow, refuse and override for each rule type
- concurrency tests on providers, patients and resources
- a property test showing `find_openings` only ever returns times `check_booking` accepts

Spend real design care on the refusal messages and the editor preview. That's where staff feel the difference.

## What done looks like

- [ ] Every booking path calls `check_booking`, and no other code path writes appointments.
- [ ] A property test over generated schedules proves `find_openings` returns only times `check_booking` accepts.
- [ ] Every refusal has a specific code and a plain reason.
- [ ] "That time was just taken" appears only for a genuine race.
- [ ] Per-provider durations, blocks, caps, resources, overbooking and lead times all work, with allow, refuse and override tests.
- [ ] Two infusions can't overlap on one chair, even with simultaneous requests (database-enforced and tested).
- [ ] Openings follow each provider's own start time.
- [ ] Buffers count once.
- [ ] No-shows and cancellations free their time.
- [ ] The drag preview and undo run the full check.
- [ ] Overrides need admin rights or the toggle, plus a reason. They're audited and shown on the appointment.
- [ ] Hard rules can't be overridden.
- [ ] "Find next available" works across providers and offices and matches `find_openings` exactly, with a recorded staging walkthrough.
- [ ] The editor previews impact before publishing and versions every change.
- [ ] A published change applies to every booking path at once (tested).
- [ ] All existing scheduling end-to-end tests still pass.

## Only Jason can do

- Collect the clinic's real rules (per-provider durations, blocks, caps, chair count, lead times, overbooking habits), then enter or approve them.
- Decide which staff get the override toggle.

## Kickoff prompt

```
Next for westchase-gi: a real booking rules engine. The brief is docs/initiatives/INIT-3-booking-rules-engine.md. It has what exists today, the rulebook table, the decisions already made, and what done looks like.

The goal: one rulebook in the database that every booking path goes through, using two functions, find_openings and check_booking. Staff only see valid times, every "no" explains itself and suggests the nearest yes, and permitted staff can override soft rules with a reason. Fix the six known scheduling bugs listed in the brief as part of the first pass. Keep everything the current system already guarantees: no double-booking under concurrency, version checks, idempotency, undo and audit rows.

This needs to be right, not just mostly right, because staff stop trusting an engine the first time it lies to them. So put most of your effort into tests: every layer and refusal code, concurrency on providers, patients and chairs, and a property test showing find_openings never offers a time check_booking would refuse. On the UI side, follow the "Line" charter and the existing components, and spend your design care on the refusal messages and the rule editor's preview. Seed realistic example rules until the clinic's real ones arrive. INIT-2 is running alongside you and also touches the appointment card.

You're done when every item under "What done looks like" is proven with evidence in the PRs. Finish with a short report that walks through each item, pass or fail, and links the evidence.
```
