# Product

<!-- impeccable:product-schema 1 -->

One repository, one deployment, **two products**: the patient-facing website (brand register,
first half) and the staff portal at `/admin` (product register, second half). They share the
design charter in `DESIGN.md`.

## Platform

web

---

## Patient website

> **Awaiting re-charter.** This half still speaks in the polish-era register; its own
> re-charter session is charted as
> [issue #202](https://github.com/FDHS-Westchase-Gastroenterology/westchase-gi/issues/202).
> Until that session lands, where this half's framing conflicts with the committed design
> charter, `DESIGN.md` and its anchors govern — in particular, "preserve the practice's
> identity, execute it better" no longer carries authority as an organizing principle.

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
follows this register plus the design charter in `DESIGN.md`.

### Register

product

### People and working contexts

These are the Persons the portal serves. They are role groups grounded in the practice's work,
not research-backed personas with invented names or biographies.

- **Front-desk staff are the primary daily users.** They work the shared appointment-request
  queue, prepare paper handoffs, and print review flyers between calls and patient arrivals.
  They usually use a shared front-desk computer and may pick up the same work on a phone. The
  portal must make interruptions and handoffs safe. These staff members need to be able to: 
  - Quickly and efficiently retrieve any information they need from the portal, past appointments, current appointments, individuals currently in the state machine as it advances through the appointment lifecycle, or a requested website change. 
  
  
- **The practice manager does the same appointment work and administers the portal.** The
  manager also manages staff access and notification recipients and may distribute printed
  requests to staff. Administrative tools must stay available without crowding daily work.
- **Practitioners may use the shared operational record, but no practitioner-only workflow is
  claimed.** The portal supports appointment-request operations; it is not a clinical record.
- **The website maintainer or engineering support is a secondary user.** This person handles
  website custody, connection, access, and change requests. Most staff should never need to
  understand or enter the underlying provider systems.

These people are not software specialists. Portal permissions remain the simpler `staff` and
`admin` roles; those access levels do not replace the working groups above.

### Product Purpose

One place where practice staff do their web-adjacent jobs without reasoning about
software topology (repositories, hosting projects, asset ledgers). The jobs:

- **Manage incoming appointment requests — the portal's central job.** Appointments is
  a state machine staff use to manage, advance, and eventually close
  incoming appointment requests. The machine itself — its states, transitions,
  operations, invariants, and its boundary with the practice's real scheduling
  system — is defined in the
  [Appointment Request Workflow Specification](docs/appointment-request-workflow-specification.md);
  this charter claims the job while that specification owns the mechanics.
- Reprint a review QR flyer.
- Choose who receives new-request notification emails.
- Manage who can sign in (invite staff, change roles, deactivate accounts).
- See where the website lives, its connection status, and who can change it — and
  manage that access (administrators only). The clinic works in its own portal
  vocabulary — people who "can edit and publish the website" — never in repository
  topology; management controls stay hidden, failing closed, until the one-time
  owner-side setup steps are complete.
- Request an occasional website change (today: through the website maintainer).

The charter claims depth, not breadth: no further jobs are claimed speculatively. New
claims graduate from prototyping under this purpose, never from imagination.

Success: staff move their own way and the portal keeps up. A veteran reaches any job
directly, never toured through a prescribed flow; a brand-new hire orients without
training. What needs attention finds staff on whatever path they take — it is never
hostage to one route from the home page. The portal fits the moment — the front-desk
computer between patients or a phone in a hallway — without staff adapting to it. It
behaves like software they already know, and the care is felt: truthful states, work
never silently lost, quality in details staff notice without naming.

### North star

**The Line** (2026-08-25). The unit of every operational surface is **the line**: one
patient, one next action, one time. The line is not a row in a report and not a link to
somewhere else — it is where the work is read and where the work is recorded. This world
governs the complete `/admin` surface until deliberately re-chartered.

Staff look once, see who must be called, and record what happened on that line — or
prepare a paper handoff — without losing the truth of the shared queue. Each request
moves from an unanswered patient ask to a documented real-world outcome; interruptions,
handoffs, narrow screens, stale data, and failed reads never make staff reconstruct what
the software meant.

The world is named for that structural commitment, not for a paper artifact. It replaces
The Front Desk Ledger (2026-08-09) and The Day Sheet (2026-08-25). Counts are column
headers, never headlines. The largest text on a working page is the day it describes; the
second largest is a patient's name. A number nobody can act on never outranks a name
somebody must call.

**Work happens where the work is listed.** A staff member who can see that a patient must
be called can record what happened on that call without leaving the page. A dialog is for
work about the whole sheet — printing a packet, adding a request that does not exist yet.
Work about one patient happens on that patient's line. Nothing about a single row ever
covers the page.

What a line can record is a decision, not a form. The question staff answer is the one
they actually face, in the order they face it: nobody picked up, we talked, or it is
booked. Outcome wording, order, and color come from one source shared by every surface,
so the line and the request record can differ in density without drifting in vocabulary.

**Every contact schedules its own return.** No path may leave a contacted request without
a call-again day. The day is prefilled from what happened and stays adjustable.

### Evidence

Evidence comes from software, plus the practice channel. The bulk New-request print workflow is
grounded in direct staff feedback relayed for this build: the practice manager prints incoming
requests and distributes them to staff. Other experience priorities come from the implemented
workflow contract and repository decisions; no additional usage observation is claimed.

The portal measures its own use — staff-usage telemetry, chartered to be built out fully,
disclosed to the practice (staff know it exists and that it exists for them), with event payloads
PHI-free by floor. Product decisions are grounded in that telemetry plus the driving developer's
input as the channel to the practice. The audit layers and sign-in state remain operational
records, not the evidence system.

Today only the patient site is instrumented; portal usage instrumentation is early
build-era work. Until it lands, claims about staff usage state their source honestly
rather than presenting assumption as measurement.

### Capabilities and Constraints


Durable truths:

- **One human action, one portal transaction.** The interface never splits one
  real-world action across disconnected forms, and server operations backing a
  combined action commit atomically. The concrete save choreography is not chartered
  here — see the workflow contract below.
- **Staff-authored intake joins the same queue.** A call, walk-in, or message can become one
  `NEW` appointment request from Home or Appointments. This records scheduling intake, not a
  patient chart; it identifies staff provenance, retries idempotently, and creates no
  website-submission notification work.
- **Paper handoff is an output, never workflow state.** Every active staff member may prepare
  an oldest-first packet of the exact durable `NEW` set, or a custom list of New and/or
  Contacted requests, at that database snapshot. Preparing or printing it changes no request
  status, version, attention state, or Request history. The packet carries the patient details
  staff need for the call, a paper routing area, safe-paper guidance, and the instruction to
  record the result in the portal. Paper can distribute work; the live queue remains
  authoritative.
- **Staff author attention.** Urgency comes from staff-authored facts, never from a Settings
  control: no "N days" knob, no practice-meeting threshold. Staff set the call-again day when
  they record contact. The portal then treats `NEW` as a first call, a due call-again as due
  now, a missing call-again as repair, and a silent Contacted request as stale after the
  previous business morning.
- **Two audit layers.** The human Recent-work view renders plain-language,
  work-linked entries; the exact technical audit (action codes, UUID fragments,
  correlation IDs) is preserved beneath it for administrators. Storage vocabulary is
  never staff language.
- **Names, not addresses.** Staff-facing identity renders the display name captured
  at invite; emails remain in the raw audit.
- **Flyer printing is front-desk work**: open to every active staff member, since
  printing an approved artifact mutates nothing. Changing flyer assets stays outside
  the portal.
- **The assistant seam is reserved, not occupied**: no floating launcher may ship
  before the capability exists. When an assistant ships it will be a docked,
  contextual widget with no dedicated page and no nav entry, and it arrives only when
  it completes a real job.
- Deliberately not building: generic metric dashboards or vanity counts; kanban or
  bulk mutations; a CMS, flyer editor, or QR generator.

Appointments workflow contract, defined in the
[Appointment Request Workflow Specification](docs/appointment-request-workflow-specification.md):

- The portal resolves appointment requests through NEW, CONTACTED, BOOKED, or CLOSED;
  contact attempts remain append-only evidence; booking handoff ends the portal's ownership
  without creating a portal Appointment. **Scheduled** remains the staff-facing action label
  for the transition to BOOKED. Semantic commands, versioning, idempotency, an append-only
  transition log, and post-commit notifications govern the build era.

Committed product-slice architecture
([ADR 0004](docs/adr/0004-portal-is-four-outcome-owned-vertical-slices.md)):

The portal remains one `/admin` design surface and shared shell under The Line world, but it is
not one product outcome with subordinate pages. Product ownership within it is divided among four
end-to-end vertical slices. Each slice owns a complete staff outcome; a route is only one way the
product may deliver that outcome.

- **Home** owns today's calls: staff can add an appointment request, read who must be called in
  order, record the common outcome on that line (no answer, contacted, or booked), prepare a
  New-request print packet or a New/Contacted custom list, and reach secondary staff jobs.
  Opening the request record is for notes, close, Undo, and reopen — not for the ordinary call.
- **Appointments** owns the complete appointment-request lifecycle and working queue, retaining
  All, New, Contacted, Scheduled, and Closed as familiar views, with the same staff-authored intake
  action in context. Close, notes, Undo, reopen, and legacy review live here.
- **Settings** owns staff access, notification recipients, and software administration without
  competing with daily appointment work.
- **Help** owns cross-job guidance, recovery beyond a slice's own path, and transitions to human
  support.

Each slice is accountable for its own job, experience thesis, information architecture, state
matrix, PHI-free instrumentation, tests, and Product Experience acceptance. This architecture
commits the ownership boundary; it does not claim that every slice's artifacts are complete yet.

Navigation, authentication, authorization policy and enforcement, design tokens, and The Line
world remain shared horizontal infrastructure. Settings exposes staff access administration; it
does not own authorization itself. The Activity log and review-flyer printing remain named
utilities placed where they support an outcome, not automatic candidates for additional slices.



### Product Principles

1. **Work first; administration second.** Home and Appointments carry the portal's center of
   gravity. Settings and Help stay easy to reach without turning every capability into an equal
   card on a dashboard.
2. **Truth before reassurance.** Empty, waiting, unavailable, stale, conflicted, and completed
   are different states and say so. A failed read never becomes a zero, a print never becomes a
   contact attempt, and an optimistic action never hides its durable outcome.
3. **Resume without reconstruction.** Staff work between calls and patient arrivals. Location,
   request state, next legal action, recovery, and follow-up remain explicit across page changes,
   interruptions, desktop, and mobile.
4. **Familiarity carries the workflow.** Preserve the four destinations, five Appointments views,
   plain staff language, standard controls, and predictable navigation. Personality comes from
   precise hierarchy and the line — one patient, one next action, one time — never from novel
   affordances staff must learn.
5. **The shared queue stays shared.** The portal may surface attention and support a manager's
   paper routing, but it never invents personal ownership or hides work behind "my tasks."
6. **One system at every size.** Desktop uses a persistent task index and dense working canvas;
   mobile keeps the same destinations and actions in reach, with information recomposed rather
   than clipped or reduced to a desktop table.


### Accessibility

WCAG 2.1 AA. Touch targets ≥ 44px, visible focus states, semantic landmarks and
heading order, `prefers-reduced-motion` honored globally. English-only by scope
decision — the patient site carries the five locales.
