# Architecture: Westchase GI

This document explains how the repository is put together, what runs during a request, where
state lives, and which files own each behavior. It is for maintainers who need a correct map
before changing code.

For setup, verification, pull requests, and release procedure, use
[`CONTRIBUTING.md`](CONTRIBUTING.md). Product truth lives in `PRODUCT.md`, design rules in
`DESIGN.md`, hard agent rules in `AGENTS.md`, and custody facts in `README.md`. The staff-facing
appointment-request states and commands are specified in
[`docs/appointment-request-workflow-specification.md`](docs/appointment-request-workflow-specification.md).

This file records intended design. Executable contracts show current behavior. If they disagree,
treat the disagreement as a defect and fix both in the same change. Neither source is
automatically right.

- [System in one page](#system-in-one-page) names the surfaces, layers, and external systems.
- [Assembly and request execution](#assembly-and-request-execution) explains build-time assembly
  and request dispatch.
- [Main execution paths](#main-execution-paths) follows patient reads, intake, and staff work.
- [State and persistence](#state-and-persistence) identifies each source of truth.
- [Trust boundaries](#trust-boundaries) collects the rules that may not be weakened.
- [Behavior-owning subsystems](#behavior-owning-subsystems) covers Auth, email, telemetry, and
  protected artifacts.
- [Proof map](#proof-map) shows where the architecture is tested.
- [Common starting points](#common-starting-points) maps changes to their owning files.

## System in one page

One Next.js 16 App Router application runs on Vercel. It carries two products in one deployment:
the patient website and the staff portal. A third root route tree supports the public review hub.

| Surface | Route | Runtime |
| --- | --- | --- |
| Patient website | `/{en,es,vi,ko,ar}/**` | Static-first React Server Components, five typed locales, Arabic RTL |
| Staff portal | `/admin/**` | Dynamic React Server Components, Server Actions, route handlers, Supabase Auth |
| Review hub | `/review` | Public, locale-less, stable target for the printed master QR |
| HTTP interfaces | `/api/**` and selected route handlers | Intake, telemetry, Preview attestation, Auth callbacks, CSV, and protected flyer assets |

Most behavior falls into three layers:

```text
Route surfaces
  src/proxy.ts · src/app/[locale]/** · src/app/admin/** · src/app/review · src/app/api/**
        │
        ▼
Application contracts and services
  patient content/i18n · portal auth · intake · workflow decisions · read models · adapters
        │
        ▼
Durable and external state
  Supabase Postgres · Supabase Auth · Resend · GitHub App · protected local artifacts
```

The request topology is:

```text
patient browser
  ├─ localized page ───────────────► typed dictionaries and content modules
  ├─ appointment form ─────────────► request handler ─► intake service
  │                                                    ├─► Postgres request + outbox
  │                                                    └─► email adapter + delivery evidence
  └─ telemetry beacon ─────────────► telemetry handler ─► private aggregate counter

staff browser
  └─ /admin/** ─► proxy session refresh ─► server authorization
                                           ├─► validated read models ─► Postgres
                                           ├─► Server Action ─► workflow command ─► atomic RPC
                                           └─► GitHub service ─► GitHub App API
```

| System | Role |
| --- | --- |
| Supabase Postgres | Appointment-request queue, workflow state, staff profiles, audit, throttling, and aggregate analytics |
| Supabase Auth | Staff identity and cookie sessions; hosted SMTP handles Auth recovery |
| Resend | Adapter behind the application-owned, text-only email interface |
| GitHub App (`wgi-portal`) | Live repository-maintainer reads and mutations from server-only code |
| Vercel | Application runtime and deployment platform; the portal does not call its API |

Application deploys and database promotions are separate. Merging `main` deploys the
application. A committed migration reaches Production only through a separate, explicit
decision.

## Assembly and request execution

### Build-time assembly

- `next.config.ts` owns legacy redirects and includes protected review-flyer files in the relevant
  server function bundle. Configured redirects run before `src/proxy.ts`.
- `src/app/[locale]/layout.tsx` fixes the patient route set through `generateStaticParams` and
  `dynamicParams = false`. It installs the patient shell, metadata base, structured data,
  language handling, notice, and patient-site telemetry.
- `src/lib/dictionaries/en.ts` defines the dictionary type. `src/lib/i18n.ts` requires ES, VI, KO,
  and AR to satisfy the same shape, so missing patient copy fails the build.
- `src/app/admin/layout.tsx`, `src/app/[locale]/layout.tsx`, and `src/app/review/layout.tsx` are
  separate root layouts. The portal and review hub do not inherit patient chrome.
- Database structure is not assembled by the Next.js build. Timestamped migrations under
  `supabase/migrations/` define schema lineage and are deployed separately.

### Request dispatch

`src/proxy.ts` is a narrow front door, not a global application layer. Its explicit matcher covers
the root locale redirect, legacy patient-query scrubbing on contact and appointment routes, and
the `/admin` subtree.

It performs three jobs:

1. `/` chooses `wgi-locale`, then `Accept-Language`, then English. The `307` response is
   non-cacheable and varies on language and cookie.
2. Legacy patient-bearing query parameters are removed with a `301` before a page or third-party
   resource can load them.
3. Admin requests refresh Supabase cookies and receive an optimistic session gate. Public Auth
   entry routes and protected flyer assets have explicit exceptions.

All other routing belongs to the App Router. React Server Components are the default. Client
components own browser interaction, not durable business state. Route handlers validate their
own input even when the browser and proxy have already checked it.

## Main execution paths

### Localized patient reads

A route under `src/app/[locale]/` validates its locale, loads the typed dictionary, and combines
it with source-owned facts or long-form content from `src/lib/`. Patient pages do not read their
copy from Postgres. Metadata helpers, sitemap generation, legacy redirects, and page links share
the canonical apex origin from `src/lib/site.ts`.

The patient layout reports only allowlisted, aggregate telemetry. `/admin` and `/review` live
outside that layout and do not report patient-site events.

### Patient appointment intake

Both browser paths enter the same service:

```text
AppointmentForm.tsx ─► POST /api/requests ─────────┐
native form ─────────► POST /api/requests/form ────┴─► processIntake()
```

`processIntake` runs the workflow in this order:

1. A filled honeypot returns a success-shaped decoy without writing a request.
2. `requestInputSchema` validates the wire payload. Database constraints enforce field limits
   again.
3. A domain-separated HMAC of the edge-supplied client address enters the shared Postgres rate
   limiter. Raw and reversibly hashed addresses are never stored.
4. `portal_create_request_with_outbox` atomically writes the durable request and the intended
   notification recipients.
5. Only after the RPC succeeds may the application return success.
6. The application attempts PHI-free notification delivery through the email interface, records
   one outcome per recipient, and updates the outbox. Delivery failure never removes or downgrades
   the accepted queue record.
7. The no-JavaScript path issues a one-time receipt, then returns `303` to a localized receipt
   page. The URL contains only an opaque token; its hash lives in `request_events`.

`public.requests` remains authoritative even when email delivery is ambiguous or fails.

### Portal identity, authorization, and reads

The proxy refreshes the Supabase session, but every protected page, handler, and Server Action
authorizes again through `requireRole` in `src/lib/portal/auth.ts`.

`requireRole` verifies the cookie-bound Auth user, then reads `public.staff_profiles` with the
server-only service client. The profile supplies active state and role. User-editable Auth
metadata is not an authorization source.

Portal pages read Postgres on the server. Boundary modules decode provider rows before the UI
branches on them. Read models such as `fetchRequestWorkSurface` combine current request state,
append-only transitions, notes, notification evidence, and Undo eligibility into one UI-facing
result. A failed read stays distinct from an empty queue or empty history.

### Appointment-request commands

The staff workflow has a read side and a command side:

```text
workflow/contracts.ts ─► legal controls rendered by the UI

Server Action
  └─► requireRole()
      └─► parse staff input and practice-local time
          └─► workflow/machine.ts decide()              pure policy
              └─► workflow/commands.ts                  idempotency and concurrency shell
                  └─► portal_execute_request_command    atomic database boundary
```

The pure decision function owns legal state transitions. The command shell binds each request,
expected version, idempotency key, and payload fingerprint. The RPC locks the current row,
rechecks version and command semantics, updates the request, appends immutable transition
evidence, writes any note and audit effects, and stores the replayable result as one transaction.
Successful actions revalidate the affected portal routes.

Undo appends a compensating transition and restores a saved coherent snapshot only when the
target is still the latest eligible transition. It never deletes history.

Read [`docs/appointment-request-workflow-specification.md`](docs/appointment-request-workflow-specification.md)
before changing states, commands, queue ordering, history, Undo, staff-facing labels, or workflow
controls.

### Staff-authored appointment intake

`/admin/requests/new` uses the patient field contract but has a separate atomic write path.
`portal_create_staff_request` binds an opaque idempotency key to the actor and payload, then writes
the request, staff-origin creation event, metadata-only audit row, and receipt together. Exact
retries return the original request. Reusing the key with different details conflicts without
mutation.

This path does not create notification outbox work because staff already created the queue record.
It does not create a separate Patient or Appointment entity.

## State and persistence

### Sources of truth

| Concern | Source of truth | Main access path |
| --- | --- | --- |
| Patient copy and practice facts | Dictionaries, `site.ts`, providers, documents, and content modules | Static/RSC reads |
| Review destinations and approved flyer bytes | `review-targets.json` and `private/review-flyers/` | Manifest helpers and protected asset route |
| Staff identity | Supabase Auth | Cookie-bound Supabase server client |
| Staff authorization | `public.staff_profiles` | `auth.ts` through the service client |
| Appointment requests | `public.requests` | Server-only reads and atomic RPCs |
| Workflow history | `public.request_transitions` | Workflow command and read modules |
| Notes, receipts, and notification evidence | `public.request_events` | Intake, request-note, and read modules |
| Intended notification delivery | `public.notification_outbox` | Intake RPC and delivery updates |
| Staff-intake idempotency | `public.staff_request_receipts` | `portal_create_staff_request` |
| Workflow-command idempotency | `public.request_command_receipts` | `executeRequestCommand` and its RPC |
| Notification destinations | `public.notification_recipients` | Management services and atomic RPCs |
| Portal release engagement | `public.portal_release_states` | Release briefing and engagement modules |
| Staff and external-operation audit | `public.audit_log` | Atomic RPCs and the audit service |
| Shared request throttles | `private.intake_rate_limits` | Database rate-limit RPC |
| Patient-site aggregates | `private.analytics_daily` | Telemetry RPC and privileged rollup query |
| Repository maintainer state | GitHub | Live GitHub App reads; never mirrored into Postgres |

Browser storage contains preferences and interaction state only. The locale cookie selects a
language, local storage remembers notice dismissal, and Supabase cookies carry the Auth session.
None is authoritative business state.

### Atomicity and uncertain external outcomes

Operations that would become misleading if partly applied use one Postgres RPC. This includes
intake, staff-authored intake, workflow commands, recipient and staff changes, release engagement,
print-packet preparation, legal holds, and deletion.

GitHub cannot participate in a Postgres transaction. A maintainer mutation therefore writes a
`pending` audit row before the provider call, then resolves it as `succeeded`, `failed`, or
`unconfirmed`. An unclear provider result remains unclear and leaves evidence for an operator.

The print packet follows the same honesty rule at a different boundary. Its RPC selects the exact
durable `new` membership, generates the database snapshot time, orders rows, and writes one
metadata-only audit entry. Opening or cancelling the browser print dialog causes no database
mutation. The live queue remains authoritative after the snapshot.

### Schema evolution

Migrations are forward-only and timestamped in `supabase/migrations/`. Each schema-changing
migration has a rollback sibling in `supabase/rollbacks/`. When old and new application versions
can overlap, change the schema first and keep the deployed interface backward compatible until
the new application is live.

Preview Branch procedure, seed commands, verification, and Production promotion live in
[`CONTRIBUTING.md`](CONTRIBUTING.md#how-to-contribute-with-a-supabase-preview-branch).

## Trust boundaries

- **Five locales move together.** `en.ts` defines the patient dictionary type. Patient-facing
  copy changes land in EN, ES, VI, KO, and AR; localized content uses the same paired shape.
- **The proxy is not authorization.** It refreshes sessions and rejects obvious unauthenticated
  requests. Every protected interface still calls `requireRole`.
- **Authorization is server-owned.** `staff_profiles` is the source of role and active state.
  Never authorize from user-editable metadata.
- **RLS is closed to clients.** Application tables have no anonymous access and no authenticated
  writes. Privileged data access stays in server-only service-role code.
- **Patient data stays inside the queue.** Patient fields never enter notification emails, URLs,
  logs, audit metadata, analytics, GitHub, or provider diagnostics.
- **Success follows durable persistence.** Intake and portal actions never present a saved state
  before the database confirms it. Failure and unknown remain distinct.
- **Staff work is accountable.** Staff-initiated state changes write metadata-only audit evidence.
  Patient text belongs to the request and its history, not `audit_log`.
- **Secrets remain server-only.** Only the Supabase URL and publishable key may use
  `NEXT_PUBLIC_*`. Service-role, email, workflow-HMAC, GitHub App, and operator credentials must
  not reach client modules.
- **Every HTTP boundary validates.** Route handlers, Server Actions, provider responses, and
  database results are untrusted until decoded by their owning contract.

[`.env.example`](.env.example) is the exact variable inventory. GitHub App credentials are
Production-only so mutable Preview code never receives Repository Administration access.

## Behavior-owning subsystems

### Staff authentication

Supabase Auth owns identity and SSR cookies. `staff_profiles` owns portal access. Public Auth entry
routes are limited to login, forgot-password, confirmation, and callback. `/admin/set-password`
requires both a verified active staff session and a signed, short-lived invite or recovery marker.

Invite and recovery links are single-use and unavailable to deactivated staff. Bearer values stay
in the URL fragment until the confirmation page parses and removes them. Password change,
metadata-only audit, and fresh-session failures remain distinct so the UI never claims an
unchanged password after Auth committed it.

Hosted SMTP, templates, redirect allowlists, expiry, cooldown, site URL, and public-signup policy
are Supabase project configuration. Preview and Production are configured and verified
separately; the operator checklist lives in
[`CONTRIBUTING.md`](CONTRIBUTING.md#shipping-to-production).

### Email

`src/lib/portal/email.ts` defines one provider-neutral, text-only application interface.
`email-provider.ts` adapts it to Resend. New-request pings, recipient confirmation, and staff setup
use this interface. Supabase Auth recovery uses hosted SMTP instead.

Application sends use bounded deadlines, stable idempotency keys, normalized outcomes, and logs
that exclude recipients, content, bearer links, provider errors, message IDs, and idempotency
keys. `accepted` means the provider returned a message ID, not that an inbox received the message.
The queue remains authoritative.

### Patient-site telemetry

`POST /api/telemetry` accepts only allowlisted event, route template, locale, and device class
values. It shares the database throttle with intake under a separate HMAC domain, then atomically
increments `private.analytics_daily`. The payload has no free text, raw URL, patient field, client
timestamp, or visitor identity. Counts are directional aggregates, not a forensic event log.

### Protected review artifacts

Approved review-flyer binaries stay under `private/review-flyers/`.
`src/lib/review-targets.json` is the destination, filename, and hash manifest. Authenticated asset
routes serve the bytes after their own authorization. Do not move the files to `public/` or
regenerate an approved PDF as a routine edit.

## Patient-request data lifecycle

The portal is a temporary intake and operations system, not FDHS's authoritative patient
record. Names, contact details, patient-supplied reasons, and staff notes are treated as
sensitive even though the form asks patients not to submit medical details.

| Data | Retention rule |
| --- | --- |
| Legitimately open request | No automatic deletion |
| Closed without an appointment (`unconverted`) | 180 days after classified closure |
| Closed after booking (`converted`) | 12 months after record handoff and classified closure |
| Request notes and notification or receipt events | Follow the parent request |
| Receipt-token hash | One hour; the receipt is valid for 15 minutes |
| Expired throttle buckets | Next hourly lifecycle run |
| Audit rows | Six years unless a legal hold protects the related request |

- Closing requires an explicit front-desk outcome. Reopening clears the outcome and its clock.
  Pre-policy closed rows remain unclassified and cannot be deleted automatically until staff
  classify them; migrations never guess.
- Legal holds block scheduled and exceptional deletion. Exceptional early deletion requires a
  non-PHI authorization reference from the privacy or records custodian, refuses held requests,
  writes minimized audit evidence, and deletes the request with its child evidence.
- Audit metadata may contain identifiers, staff identity, state changes, closure outcomes,
  authorization references, and counts. It must not contain patient names, contact details,
  intake text, or appointment-request notes.
- The application keeps no duplicate patient-data archive. A downloaded CSV is a
  clinic-controlled sensitive copy outside application retention.
- Backups are recovery copies, not archives. Lifecycle scheduling remains off until privacy,
  custody, security, test, Preview, and approval gates are complete.

## External interfaces

### GitHub App

The Website surface reads repository custody and maintainer state live from GitHub. The
clinic-owned GitHub App has Repository Administration read/write and Metadata read, with no
webhook. Server code mints short-lived installation tokens pinned to the numeric owner and
repository IDs. It exposes only read, invite, cancel-invitation, and revoke operations.

Never reintroduce a database-backed software registry, substitute a personal access token, call
GitHub from a client module, or log JWTs, tokens, or environment values. A code rollback is not a
privilege rollback: granted repository access survives until the owner changes it.

### Hosting and linked services

Vercel serves the apex canonical site and deploys the application from `main`. The portal displays
hosting custody as a static fact and never manages Vercel or DNS. Registrar, account ownership,
access, and handoff status belong in `README.md`.

Hushforms and healow are external patient links, not application interfaces. Review destinations
come from `review-targets.json`; map embeds send no referrer. Unverified patient-service URLs do
not ship.

## Proof map

Tests pin the main contracts:

| Contract | Primary proof |
| --- | --- |
| Dictionary parity and static route assembly | Typecheck/build, `e2e/dictionary-availability.test.mjs`, public smoke |
| Pure workflow policy and read composition | `src/lib/portal/workflow/*.test.mjs` |
| Route, Auth, intake, portal, email, and privacy behavior | Focused Playwright specs under `e2e/` |
| Schema, grants, RLS, RPC signatures, and PostgREST relations | `scripts/verify-schema.mjs` and `e2e/supabase-dependency-contract.spec.ts` |
| Destructive-test isolation from Production | `e2e/target-guard.ts` and `e2e/target-guard.test.mjs` |
| Patient-data leak boundaries | `e2e/leak-hygiene.spec.ts` |
| Review-flyer destination and byte integrity | `scripts/verify-review-flyers.mjs` |

The exact command set and change-type check matrix live in
[`CONTRIBUTING.md`](CONTRIBUTING.md#verification).

## Common starting points

Start from the owner of the behavior, then follow its imports toward the route and its calls toward
the adapter or database. The matching change-type check matrix is
[`CONTRIBUTING.md`](CONTRIBUTING.md#by-change-type).

- **Patient copy and facts:** `src/lib/dictionaries/`, `src/lib/site.ts`, `src/lib/providers.ts`,
  `src/lib/services.ts`, `src/lib/resources.ts`, and `src/lib/testimonials.ts`.
- **Patient pages and long-form content:** `src/app/[locale]/`, `src/lib/documents.ts`, and
  `src/lib/content/preps/`, `src/lib/content/blog/`, and `src/lib/content/education/`. Include
  sitemap, metadata, and redirects when discovery changes.
- **JSON boundary decoding:** `src/lib/json.ts` owns the `Json` value type and the Zod helpers
  used before route or portal code branches on untrusted data.
- **Intake fields or persistence:** `src/lib/portal/contracts.ts` → `AppointmentForm.tsx` → both
  request handlers → `src/lib/portal/intake.ts` and `intake-notification.ts` → the owning RPC.
- **Appointment-request workflow:** `docs/appointment-request-workflow-specification.md` →
  `src/lib/portal/workflow/contracts.ts` and `machine.ts` → `workflow-actions.ts` →
  `workflow/commands.ts` → `portal_execute_request_command`.
- **Portal authorization and sessions:** `src/lib/portal/auth.ts`, `server.ts`, `src/proxy.ts`,
  Auth entry routes, and `staff_profiles`.
- **Portal route or mutation:** the route under `src/app/admin/`, `requireRole` at the protected
  interface, its colocated action, the matching `src/lib/portal/` service, and an atomic RPC when
  records must agree.
- **Portal reads and queue attention:** `src/lib/portal/workflow/reads.ts`,
  `src/lib/portal/request-query.ts`, and `src/app/admin/(portal)/requests/queue.ts`.
- **Table, column, RLS policy, RPC, or fixture:** a timestamped migration and rollback sibling,
  `scripts/verify-schema.mjs`, seed files when fixtures change, and every reader or writer of the
  changed interface.
- **Email:** `intake-notification.ts` or `management-email.ts` for composition, `email.ts` for the
  interface, and `email-provider.ts` for the adapter.
- **Telemetry:** `src/lib/telemetry.ts` → `src/lib/telemetry-client.ts` →
  `src/lib/portal/telemetry.ts` → the route and analytics RPC.
- **Website and GitHub:** `src/app/admin/(portal)/settings/software/`, `integrations.ts`,
  `maintainer-operation.ts`, and `maintainers.ts`.
- **Review flyers:** `private/review-flyers/`, `review-targets.json`, `review-flyers.ts`, the
  protected asset route, and `scripts/verify-review-flyers.mjs`.
- **SEO, canonical URLs, locale routing, and legacy scrubbing:** `metadata.ts`, `site.ts`,
  `sitemap.ts`, `robots.ts`, `next.config.ts`, and `src/proxy.ts`.
- **Design and shared UI:** `src/app/globals.css`, `fonts.ts`, route and component modules,
  `DESIGN.md`, and the affected `ui-reference/` surfaces.
- **CI and dependency automation:** `.github/workflows/` and
  `.github/scripts/dependency-automation.cjs`; executable policy and its regression test
  change together.
- **Lint and format:** `.oxlintrc.json` and `.oxfmtrc.json`.
