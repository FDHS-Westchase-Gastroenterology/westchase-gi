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

These are the people the portal serves. They are role groups grounded in the practice's work,
not research-backed personas with invented names or biographies.

- **Front-desk staff are the primary daily users.** They work the shared appointment-request
  queue, prepare paper handoffs, and print review flyers between calls and patient arrivals.
  They usually use a shared front-desk computer and may pick up the same work on a phone. The
  portal must make interruptions and handoffs safe.
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

**The Front Desk Ledger.** Staff should be able to look once, understand what needs attention,
and either enter the live appointment request or create a safe paper handoff without losing the
truth of the shared queue. Each request moves from an unanswered patient ask to a documented
real-world outcome; interruptions, handoffs, narrow screens, stale data, and failed reads never
make staff reconstruct what the software meant.

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

The law the portal keeps while its narrative sections await prototyping. Binding until
explicitly amended.

Floors, riding on their own authority:

- **Honest reads.** A failed read is never presented as an empty result — "nothing
  waiting" and "could not check" are different truths. Counts are suppressed, never
  zeroed, when their read fails; a failed recipients read stays silent rather than
  raising a false zero-recipient warning.
- **PHI-minimal.** The portal handles appointment requests, not a clinical record —
  but intake stores an optional patient-supplied brief reason, so the queue is
  sensitive. Notification emails, operational logs, and telemetry payloads stay free
  of patient fields. Boundary-crossing reads of patient data are audited: a CSV
  export and a prepared New-request print packet each write a metadata-only audit row
  (actor, timestamp, row count, filter).
- No direct browser database access; no assistant that sees patient free text or
  mutates records autonomously.

Durable truths, re-owned in the 2026-08-04 re-charter session:

- **One human action, one portal transaction.** The interface never splits one
  real-world action across disconnected forms, and server operations backing a
  combined action commit atomically. The concrete save choreography is not chartered
  here — see the state-machine deferral below.
- **Staff-authored intake joins the same ledger.** A call, walk-in, or message can become one
  `NEW` appointment request from Home or Appointments. This records scheduling intake, not a
  patient chart; it identifies staff provenance, retries idempotently, and creates no
  website-submission notification work.
- **Paper handoff is an output, never workflow state.** Every active staff member may prepare
  one oldest-first packet containing the exact durable `NEW` set at that database snapshot.
  Preparing or printing it changes no request status, version, attention state, or Request
  history. The packet carries the patient details staff need for the call, a paper routing area,
  safe-paper guidance, and the instruction to record the result in the portal. Paper can
  distribute work; the live queue remains authoritative.
- **Staff author attention.** Urgency comes from staff, never from configuration: no
  Settings "N days" knob, no practice-meeting threshold. The mechanics through which
  staff express it belong to the state machine's definition.
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

The portal remains one `/admin` design surface and shared shell under the Front Desk Ledger world,
but it is not one product outcome with subordinate pages. Product ownership within it is divided
among four end-to-end vertical slices. Each slice owns a complete staff outcome; a route is only
one way the product may deliver that outcome.

- **Home** owns orientation, triage, handoff, and the next useful action: staff can add an
  appointment request, scan the ordered shared work stack, prepare a print packet by status, open
  the next request to work, and reach recent operational context and secondary staff jobs.
- **Appointments** owns the complete appointment-request lifecycle and working queue, retaining
  All, New, Contacted, Scheduled, and Closed as familiar views, with the same staff-authored intake
  action in context.
- **Settings** owns staff access, notification recipients, and software administration without
  competing with daily appointment work.
- **Help** owns cross-job guidance, recovery beyond a slice's own path, and transitions to human
  support.

Each slice is accountable for its own job, experience thesis, information architecture, state
matrix, PHI-free instrumentation, tests, and Product Experience acceptance. This architecture
commits the ownership boundary; it does not claim that every slice's artifacts are complete yet.

Navigation, authentication, authorization policy and enforcement, design tokens, and the Front
Desk Ledger world remain shared horizontal infrastructure. Settings exposes staff access
administration; it does not own authorization itself. The Activity log and review-flyer printing
remain named utilities placed where they support an outcome, not automatic candidates for
additional slices.

Explicitly undecided / open product facts: the maintainer invite/cancel/accept/revoke
acceptance pass; the structured website-change-request workflow (later conversationally
assisted) planned for the maintainer seam.

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
   precise hierarchy and the paper-ledger metaphor, never from novel affordances staff must learn.
5. **The shared queue stays shared.** The portal may surface attention and support a manager's
   paper routing, but it never invents personal ownership or hides work behind "my tasks."
6. **One system at every size.** Desktop uses a persistent task index and dense working canvas;
   mobile keeps the same destinations and actions in reach, with information recomposed rather
   than clipped or reduced to a desktop table.

### Anti-references

- Generic SaaS dashboards made from interchangeable metric cards, equal-weight shortcuts, and
  charts that stand in for the work.
- Kanban boards, invented assignees, personal task queues, or any interface that implies a domain
  model the portal does not own.
- Decorative clinical styling: excessive white cards, blue gradients, stock-health iconography,
  glass, and motion used to make routine work feel more "digital."
- Hidden mutation, ambiguous save states, reassuring zeroes after failed reads, and paper actions
  that silently advance a request.
- Desktop-only density squeezed onto a phone, or mobile simplification that removes status,
  recovery, or the next safe action.

### Accessibility

WCAG 2.1 AA. Touch targets ≥ 44px, visible focus states, semantic landmarks and
heading order, `prefers-reduced-motion` honored globally. English-only by scope
decision — the patient site carries the five locales.
