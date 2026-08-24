---
version: 1
slug: "route-admin"
primary_target: "route:/admin"
related_targets: ["route:/admin/requests","route:/admin/settings","route:/admin/help","route:/admin/audit"]
---

# Staff portal shell and product-slice brief

## User and moment
Westchase GI front-desk staff open this authenticated, English-only workspace between calls,
patient arrivals, and other interruptions. They need to enter any staff job directly, understand
where they are, and resume safely without first reasoning about the software's structure.

## Shared-shell job
Keep identity, location, navigation, and recovery predictable while each product slice carries a
complete staff outcome. The shell should orient staff and then recede; it must not turn distinct
jobs into subordinate pages of one generic dashboard.

## Shared experience world
**The Front Desk Ledger** is a calm clinical workbench modeled on the paper routing stack staff already use, not a generic SaaS dashboard. New appointment requests form the actionable work stack. The interface recedes around that work, but remains explicit about status, ownership, timing, recovery, and completion.

## Product-slice architecture
The portal remains one `/admin` design surface and shared shell under this world, but it is not one
product outcome with subordinate pages. Product ownership within it is divided among four
vertical slices:

- **Home:** orientation, triage, handoff, and the next useful action.
- **Appointments:** the complete appointment-request lifecycle and working queue.
- **Settings:** staff access, notification recipients, and software administration.
- **Help:** cross-job guidance, recovery beyond a slice's own path, and transitions to human
  support.

A vertical slice is not merely a page or route. It owns a complete staff outcome and is
accountable for its job, experience thesis, information architecture, state matrix, PHI-free
instrumentation, tests, and Product Experience acceptance. This brief commits that boundary; the
slice-specific artifacts remain follow-up work where they are not yet complete.

## Shared horizontal infrastructure
- Navigation, authentication, authorization policy and enforcement, and design tokens belong to
  the portal rather than to one slice.
- The Front Desk Ledger world supplies shared interaction and visual grammar without flattening
  the four outcomes into one experience thesis.
- Settings exposes staff access administration; authorization remains shared infrastructure.
- The Activity log and review-flyer printing remain named utilities placed with the outcomes they
  support, not additional slices by default.

## Interaction contracts
- Printing or preparing a packet never changes request status, attention state, history, or version.
- Every mutation communicates pending, success, failure, conflict, undo, and the durable result in staff language.
- Desktop uses a persistent task rail and working canvas. Mobile preserves the same four destinations in thumb reach.
- Amber means attention is needed. Teal means ready or active. Navy carries navigation and primary actions.
- Appointment request is the unit of appointment work; “Appointments” is the destination label,
  not the product boundary.

## Required states
Each slice defines and verifies its own applicable waiting, populated, empty, partial-read,
stale/conflict, unavailable, unauthorized, completed, print-preview, print, narrow-mobile,
wide-desktop, keyboard, and reduced-motion states. Shared-shell failure must not obscure a slice's
truth, and patient data must never appear in non-secure artifacts.

## Evidence and assumptions
The Home paper-handoff need comes from direct staff feedback supplied for this work, and the
Appointments lifecycle is grounded in the implemented workflow specification. No equivalent
usage observation is claimed for Settings or Help. Instrument each slice's task starts,
successful outcomes, and recoveries before claiming observed efficiency gains; print-packet
instrumentation remains metadata-only.
