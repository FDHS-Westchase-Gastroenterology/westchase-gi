# Portal operations guide

Day-to-day operations for the appointment-request pipeline and the staff
portal. Written for whoever maintains this repository; the portal's own
Help page covers the front-desk view of the same system.

## Running locally

```bash
npm install
cp .env.example .env.local     # fill in real values, names below
npx playwright install chromium
npm run dev                    # patient site + portal on :3000
npm run dev:mission            # the E2E stack's server on :3100
npx playwright test            # full E2E suite (boots :3100 itself)
```

`.env.local` points the DEFAULT environment at a **development** Supabase
project; production values live under the `_PROD`-suffixed names and in
the Vercel environment store. Never point local tests at production.

## Environment names

| Name | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (+ `_ANON_KEY` alias) | Browser-safe Supabase config (RLS enforced) |
| `SUPABASE_SERVICE_ROLE_KEY` | Temporary server-only compatibility credential for privileged data and Auth Admin; never `NEXT_PUBLIC_*`, never in client bundles |
| `SUPABASE_PROJECT_REF` / `SUPABASE_DB_PASSWORD` | CLI/migration access for the default (dev) project |
| `PLAYWRIGHT_ALLOWED_SUPABASE_PROJECT_REF` | Exact Development project allowlist for destructive Playwright runs; use `local` only with a loopback disposable stack |
| `SUPABASE_*_PROD` family | The same, for the production project (migrations + verify scripts); the E2E guard rejects its URL and reference |
| `RESEND_API_KEY` / `RESEND_FROM` | Current production email adapter + sender; deliberately absent from Preview |
| `PORTAL_BASE_URL` | Absolute base URL used in notification links |
| `PORTAL_PREVIEW_USERNAME` / `PORTAL_PREVIEW_PASSWORD` | Shared branch-Preview portal alias; Preview only, never Production |
| `PORTAL_GITHUB_APP_ID` / `PORTAL_GITHUB_APP_INSTALLATION_ID` | Server-only identifiers for the clinic-owned `wgi-portal` App |
| `PORTAL_GITHUB_APP_PRIVATE_KEY` | Server-only App private key; PEM encoded as base64 or escaped newlines |
| `PORTAL_SEED_ADMIN_EMAIL` / `PORTAL_SEED_ADMIN_PASSWORD` | Seeded admin on the Development project; used by E2E and as the underlying Preview review identity, never Production |
| `PORTAL_PROD_ADMIN_EMAIL` / `PORTAL_PROD_ADMIN_PASSWORD` | Operator-only Production activation/verification identity; never add to Vercel, never read by Playwright, and never falls back to the Development seed identity |

The service-role JWT is a temporary compatibility bridge. The configured opaque secrets could
reach ordinary data APIs but failed hosted Auth Admin calls, while the service-role JWT succeeded.
Keep the bridge server-only until create/delete, invite, resend, recovery, deactivate, and cleanup
canaries pass in both intended projects and the actual Vercel Production variables are verified.

## Rotating a credential

1. Generate the new value at the provider (Supabase project settings /
   Resend dashboard).
2. Update the Vercel environment for the affected targets:
   `printf '%s' "$NEW_VALUE" | vercel env add NAME production` (repeat for
   `preview` if applicable), then remove the stale entry with
   `vercel env rm`.
3. Update your local `.env.local`.
4. Redeploy (any push to the deployed branch) and spot-check: a test
   submission on a preview URL, and `scripts/verify-schema.mjs --target dev`.

For the GitHub App private key, generate the replacement in the clinic-owned
App settings, update Production, redeploy, prove the live GitHub status there,
and then revoke the old key. Keep verification that needs App credentials local
through the ignored credential store; do not make the Administration-capable
key available to Preview deployments. Never use a personal access token.

The Supabase management access token used for provisioning is personal,
short-lived, and is NOT a runtime dependency — the app never reads it.

## GitHub and Vercel custody

The clinic-controlled personal account `FDHS-Westchase-Gastroenterology`
owns the repository. ASTXRTYS has Write access for implementation work, not
ownership. The clinic-owned Vercel Hobby project is also named `westchase-gi`;
it replaced the former consultant-owned project after Hobby's cross-account
repository restriction prevented a relink. The production alias and
push-to-deploy path are verified. The site has been live at canonical
`https://westchasegi.com` since 2026-07-18, with DNS at Porkbun, `www`
redirecting to the apex, and `westchase-gi.vercel.app` still attached.

The `wgi-portal` GitHub App registration uses Repository Administration
read/write and Metadata read permissions. Website-page reads use Administration
read; each mutation mints a fresh Administration write token. Every token is
restricted to the numeric ID of `westchase-gi`, and the application exposes only
invite, cancel invitation, and revoke commands. Its JWT-to-installation-token
path was rehearsed successfully. Enabling two-factor authentication on the owner
account and narrowing the App installation to only this repository remain
owner-only defense-in-depth tasks, not portal-readiness gates; do not mark either
complete without owner verification. The portal shows the clinic-owned Vercel
project as a static custody fact and does not connect to or manage Vercel.

## Supabase custody

Both projects (production and development) live in a clinic-branded Supabase
organization provisioned for this application. As verified 2026-07-19, its sole
member and Owner is Jason's non-clinic account, that account has MFA off, and no
practice-controlled member exists. Do not conflate a dedicated project
organization—or the queue's role as the practice's system of record—with clinic
ownership of the Supabase account. Transfer both projects to a practice-owned
organization at handoff; Supabase supports **project transfer** between
organizations, so no data migration is required.

Until ownership is verified or transferred: never delete or pause either project;
schema changes go through committed migrations in `supabase/migrations/`
(`supabase link` + `supabase db push` per project, or the management API), applied
to development first and production only after verification. Record the owner,
transfer date, and a non-secret acceptance check when this closes.

## Current Production activation state (verified 2026-07-25)

GitHub issue [#24](https://github.com/FDHS-Westchase-Gastroenterology/westchase-gi/issues/24)
is the canonical remaining-acceptance tracker. Keep this section synchronized with that checklist.

- PR #72's behavior-bearing release `d318300` is deployed and independently accepted in
  Production, including the task-first portal, Website/maintainer controls, protected flyer
  printer, optional appointment email, first-login tour/Help flow, persistent public-site link,
  language chooser, and notification privacy refinement.
- Sanitized Production canaries passed staff role changes/deactivation and lockout; Auth Admin
  create/invite/resend/recovery/delete paths; request new → contacted → scheduled → explicitly
  classified closed, notes, filtered export, formula neutralization, optional-email-absent,
  legal-hold place/release, and unsigned-receipt rejection; Home, Requests, Settings, Website,
  Help, and admin/non-admin flyer authorization. Cleanup restored 21 requests / 3 closed with no
  synthetic request, profile, Auth, or actor-audit state retained.
- Remaining Production acceptance is notification-recipient add/confirm/pause/resume/remove with
  a clinic-approved inbox, clinic-inbox invitation/recovery delivery after hosted SMTP is fixed,
  and the throwaway GitHub maintainer invite/cancel/accept/revoke lifecycle.
- Development and Production are current through migration `20260725170000`; the retired
  registry tables/functions remain absent. Development passed the cap preflight, forward
  migration, transactional lifecycle smoke, portal request workflow, exact rollback,
  migration-ledger repair, and clean reapplication.
- Production received the same migrations schema-first on 2026-07-25 after a zero-violation cap
  preflight and a restore-readable temporary logical backup. Migration-ledger, constraint,
  RLS, privilege, and RPC assertions passed. Its first count-only lifecycle preview reported
  zero unconverted, converted, held, receipt-secret, rate-limit, or audit candidates and three
  deliberately unclassified legacy closures. No lifecycle run or Cron schedule was created.
- Production migration-ledger parity, catalog/RLS/ACL/RPC assertions, authenticated Data API
  denial, nullable-email insertion, atomic audit rollback, tour persistence/auditing, public-site
  locale negotiation, and portal-session continuity passed on `1124668`. The temporary request,
  staff profile, audit rows, and Auth identity used for acceptance were deleted. Review-flyer
  acceptance remains a separate checklist item in issue #24.
- The Resend domain and Production application `RESEND_FROM` are configured. Provider
  logs mark two non-owner/non-test recipient-confirmation messages delivered, but clinic
  ownership of those inboxes is not documented. Reconcile those recipients and run
  clinic-approved staff-invitation and appointment-notification canaries.
- Production Supabase Auth still uses the sandbox sender. Move its hosted SMTP sender
  off `@resend.dev` before the arbitrary-clinic-inbox password-reset canary; the prior
  owner-inbox reset receipt does not satisfy that gate.
- Use a controlled throwaway GitHub account to complete invite, cancel, accept as
  Write, and revoke, then verify the corresponding Activity-log entries.
- The former standalone flyer repository and Vercel project are retired after this repository's
  routes, protected assets, manifest, verifier, build, and live review hub were confirmed
  self-contained. Production admin access and protected downloads passed; staff and anonymous
  access failed closed. There is no separate rollback application.
- Owner 2FA and narrowing the GitHub App installation remain separate owner-only
  governance controls. They are open, but they do not withhold the current portal UI.

## Email-path inventory

The application owns one provider-neutral, text-only email capability. Resend
is the only production adapter today, isolated in
`src/lib/portal/email-provider.ts`; replacing it changes that file plus
operations configuration, not feature workflows.

| Path | Delivery owner |
|---|---|
| New appointment notification | Application email capability |
| Notification-recipient confirmation | Application email capability |
| Staff setup invitation | Application email capability |
| Password recovery | Supabase Auth hosted custom SMTP |

The three application-owned paths share an eight-second deadline, stable
idempotency keys, normalized failures, and logs that exclude recipients,
message text, bearer links, provider errors, and idempotency keys. Appointment
fan-out remains parallel and records one outcome per recipient. There are no
automatic request-path retries. A timeout is ambiguous because the provider
request may finish later; a deliberate retry can reuse the stable key within
the provider's retention window.

An `accepted` outcome means the configured provider returned a message ID. It
does not prove inbox delivery. The request queue remains authoritative.

Supabase Auth owns password-recovery generation, hosted template, rate limits,
and delivery through its custom SMTP settings. Those settings are project
configuration, not Postgres migrations, so development and production must be
kept in sync separately. Do not add an Auth Send Email Hook unless unified Auth
telemetry or provider selection becomes a concrete requirement.

For each hosted Supabase project, configure Resend SMTP, set the Auth site URL
to that environment's trusted portal origin, and allow the exact
`/admin/auth/confirm` redirect. Do not use a wildcard redirect. The recovery
template contract is committed in `supabase/templates/recovery.html`; its link
must preserve this shape:

```text
{{ .RedirectTo }}#token_hash={{ .TokenHash }}&type=recovery
```

The URL fragment keeps the bearer token out of HTTP requests and referrer
headers. The confirmation page removes it from the address bar before the user
presses Continue, and only that deliberate action consumes the one-time token.
Use the committed subject and template when configuring hosted Auth rather than
Supabase's default recovery link. Keep the Auth email rate limit high enough for
serial verification while retaining the provider's abuse controls.

After an Auth configuration change, verify all of the following without
printing or reading a live bearer link:

1. Request a reset for an active development staff account and confirm the
   expected subject reaches the approved test inbox.
2. Run `e2e/portal-auth.spec.ts` serially to prove invite and recovery links are
   single-use, role preserving, and unavailable to deactivated accounts.
3. Confirm an unknown address receives the same visible portal response as an
   active address.

Production's application-owned email path uses the verified `westchasegi.com`
sending domain through its configured `RESEND_FROM`. Provider logs mark two
non-owner/non-test recipient-confirmation messages delivered; that is real provider
evidence, but the record does not establish that clinic staff own or read those
inboxes. Reconcile the intended recipients and run clinic-approved staff-invitation
and appointment-notification canaries before handover.

Supabase Auth is a separate hosted SMTP path. Its Production sender is still the
sandbox `@resend.dev` identity, which permits only the Resend account owner's
address. Change that hosted sender to the approved clinic identity before an
arbitrary-clinic-inbox password-reset canary. Also record the Resend team/account
custodian without copying credentials into this repository; domain verification and
sender configuration do not themselves prove practice custody.

## Data export

- **CSV, self-serve:** the queue's Export CSV button (or
  `GET /admin/requests/export?status=...` authenticated) — the documented
  column set, filtered like the queue.
- **Full copy:** Supabase dashboard → Database → Backups when the selected
  plan provides them, or `pg_dump` with the database password for a complete
  portable dump. Backup availability and history are plan-dependent; they are
  not guaranteed on Free.
  The practice's data is standard Postgres — there is no lock-in.

## Patient-request data lifecycle

The balanced lifecycle was approved for isolated implementation on 2026-07-25.
Production activation still requires the approvals below. The portal is a
temporary appointment-intake and operations system, not a substitute for FDHS's
authoritative patient record. Patients are asked not to submit PHI, but names,
contact details, free-text reasons, and staff notes must be handled as potentially
sensitive.

| Data                                              | Retention                                                                                                   |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Legitimately open request                         | No automatic deletion                                                                                       |
| Closed request that did not become an appointment | 180 days after classified closure                                                                           |
| Closed request transferred to the FDHS record     | 12 months after verified handoff and classified closure                                                     |
| Request notes and notification/receipt events     | Follow the parent request and delete with it                                                                |
| Receipt token hash                                | Remove after one hour; the receipt is valid for only 15 minutes                                             |
| Expired intake rate-limit HMAC bucket             | Remove on the next hourly lifecycle run                                                                     |
| Audit rows                                        | Six years, unless a legal hold protects the related request                                                 |
| Recovery copies                                   | Target a 14-day backup/PITR window; actual availability must be verified against the clinic's Supabase plan |

Closing a request requires one explicit disposition:

- **Did not become an appointment** starts the 180-day clock.
- **Transferred to the FDHS record** confirms the handoff and starts the
  12-month clock.

Reopening a request clears its closure classification and clock. Closed rows
that existed before this policy remain unclassified and ineligible for
automatic deletion until staff review them; the migration never guesses their
disposition. The migration keeps the currently deployed status RPC
backward-compatible for a schema-first rollout: an old-app closure becomes
unclassified and cannot expire. Once the new application is live, its server
action requires the explicit classified-closure RPC.

### Archive, holds, and authorized deletion

There is no duplicate patient-data archive in Supabase. For converted
requests, the FDHS record is the authoritative destination. CSV exports are
not retained by the application; a downloaded export becomes a
clinic-controlled sensitive copy and follows clinic handling and disposal
rules.

A legal hold blocks both scheduled deletion and exceptional early deletion.
Only portal administrators can place or release a hold, each action requires a
short non-patient reason or case reference, and the change is audited. Routine
expiry is authorized by this approved policy. Exceptional early deletion has
no self-serve UI: a database operator may call
`portal_delete_request_early` only after receiving a non-PHI authorization
reference from the designated privacy/records custodian. The function refuses
held requests and atomically writes a minimized audit row before deleting the
request and its events.

Audit metadata may contain request UUIDs, staff identities, status changes,
dispositions, authorization references, and counts. It must not copy patient
names, contact details, intake messages, or staff-note text.

### Preview, activation, and restore

The migrations add lifecycle controls but deliberately do **not** schedule or
run deletion. Activation remains blocked until all of the following are
recorded:

1. FDHS's privacy/records authority confirms the portal's record
   classification and the authoritative handoff destination.
2. Practice-controlled Supabase custody, organization MFA, the appropriate
   plan/HIPAA add-on, BAA, SSL/network controls, logging, and recovery posture
   are verified.
3. The forward migration, lifecycle boundaries, holds, repeated runs, and
   exact rollback pass in disposable Supabase.
4. A count-only preflight finds zero existing requests over the new database
   caps (`name > 120`, `phone > 32`, `email > 254`). Stop on any nonzero count;
   never truncate patient-supplied data during migration.
5. Development receives the migration and passes the same preview and
   verification before Production is considered.
6. The first Production preview from
   `portal_preview_data_lifecycle(now())` is reviewed without patient content
   and explicitly approved.

After activation, Supabase Cron may call
`portal_run_data_lifecycle('system@westchasegi.com', now())` hourly. The
function is idempotent, removes expired receipt secrets and limiter buckets,
deletes only classified/non-held requests at their exact boundary, and ages
audit rows at six years. Record the Cron job name, schedule, last successful
run, and alert owner outside this repository.

Backups are recovery copies, not archives. Live deletion does not rewrite an
immutable snapshot; deleted data ages out with the configured backup/PITR
window. Restore only into an isolated, access-restricted environment. Before
returning a restore to service:

1. Reapply any exceptional deletion references kept in the clinic's external
   compliance record.
2. Preview and run the lifecycle at the current time.
3. Verify holds, candidate counts, application checks, and audit continuity.
4. Destroy the isolated copy if the restore is rejected.

The manual rollback is
`supabase/rollbacks/20260725170000_to_20260720102654.sql`. It refuses to drop
classified or held lifecycle state. If an approved hosted rollback is ever
performed, mark both versions reverted in the migration ledger before a later
push (`supabase migration repair --status reverted 20260725133049
20260725170000 --linked`). A rollback cannot restore rows already deleted;
restore those only from an approved recovery copy.

HIPAA does not impose one universal medical-record retention period; state
law and the record's classification govern. The Security Rule's six-year
documentation period is not a blanket six-year medical-record mandate. Policy
sources: [HHS retention FAQ](https://www.hhs.gov/hipaa/for-professionals/faq/580/does-hipaa-require-covered-entities-to-keep-medical-records-for-any-period/index.html),
[45 CFR 164.316](https://www.ecfr.gov/current/title-45/subtitle-A/subchapter-C/part-164/subpart-C/section-164.316),
[Florida Rule 64B8-10.002](https://flrules.org/gateway/RuleNo.asp?ID=64B8-10.002),
[Supabase backups](https://supabase.com/docs/guides/platform/backups), and
[Supabase HIPAA guidance](https://supabase.com/docs/guides/security/hipaa-compliance).

## Review-flyer printing

Any active staff member opens **Print review flyers** from the portal home page (it is also linked
from Settings → Website). The page supports one flyer at a time, all six flyers, and protected PDF,
SVG, and PNG downloads. Both the page and its asset route require an authenticated staff session
(`requireRole("staff")`); anonymous visitors get nothing.

The 18 approved binaries live in `private/review-flyers/`; `src/lib/review-targets.json` is the
single manifest for destinations, filenames, and pinned hashes. Never move these files to
`public/`, regenerate an approved PDF during a routine edit, or duplicate review destinations
outside the manifest. After any intentional flyer change, update the canonical files and hashes
together, then run:

```bash
node scripts/verify-review-flyers.mjs
```

The verifier proves all 18 hashes, decodes every PNG to its exact destination, and confirms each
PDF is one 612 × 792-point letter page.

## Notification recipients

Managed in the portal (Settings): admins add/remove addresses, any staff
member can pause/resume one. The intake pipeline reads the ACTIVE set at
submission time and records one `request_events` row per attempt with the
provider outcome. The Production application sender is configured on the verified
clinic domain. Two recipient-confirmation messages have provider `delivered` events,
but clinic ownership/read receipt is not recorded. Confirm the intended addresses and
run a clinic-approved appointment-notification canary before treating notifications
as fully accepted. This application path is separate from Supabase Auth's still-sandboxed
password-recovery sender.

## Incident basics

- **Form down / database unreachable:** patients see the truthful failure
  state with the office phone and text line — they are never shown a fake
  confirmation, so nothing is silently lost. Check Vercel status, then
  the Supabase project health in its dashboard.
- **Portal won't load:** verify the Vercel deployment is READY and the
  Supabase project is ACTIVE_HEALTHY. The patient site keeps working —
  the portal and site share infrastructure but fail independently.
- **Notifications not arriving:** the queue is the system of record —
  check requests there first. Then Settings → recipients (is the address
  active?), the `request_events` rows for the request (what did the
  provider say?), and the Resend dashboard.
- **GitHub shows Not configured:** confirm all three
  `PORTAL_GITHUB_APP_*` variables exist on that Vercel target and redeploy.
  Do not print their values while diagnosing. If it instead shows an upstream
  failure, check the App installation and least-privilege permissions in the
  clinic account.
- **A secret leaked somewhere:** rotate it (see above) — the repo's
  history is provably clean (`node scripts/verify-no-secrets.mjs`) and
  must stay that way.

## Verification toolbox

```bash
npm run build && npm run lint && npm run doctor   # build + lint + React Doctor (100 baseline)
npm run test:e2e-guard                            # pure target-guard matrix; no server/DB
npx playwright test                               # full E2E contract
node scripts/verify-schema.mjs --target dev       # schema/RLS/seed health (or --target prod)
node scripts/verify-no-secrets.mjs                # git history secret sweep
node scripts/verify-review-flyers.mjs             # QR destinations + artifact fidelity
```

`verify-schema.mjs` uses privileged credentials, creates a temporary request to
exercise atomic rollback, and deletes it in cleanup. Running it against Production
is an authorized activation/maintenance action, not a read-only inspection. The Production path
requires `PORTAL_PROD_ADMIN_EMAIL` / `PORTAL_PROD_ADMIN_PASSWORD`; it cannot reuse or fall back to
the Development Playwright identity.
