# Architecture — Westchase GI

Developer-facing system design: runtime topology, module interfaces, non-obvious invariants,
external seams, and where changes belong. Process lives in
[`CONTRIBUTING.md`](CONTRIBUTING.md), hard agent rules in [`AGENTS.md`](AGENTS.md), product
truth in `PRODUCT.md`, design rules in `DESIGN.md`, and current custody in `README.md`.

This document records intended design. Executable contracts show current behavior; a
disagreement is a defect to investigate and resolve in the same change, not evidence that
either the prose or the code is automatically right.

## System topology

One Next.js 16 App Router and Tailwind CSS 4 application carries two products in one
deployment:

- **Patient site** (`/{en,es,vi,ko,ar}/**`) — static-first, five locales, Arabic RTL, and
  type-enforced dictionaries.
- **Staff portal** (`/admin/**`) — authenticated, English-only operations for the durable
  appointment-request queue and practice administration.

| System | Architectural role |
|---|---|
| Supabase | Hosted Postgres queue and Auth. Development and Production are separate projects. Application tables are RLS-protected; privileged data access stays in server-only code. |
| Email capability | Provider-neutral, text-only application interface with a Resend adapter. Supabase Auth recovery uses a separate hosted SMTP path. |
| GitHub App (`wgi-portal`) | Server-only adapter for reading repository custody and inviting, cancelling, or revoking maintainers. |
| Vercel + DNS | Vercel runs the application; `https://westchasegi.com` is canonical. The portal does not call or manage Vercel or DNS. |

```text
patient browser ──► Vercel: Next.js application
                      ├─ src/proxy.ts          locale redirect · admin gate · query scrub
                      ├─ src/app/[locale]/**   patient pages (RSC)
                      ├─ intake handlers ─────► Postgres `requests` (durable queue)
                      │                              └─► email interface ─► PHI-free staff ping
                      └─ telemetry handler ───► private aggregate counters

staff browser ──────► /admin/** (Supabase Auth session)
                      ├─ protected pages/actions ─► service-role data interface
                      └─ Website surface ─────────► GitHub App ─► GitHub API
```

Application deployment and database promotion are separate release axes: merging `main`
deploys the application, while a committed migration reaches Production only through a
separate, explicit decision.

## Runtime and trust model

- **Proxy (`src/proxy.ts`)** — Next.js 16 proxy convention; there is no `middleware.ts`. Its
  matcher is explicit, so new protected paths must be added deliberately. It performs:
  - `/` locale selection: `wgi-locale` cookie → `Accept-Language` → `en`, returned as a
    non-cacheable `307` varying on language and cookie;
  - a `301` scrub of legacy patient-bearing query parameters on appointment/contact paths
    before a document or third-party resource can load; and
  - Supabase session refresh plus an optimistic `/admin` gate. Public auth-entry paths are
    `login`, `forgot-password`, `auth/confirm`, and `auth/callback`. The review-flyer asset
    route passes the proxy gate only so its own server authorization can return the right
    binary response. Other unauthenticated admin requests fail closed.
- **Server rendering and authorization** — React Server Components are the default. Every
  protected admin page, handler, and mutation reauthorizes with `requireRole`; proxy gating
  never substitutes for server authorization. Portal pages are dynamic.
- **External HTTP interfaces** — the important seams are JSON and no-JS intake, aggregate
  telemetry, authenticated CSV export and flyer assets, and the Auth callback/confirmation
  flow. Handlers validate at their own interface rather than trusting the browser or proxy.
- **Server actions** — portal actions are colocated with their routes and authenticate before
  calling the portal library or a database RPC.
- **SEO** — metadata, sitemap, robots, and legacy redirects share the apex canonical origin.

Only the Supabase URL and publishable key are browser-visible. Service-role, email, and GitHub
App credentials are server-only; GitHub App credentials are Production-only. Database,
seed, Preview, and Production-operator credentials are tooling inputs with narrower scopes,
not browser configuration. [`.env.example`](.env.example) is the exact variable inventory.

## Architectural invariants

- **Five locales move together.** `en.ts` defines the patient dictionary type, so a missing
  key in ES/VI/KO/AR fails the build. Patient-facing copy changes land in all five locales;
  localized content libraries enforce the same shape through `Bi`.
- **Authorization is server-owned.** `staff_profiles`, read through the service client, is
  the role and active-state source of truth. Never authorize from user-editable metadata or
  expose a portal secret through `NEXT_PUBLIC_*`.
- **RLS is closed to clients.** Every application table has RLS enabled; anonymous grants and
  authenticated writes are absent. Privileged writes originate in server-only service-role
  code, and multi-record operations that must agree use atomic RPCs.
- **Intake success means durable persistence.** The application never renders success before
  the Postgres insert. Failure and unknown states remain distinct and show the staffed
  call/text fallback.
- **Patient data stays inside the queue.** Patient fields never enter notification emails,
  URLs, server logs, audit metadata, analytics, or provider diagnostics. Browser, server, and
  database caps all constrain patient input.
- **Staff work is accountable.** Every staff-initiated state change writes metadata-only
  audit evidence. Patient text belongs in the request and its event stream, not `audit_log`.

## Data interface

### Stored data

| Relation | Role |
|---|---|
| `public.requests` | Appointment-request system of record. Owns lifecycle, closure disposition, receipt-token hash state, and legal-hold state. |
| `public.request_events` | Child event stream for notification outcomes, attributed appointment-request notes, call outcomes, and Undo evidence. Call outcomes carry versioned lifecycle snapshots; events cascade with the request. |
| `public.notification_recipients` | Active/paused destinations for new-request pings. |
| `public.staff_profiles` | Authorization source of truth linked to `auth.users`. |
| `public.portal_release_states` | PHI-free, bounded per-staff engagement with application-owned release briefings. |
| `public.audit_log` | Metadata-only record of staff-visible operations and external-operation outcomes. |
| `private.intake_rate_limits` | Expiring HMAC throttle buckets; no raw or reversibly hashed client address. |
| `private.analytics_daily` | PHI-free daily counts by allowlisted event, route template, locale, and device class. |

### Atomic operations

- Intake throttling and analytics increments are database-atomic so multiple application
  instances share one limit and counter.
- Saving a call outcome commits the outcome, request lifecycle, call-again timing, and closure
  disposition together. Undo records a new event and restores the saved snapshot only
  when no later mutation has made it stale; it never deletes history.
- Staff, recipient, release-state, legal-hold, and deletion operations apply their data and
  audit effects as one database operation where partial success would misrepresent state.
- GitHub mutations cannot share a database transaction with the provider. They write a
  `pending` audit row before the call, then finish it as `succeeded`, `failed`, or
  `unconfirmed`, preserving evidence across ambiguous external outcomes.
- Lifecycle preview, scheduled deletion, legal holds, and exceptional early deletion remain
  distinct privileged interfaces.

### Migrations

The repository uses forward-only timestamped migrations in `supabase/migrations/`. Every new
schema-changing migration ships with a rollback sibling in `supabase/rollbacks/`. Apply and
verify Development first; merging does not authorize Production promotion. When old and new
application versions can overlap, schema-first changes keep the deployed interface backward
compatible until the new application is live. Seed fixtures live in `supabase/seed.sql` and
`scripts/seed-portal.mjs`; commands and release procedure live in `CONTRIBUTING.md`.

## Critical flows

### Intake

1. `AppointmentForm.tsx` posts JSON to `/api/requests`; without JavaScript the browser posts
   natively to `/api/requests/form`.
2. `requestInputSchema` validates server-side and database constraints enforce field caps
   again.
3. A filled honeypot is dropped with a success-shaped response and never enters the queue.
4. The shared Postgres throttle uses a domain-separated HMAC key, never a raw address or a
   reversible digest.
5. The durable `requests` insert completes before any success state can render.
6. Notification fan-out snapshots active recipients, sends a PHI-free portal ping through the
   email interface, and records one outcome event per recipient. Notification failure never
   rolls back the queue record.
7. The no-JS handler returns `303` to a localized receipt page with a 15-minute, one-time
   opaque token bound to the stored request. Only its hash is stored, and that hash expires
   after one hour. No patient value or unsigned success flag enters the URL.

### Patient-site telemetry

`POST /api/telemetry` validates four allowlisted dimensions, uses a telemetry-specific HMAC
domain in the shared throttle, and atomically increments `private.analytics_daily`. The
payload contains no free text, raw URL, patient field, or client timestamp. Counts are
directional aggregates, not a forensic event log; reads use
`supabase/snippets/analytics-daily-rollup.sql` through a privileged operator context.

### Staff authentication

Supabase Auth uses SSR cookies. The proxy refreshes sessions; `requireRole` authorizes every
protected operation from `staff_profiles`. Public auth-entry routes stay generic and fail
closed so an unknown or inactive address receives the same visible response as an active
one. `/admin/set-password` is not public: it requires a verified active staff session plus a
signed invite/recovery flow cookie.

Invite and recovery links are single-use and unavailable to deactivated staff. Recovery
templates put `token_hash` and `type` in the URL fragment, keeping bearer values out of HTTP
requests and referrer headers. The confirmation page strips the fragment before a deliberate
Continue action consumes the token. Hosted Auth SMTP, templates, site URL, and
`/admin/auth/confirm` redirects are project configuration, not migrations — manage and
verify Development and Production separately.

### Email

The application owns one provider-neutral, text-only email interface; replacing the Resend
adapter changes `email-provider.ts` and configuration, not feature workflows. Appointment
pings, recipient confirmation, and staff setup use this interface. Password recovery remains
owned by Supabase Auth hosted SMTP.

Application-owned sends share an eight-second deadline, stable idempotency keys, normalized
outcomes, and logs that exclude recipients, content, bearer links, provider errors, message
IDs, and idempotency keys. Fan-out is parallel with one recorded outcome per recipient. The
request path does not retry automatically because a timeout is ambiguous; a deliberate retry
reuses the stable key within the provider's retention window. `accepted` means the provider
returned a message ID, not that an inbox received the message. The Postgres queue remains
authoritative.

### Protected review artifacts

Approved review-flyer binaries stay under `private/review-flyers/` and are served only through
an authenticated route. `src/lib/review-targets.json` is the single destination, filename,
and hash manifest. Do not move the artifacts to `public/` or regenerate an approved PDF as a
routine edit.

## Patient-request data lifecycle

The portal is a temporary intake and operations system, not FDHS's authoritative patient
record. Names, contact details, patient-supplied reasons, and staff notes are handled as
sensitive even though the form asks patients not to submit medical details.

| Data | Retention rule |
|---|---|
| Legitimately open request | No automatic deletion |
| Closed without an appointment (`unconverted`) | 180 days after classified closure |
| Closed after booking (`converted`) | 12 months after staff-recorded booking and classified closure |
| Request notes and notification/receipt events | Follow the parent request |
| Receipt-token hash | One hour; the receipt itself is valid for 15 minutes |
| Expired throttle buckets | Next hourly lifecycle run |
| Audit rows | Six years unless a legal hold protects the related request |

- Closing requires an explicit front-desk disposition. Reopening clears the disposition
  and its clock. Pre-policy closed rows remain unclassified and ineligible for automatic
  deletion until staff classify them; migrations never guess.
- Legal holds block scheduled and exceptional deletion. Exceptional early deletion requires
  a non-PHI authorization reference from the privacy/records custodian, refuses held
  requests, writes minimized audit evidence, and then deletes the request and child events.
- Audit metadata may contain identifiers, staff identity, state changes, dispositions,
  authorization references, and counts—never patient names, contact details, intake text, or
  appointment-request notes.
- The application keeps no duplicate patient-data archive. A downloaded CSV is a
  clinic-controlled sensitive copy outside application retention.
- Backups are recovery copies, not archives. The lifecycle migrations schedule nothing until
  privacy, custody, security, test, preview, and approval gates are complete.

## External interfaces

### GitHub App

The Website surface reads repository custody and maintainer state live from GitHub; do not
reintroduce a database-backed software registry. The clinic-owned GitHub App has Repository
Administration read/write and Metadata read, with no webhook. Server code mints short-lived
installation tokens pinned to numeric owner and repository IDs and exposes only read,
invite, cancel-invitation, and revoke operations.

GitHub App credentials exist only in Vercel Production so mutable Preview code cannot inherit
an Administration-capable key. Never substitute a personal access token, call GitHub from a
client module, or log JWTs, tokens, or environment values. A code rollback is not a privilege
rollback: a granted repository permission survives until the owner changes it.

### Hosting, DNS, and linked services

Vercel serves the apex canonical site and deploys from `main`; the portal displays hosting
custody as a static fact and never calls Vercel. Registrar, account ownership, current access,
and open handoff status live in `README.md`, not here.

The Hushforms patient packet and healow patient portal are external links, not application
interfaces. Review destinations come from `src/lib/review-targets.json`; map embeds send no
referrer. Unverified patient-service URLs do not ship.

## Test isolation and release model

Credential-bearing E2E runs only against the allowlisted Development project or an explicit
loopback disposable stack. `e2e/target-guard.ts` binds the project reference to the URL and
rejects Production before the first database call; credentialed runs retain no trace, video,
or HTML report. Database-adjacent PRs use a disposable Docker Supabase stack in CI with no
hosted Supabase, Vercel, or repository secrets.

`verify-schema.mjs --target prod` creates and deletes a temporary request, so it is an
authorized maintenance action rather than a read-only inspection. The complete check matrix,
UI baseline procedure, CI policy, merge rules, and application/database release procedure
live in [`CONTRIBUTING.md`](CONTRIBUTING.md#verification).

## Where logic lives

This is the change-type → files map. The matching change-type → checks map is
[`CONTRIBUTING.md`](CONTRIBUTING.md#by-change-type).

- **Patient copy and facts:** dictionaries under `src/lib/dictionaries/`; shared office facts
  and locale helpers in `site.ts`; page libraries in `services.ts`, `resources.ts`, and
  `testimonials.ts`; rendering under `src/app/[locale]/` and `src/components/`.
- **Providers:** `src/lib/providers.ts` is the credential source—preserve the verbatim titles
  documented in its header. Related targets, headshots, physician rendering, and metadata
  live in `review-targets.json`, `public/images/staff/`, the physicians page, and all locale
  dictionaries.
- **Patient documents and long-form content:** `documents.ts` owns document availability;
  `content/preps/`, `content/blog/`, and `content/education/` own on-site content. Their
  indexes link document IDs; sitemap and `next.config.ts` own discovery and legacy redirects.
- **Intake contract and persistence:** `src/lib/portal/contracts.ts` →
  `AppointmentForm.tsx` → both request handlers → `src/lib/portal/intake.ts` and
  `intake-notification.ts` → migrations. Receipt rendering lives under
  `[locale]/appointment/received`.
- **Telemetry:** `src/lib/telemetry.ts` → `src/lib/portal/telemetry.ts` → the telemetry route
  → analytics migration and read snippet.
- **Portal route or mutation:** route under `src/app/admin/`, with `requireRole` at every
  protected interface; route `actions.ts`; `portal-nav.tsx` for permanent navigation; proxy
  matcher and public allowlist when access shape changes.
- **Portal authorization and sessions:** `src/lib/portal/auth.ts`, client construction in
  `server.ts`, session refresh in `src/proxy.ts`, contract types, auth-entry routes, and
  `staff_profiles` migrations.
- **Queue, staff, recipient, release, or audit behavior:** the matching module under
  `src/lib/portal/`, its colocated route/action, contracts, and the atomic migration/RPC.
- **Table, column, RLS policy, RPC, or fixture:** timestamped migration plus rollback sibling,
  `scripts/verify-schema.mjs`, seed files when fixtures change, and every portal reader/writer
  of the changed interface.
- **Email:** `intake-notification.ts` for appointment pings, `management-email.ts` for
  staff/recipient composition, `email.ts` for the interface, and `email-provider.ts` for the
  adapter. Auth recovery SMTP, templates, and redirects are hosted project configuration.
- **Website/GitHub:** `src/app/admin/(portal)/settings/software/`, `integrations.ts`, and the
  maintainer modules. GitHub App only—never a PAT, client-side call, or Vercel integration.
- **Review flyers:** private artifacts, `review-targets.json`, `review-flyers.ts`, protected
  asset route, and `scripts/verify-review-flyers.mjs`.
- **SEO, canonical URLs, locale routing, and legacy scrubbing:** `metadata.ts`, `site.ts`,
  `sitemap.ts`, `robots.ts`, `next.config.ts`, and `src/proxy.ts`.
- **Design and shared UI:** `src/app/globals.css`, `fonts.ts`, route/component modules,
  `DESIGN.md`, and the affected `ui-reference/` surfaces.
- **CI and dependency automation:** `.github/workflows/` and
  `.github/scripts/dependency-automation.cjs`; executable policy and its regression test
  change together.
