# Staff portal — product definition

The `/admin` staff portal is a second product living in this repository, with its own
register: the patient site is a brand surface; the portal is a tool. UI work inside
`src/app/admin/` follows this file plus the shared design tokens in `DESIGN.md`
(the root `PRODUCT.md` describes the patient-facing site only).

## Register

product

## Users

Front-desk staff and the practice manager of a two-location gastroenterology practice.
Not software people; they run on phone calls, schedules, and paper. They open the
portal between patient interactions, usually on the front-desk computer, sometimes on
a phone. A secondary user is the practice's website maintainer / engineering support.

## Product purpose

One place where practice staff do their web-adjacent jobs without reasoning about
software topology (repositories, hosting projects, asset ledgers). The jobs:

- Work the appointment-request queue — the reason the portal exists: the previous
  vendor form fed an Officite queue the practice did not know to monitor, where
  requests accumulated unseen and unworked.
- Reprint a review QR flyer.
- Choose who receives new-request notification emails.
- Manage who can sign in (invite staff, change roles, deactivate accounts).
- See where the website lives, its connection status, and who can change it —
  and manage that access: invite a maintainer, cancel an invitation, or remove
  one (administrators only). The clinic works in its own portal vocabulary —
  people who "can edit and publish the website" — never in repository topology;
  management controls stay hidden, failing closed, until the one-time
  owner-side setup steps are complete.
- Request an occasional website change (today: through the website maintainer; a
  portal assistant is planned for exactly this seam and its docked launcher already
  reserves the spot).

Success: a new front-desk hire lands on the home page and knows what to do without
training, and nothing needing attention hides more than one click deep.

## Current delivery boundary (verified 2026-07-19)

The task-first Home, Requests queue, recipient and staff management, Activity log,
Website/maintainer controls, and protected review-flyer printer are deployed. A full
throwaway maintainer invite/cancel/accept/revoke acceptance pass; issue
[#43](https://github.com/FDHS-Westchase-Gastroenterology/westchase-gi/issues/43)'s first-login
opt-in tour plus Help-page systems explainer/restart path; and the conversational website-change
assistant remain future work. Do not present them as completed portal capabilities.

## Design principles

1. **Tasks, not topology.** Navigation and copy name staff jobs ("Print review
   flyers", "Manage staff access"), never systems. Occasional tasks are reached from
   the home page instead of holding permanent tabs.
2. **The queue is the heartbeat.** New-request status is the first thing the home
   page says, and the queue is one click from everywhere.
3. **Calm, attended, on-brand.** The practice's tokens (navy / teal / amber / mint,
   Lato + Trocchi) at product-register restraint: exactly one serif page title per
   screen (Trocchi at its true 400 weight — never synthetic bold), Lato for every
   heading below it, minimal motion (150–250 ms, state-conveying only), and empty
   states that teach the interface.
4. **Honest states.** Delivery, connection, and configuration states render
   truthfully ("Not configured", "Connection unavailable"), and no control ships
   before its capability exists.
5. **PHI-minimal.** The portal handles callback leads, not a clinical record. Intake has
   no dedicated clinical fields, but it stores an optional patient-supplied brief reason,
   so the queue is still sensitive. Notification emails and operational logs stay free of
   patient fields.

## Anti-references

- Generic SaaS admin shells: sidebar chrome, icon-card dashboards, hero-metric stat
  rows.
- Software-inventory framing: asset registries, provider matrices, "manage
  integrations" panels.
- Chat-forward AI dashboards; the assistant remains a docked, conservatively-scoped
  widget.

## Accessibility

WCAG 2.1 AA. Touch targets ≥ 44px, visible focus states, semantic landmarks and
heading order, `prefers-reduced-motion` honored globally. English-only by scope
decision — the patient site carries the five locales.
