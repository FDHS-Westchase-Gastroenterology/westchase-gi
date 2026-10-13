# Supabase and Vercel dependency map

Everything the app relies on Supabase or Vercel for, so the AWS side can be built with nothing
left to discover. INIT-1 step 1 ([`INIT-1-aws-migration.md`](../initiatives/INIT-1-aws-migration.md)).

Taken on 2026-10-13 from PR #224 (`portal/appointment-workflow-experience` at `cc46e59a`),
plus read-only catalog queries against the PR #224 Preview database and Production. Counts are
of that tree; re-grep before relying on an exact number.

**Replaces with** names the AWS piece INIT-1 "Already decided" settles on. A dash means INIT-1
says nothing and the builder picks. Where INIT-1 was silent on something that changes the plan,
the default this map sets is in [Settled defaults](#settled-defaults).

**Removal deferred** marks billing and Vercel analytics. They are going away, but not in this
migration step; they are listed so nobody rebuilds them on AWS by accident.

## At a glance: what has to exist on AWS

| # | Capability | Today | Replaces with |
| --- | --- | --- | --- |
| 1 | Postgres 17 with `btree_gist`, `pg_trgm`, `unaccent`, `pgcrypto` | Supabase Postgres 17.6 | RDS for PostgreSQL |
| 2 | The roles, `auth` schema and default privileges migrations assume | Supabase platform | Own roles (migration owner, app role, read-only reporting) |
| 3 | A migration ledger and a runner | `supabase_migrations.schema_migrations`, Supabase GitHub integration | Drizzle (drizzle-kit), SQL kept as custom migrations, pipeline step |
| 4 | Data access from the server | supabase-js over PostgREST (`.rpc`, `.from`) | Drizzle |
| 5 | Staff sign-in, invites, password reset, admin user management | Supabase Auth | Cognito, with MFA |
| 6 | Session check on every `/admin` request | `@supabase/ssr` cookies in `src/proxy.ts` | Cognito session |
| 7 | Server secrets | Vercel env store | Secrets Manager |
| 8 | Several HMAC secrets that today *are* the Supabase service-role key | `SUPABASE_SERVICE_ROLE_KEY` | Dedicated secrets ([§4](#4-environment-and-secrets)) |
| 9 | Password-reset email | Supabase Auth SMTP, `supabase/templates/recovery.html` | Cognito custom email sender Lambda → Resend |
| 10 | App email | Resend | Resend (no PHI) |
| 11 | Hosting the Next.js app | Vercel | ECS Fargate behind a load balancer, WAF in front |
| 12 | Real client IP for rate limits | `x-vercel-forwarded-for` | Load balancer header, read safely ([§6](#6-hosting-and-runtime-vercel)) |
| 13 | Per-PR previews with their own database | Supabase Branching + Vercel Preview | ≤2 previews on staging's load balancer and DB server |
| 14 | CI checks and deploy gates | `Supabase Preview`, `supabase-integration`, `Vercel` status | GitHub Actions with OIDC |
| 15 | DNS | Porkbun | Route 53 |
| 16 | The QR-code domain on printed flyers | `westchase-gi.vercel.app` | Vercel project kept as a redirect only ([Settled defaults](#settled-defaults)) |
| 17 | The data-retention job | Not running anywhere | EventBridge Scheduler → one-off ECS task, created disabled ([Settled defaults](#settled-defaults)) |

Confirmed not used, so nothing to build: Supabase Storage (0 buckets in Production and
Preview), Realtime (the `supabase_realtime` publication has 0 tables), Edge Functions (no
`supabase/functions/`), pg_cron, pg_net, database webhooks, Vault (0 secrets), auth triggers
or hooks, GraphQL, a browser-side Supabase client, Vercel cron, Vercel Edge runtime,
`vercel.json`.

## Production is 20 migrations behind

Production's ledger holds 20 versions, `20260713074105` to `20260729172311`, with 6 tables and
21 functions in `public`. `main` carries 21 migrations; `20260802005123_atomic_notification_recipient_mutations`
is on `main` but not applied (the app tolerates it: `src/lib/portal/recipient-compatibility.ts`).
PR #224 carries 55. Production also lacks `btree_gist`, `pg_trgm` and `unaccent`, which only
the later migrations create.

The cut-over copies Production into an RDS schema built from all 55, so Production is promoted
to PR #224's migrations through the usual release before the cut-over window, and the copy is
like-for-like ([Settled defaults](#settled-defaults)).

## 1. Database

### What Supabase provides before the first migration

The migrations assume these exist. [`supabase-platform-shim.sql`](supabase-platform-shim.sql) is
the proven minimum that lets all 55 apply on plain Postgres 17
([migration-order.md](migration-order.md)).

| Piece | Where it is assumed | Replaces with |
| --- | --- | --- |
| Roles `anon`, `authenticated`, `service_role` (and `authenticator`) | Grants and revokes in 43 migrations: `anon` 117 mentions, `authenticated` 129, `service_role` 131; 25 more in rollbacks | Migration owner, least-privilege app role, read-only reporting role (INIT-1). Every grant is rewritten. |
| `auth.users` table | `staff_profiles.user_id ... references auth.users(id) on delete cascade` (`20260713074105_portal_schema.sql:64`) | A local user table keyed by the Cognito `sub`, or drop the FK |
| `auth.jwt()`, `auth.uid()` | 10 RLS policies in the first two migrations. All 10 are dropped by `20260714224219_close_portal_data_api_and_atomic_audits.sql`, so none is live | Nothing; the history only needs them to exist while replaying |
| `extensions` schema with `pgcrypto`, `uuid-ossp` | `extensions.digest(...)` in `20260817153511`; no migration creates pgcrypto | `create extension pgcrypto` in the first custom migration |
| `btree_gist`, `pg_trgm`, `unaccent` | Created `with schema extensions`; used as `extensions.gist_uuid_ops` (the double-booking exclusion constraint), `extensions.gin_trgm_ops`, `extensions.unaccent` | Same extensions on RDS (all three are supported) |
| `search_path` including `extensions` | `supabase/config.toml` `extra_search_path` | Set on the database or role |
| Default privileges on `public` | Platform-set `ALTER DEFAULT PRIVILEGES FOR ROLE postgres/supabase_admin` | Explicit grants in migrations |
| `private` schema (not exposed) | `private.intake_rate_limits`, `private.analytics_daily`, `private.set_updated_at` | Kept as is; created by the migrations |

### What the schema contains

- 55 migrations, 35 tables and 84 functions in `public` (89 `portal_*` functions are
  created over the history; INIT-1's "126" counts redefinitions). Every function is
  `security invoker` with `set search_path`; none is `security definer`.
- RLS is enabled on every table with zero policies, so all reads and writes go through
  `service_role` today. The app role on RDS takes that place.
- `notify pgrst, 'reload schema'` appears in 17 migrations and 16 rollbacks. It reloads
  PostgREST's cache and is a harmless no-op on RDS once PostgREST is gone.
- 42 rollback files in `supabase/rollbacks/` (convention since `20260725170000`).
- `supabase/seed.sql`: fictional `requests` and `request_events` rows only.

### Ledger and migration runner

| Piece | Where | Replaces with |
| --- | --- | --- |
| `supabase_migrations.schema_migrations` | Written by Supabase; read by `scripts/verify-migration-lineage.mjs` | Drizzle's migrations table |
| Applying migrations to Preview | Supabase GitHub integration on each push | Migration step in the pipeline that stops on failure |
| Applying migrations to Production | By hand after a separate decision, then `verify-schema.mjs --target prod` (CONTRIBUTING.md "Shipping to production") | Pipeline step behind the production approval |
| Direct SQL from scripts and tests | `supabase db query` CLI with `POSTGRES_URL` or `--local`; `scripts/branch-database.mjs` accepts only `*.supabase.co` / `*.pooler.supabase.com` hosts | `psql` or Drizzle against RDS |
| Production schema checks | Supabase Management API `POST /v1/projects/<ref>/database/query` in `scripts/verify-schema.mjs` | Direct connection from a runner inside the VPC |

## 2. Data access

All in the server; there is no browser Supabase client.

| Piece | Where | Replaces with |
| --- | --- | --- |
| Client construction | `src/lib/portal/server.ts`: `serverClient()` (cookie-bound, publishable key, 12 call sites) and `serviceClient()` (service-role key, 67 call sites) | Drizzle client with the app role |
| `.rpc()` | 46 calls in 16 files, 50 distinct functions (41 literal names, 9 chosen at runtime in `scheduling/service.ts:104`, `:318` and `release-briefing.ts:53`) | Drizzle `sql` calls to the same functions |
| `.from()` | 58 calls on 9 tables: `staff_profiles` 15, `notification_recipients` 12, `requests` 9, `audit_log` 7, `request_events` 5, `request_transitions` 4, `notification_outbox` 3, `portal_release_states` 2, `request_command_receipts` 1; plus the embedded `staff_tours` read in `auth.ts` | Drizzle queries |
| Importers | 23 files in `src` (`src/proxy.ts`, 3 route files, 19 under `src/lib/portal/`) | — |
| PostgREST behaviours the code relies on | `.single()` 6, `.maybeSingle()` 18, `.abortSignal()` 31; error codes `PGRST202` (`recipient-rpc.ts:28`) and `PGRST204` (`audit.ts:25`, with a legacy fallback) | Equivalent handling on the driver's errors |
| Postgres error codes | `23505`, `P0002`, `22P02`, `22023` in `requests/new/actions.ts`, `management.ts`, `recipient-rpc.ts`, `recipient-compatibility.ts` | Unchanged; they are Postgres codes, read from the driver instead of PostgREST |
| Packages | `@supabase/ssr` 0.12.7, `@supabase/supabase-js` 2.117.2 | Removed |

## 3. Staff sign-in

| Piece | Where | Replaces with |
| --- | --- | --- |
| Password sign-in, sign-out | `signInWithPassword`, `signOut({scope:"local"})` in `src/app/admin/actions.ts` | Cognito |
| Set or change password | `updateUser({password})` in `actions.ts:158` | Cognito |
| Password reset request | `resetPasswordForEmail(email, {redirectTo: /admin/auth/confirm})` in `actions.ts:313` | Cognito forgot-password |
| Link confirmation | `verifyOtp({token_hash, type})` in `actions.ts:350`, `:468`; pages under `src/app/admin/auth/confirm/` read `token_hash` from the URL fragment | Cognito confirmation codes or links |
| PKCE callback | `exchangeCodeForSession` in `src/app/admin/auth/callback/route.ts:32` | Cognito, if hosted UI is used; otherwise removed |
| Session check on each request | `getClaims()` in `src/proxy.ts:162`; public paths `/admin/login`, `/admin/forgot-password`, `/admin/auth/confirm`, `/admin/auth/callback` and review-flyer assets; fails closed | Cognito token check in the proxy |
| Staff identity read | `getUser` in `src/lib/portal/auth.ts:168`; authorization comes from `staff_profiles`, not the JWT | Same lookup keyed by Cognito `sub` |
| Invites | `admin.createUser` + `admin.generateLink({type:"invite"})` in `src/lib/portal/management.ts:496`, `:510`; the link is mailed through Resend, not Supabase | Cognito `AdminCreateUser` with the email sent through Resend |
| Deactivation | `admin.updateUserById(..., {ban_duration:"876000h"})` in `management.ts:166`, `:745` | Cognito `AdminDisableUser` plus global sign-out |
| Role in `app_metadata` | `management.ts:499`, `:814`–`:849` | Cognito group or custom attribute |
| Delete, look up, list | `admin.deleteUser` (`:174`), `admin.getUserById` (`:587`, `:808`), `admin.listUsers` (`staff-identity.ts:69`); error codes `email_exists`, `user_already_exists` (`:140`) | Cognito admin APIs |
| Password-flow cookie `wgi-portal-password-flow` | `auth.ts:88`–`96`, HMAC-signed with the service-role key | Kept, with its own secret |
| Recovery email template | `supabase/templates/recovery.html` | Cognito custom email sender Lambda → Resend |
| Local Auth settings | `supabase/config.toml` `[auth]`: JWT 3600 s, refresh rotation, signup off, 12-character passwords, OTP 3600 s, 60 s resend, rate limits | Cognito pool settings; INIT-1 sets 8 h idle and 24 h absolute sessions, MFA, lockout |
| Hosted Auth settings (dashboard only) | Site URL, redirect allowlist, recovery template, OTP expiry, resend cooldown, custom SMTP, signup off, per environment (CONTRIBUTING.md "Shipping to production" item 5) | Cognito pool settings in Terraform |
| Preview sign-in alias | `PORTAL_PREVIEW_USERNAME`/`PASSWORD` mapped to the seed admin when `VERCEL_ENV !== "production"` (`actions.ts:72`, `login/page.tsx:43`) | Preset developer sign-in in non-production only, behind an explicit flag (INIT-1) |
| Users to carry over | 10 rows in Production `auth.users` | Recreated in Cognito; staff set a new password and enrol MFA (INIT-1) |

The SMTP provider behind Supabase's recovery email is a dashboard setting that is not in the
repository; check it in Supabase → Authentication → Emails before the Cognito sender is built.

## 4. Environment and secrets

Today these live in the Vercel environment store (Production and Preview) and `.env.local`.

| Variable | Read by | Replaces with |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `server.ts`, `proxy.ts`, preview route; the only `NEXT_PUBLIC_*` variables | Removed |
| `SUPABASE_SERVICE_ROLE_KEY` | `server.ts` and as an HMAC key (below) | Removed; database credentials for the app role from Secrets Manager |
| `SUPABASE_PROJECT_REF`, `SUPABASE_BRANCH_PROJECT_REF`, `SUPABASE_PREVIEW_BRANCH` | `/api/preview-environment` | Removed with that route |
| `WORKFLOW_COMMAND_HMAC_KEY` | `patients/commands.ts:21`, `scheduling/service.ts:59`, `clinical/service.ts:29`, `billing/service.ts:35`, `workflow/commands.ts:157`; **falls back to the service-role key when unset** | Secrets Manager, required |
| `RESEND_API_KEY`, `RESEND_FROM` | `email-provider.ts` | Secrets Manager (INIT-1) |
| `PORTAL_BASE_URL` | Redirect and invite URLs | Task environment |
| `PORTAL_GITHUB_APP_ID`, `_INSTALLATION_ID`, `_PRIVATE_KEY` | `src/lib/portal/integrations.ts` | Secrets Manager |
| `PORTAL_PREVIEW_USERNAME`/`PASSWORD`, `PORTAL_SEED_ADMIN_*`, `PORTAL_PROD_ADMIN_*` | Preview alias, seed and verification scripts, CI | Non-production secrets only |
| `VERCEL_ENV`, `VERCEL_GIT_COMMIT_SHA` | Injected by Vercel; read in `actions.ts`, `login/page.tsx`, `/api/preview-environment` | An explicit environment flag and the image's commit SHA |
| Script/CI-only: `SUPABASE_URL`, `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`, `SUPABASE_SECRET_KEY`, `POSTGRES_URL`, `POSTGRES_URL_NON_POOLING`, `SUPABASE_DISPOSABLE_WORKDIR`, `PLAYWRIGHT_ALLOWED_SUPABASE_PROJECT_REF`, the `*_PROD` family, `SUPABASE_DEV_*`, `DEV_SEED_ALLOWED_PROJECT_REF` | `scripts/`, `e2e/`, workflows | Database URLs for each environment; the guard variables are rewritten for RDS hosts |

**The service-role key doubles as four HMAC secrets.** Besides opening the database, it signs
the password-flow cookie (`auth.ts:91`), hashes client IPs for intake rate limits
(`intake.ts:157`) and telemetry (`telemetry.ts:37`), and keys the test-send rate limit
(`management.ts:363`). It is also the fallback for `WORKFLOW_COMMAND_HMAC_KEY`. The key
disappears on AWS, so each of these needs its own secret. Changing the key resets in-flight
password flows and rate-limit buckets, which is harmless at cut-over.

## 5. Email

| Piece | Where | Replaces with |
| --- | --- | --- |
| New-request alert and its test variant | `intake.ts:236`, `intake-notification.ts`; `management.ts:432` | Resend (INIT-1: no PHI) |
| Recipient confirmation | `management.ts:265` | Resend |
| Staff invite | `management.ts:127` via `management-email.ts`; link built from Supabase's `hashed_token` | Resend, with a Cognito-issued link or temporary password |
| Password reset | Supabase Auth SMTP ([§3](#3-staff-sign-in)) | Cognito custom email sender Lambda → Resend |
| Delivery | Synchronous in the request; `notification_outbox` rows marked `delivered` or `failed` with `attempts: 1`; no retry worker; undelivered rows shown on the admin home page | Unchanged; nothing to schedule |

## 6. Hosting and runtime (Vercel)

| Piece | Where | Replaces with |
| --- | --- | --- |
| The app | Vercel project, Node runtime (`runtime = "nodejs"` on 5 routes; no Edge) | ECS Fargate behind a load balancer, WAF in front |
| Build output | `next.config.ts` has no `output: "standalone"`; `distDir` from `NEXT_DIST_DIR` | Container image; `standalone` output is the usual route |
| Files the server reads at runtime | `outputFileTracingIncludes` adds `./private/review-flyers/**/*` for the review-flyer routes | Copied into the image |
| Image optimisation | `next/image` with the default loader in 12 files; no `images` config | Next's built-in optimiser in the container (needs `sharp`) |
| Fonts | `next/font/google` in `src/lib/fonts.ts`, `portal-fonts.ts`, fetched at build time | The image build needs outbound network, or self-host the fonts |
| Client IP | `x-vercel-forwarded-for` then `x-forwarded-for`, taking the **first** entry (`intake.ts:150`, `telemetry.ts:28`) | The load balancer appends to `X-Forwarded-For`, so the first entry is whatever the client sent; read the entry the load balancer added (or the CloudFront viewer-address header), or rate limits can be dodged |
| Response headers | `headers()` in `next.config.ts` sends `Strict-Transport-Security: max-age=63072000; includeSubDomains`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: DENY`, `Content-Security-Policy: frame-ancestors 'none'` and a `Permissions-Policy` denying camera, microphone and geolocation; `src/proxy.ts` then sets `Cache-Control: private, no-store` and `Referrer-Policy: no-referrer` on admin responses | Unchanged: Next sends them from the container too, except on the `next.config.ts` redirects, which carry none of them on `next start`; the load balancer inserts HSTS and `nosniff` on those. INIT-1 still adds a full Content-Security-Policy |
| Redirects, `revalidatePath` (19 calls), `generateStaticParams`, `robots.ts`, `sitemap.ts` | Standard Next.js; `site.url` is `https://westchasegi.com` | Work the same in a long-running container; the in-memory cache is per task |
| Preview attestation | `src/app/api/preview-environment/route.ts`: 404 unless `VERCEL_ENV === "preview"`; checks the Supabase ref, the client key and two columns; returns `{ok, projectRef, gitCommitSha, clientKeySafe, schemaCompatible}` for CI | Rebuilt for the new preview flow or removed |
| Vercel host on paper | `src/lib/review-targets.json`: the master review QR flyer points at `https://westchase-gi.vercel.app/review`; the PDFs and QR images under `private/review-flyers/` are hash-pinned (`scripts/verify-review-flyers.mjs`) | Vercel project kept as a redirect only ([Settled defaults](#settled-defaults)) |
| Other Vercel host references | `scripts/capture-ui-reference.mjs:44` (`*.vercel.app` preview detection); `e2e/portal/review-flyers.spec.ts:533` (forbids `wgi-review-qr.vercel.app` and `/storage/v1/`) | Updated |
| Staff-visible copy naming the providers | `src/lib/portal/website-custody.ts` ("Hosting = Vercel", links to the Vercel and Supabase dashboards, Porkbun, GitHub); asserted by `e2e/portal/website.spec.ts` | Rewritten for AWS |
| DNS | Porkbun | Route 53 (INIT-1) |
| **Vercel analytics** (removal deferred) | `@vercel/analytics`, `@vercel/speed-insights` in `package.json`; mounted at `src/app/[locale]/layout.tsx:1`–`2`, `:152`–`153`; patient site only | Not rebuilt |

## 7. Background and scheduled work

Nothing runs on a schedule in Supabase or Vercel today. What exists:

| Piece | Where | Replaces with |
| --- | --- | --- |
| Data retention | `portal_run_data_lifecycle(p_actor_email, p_now)` and `portal_preview_data_lifecycle(p_now)` (from `20260725170000`; windows of 1 hour, 180 days, 1 year, 6 years for audit). **Nothing calls it**: no pg_cron, Vercel cron or GitHub schedule. ARCHITECTURE.md describes "the request lifecycle scheduler"; AGENTS.md says scheduler activation needs separate explicit authorization | EventBridge Scheduler running a one-off ECS task, created disabled ([Settled defaults](#settled-defaults)) |
| Intake rate-limit cleanup | Inside the rate-limit RPC (`delete ... where expires_at <= p_now`) | Nothing to schedule |
| Analytics roll-up | Per request, `/api/telemetry` → `portal_record_analytics_event` upserts into `private.analytics_daily`. `supabase/snippets/analytics-daily-rollup.sql` is read-only reporting queries, not a job | Nothing to schedule |
| Dependabot auto-merge | `.github/workflows/dependabot-automerge.yml`, hourly cron in GitHub | Stays in GitHub; its required-check list changes ([§8](#8-previews-ci-and-deploys)) |

## 8. Previews, CI and deploys

| Piece | Where | Replaces with |
| --- | --- | --- |
| Per-PR database | Supabase Branching; a child Git branch inherits its integration branch's Preview database (PR #224 owns `gqzwcvwyhykscuidcmlh`) | One throwaway database per preview on staging's server, ≤2 at once, destroyed on merge or close (INIT-1) |
| Per-PR app | Vercel Preview deployment | Preview service on staging's load balancer |
| `Supabase Preview` check run | Posted by the Supabase GitHub app; `supabase-integration` waits for it | Removed |
| `Vercel` commit status | Posted by Vercel; required by branch protection and by `dependency-automation.cjs` | Removed |
| `supabase-integration` job | `.github/workflows/supabase-dependency-integration.yml` ("Supabase Branch Integration"): resolves the database-owning branch, runs `supabase branches get ... --output env` (CLI 2.113.0), waits for the `vercel[bot]` Preview deployment, checks `/api/preview-environment`, then `verify-migration-lineage`, `seed-portal --target branch`, `verify-schema --target branch`, `test:e2e:boundaries`, `test:e2e:portal` | Rewritten against the preview's RDS database and URL; INIT-1 adds a migration dry run, Terraform plan and vulnerability scan |
| `quality` job | `ci.yml`; builds with placeholder `NEXT_PUBLIC_SUPABASE_URL`, publishable and service keys | Placeholders change with the variables |
| `production` job | `production-verification.yml` → `dependency-automation.cjs` `verifyProduction`: waits for a GitHub deployment in environment "Production" and a successful `Vercel` status, then fetches `https://westchasegi.com/en` | Waits on the AWS deploy instead |
| Required checks | Branch protection (AGENTS.md): `quality`, `react-doctor`, `Vercel`, `supabase-integration`. `dependency-automation.cjs`: `PR_REQUIRED_CHECKS = ["quality","react-doctor","supabase-integration"]`, `PRODUCTION_REQUIRED_CHECKS = ["quality","react-doctor","production"]`, plus `Vercel` | Updated together with the workflows |
| Secrets and variables | `SUPABASE_ACCESS_TOKEN`, `PORTAL_PREVIEW_ADMIN_EMAIL`, `PORTAL_PREVIEW_ADMIN_PASSWORD`, `vars.SUPABASE_PROJECT_ID` | OIDC role; no long-lived keys (INIT-1) |
| Supabase "Deploy to production" switch | Kept off in the Supabase GitHub integration | Production approval in a protected GitHub environment (INIT-1) |

## 9. Scripts and tests

The existing end-to-end suite is INIT-1's regression contract, and most of it reaches the
database and Auth directly.

| Piece | Where | Replaces with |
| --- | --- | --- |
| Target guard | `e2e/harness/target-guard.ts` `assertSafeE2ETarget`: target host must be loopback or exactly `<ref>.supabase.co`, refuses the Production ref | Rewritten for RDS hosts, still refusing Production |
| Harness | `e2e/harness/env.ts` (`serviceDb()`, `publishableDb()`, `seedAdmin()`), `global-setup.ts` (Auth `listUsers` preflight, recipient snapshot), `global-teardown.ts` | Drizzle and Cognito equivalents |
| Specs | 65 e2e files use `serviceDb` or `publishableDb`; only `e2e/public/*` and `harness/assert.ts` are free of Supabase. Auth calls in e2e include `signUp`, `refreshSession`, `generateLink`, `createUser`, `deleteUser` | Updated |
| Direct SQL in tests | `e2e/boundaries/support.ts:190`–`230` (destructive SQL via `supabase db query`, recomputes the service-key HMAC to clear rate limits); `e2e/portal/telemetry.spec.ts:25`–`75` (reads `private.analytics_daily`) | `psql`/Drizzle against the preview database |
| Sign-in concurrency | `playwright.config.ts` runs `workers: 1` because hosted Auth rate-limits concurrent sign-ins | Revisit under Cognito |
| Seeding and verification | `scripts/seed-portal.mjs` (`/auth/v1/admin/users`, `/rest/v1/...`), `scripts/verify-schema.mjs` (2389 lines; Management API, `/rest/v1/`, `/auth/v1/token`), `scripts/verify-migration-lineage.mjs`, `scripts/branch-database.mjs` | Rewritten |
| Demo data | `npm run demo:data` (`scripts/demo-data/database.mjs`: Auth admin REST, `supabase db query` over the pooler); `dev:patients` (`dev-patients-app.mjs`, `dev-patients-store.mjs`) | Rewritten |
| Secret scan | `scripts/verify-no-secrets.mjs` (Supabase key names, `sbp_`, `sb_secret_`, `re_`) | Extended to AWS secret shapes |

## 10. Other third parties

Unchanged by the move unless noted: Resend; the GitHub App (`src/lib/portal/integrations.ts`,
used by `maintainers.ts`); Porkbun (registrar, and DNS until Route 53); Google Fonts at build
time; patient-facing links to eCW/healow, Hushforms, Google Maps and reviews, Facebook,
Healthgrades. No error tracking, product analytics, CAPTCHA or payment SDK is installed.

## 11. Documents to rewrite after the move

CONTRIBUTING.md (Preview Branch workflow, shipping to production, credential rotation,
password-recovery configuration), ARCHITECTURE.md (trust boundaries, hosting and linked
services, schema evolution, staff authentication, email), AGENTS.md (Supabase guidance and
dependency contract, tools, branch protection), README.md "Who owns what",
FRONTEND-HANDOFF.md, `test/README.md`, `ui-reference/README.md`, and
`.github/PULL_REQUEST_TEMPLATE.md`.

## 12. Removal deferred: billing and analytics

Listed so nobody rebuilds them on AWS. Leave them in place until their own removal.

**Billing.** `src/lib/portal/billing/` (`contracts`, `http`, `rows`, `service`),
`src/app/api/admin/billing/route.ts`, `e2e/boundaries/billing.spec.ts`,
`e2e/portal/billing.spec.ts`, `e2e/harness/billing.ts`; migration
`20260906231144_patient_billing_ledger.sql` (tables `patient_billing_accounts`,
`patient_billing_entries`, `patient_billing_receipts`; functions
`portal_execute_billing_command`, `portal_read_patient_billing`) and its rollback; demo-data
and `verify-schema.mjs` coverage. `src/lib/dictionaries/en.ts:339` "Insurance and Billing" is
patient-site copy, not the feature.

**Vercel analytics.** The two packages and the two mounts in `src/app/[locale]/layout.tsx`.

**First-party patient analytics** is separate from Vercel analytics and runs on our own
database: migration `20260728223000_add_patient_analytics_daily.sql` (`private.analytics_daily`,
`portal_record_analytics_event`), `/api/telemetry`, `src/lib/telemetry*.ts`,
`src/lib/portal/telemetry.ts`, the `<TelemetryReporter>` mount, emitters in
`AppointmentForm`, `DocumentList`, `LanguageChooser`, `NoticeBanner`, and
`e2e/portal/telemetry.spec.ts`. It carries over to RDS
([Settled defaults](#settled-defaults)). The staff release-briefing telemetry
(`20260729105056`, `portal_release_states`, `release-briefing.ts`) is a product feature and is
not analytics.

## Settled defaults

Where INIT-1 was silent, this map keeps today's behavior and takes the simplest route.

1. **Production catches up before the copy.** PR #224's migrations reach Production through the
   usual promotion (CONTRIBUTING.md "Shipping to production") before the cut-over window, so
   Production and RDS have the same 55-migration schema and the copy needs no reshaping.
2. **Migration file dates are fixed.** The 13 future-dated files carry their commit times
   ([migration-order.md](migration-order.md)).
3. **The printed review flyers keep working.** The Vercel project behind
   `westchase-gi.vercel.app` stays, with its deployment replaced by a redirect to
   `https://westchasegi.com/review`. It holds no app code and no patient data. The next flyer
   print uses the `westchasegi.com` address, and the project can go once no printed copy points
   at it.
4. **The data-retention job is built but off.** Terraform creates the EventBridge Scheduler
   schedule disabled; it starts when Jason authorizes scheduler activation, as AGENTS.md already
   requires.
5. **First-party patient analytics carries over.** INIT-1 removes Vercel analytics only;
   `/api/telemetry` and `private.analytics_daily` move with the rest of the database.
