# Product

<!-- impeccable:product-schema 1 -->

One repository, one deployment, **two products**: the patient-facing website (brand register,
first half) and the staff portal at `/admin` (product register, second half). They share the
design system in `DESIGN.md`. 

## Platform

web

---

## Patient website

### Register

brand

### Users

Patients of a two-location gastroenterology practice in Tampa and Lutz, Florida. Mostly adults
45 and older (colonoscopy screening age), many referred by a primary-care physician, many
Spanish-speaking. They arrive anxious or task-driven — and they skim: find the phone number,
request an appointment, download prep instructions before a procedure, fill out new-patient
forms, or check directions and hours. Usually on a phone. A second audience is referring
physician offices verifying credentials, locations, and fax details.

### Product Purpose

The patient-facing website of FDHS Westchase Gastroenterology (Florida Digestive Health
Specialists network). It exists so patients can reach the practice and prepare for visits without
friction: request an appointment, call or text a staffed line, access the patient portal and
online forms, and get accurate location, hours, and provider information in English, Spanish,
Vietnamese, Korean, or Arabic.

Success: every link works, every fact is verified, all five languages are first-class, and the
site reads as the polished front door of a practice that answers its own phones. Success is also
knowable: the practice can tell, from aggregate and PHI-free evidence, whether patients are
reaching the phone, the text line, and the request form — without watching anyone do it.

### Positioning

A real person answers. The practice's differentiator is staffed human attention — a human
answers the text line within 24 hours — and full five-language service. Template-vendor
competitors cannot truthfully claim either; this site never undermines the claim with bots,
pop-ups, or conversion pressure.

### Brand Personality

Calm, credentialed, human. The site must feel attended-to rather than automated: plain
language, warm but clinical, never salesy. The site never shouts: no pop-ups, no autoplay, no
urgency — its confidence shows in what it doesn't do. Three words: steady, attentive,
multilingual.

### Anti-references

- Template-vendor medical sites: stock abdominal-pain heroes, content-mill blogs,
  repeated meta descriptions, pop-ups that fire on every page.
- Luxury-wellness aesthetics (gold/cream, serif-italic opulence). This is an insurance-based
  medical practice, not a spa; its sister wellness brand owns that lane and this site must not
  borrow it.
- Chatbot-forward "AI clinic" sites. Human attention is the differentiator here.
- Generic SaaS landing-page grammar: hero metrics, gradient text, icon-card grids.
- Conversion-pressure patterns: exit-intent modals, chat bubbles, floating action buttons,
  review-bait sprinkled through content, interruptions on arrival. The site asks once, in
  context.

### Product Principles

1. **Nothing broken, nothing invented.** Every link is verified before it ships. Facts that are
   not yet confirmed by the practice render as honest fallbacks (request from the office), never
   as placeholders or guesses.
2. **Preserve the practice's identity, execute it better.** The FDHS header, verbatim provider
   credentials, harvested source-mirror graphics byte-for-byte, and the existing
   blue-teal-and-amber palette stay; published staff headshots are the documented exception and
   use intentionally resized, optimized derivatives.
3. **The human line is the hero.** Call and text affordances are prominent on every page; the
   text line is presented as a staffed human channel, never a bot. Anxious patients skim, so
   every section offers one clear action and a short path to phone, forms, portal, and
   directions.
4. **Every language is a mode, not a footnote.** Every patient-facing surface exists in
   English, Spanish, Vietnamese, Korean, and Arabic with equal care (Arabic fully RTL), and
   no string may claim a smaller language set than the site actually serves — availability
   claims stay true at the sentence level, and clinical-care language claims ship only with
   dated practice confirmation.
5. **Measure like a medical practice.** Product evidence is aggregate, first-party, and
   PHI-free: counts and funnels, never journeys — no per-visitor profiles, session replay,
   heatmaps, or third-party trackers. If a question can't be answered inside that posture,
   the instrumentation fits the posture, never the reverse.

### Capabilities and Constraints

Standing interaction policies, binding until explicitly amended:

- **Interruptions are earned, never guessed.** At most one standing first-visit interruption,
  and it fires only on positive evidence it helps (the language chooser opens itself only on a
  detected language mismatch; the header menu always works). The once-per-visitor banner is the
  only standing notice. Any future modal needs an explicit exception here — the old vendor
  site's daily popup is the anti-precedent.
- **Asks are calibrated.** One review ask per page in primary content; the testimonial rail and
  footer carry the standing invitation. Written contact is one honest pipeline, labeled as what
  it actually does. The site never trades the trust it is building for a second conversion.

### Accessibility & Inclusion

WCAG 2.1 AA. Older-skewing patient base: body text at 17px or larger, contrast at 4.5:1 or
better everywhere, visible focus states, large tap targets (44px floor, including dismiss
controls), semantic landmarks, skip link. Async outcome states move focus to the outcome —
success, failure, and unknown alike — never leaving keyboard users on a detached control.
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

### Product Purpose

One place where practice staff do their web-adjacent jobs without reasoning about
software topology (repositories, hosting projects, asset ledgers). The jobs:

- Work the appointment-request queue — the reason the portal exists: the previous
  vendor form fed a queue the practice did not know to monitor, where requests
  accumulated unseen and unworked.
- Reprint a review QR flyer.
- Choose who receives new-request notification emails.
- Manage who can sign in (invite staff, change roles, deactivate accounts).
- See where the website lives, its connection status, and who can change it — and
  manage that access (administrators only). The clinic works in its own portal
  vocabulary — people who "can edit and publish the website" — never in repository
  topology; management controls stay hidden, failing closed, until the one-time
  owner-side setup steps are complete.
- Request an occasional website change (today: through the website maintainer).

Success: a new front-desk hire lands on the home page and knows what to do without
training, and nothing needing attention hides more than one click deep.

### North star

The portal should feel like a calm shift partner: tell me what needs attention, let
me finish the work in one coherent action, show me exactly what changed, and let me
recover safely when I make a mistake. The intended emotional result is not
excitement — it is calm confidence that the queue is complete, the next action is
obvious, a colleague can continue my work, and nothing is silently lost or
misrepresented.

The center of gravity is "staff finish clinic work", not "staff update records":
the real job is a phone call and its outcome, not a status field. Appointment
request notes are a first-class clinic abstraction: every request has one
Appointment request notes surface where staff read and add context for the next
person.

### Capabilities and Constraints

The portal's surfaces: a task-first Home, the Requests queue and request detail,
recipient and staff management, an Activity log, Website/maintainer controls, the
protected review-flyer printer, an opt-in first-login tour, and a Help-page systems
explainer with a tour-restart path.

Durable workflow truths:

- **Lifecycle vocabulary.** Requests move among Contacted, Scheduled, and Closed —
  the same words in the queue and on request detail. There is no forced linear
  funnel: direct `new → scheduled` is the normal successful path, and Scheduled
  stays visible rather than converting to a close. Contacted can resurface on a
  staff-chosen day; Closed leaves the active queue and can be reopened as Contacted
  or Scheduled. Staff never learn a status/disposition split.
- **One human action, one transaction.** Request detail leads with patient context,
  then the single Appointment request notes surface, then the status workflow.
  Staff choose the next status (the current one is never offered as a destination),
  then only the details that status needs; one Save records outcome, status,
  optional call-again day, and closure disposition together, atomically. After
  a confirmed save, Undo restores the exact preceding lifecycle state without
  erasing the saved call outcome from Request activity, and the next request is
  offered as a separate continuation action, never a second Save.
- **Staff author attention.** Urgency comes from staff-chosen call-again days and
  business-aware age ("since Friday", after-hours arrivals), not from a Settings
  "N days" knob or a practice meeting. The queue leads with what to work next;
  next-action hints ride each row.
- **Honest reads.** A failed read is never presented as an empty result — "nothing
  waiting" and "could not check" are different truths. Counts are suppressed, never
  zeroed, when their read fails; a failed recipients read stays silent rather than
  raising a false zero-recipient warning.
- **Two audit layers.** The human Recent-work view renders plain-language,
  work-linked entries; the exact technical audit (action codes, UUID fragments,
  correlation IDs) is preserved beneath it for administrators. Storage vocabulary
  is never staff language.
- **Flyer printing is front-desk work** (practice decision 2026-07-26): open to
  every active staff member, since printing an approved artifact mutates nothing.
  Changing flyer assets stays outside the portal. An explicit print action produces
  the complete patient contact, Appointment request notes, and Request activity
  without portal controls or delivery diagnostics.
- **The assistant seam is reserved, not occupied** (decision 2026-07-26): no
  floating launcher may ship before the capability exists. When an assistant ships
  it will be a docked, contextual widget with no dedicated page and no nav entry,
  and it arrives only when it completes a real job (first candidate: drafting
  structured website-change requests).

Explicitly undecided / open product facts: recoverable staff lifecycle operations;
the maintainer invite/cancel/accept/revoke acceptance pass; the structured
website-change-request workflow (later conversationally assisted) planned for the
maintainer seam.

Deliberately not building: generic metric dashboards or vanity counts; a forced
linear status funnel; kanban or bulk mutations; direct browser database access; a
CMS, flyer editor, or QR generator; page-view surveillance; an assistant that sees
patient free text or mutates records autonomously.

### Product Principles

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
   result.
5. **One human action, one portal transaction.** Staff experience "set the outcome
   and call-again timing" as a single step, while appointment request notes remain
   in their one familiar section. The interface never splits one real-world
   action across disconnected forms, and server operations backing a combined
   action commit atomically.
6. **Attention over inventory.** Lead with work that needs action — and its
   age in business terms — not with counts or tables that merely exist. Attention
   travels with the worker: the waiting-request count rides on the Requests nav
   destination, and notification failures surface on Home beside the
   zero-recipient warning. Both are attention, not inventory; neither collects
   anything new.
7. **PHI-minimal.** The portal handles appointment requests, not a clinical record. Intake
   has no dedicated clinical fields, but it stores an optional patient-supplied
   brief reason, so the queue is still sensitive. Notification emails and
   operational logs stay free of patient fields. Boundary-crossing reads of patient
   data are audited: a CSV export writes a metadata-only audit row (actor,
   timestamp, row count, filter) — an export creates a clinic-controlled sensitive
   copy, and leaving it unaudited was inconsistent with this posture (decision
   2026-07-28).
8. **Names, not addresses.** Staff-facing identity renders the display name captured
   at invite (header, note attribution, the Recent-work view); emails remain in the
   raw audit. Staff rows surface last sign-in from existing Auth state — the
   highest-value adoption signal available without any new tracking.

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
