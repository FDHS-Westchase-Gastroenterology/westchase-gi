# Architecture — Westchase GI

Developer-facing system design: how the application works, where logic lives, and how it
interacts with external systems. Companions: [`CONTRIBUTING.md`](CONTRIBUTING.md) (process:
setup, verification, commit/PR/merge, production), [`AGENTS.md`](AGENTS.md) (non-negotiable
hard rules), `PRODUCT.md` (patient-site and staff-portal registers), `DESIGN.md` (design system).

This document describes the design; it is not a status page. When it and the code disagree,
the code is right — fix this file in the same pull request.

## 1. System overview

One Next.js 16 (App Router) + Tailwind CSS 4 application carries **two products** in a single
deployment:

- **Patient site** (`/{en,es,vi,ko,ar}/**`) — static-first, five locales (Arabic RTL), brand
  register. Renders from one codebase through type-enforced dictionaries.
- **Staff portal** (`/admin/**`) — authenticated, English-only operations tool: the
  appointment-request queue, notification recipients, staff accounts, review-flyer printer,
  audit log, and the Website custody surface.

Supporting systems:

| System | Role |
|---|---|
| Supabase | Two hosted projects (development, production): Postgres queue + Auth. RLS closed; all writes through service-role server code. |
| Email capability | Provider-neutral, text-only, application-owned. Resend is the only production adapter today. Supabase Auth password recovery is a separate hosted SMTP path. |
| GitHub App (`wgi-portal`) | Clinic-owned; powers the portal's Website surface (read owner/maintainers, invite/cancel/revoke maintainers). Server-side only. |
| Vercel | Clinic-owned Hobby project `westchase-gi`; push-to-deploy. The portal does not connect to or manage Vercel. |
| Porkbun | Registrar + DNS for `westchasegi.com` (apex canonical, `www` redirects). |

```text
patient browser ──► Vercel: Next.js app
                      ├─ src/proxy.ts        locale redirect · /admin gate · legacy query scrub
                      ├─ src/app/[locale]/** patient pages (RSC)
                      ├─ src/app/api/requests/**  intake API ──► Postgres `requests` (durable queue)
                      │                                   └─► email capability ──► staff inboxes
                      │                                        (PHI-free ping; queue is the record)
staff browser ──────►   ├─ src/app/admin/**   portal (Supabase Auth session)
                      │      └─ server actions ──► service-role RPCs (RLS closed to clients)
                      └─ Website surface ──► GitHub App ──► GitHub API (repo custody)
```

## 2. Runtime model

- **Proxy (`src/proxy.ts`)** — Next 16 proxy convention; there is no `middleware.ts`. The
  matcher is an explicit list (`/`, locale `contact`/`appointment`, `/admin/*`), so a new
  protected path must be added to it. Responsibilities:
  - `/` → visitor locale: `wgi-locale` cookie → `Accept-Language` negotiation → `en`
    (`307`, `no-store`, `Vary: Accept-Language, Cookie`).
  - Legacy patient-bearing query strings on form paths are scrubbed with a `301` **before**
    the document (and any third-party resource) loads.
  - `/admin/**`: Supabase session refresh + optimistic gate. The only public paths are the
    authentication-entry routes (`login`, `forgot-password`, `auth/confirm`,
    `auth/callback`) and the flyer-asset route's own server-side check; everything else
    fails closed (redirect to login, or `401` JSON for `/admin/settings/mutations`).
- **Pages** — React Server Components by default. Patient routes render all five locales from
  one page module; portal pages are dynamic and call `requireRole` first.
- **Route handlers** — `POST /api/requests` (JSON intake), `POST /api/requests/form` (no-JS
  native POST → `303` to a one-time receipt), `GET /admin/requests/export` (CSV),
  `GET /admin/review-flyers/assets/[filename]` (protected binary).
- **Server actions** — portal mutations live in each admin route's `actions.ts`; every one
  authenticates first.
- **SEO surface** — `src/app/sitemap.ts`, `src/app/robots.ts`, `src/lib/metadata.ts`, and the
  legacy `redirects()` map in `next.config.ts`. Canonical origin is the apex
  `https://westchasegi.com` everywhere.

## 3. Module map

### `src/lib/` — patient-site facts and shared primitives

| Module | Responsibility |
|---|---|
| `site.ts` | Locale set, `localeDir` (Arabic RTL), office/hours/contact facts, `site` object, locale-path helpers, map/directions URLs. Dated source comments mark confirmation status. |
| `dictionaries/{en,es,vi,ko,ar}.ts` | All patient-facing strings. `en.ts` defines `export type Dictionary = typeof en`; a missing key in any locale is a build error. |
| `i18n.ts`, `locale-preference.ts` | Dictionary lookup; locale cookie persistence. |
| `providers.ts` | Provider roster. **Credentials are verbatim and load-bearing** (AGENTS.md rule 1). |
| `services.ts`, `resources.ts`, `testimonials.ts` | Page-level fact libraries. |
| `documents.ts` | The 31-slot patient-document registry (2 record-release, 13 preps, 16 disease sheets). `file` stays `null` until a real PDF exists in `public/documents/`; slots fall back to the staffed text line or the on-site page. |
| `telemetry.ts` | Client-importable PHI-free analytics contract: `ANALYTICS_EVENTS`, route-template allowlist, `telemetryEventSchema`. |
| `content/preps/` | Procedure-prep handouts, transcribed from the practice's scans (EN and ES separately; source discrepancies preserved in comments). Registered through `index.ts`; shared `Bi` type from `content/types.ts`. |
| `content/blog/` | The 16 migrated posts (`batch1–3.ts`, `legacyPath` drives redirects). |
| `content/education/` | The 17 rebuilt education topics + disease-sheet pages (`procedures.ts`, `conditions-a.ts`, `conditions-b.ts`). |
| `metadata.ts` | Per-page titles/descriptions, canonical, hreflang, JSON-LD. |
| `fonts.ts` | Lato + Trocchi loading. |
| `review-flyers.ts`, `review-targets.json` | Review destinations manifest: filenames, pinned SHA-256 hashes, six targets. |
| `portal/` | Everything server-side for intake + portal (below). |

### `src/lib/portal/` — intake and portal server library (server-only)

| Module | Responsibility |
|---|---|
| `contracts.ts` | The shared contract: `requestInputSchema` (zod), `REQUEST_FIELD_LIMITS`, `REQUEST_STATUSES`, `RequestClosureDisposition`, `StaffRole`, `AUDIT_ACTIONS`, `IntakeResponse` (the only permitted intake response shape), `INTAKE_API` / `INTAKE_NOJS_ACTION`, `receiptPath`, `HONEYPOT_FIELD` (`"company"`), `INTAKE_RATE_LIMIT`, generic `RESET_REQUEST_MESSAGE`. |
| `server.ts` | Supabase client factories: `serverClient()` (session-bound), `serviceClient()` (service role). Reads server-only env; never `NEXT_PUBLIC_*`. |
| `auth.ts` | `requireRole()` for every portal page/action; `staff_profiles` authorization via the service client (never user-editable metadata); password-flow signed-cookie helpers for invite/recovery. |
| `release-briefing.ts`, `release-state.ts` | Per-staff release-briefing read/mutation boundary, technical audit classifier, and PHI-free five-state model. The application owns release content; Postgres stores bounded per-release view, guide-open, dismiss, acknowledgement, and hide engagement. |
| `release-engagement.ts`, `release-engagement-model.ts` | Server-only release-engagement report query plus fail-closed row parser. It joins release state to staff identity for the admin Activity surface and never reads patient tables. |
| `intake.ts` | `processIntake()`: validate → honeypot drop → shared atomic throttle → durable insert → receipt token. `consumeRequestReceipt()` for the one-time receipt page. |
| `telemetry.ts` | `processTelemetry()`: zod → shared throttle (telemetry HMAC domain) → `portal_record_analytics_event` upsert. |
| `intake-notification.ts` | Fan-out to ACTIVE recipients; one `request_events` row per recipient with provider outcome. Zero patient fields. |
| `email.ts` | The transport seam: `PortalEmail*` contract types + `createEmailSender(transport)` — eight-second deadline, idempotency-key pass-through, normalized outcomes, logs exclude recipients/content/keys. |
| `email-provider.ts` | `sendPortalEmail`: the sender bound to the Resend adapter (`unconfigured` result when `RESEND_API_KEY` is absent). |
| `management-email.ts` | Message composition for recipient-confirmation and staff lifecycle mail. Appointment pings are composed in `intake-notification.ts`. |
| `management.ts` | Staff and recipient mutations (invite/resend/deactivate/role change; add/toggle/remove recipient); each returns a typed result and writes audit rows. |
| `maintainers.ts`, `maintainer-operation.ts`, `maintainer-view.ts`, `github-response.ts` | Website-surface maintainer lifecycle (invite/cancel/revoke) and its view/response shaping. |
| `integrations.ts` | GitHub App provider: RS256 App JWT → installation token; every token pinned to the numeric owner/repository IDs; configured/unconfigured/unavailable states. |
| `audit.ts` | `recordAudit`, `beginExternalAudit`/`finishExternalAudit` (atomic external-operation audit). |
| `request-query.ts` | Queue paging/search parsing and caps. |
| `business-time.ts` | Practice-local business-time math for queue attention states. |

### `src/app/`

- `[locale]/**` — patient pages; `[...rest]` catch-all; `appointment/received` (receipt).
- `admin/(portal)/**` — authenticated surfaces behind the group `layout.tsx`: Home
  (`page.tsx`), `requests/` (+ `[id]`, `export`), `review-flyers/` (+ protected `assets/`),
  `settings/` (recipients, staff, `mutations` endpoint), `settings/software/` (Website),
  `audit/`, `help/`, plus `portal-nav.tsx`, `portal-tour.tsx`, `tour-actions.ts`.
  `admin/(portal)/registry/` is a permanent redirect to `settings/software/` kept for
  retired-registry bookmarks.
- `admin/login`, `admin/forgot-password`, `admin/auth/{confirm,callback}` — the deliberate
  public session-establishment boundaries; they stay generic and fail-closed.
  `admin/set-password` is the gated completion step, not a public boundary: it requires a
  verified active staff session plus the signed password-flow cookie (invite or recovery).
- `api/requests/` — the two intake handlers. `api/telemetry/` — PHI-free aggregate event
  counters. `review/` — the public review hub.

### `src/components/`

Shared patient-site UI (Header, Footer, NoticeBanner, AppointmentForm, DocumentList,
ProfileCardViewer, Reveal, etc.). Portal UI is colocated with its routes in
`src/app/admin/`, strings inline (English-only by scope).

## 4. Contracts that break naive changes

- **Five locales are type-enforced.** A key missing from any dictionary is a build error,
  not a runtime gap. Content libraries share the same discipline via the `Bi` type. Any
  patient-facing copy change lands in all five dictionaries in the same PR.
- **The portal is server-authorized.** Every `/admin` page, handler, and action calls
  `requireRole`; authorization reads `staff_profiles` through the service client. Never
  authorize from user-editable metadata; never put a portal secret in `NEXT_PUBLIC_*`.
- **Intake invariants.** Success renders only after the durable Postgres insert; failure and
  unknown states stay distinct and always surface the call/text fallback. The honeypot field
  is deliberately absent from the schema and its submission returns a success-shaped
  response. Patient fields are capped at browser, server, and database boundaries. No
  patient value reaches a URL or a log line.
- **RLS posture.** Enabled on every table, zero anonymous grants, no authenticated write
  policies. All writes go through service-role server actions, and every staff-visible
  mutation writes an `audit_log` row.

## 5. Data layer (Supabase Postgres)

### Tables

| Table | Role |
|---|---|
| `public.requests` | The appointment-request queue — the system of record. Status lifecycle `new → contacted → scheduled → closed` with explicit closure classification (`converted` / `unconverted`) driving retention. Carries receipt-token hash state and legal-hold/lifecycle columns (later migrations). |
| `public.request_events` | Per-request event stream: notification attempts, attributed appointment request notes, atomic call outcomes, and their explicit Undo events. Call outcomes carry versioned lifecycle snapshots so Undo can restore the exact preceding request state when no later save has changed it, without deleting the saved call outcome or Undo event. Cascade-deletes with its parent request. |
| `public.notification_recipients` | Who gets new-request email pings; `active` toggles pause/resume; optional label. |
| `public.staff_profiles` | Authorization source of truth: `user_id → auth.users`, role (`admin`/`staff`), active flag. |
| `public.portal_release_states` | PHI-free per-staff release briefing state keyed by `(staff_user_id, release_id)`: immutable first open, last-view and bounded view count, first/last guide open and count, last dismiss and count, plus idempotent acknowledgement and early hide. |
| `public.audit_log` | Every staff-visible mutation: actor, action, entity, detail JSONB (metadata only — never patient text). Six-year retention. |
| `private.intake_rate_limits` | Expired-bucket HMAC throttle state, cleaned by the lifecycle run. |
| `private.analytics_daily` | PHI-free patient-site daily event rollups `(day, event, route_template, locale, device_class)` — aggregate counts only. |
| ~~`registry_assets` / `registry_grants`~~ | Retired by migration; remain absent. |

### RPCs (service-role only)

Intake: `portal_check_intake_rate_limit`. Telemetry: `portal_record_analytics_event`. Queue:
`portal_update_request_status`,
`portal_close_request`, `portal_add_request_note`, `portal_log_call_outcome` (atomic combined
outcome plus lifecycle snapshot), `portal_undo_call_outcome` (atomic Undo that rejects a stale
or repeated attempt).
Recipients: `portal_update_recipient_label`. Staff: `portal_complete_staff_onboarding`,
`portal_record_staff_password_reset`, `portal_set_staff_tour_dismissed`. Release briefing:
`portal_open_staff_release`, `portal_record_staff_release_guide_open`,
`portal_record_staff_release_dismiss`, `portal_acknowledge_staff_release`,
`portal_hide_staff_release`.
Lifecycle:
`portal_preview_data_lifecycle`, `portal_run_data_lifecycle`, `portal_set_request_legal_hold`,
`portal_delete_request_early`.

### Migrations

Forward-only, timestamped files in `supabase/migrations/`. Since
`20260725170000_add_request_data_lifecycle`, each schema-changing migration ships with a
rollback sibling in `supabase/rollbacks/` (named `<new_version>_to_<prior_version>.sql`); the
twelve earlier migrations predate the convention and have none. Applied development-first
(`supabase link` + `supabase db push`); production promotion is a separate, deliberate
decision — merging the migration does not authorize it. Schema-first rollouts keep the
deployed status RPC backward-compatible until the new app is live. After an approved hosted
rollback, mark versions reverted in the migration ledger
(`supabase migration repair --status reverted ...`) before any later push.
`supabase/seed.sql` + `scripts/seed-portal.mjs` seed the local/development fixtures.

## 6. Intake pipeline

1. The form (`/{locale}/appointment`, `/{locale}/contact`; `AppointmentForm.tsx`) POSTs JSON
   to `/api/requests`, or without JS does a native POST to `/api/requests/form`.
2. Server-side validation against `requestInputSchema`; field caps enforced again here and in
   the database.
3. Honeypot-filled submissions are dropped with a success-shaped response.
4. `portal_check_intake_rate_limit` applies the shared, atomic throttle in Postgres, keyed by
   an HMAC — never a raw address or reversible digest.
5. **The durable insert into `requests` happens before any success state renders.** Failure
   and unknown states are distinct and always present the staffed call/text line.
6. Notification fan-out reads the ACTIVE recipient set at submission time and sends the
   PHI-free ping (stable notice + portal link) through the email capability, recording one
   `request_events` row per recipient.
7. The no-JS path answers `303` to `/{locale}/appointment/received` with a short-lived
   (15-minute), one-time, opaque receipt token bound to the persisted request; its hash is
   removed after one hour. No patient field or unsigned success flag ever rides the URL.

## 6b. Patient-site telemetry

`POST /api/telemetry` → zod (`src/lib/telemetry.ts`) → shared throttle
(`portal_check_intake_rate_limit` with a telemetry-only HMAC domain) → atomic upsert RPC
(`portal_record_analytics_event`) → `private.analytics_daily`. Service-role writes only;
RLS on, zero anon/authenticated grants. Read path is the SQL snippet
`supabase/snippets/analytics-daily-rollup.sql` (dashboard / service role). No staff UI in
v1. Counts are directional, not forensic; payload is four allowlisted strings and never
carries free text, raw URLs, or timestamps.

## 7. Staff portal

- **Authentication** — Supabase Auth over SSR cookies. The proxy refreshes the session and
  gates `/admin`; `requireRole` authorizes every page/action from `staff_profiles` via the
  service client. Login, reset request, and one-time-link confirmation are the only public
  boundaries and stay generic/fail-closed (an unknown address gets the same visible response
  as an active one).
- **One-time links** — invite and recovery links are single-use and role-preserving, and are
  unavailable to deactivated accounts. The recovery e-mail template
  (`supabase/templates/recovery.html`) carries the token in the URL fragment
  (`{{ .RedirectTo }}#token_hash=...&type=recovery`), keeping bearer tokens out of HTTP
  requests and referrer headers; the confirmation page strips the fragment before the user
  presses Continue, and only that deliberate action consumes the token.
- **Surfaces** — task-first Home (live new-request status, attention context in
  business-time terms, zero-recipient warning; a failed read renders "count unavailable",
  never an empty queue), Requests queue + detail (status control with in-place closure
  classification, attributed notes, CSV export), Settings (notification recipients; staff
  accounts with emailed single-use setup links), Website (custody + maintainer controls),
  Activity (audit log), Help, review-flyer printer (every active staff member), first-login
  tour. Product truth: the portal register in `PRODUCT.md`.
- **Mutations** — `management.ts` (staff/recipients) and the maintainer modules return typed
  results, commit combined actions atomically, and write `audit_log` rows.
- **Review-flyer printer** — 18 approved binaries in `private/review-flyers/` served through
  an authenticated asset route; `src/lib/review-targets.json` is the single manifest
  (destinations, filenames, pinned hashes). Never move flyers to `public/` or regenerate an
  approved PDF in a routine edit. `scripts/verify-review-flyers.mjs` proves hashes, decodes
  every PNG to its exact destination, and checks each PDF is one letter page.

## 8. Email system

The application owns **one provider-neutral, text-only email capability**; replacing the
Resend adapter changes `email-provider.ts` plus configuration, not feature workflows.

| Path | Delivery owner |
|---|---|
| New appointment notification | Application email capability |
| Notification-recipient confirmation | Application email capability |
| Staff setup invitation | Application email capability |
| Password recovery | Supabase Auth hosted custom SMTP |

Application-owned paths share the eight-second deadline, stable idempotency keys, normalized
failures, and logs that exclude recipients, message text, bearer links, provider errors, and
idempotency keys. Fan-out is parallel with one recorded outcome per recipient; there are no
automatic request-path retries (a timeout is ambiguous — a deliberate retry reuses the stable
key within the provider retention window). An `accepted` outcome means the provider returned
a message ID; it does not prove inbox delivery. **The queue remains authoritative.**

Supabase Auth owns recovery generation, template, rate limits, and delivery via its custom
SMTP settings. Those settings are project configuration, not migrations, so the development
and production projects must be kept in sync separately. Per project: configure the Resend
SMTP sender, set the Auth site URL to that environment's trusted portal origin, and allow the
exact `/admin/auth/confirm` redirect (no wildcard). Do not add an Auth Send Email Hook unless
unified Auth telemetry or provider selection becomes a concrete requirement.

## 9. Patient-request data lifecycle

The portal is a temporary intake and operations system, not a substitute for FDHS's
authoritative patient record. Patients are asked not to submit PHI, but names, contact
details, free-text reasons, and staff notes are handled as potentially sensitive.

| Data | Retention |
|---|---|
| Legitimately open request | No automatic deletion |
| Closed, no appointment booked (`unconverted`) | 180 days after classified closure |
| Closed, appointment booked (`converted`) | 12 months after staff-recorded booking + classified closure |
| Notes and notification/receipt events | Follow the parent request |
| Receipt token hash | Removed after one hour (receipt valid 15 minutes) |
| Expired intake rate-limit buckets | Next hourly lifecycle run |
| Audit rows | Six years, unless a legal hold protects the related request |
| Recovery copies | Target 14-day backup/PITR window; verify against the clinic's plan |

Rules:

- Closing a request requires one explicit disposition chosen in front-desk language; the
  handoff to the practice's scheduling system is always a person. Reopening clears the
  classification and its clock. Pre-policy closed rows stay unclassified and ineligible for
  automatic deletion until staff review them — the migration never guesses.
- **Legal holds** block scheduled and exceptional deletion. No self-serve UI: an operator
  calls `portal_set_request_legal_hold` with a short non-patient reason; audited.
- **Exceptional early deletion** is operator-only: `portal_delete_request_early` requires a
  non-PHI authorization reference from the privacy/records custodian, refuses held requests,
  and writes a minimized audit row before deleting the request and its events.
- Audit metadata may carry UUIDs, staff identities, status changes, dispositions,
  authorization references, and counts — never patient names, contact details, intake
  messages, or note text.
- There is no duplicate patient-data archive in Supabase. CSV exports are not retained by the
  application; a downloaded export is a clinic-controlled sensitive copy.
- Backups are recovery copies, not archives: deleted data ages out with the backup/PITR
  window. Restore only into an isolated, access-restricted environment; reapply exceptional
  deletions, re-run the lifecycle preview, and verify holds/counts/audit continuity before
  returning a restore to service.

**Activation gates** — the lifecycle migrations deliberately schedule nothing. Supabase Cron
may call `portal_run_data_lifecycle('system@westchasegi.com', now())` hourly only after all
of these are recorded: (1) FDHS privacy/records authority confirms classification and the
authoritative handoff destination; (2) practice-controlled Supabase custody, org MFA,
plan/HIPAA add-on, BAA, SSL/network controls, logging, and recovery posture verified;
(3) forward migration, boundaries, holds, repeated runs, and exact rollback pass in
disposable Supabase; (4) a count-only preflight finds zero requests over the new caps —
never truncate patient-supplied data mid-migration; (5) development passes the same preview
and verification first; (6) the first production count-only preview is reviewed without
patient content and explicitly approved.

## 10. Interacting systems and custody

- **GitHub (clinic-owned).** The clinic-controlled personal account
  `FDHS-Westchase-Gastroenterology` owns the repository; ASTXRTYS holds Write access (Admin
  only for a concrete settings task, then back to Write). The owner is deliberately a
  personal account, not an organization — it supports strict branch protection and the Vercel
  Hobby connection without an organization plan. `main` protection requires current-branch
  `quality`, `react-doctor`, and `Vercel` statuses plus resolved conversations; force pushes
  and deletion are blocked.
- **Vercel (clinic-owned).** Hobby project `westchase-gi` serves the canonical apex;
  `westchase-gi.vercel.app` remains an attached alias. Hobby could not relink a repository
  owned by a different GitHub account, so the working path was a fresh clinic-owned project
  import, environment/alias migration, and deletion of the consultant-owned project. The
  portal displays hosting custody as a static fact and never calls Vercel.
- **GitHub App `wgi-portal`.** Registered on the clinic account with Repository
  Administration read/write + Metadata read, no webhook. The provider mints short-lived
  installation tokens at request time; every token is pinned to the numeric owner and
  repository IDs; the app exposes only invite, cancel invitation, and revoke. The three
  `PORTAL_GITHUB_APP_*` variables exist **only** in the Vercel Production environment —
  mutable Preview code must not inherit an Administration-capable key. Never use a personal
  access token, never call GitHub from a client component, never log JWTs/tokens/env values,
  and remember a code revert is not a privilege rollback (an approved Administration grant
  survives until the owner reduces it).
- **Supabase (custody gap).** Both projects live in a clinic-branded organization whose sole
  member/owner is Jason's non-clinic account (MFA off; no practice member). A dedicated
  project organization and the queue's system-of-record role are not clinic account custody.
  Transfer both projects to a practice-owned organization at handoff (Supabase project
  transfer — no data migration). Until then: never delete or pause either project.
- **Resend (custody gap).** The `westchasegi.com` sending domain and Production `RESEND_FROM`
  are configured, but account/team custody is not evidenced. Record the custodian without
  copying credentials into the repository. Supabase Auth's hosted SMTP sender is a separate
  configuration tracked with the remaining acceptance items in issue #24.
- **Porkbun.** Registrar and DNS since the 2026-07-18 cutover; apex is canonical, `www`
  redirects, TLS live.
- **External patient services.** The EN/ES Hushforms packet (new-patient forms) and the
  healow patient portal are external and linked, not operated here. Review destinations live
  in `src/lib/review-targets.json`. Map embeds send no referrer. Only ship URLs verified
  live; unconfirmed links stay out (AGENTS.md rule 7).

Two owner-only defense-in-depth tasks remain open (not portal-readiness gates): enable 2FA on
the clinic GitHub account, and narrow the App installation from "all repositories" to only
this repository.

## 11. Environments and configuration

| Variable | Scope |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (`_ANON_KEY` alias) | Browser-safe Supabase config (RLS enforced) |
| `SUPABASE_SERVICE_ROLE_KEY` | Temporary server-only compatibility credential for privileged data + Auth Admin; never `NEXT_PUBLIC_*`, never in client bundles |
| `SUPABASE_PROJECT_REF` / `SUPABASE_DB_PASSWORD` | CLI/migration access for the default (development) project |
| `PLAYWRIGHT_ALLOWED_SUPABASE_PROJECT_REF` | Exact development-project allowlist for destructive Playwright runs; `local` only with a loopback disposable stack |
| `SUPABASE_*_PROD` family | Same, for the production project (migrations + verify scripts); the E2E guard rejects its URL and reference |
| `RESEND_API_KEY` / `RESEND_FROM` | Production email adapter + sender; deliberately absent from Preview |
| `PORTAL_BASE_URL` | Absolute base URL in notification links |
| `PORTAL_PREVIEW_USERNAME` / `PORTAL_PREVIEW_PASSWORD` | Shared branch-Preview portal alias; Preview only |
| `PORTAL_GITHUB_APP_ID` / `PORTAL_GITHUB_APP_INSTALLATION_ID` / `PORTAL_GITHUB_APP_PRIVATE_KEY` | GitHub App credentials; **Production only** |
| `PORTAL_SEED_ADMIN_EMAIL` / `PORTAL_SEED_ADMIN_PASSWORD` | Seeded development admin; E2E + Preview review identity; never Production |
| `PORTAL_PROD_ADMIN_EMAIL` / `PORTAL_PROD_ADMIN_PASSWORD` | Operator-only production activation/verification identity; never in Vercel, never read by Playwright, never falls back to the dev seed |

The service-role JWT is a temporary bridge: the configured opaque secrets reached data APIs
but failed hosted Auth Admin calls. Keep it server-only until the create/delete, invite,
resend, recovery, deactivate, and cleanup canaries pass in both projects and the Vercel
Production environment is verified. The Supabase management access token used for
provisioning is personal, short-lived, and never a runtime dependency.

## 12. Testing architecture

| Layer | Command | Credentials |
|---|---|---|
| Portal unit tests | `npm run test:unit` (`node --test src/lib/portal/*.test.mjs`) | None |
| Target-guard matrix | `npm run test:e2e-guard` | None |
| Lint / build | `npm run lint` / `npm run build` (placeholder Supabase values) | None |
| Public smoke | `PLAYWRIGHT_PUBLIC_SMOKE=1 npx playwright test e2e/smoke.spec.ts --project=chromium` | None |
| Full E2E | `npx playwright test` (boots own server on :3100) | Development Supabase via `.env.local` |
| Schema/RLS verifier | `node scripts/verify-schema.mjs --target dev\|prod` | Privileged |
| Secret sweep | `node scripts/verify-no-secrets.mjs` | None |
| Flyer verifier | `node scripts/verify-review-flyers.mjs` | None |
| Dependency contract | `e2e/supabase-dependency-contract.spec.ts` in CI (disposable Docker Supabase; no hosted secrets) | CI only |

The E2E guard (`e2e/target-guard.ts`) refuses to run when `SUPABASE_PROJECT_REF` does not
exactly match `PLAYWRIGHT_ALLOWED_SUPABASE_PROJECT_REF`, requires the URL to encode that same
hosted reference (or the explicit `local` loopback sentinel), and rejects the Production
reference outright before the first database call. Specs toggle notification recipients off
so no real email sends, and credential-bearing runs retain no traces, video, or HTML report.
The committed Playwright config uses **one worker** because the shared development Auth
project rate-limits concurrent sign-ins; do not override that for login-heavy specs.
`verify-schema.mjs` creates and deletes a temporary request — running it against Production
is an authorized maintenance action, not a read-only inspection, and requires the
`PORTAL_PROD_ADMIN_*` identity.

The checked-in [`ui-reference/`](ui-reference/README.md) atlas is the visual baseline for
frontend work; `scripts/capture-ui-reference.mjs` refreshes it (live public site by default;
local/Preview origin for a change under review; portal mode uses the seeded Development or
Preview identity, redacts in-browser, and never runs against Production).

## 13. CI/CD and release shape

- `.github/workflows/ci.yml` — the `quality` job: dependency-policy self-test, e2e-guard,
  unit tests, lint, placeholder build, public smoke. Exactly the credential-free set in
  `CONTRIBUTING.md`.
- `react-doctor.yml` — advisory execution signal; a green check proves the scan ran, not a
  clean 100. Branch protection requires the status; inspect the report.
- `supabase-dependency-integration.yml` — the disposable-stack contract job for
  package-changing PRs; runs on the exact head even though it is not a repository-setting
  requirement; receives no hosted Supabase/Vercel/repository secrets and never touches
  Development or Production.
- `dependabot-automerge.yml` + `dependabot-codex-review.yml` — the guarded dependency lane:
  deterministic gates are authoritative; the read-only Codex review can veto but never
  overrides; the controller merges at most one verified, manifest-only PR at the exact
  reviewed SHA, then pauses for post-merge CI, React Doctor, Vercel Production, and live
  smoke. Executable policy: `.github/scripts/dependency-automation.cjs`; SOP:
  `.github/codex/dependabot-sop-and-examples.md`.
- `production-verification.yml` — post-merge exact-commit production verification against the
  canonical site.
- `main` **is** production: merge → required checks → automatic Vercel deploy → production
  verification. Database changes promote separately (§5).

## 14. Where logic lives

Change-type → files. Verification for each area is mapped in `CONTRIBUTING.md` §What to run.

- **Patient-facing copy (any locale):** `src/lib/dictionaries/en.ts` then the same keys in
  `es/vi/ko/ar`; page facts in `site.ts`, `services.ts`, `resources.ts`, `testimonials.ts`;
  rendering in `src/app/[locale]/**/page.tsx` and `src/components/`. Portal strings stay
  inline in `src/app/admin/` (English-only).
- **A provider or their credentials:** `src/lib/providers.ts` (AGENTS.md rule 1 first),
  `src/lib/review-targets.json`, headshots in `public/images/staff/`,
  `src/app/[locale]/physicians/page.tsx`, `meta.physicians` in all five dictionaries.
- **A patient document slot:** `src/lib/documents.ts` + file in `public/documents/`;
  `DocumentList.tsx`; `topicForDocument` / `prepForDocument` linkages in the content indexes.
- **Procedure-prep content:** the handout module in `src/lib/content/preps/` + its
  `index.ts`; matching `docId`; `procedure-prep/[slug]/page.tsx`; `PrepBody.tsx`;
  `src/app/sitemap.ts`; legacy redirects in `next.config.ts`.
- **A blog post:** `src/lib/content/blog/batch{1,2,3}.ts`; `sitemap.ts`; `next.config.ts`
  redirects keyed off `legacyPath`.
- **A patient-education topic:** `src/lib/content/education/{procedures,conditions-a,conditions-b}.ts`;
  `relatedDocId` linkage; `sitemap.ts`; education redirects.
- **Appointment form / API contract:** `contracts.ts` (`requestInputSchema`,
  `REQUEST_FIELD_LIMITS`, `IntakeResponse`) → `AppointmentForm.tsx` →
  `api/requests/route.ts` + `api/requests/form/route.ts`; `appointment.form` strings in all
  dictionaries; column mapping in `intake.ts` + migrations.
- **Intake persistence / throttling / receipt:** `intake.ts`; `INTAKE_RATE_LIMIT` and
  `receiptPath` in `contracts.ts`; `intake-notification.ts`; the rate-limit RPC migration;
  `appointment/received/page.tsx`.
- **Patient-site telemetry:** `src/lib/telemetry.ts` (shared contract) →
  `src/lib/portal/telemetry.ts` → `api/telemetry/route.ts`; analytics migration +
  `portal_record_analytics_event`; read path `supabase/snippets/analytics-daily-rollup.sql`.
- **A portal page or route:** the route under `src/app/admin/` with `requireRole` first;
  `portal-nav.tsx` for permanent nav (occasional tasks are reached from Home/Settings);
  the route's `actions.ts`; the matcher + public-path allowlist in `src/proxy.ts`.
- **Portal authz / roles / sessions:** `auth.ts`; session plumbing in `server.ts` and
  `proxy.ts`; `StaffRole` / `AUDIT_ACTIONS` in `contracts.ts`; auth entry routes;
  `staff_profiles` in migrations.
- **A table, column, RLS policy, or RPC:** new timestamped migration + rollback sibling;
  assertions in `scripts/verify-schema.mjs`; `supabase/seed.sql` / `scripts/seed-portal.mjs`
  if fixtures change; the reading code in `src/lib/portal/`.
- **Notification email:** `intake-notification.ts` (appointment ping),
  `management-email.ts` (staff/recipient mail), `email-provider.ts` (transport).
- **Website surface / GitHub App:** `src/app/admin/(portal)/settings/software/` and
  `integrations.ts`. Clinic-owned GitHub App only; never a PAT; never client-side; never
  Vercel.
- **SEO / canonical / sitemap / redirects:** `metadata.ts`, `site.ts`, `sitemap.ts`,
  `robots.ts`, `next.config.ts`. Canonical origin is the apex; locale routing lives in
  `proxy.ts`.
- **Design tokens / shared UI:** `src/app/globals.css` (tokens, component classes),
  `fonts.ts`; refresh `ui-reference/` images for covered surfaces. Use the CSS variables,
  not ad-hoc colors; `:lang()` blocks remap fonts for VI/KO/AR; source-mirror graphics stay
  byte-exact.
- **Proxy behavior (locale routing, scrubbing, gating):** `src/proxy.ts`; the matcher is an
  explicit list.
- **CI / dependency automation:** `.github/workflows/`,
  `.github/scripts/dependency-automation.cjs` — executable policy and its test change
  together; prose never widens the provenance or manifest-only boundary.
