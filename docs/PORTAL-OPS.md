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
| `SUPABASE_SECRET_KEY` (+ `SUPABASE_SERVICE_ROLE_KEY` alias) | Server-only privileged key — never `NEXT_PUBLIC_*`, never in client bundles |
| `SUPABASE_PROJECT_REF` / `SUPABASE_DB_PASSWORD` | CLI/migration access for the default (dev) project |
| `SUPABASE_*_PROD` family | The same, for the production project (migrations + verify scripts) |
| `RESEND_API_KEY` / `RESEND_FROM` | Current production email adapter + sender |
| `PORTAL_BASE_URL` | Absolute base URL used in notification links |
| `PORTAL_GITHUB_APP_ID` / `PORTAL_GITHUB_APP_INSTALLATION_ID` | Server-only identifiers for the clinic-owned `wgi-portal` App |
| `PORTAL_GITHUB_APP_PRIVATE_KEY` | Server-only App private key; PEM encoded as base64 or escaped newlines |
| `PORTAL_SEED_ADMIN_EMAIL` / `PORTAL_SEED_ADMIN_PASSWORD` | E2E test admin on the dev project (tests only) |

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
push-to-deploy path are verified.

The `wgi-portal` GitHub App registration uses Repository Administration
read/write and Metadata read permissions. The Website status request explicitly
downscopes each installation token to Metadata read; it cannot change repository
settings or collaborators. Its JWT-to-installation-token path was rehearsed
successfully. Enabling two-factor authentication on the owner account and
restricting the App installation to only this repository remain owner-only
tasks; do not mark either complete without owner verification. The portal shows
the clinic-owned Vercel project as a static custody fact and does not connect to
or manage Vercel.

## Supabase custody

Both projects (production and development) live in a dedicated Supabase
organization for the practice. Supabase supports **project transfer**
between organizations, so at handover the projects move to an
organization owned by the practice's own account — no data migration
required. Until then: never delete or pause either project; schema
changes go through committed migrations in `supabase/migrations/`
(`supabase link` + `supabase db push` per project, or the management
API), applied to dev first, production after verification.

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

Until the practice domain is verified, `onboarding@resend.dev` can deliver only
to the Resend account owner's address. That permits an owner-inbox canary but
does not satisfy arbitrary clinic-recipient delivery; repeat the receipt canary
after domain recovery and update `RESEND_FROM` before handover.

## Data export

- **CSV, self-serve:** the queue's Export CSV button (or
  `GET /admin/requests/export?status=...` authenticated) — the documented
  column set, filtered like the queue.
- **Full copy:** Supabase dashboard → Database → Backups (daily included),
  or `pg_dump` with the database password for a complete portable dump.
  The practice's data is standard Postgres — there is no lock-in.

## Review-flyer printing

Administrators open **Print review flyers** in the portal navigation. The page supports one
flyer at a time, all six flyers, and protected PDF, SVG, and PNG downloads. Non-admin staff do
not see the action and cannot fetch its files directly.

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
provider outcome. Until a practice email domain is verified with Resend,
the onboarding sender only delivers to the Resend account owner's
address — other recipients record as provider-rejected attempts. After
the practice domain is verified (post-cutover task), set `RESEND_FROM`
to the practice sender and deliveries open up to any recipient.

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
npx playwright test                               # full E2E contract
node scripts/verify-schema.mjs --target dev       # schema/RLS/seed health (or --target prod)
node scripts/verify-no-secrets.mjs                # git history secret sweep
node scripts/verify-review-flyers.mjs             # QR destinations + artifact fidelity
```
