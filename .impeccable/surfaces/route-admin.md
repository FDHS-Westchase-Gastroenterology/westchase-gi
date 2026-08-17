---
version: 1
slug: "route-admin"
primary_target: "route:/admin"
related_targets: ["route:/admin/requests","route:/admin/settings","route:/admin/help","route:/admin/audit"]
---

# Staff portal surface brief

## User and moment
Westchase GI front-desk staff open this authenticated, English-only workspace between calls, patient arrivals, and other interruptions. Their recurring job is to turn each appointment request into a documented real-world outcome without losing the thread or duplicating another person’s work.

## Job to be done
Show what needs attention now, make the next action obvious, preserve enough context to resume safely, and create a truthful paper handoff when a manager distributes new appointment requests across the team.

## Experience thesis
**The Front Desk Ledger** is a calm clinical workbench modeled on the paper routing stack staff already use, not a generic SaaS dashboard. New appointment requests form the actionable work stack. The interface recedes around that work, but remains explicit about status, ownership, timing, recovery, and completion.

## Operational information architecture
- Home: triage, handoff, and the next useful action.
- Appointments: the durable queue and request workspace.
- Settings: people, notifications, and software setup.
- Help: workflow guidance and recovery.
- Activity and review-flyer printing remain named utilities rather than competing top-level destinations.

## Interaction contracts
- Printing or preparing a packet never changes request status, attention state, history, or version.
- Every mutation communicates pending, success, failure, conflict, undo, and the durable result in staff language.
- Desktop uses a persistent task rail and working canvas. Mobile preserves the same four destinations in thumb reach.
- Amber means attention is needed. Teal means ready or active. Navy carries navigation and primary actions.
- Appointment request is the unit of work; “Appointments” is only the destination label.

## Required states
Design and verify waiting, populated, empty, partial-read, stale/conflict, unavailable, unauthorized, completed, print-preview, print, narrow-mobile, wide-desktop, keyboard, and reduced-motion states. Patient data must never appear in non-secure artifacts.

## Evidence and assumptions
The bulk paper handoff comes from direct staff feedback supplied for this work. Other prioritization is grounded in the implemented workflow specification and repository decisions; no additional usage telemetry is available. Instrument task starts, successful outcomes, recoveries, and metadata-only print-packet preparation before claiming observed efficiency gains.
