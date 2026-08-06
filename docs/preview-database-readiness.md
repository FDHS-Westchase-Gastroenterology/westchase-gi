# Preview database readiness

Every pull request must report the GitHub status check
**`preview-database-readiness`**. It fails closed unless the successful Vercel
Preview deployment for that exact PR head can call the matching Supabase preview
database and report the exact set of committed migration versions.

`GET /api/preview-readiness` is intentionally PHI-free and non-cacheable. Its
success payload contains only `ready`, the sorted migration-version list, and
Vercel's commit SHA and pull-request ID. The database function is executable
only by `service_role`; the route is the single server-side caller. The check
derives the expected list from every `supabase/migrations/*.sql` file at the PR
head, so a branch missing an older migration also fails rather than hiding a
Next.js schema error.

The endpoint returns 503 outside Vercel Preview, when commit/PR identity is
missing, or when the active Supabase URL is either long-lived Development or
Production. The workflow keeps polling through the initial Vercel deployment
race until Supabase has rebound and redeployed the exact PR head.

## One-time authorized integration setup

Do this in the Supabase and Vercel dashboards, not from CI and not from a local
script:

1. In Supabase **Project Settings → Integrations**, connect GitHub repository
   `FDHS-Westchase-Gastroenterology/westchase-gi` with **working directory
   `.`**, turn **automatic branching on**, and keep **Deploy to production
   off**. Confirm preview branches apply committed migrations and
   `supabase/seed.sql`; they must not copy Production data.
2. Connect that Supabase project to Vercel project **`westchase-gi`**. Keep the
   Vercel GitHub integration enabled. Supabase sets the matching Preview
   variables when a PR opens and triggers a redeploy to resolve the normal
   initial deployment race.
3. In Vercel **Preview only**, keep the fictional `PORTAL_SEED_ADMIN_*` and
   `PORTAL_PREVIEW_*` credentials, plus the non-secret long-lived guard values
   `PLAYWRIGHT_ALLOWED_SUPABASE_PROJECT_REF`, `SUPABASE_PROJECT_REF_PROD`, and
   `SUPABASE_URL_PROD`. Do not add those credentials to Production. Supabase's
   integration owns the active branch URL and keys. Its current marketplace
   variables include `NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and `SUPABASE_SECRET_KEY`; the app
   accepts that modern server key while retaining the canary-proven legacy
   `SUPABASE_SERVICE_ROLE_KEY` fallback for existing environments.
4. In GitHub branch protection, require **`preview-database-readiness`** in
   addition to the existing `Vercel`, `quality`, `react-doctor`, and
   `supabase-integration` checks. A missing, pending, stale, or failed check
   blocks merge.

Do not add Production Supabase, Resend, GitHub App, patient, or real-staff
credentials to Preview or CI. Production migrations remain an explicitly
authorized, separate operation.

## Fictional Preview staff identity

`supabase/seed.sql` intentionally does not insert `auth.users`. Auth fixtures
must instead use `scripts/seed-portal.mjs`, which creates the user through the
Supabase Auth Admin API, assigns `app_metadata.role = "admin"`, and provisions
the matching `staff_profiles` row. It never uses `user_metadata` for
authorization.

`npm run build` derives the active branch ref and invokes the guarded Preview
seeder before every Vercel Preview build. The build refuses to continue if
Supabase still points at long-lived Development/Production or if the fictional
account cannot be created through the Auth Admin API. Production and local
builds skip this step.

The underlying command is:

```bash
VERCEL_ENV=preview \
SUPABASE_PREVIEW_PROJECT_REF=<preview-branch-ref> \
SUPABASE_PROD_PROJECT_REF=<production-project-ref> \
SUPABASE_PROD_URL=<production-url> \
PLAYWRIGHT_ALLOWED_SUPABASE_PROJECT_REF=<development-project-ref> \
node scripts/seed-portal.mjs --target preview
```

`--target preview` requires the exact
`https://<SUPABASE_PREVIEW_PROJECT_REF>.supabase.co` URL and refuses a supplied
long-lived Development project and the Production project URL/ref. Supply `PORTAL_SEED_ADMIN_EMAIL` and
`PORTAL_SEED_ADMIN_PASSWORD` only through the Preview secret store. The
reviewer-facing `PORTAL_PREVIEW_USERNAME` and `PORTAL_PREVIEW_PASSWORD` remain
an alias for that fictional seed account; they are not the Auth identity.

## Troubleshooting

If `preview-database-readiness` fails, first confirm the Vercel deployment is
the exact PR head and that the Supabase integration completed its post-variable
redeploy. Then confirm the Supabase preview branch exists, has applied the
complete migration set, and has no Production data. Fix branch binding or rerun the
Preview deployment; do not make a hosted migration write merely to satisfy the
check. A Vercel build failure before `next build` means branch variables or the
fictional seed identity are missing or unsafe.
