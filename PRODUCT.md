# Product

One repository, one deployment, **two products**: the patient-facing website (brand register,
first half) and the staff portal at `/admin` (product register, second half). They share the
design system in `DESIGN.md`.

## Register

brand

## Users

Patients of a two-location gastroenterology practice in Tampa and Lutz, Florida. Mostly adults
45 and older (colonoscopy screening age), many referred by a primary-care physician, many
Spanish-speaking. They arrive anxious or task-driven: find the phone number, request an
appointment, download prep instructions before a procedure, fill out new-patient forms, or check
directions and hours. Usually on a phone. A second audience is referring physician offices
verifying credentials, locations, and fax details.

## Product Purpose

The patient-facing website of FDHS Westchase Gastroenterology (Florida Digestive Health
Specialists network). It exists so patients can reach the practice and prepare for visits without
friction: request an appointment, call or text a staffed line, access the patient portal and
online forms, and get accurate location, hours, and provider information in English, Spanish,
Vietnamese, Korean, or Arabic.
Success: every link works, every fact is verified, all five languages are first-class, and the site
reads as the polished front door of a practice that answers its own phones.

## Brand Personality

Calm, credentialed, human. The practice's differentiator is staffed human attention (a real
person answers the text line within 24 hours), so the site must feel attended-to rather than
automated: plain language, warm but clinical, never salesy. Three words: steady, attentive,
multilingual.

## Anti-references

- Template-vendor medical sites: stock abdominal-pain heroes, content-mill blogs,
  repeated meta descriptions, pop-ups that fire on every page.
- Luxury-wellness aesthetics (gold/cream, serif-italic opulence). This is an insurance-based
  medical practice, not a spa; its sister wellness brand owns that lane and this site must not
  borrow it.
- Chatbot-forward "AI clinic" sites. Human attention is the differentiator here.
- Generic SaaS landing-page grammar: hero metrics, gradient text, icon-card grids.

## Design Principles

1. **Nothing broken, nothing invented.** Every link is verified before it ships. Facts that are
   not yet confirmed by the practice render as honest fallbacks (request from the office), never
   as placeholders or guesses.
2. **Preserve the practice's identity, execute it better.** The FDHS header, verbatim provider
   credentials, harvested source-mirror graphics byte-for-byte, and the existing
   blue-teal-and-amber palette stay; published staff headshots are the documented exception and
   use intentionally resized, optimized derivatives.
3. **The human line is the hero.** Call and text affordances are prominent on every page; the
   text line is presented as a staffed human channel, never a bot.
4. **Every language is a mode, not a footnote.** Every patient-facing surface exists in
   English, Spanish, Vietnamese, Korean, and Arabic with equal care (Arabic fully RTL).
5. **Anxious patients skim.** One clear action per section, generous type, high contrast, short
   paths to phone, forms, portal, and directions.

## Accessibility & Inclusion

WCAG 2.1 AA. Older-skewing patient base: body text at 17px or larger, contrast at 4.5:1 or
better everywhere, visible focus states, large tap targets, semantic landmarks, skip link.
Full reduced-motion alternatives. All five locales use correct `lang` attributes and hreflang
alternates, with RTL direction for Arabic, so assistive technology and search understand every
mode.

---

## Staff portal (`/admin`)

The `/admin` staff portal is the repository's second product, with its own register: the
patient site is a brand surface; the portal is a tool. UI work inside `src/app/admin/`
follows this register plus the shared design tokens in `DESIGN.md`.

### Register

product

### Users

Front-desk staff and the practice manager of a two-location gastroenterology practice.
Not software people; they run on phone calls, schedules, and paper. They open the
portal between patient interactions, usually on the front-desk computer, sometimes on
a phone. A secondary user is the practice's website maintainer / engineering support.

### Product purpose

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
  structured change-request workflow, later conversationally assisted, is the
  planned next step for this seam).

Success: a new front-desk hire lands on the home page and knows what to do without
training, and nothing needing attention hides more than one click deep.

### North star

The portal should feel like a calm shift partner: tell me what needs attention, let
me finish the work in one coherent action, show me exactly what changed, and let me
recover safely when I make a mistake. The intended emotional result is not
excitement — it is calm confidence that the queue is complete, the next action is
obvious, a colleague can continue my work, and nothing is silently lost or
misrepresented.

The center of gravity is moving from "staff update records" to "staff finish clinic
work": the real job is a phone call and its outcome, not a status field plus a
separate note form.

### Current delivery boundary (verified 2026-07-27)

The task-first Home, Requests queue, recipient and staff management, Activity log,
Website/maintainer controls, protected review-flyer printer, first-login opt-in
tour, and Help-page systems explainer/restart path are deployed. Home renders a
distinct "count unavailable" state when its queue read fails — a failed read never
presents as an empty queue. All four primary nav destinations stay fully visible on
a 390px phone.

Request detail keeps New, Contacted, Scheduled, and Closed in one Status control.
Closed expands in place to ask whether an appointment was booked; staff never have
to reconcile a separate finishing section with the visible status.

Home also carries attention context in practice-local business terms: how long the
oldest new request has been waiting ("since Friday"), which previewed requests
arrived after office hours, and an explicit warning when zero active notification
recipients exist (a failed recipients read stays silent — absence of evidence is
not evidence of absence). The queue marks unworked requests that have waited past
their arrival day. Review-flyer printing is open to every active staff member, not
only administrators (decision 2026-07-26): printing an approved artifact mutates
nothing, and handing flyers to patients is a front-desk job. Changing flyer assets
stays outside the portal.

The docked "coming soon" assistant launcher was removed (decision 2026-07-26): a
floating control that completes no job obstructs real work on phones and violates
the honest-states principle. The seam remains reserved — when an assistant ships it
will be a docked, contextual widget with no dedicated page and no nav entry, and it
arrives only when it completes a real job (first candidate: drafting structured
website-change requests). The remaining future work also includes a full throwaway
maintainer invite/cancel/accept/revoke acceptance pass.

### Design principles

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
   truthfully ("Not configured", "Connection unavailable"), no control ships
   before its capability exists, and a failed read is never presented as an empty
   result — "nothing waiting" and "could not check" are different truths.
5. **One human action, one portal transaction.** Staff experience "set the outcome
   and explain what happened" as a single step; the interface should not split one
   real-world action across disconnected forms, and server operations backing a
   combined action must commit atomically.
6. **Attention over inventory.** Lead with work that needs action — and its
   age in business terms — not with counts or tables that merely exist.
7. **PHI-minimal.** The portal handles callback leads, not a clinical record. Intake has
   no dedicated clinical fields, but it stores an optional patient-supplied brief reason,
   so the queue is still sensitive. Notification emails and operational logs stay free of
   patient fields. Boundary-crossing reads of patient data are audited: a CSV export
   writes a metadata-only audit row (actor, timestamp, row count, filter) — an export
   creates a clinic-controlled sensitive copy, and leaving it unaudited was inconsistent
   with this posture (decision 2026-07-28).

### Direction (adopted 2026-07-26; amended 2026-07-28)

Priorities for the portal's next chapter, in order:

1. **A unified call-outcome workflow** on request detail: one prominent action that
   records outcome, status, note, and closure classification together, atomically.
   The outcome vocabulary is decided (2026-07-26), grounded in how the activity
   record shows staff actually work — status changes paired with notes, direct
   new → scheduled as the normal successful path: *Appointment booked —
   request finished* (maps to the converted-record closure, so staff never learn
   the status/classification split); *Reached the patient — follow-up needed*,
   *Left a voicemail — call again*, and *No answer — call again* (each `contacted`
   plus an optional follow-up time); *Patient won't schedule* and *Duplicate or
   not actionable* (both map to the did-not-become-an-appointment closure). Six
   outcomes, one screen; any outcome the activity record shows going unused gets
   removed. The atomic server operation landed in migrations 2026-07-27
   (`portal_log_call_outcome`; issue #124), so the composer is now unblocked
   frontend work; production promotion of the migration follows its own
   deliberate path. On phones the composer leads the work area — today the
   status control sits well below the fold there.
2. **A queue that says what to work next**: a needs-attention default view,
   business-aware age (a request that arrived Saturday afternoon is not the same as
   one waiting since Thursday), next action per row, and continuity
   (previous/next, save-and-open-next). A request touched once and then left
   silent is attention again: the queue's "once touched, urgency is a triage
   judgment" premise is retired — staleness (no note or status change within a
   practice-confirmed business window) re-flags the row.
3. **A human Recent-work view** over the durable audit record: grouped,
   plain-language entries linked to the work ("finished an appointment request as
   Scheduled"), with the exact technical audit preserved beneath it for
   administrators. Storage vocabulary (action codes, UUID fragments) is not staff
   language. The audit detail already carries from/to statuses, dispositions,
   actors, and correlation IDs (verified 2026-07-28), so this is a
   presentation-layer view, not a schema change.
4. **One feedback-and-forgiveness pattern for every mutation**: the pressed control
   responds immediately, only the affected row goes pending, success lands beside
   the changed object, failures preserve input and say whether anything changed,
   and reversible actions offer undo instead of repeated confirm prompts.
5. **Attention travels with the worker**: the waiting-request count rides on the
   Requests nav destination, suppressed — never zeroed — when its read fails, and
   recent notification failures (trailing 24 hours, from the existing
   `request_events` rows) aggregate onto Home beside the zero-recipient warning.
   Both are attention, not inventory; neither collects anything new.
6. **Names, not addresses**: staff-facing identity renders the display name
   captured at invite (header, note attribution, the Recent-work view); emails
   remain in the raw audit. Settings staff rows surface last sign-in from
   existing Auth state — the highest-value adoption signal available without any
   new tracking.

Backend prerequisites for this chapter were tracked as scoped issues: the atomic
call-outcome operation (#124), audit provenance for the Recent-work view (#125),
and the recipient label-update operation (#126) landed in migrations 2026-07-27
(production promotion remains the deliberate separate decision); recoverable
staff lifecycle operations (#127) remain open. Frontend work that needs no schema
change does not wait on them.

Deliberately not building: generic metric dashboards or vanity counts; a forced
linear status funnel (direct new → scheduled is the normal successful path); kanban
or bulk mutations; direct browser database access; a CMS, flyer editor, or QR
generator; page-view surveillance; an assistant that sees patient free text or
mutates records autonomously.

### Anti-references

- Generic SaaS admin shells: sidebar chrome, icon-card dashboards, hero-metric stat
  rows.
- Software-inventory framing: asset registries, provider matrices, "manage
  integrations" panels.
- Chat-forward AI dashboards; any future assistant remains a docked,
  conservatively-scoped widget that ships only with a completed job.
- Developer-console vocabulary on staff surfaces: raw action codes, entity names,
  and UUID fragments belong to the administrator's technical audit beneath a
  plain-language layer, never to the layer itself.

### Accessibility

WCAG 2.1 AA. Touch targets ≥ 44px, visible focus states, semantic landmarks and
heading order, `prefers-reduced-motion` honored globally. English-only by scope
decision — the patient site carries the five locales.
