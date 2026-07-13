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
| `RESEND_API_KEY` / `RESEND_FROM` | Notification email provider + sender |
| `PORTAL_BASE_URL` | Absolute base URL used in notification links |
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

The Supabase management access token used for provisioning is personal,
short-lived, and is NOT a runtime dependency — the app never reads it.

## Supabase custody

Both projects (production and development) live in a dedicated Supabase
organization for the practice. Supabase supports **project transfer**
between organizations, so at handover the projects move to an
organization owned by the practice's own account — no data migration
required. Until then: never delete or pause either project; schema
changes go through committed migrations in `supabase/migrations/`
(`supabase link` + `supabase db push` per project, or the management
API), applied to dev first, production after verification.

## Data export

- **CSV, self-serve:** the queue's Export CSV button (or
  `GET /admin/requests/export?status=...` authenticated) — the documented
  column set, filtered like the queue.
- **Full copy:** Supabase dashboard → Database → Backups (daily included),
  or `pg_dump` with the database password for a complete portable dump.
  The practice's data is standard Postgres — there is no lock-in.

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
- **A secret leaked somewhere:** rotate it (see above) — the repo's
  history is provably clean (`node scripts/verify-no-secrets.mjs`) and
  must stay that way.

## Verification toolbox

```bash
npm run build && npm run lint && npm run doctor   # build + lint + React Doctor (100 baseline)
npx playwright test                               # full E2E contract
node scripts/verify-schema.mjs --target dev       # schema/RLS/seed health (or --target prod)
node scripts/verify-no-secrets.mjs                # git history secret sweep
```
