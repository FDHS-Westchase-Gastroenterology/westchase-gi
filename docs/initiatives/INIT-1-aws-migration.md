# INIT-1 · Move to AWS and get HIPAA-ready

## Progress

**Status:** Step 1's real work is done and merged into PR #224 (#402, merge `10bfd7a1`, 2026-10-13): the dependency map, the migration-order proof, the file-date fix and the settled defaults in `inventory.md`. Step 1 stays unticked only because billing and Vercel analytics removal is deferred; that removal blocks nothing. Step 2 (the AWS foundation) is next. No migration code yet: no Terraform, no Drizzle, and the app still runs on Supabase and Vercel. Most of Jason's AWS setup is done (see below).

**Known CI failures, not caused by INIT-1:** `supabase-integration` fails the same 2 specs on PR #224 from at least `d7f9f4d2` (2026-10-07) and `b45cec60` (2026-10-09), before #402: `e2e/boundaries/notification-test.spec.ts` (Settings › Notifications test send) and `e2e/boundaries/schedule-month-availability.spec.ts` (month availability). The migration lineage and schema checks in that job pass. #404 fixes both. The test send refused `{}` after `d6e36987`, an app fix. The month spec predates `1acc94cd`'s clock-mark openings, a test fix. With them fixed, the job goes on to the staff-portal specs; #404 records that result. Rely on the suite as the regression contract only once the job is green on #224's head.

**Last updated:** 2026-10-13

To keep this current: when a PR finishes a step, tick its box in that same PR, add the PR number next to it (like `(#412)`), and update **Status** and **Last updated**.

Steps (from "How I'd approach it"):

- [ ] 1. Strip out what we're deleting (billing, Vercel analytics), fix the future-dated migration file names, and map every Supabase and Vercel touchpoint in `docs/migration/inventory.md`.
  - [x] Map every Supabase and Vercel touchpoint in `docs/migration/inventory.md` (#402).
  - [x] Prove the migration files build a clean database from scratch in order (`docs/migration/migration-order.md`) (#402).
  - [x] Fix the future-dated migration file names (`docs/migration/migration-order.md`) (#402).
  - [ ] Strip out billing and Vercel analytics: deferred, later and not blocking; where they show up is in `inventory.md` §12.
- [ ] 2. Stand up the AWS foundation.
- [ ] 3. Move the database, sign-in, data access and email.
- [ ] 4. Set up hosting and the pipeline.
- [ ] 5. Cut over.
- [ ] 6. Shut down the old stack and write the paperwork.

Waiting on Jason:

- [x] Create the AWS Organization (advanced features on since 2026-10-06; see `AWS-ACCESS.md`).
- [x] Secure the root sign-in: password plus a passkey, no access keys (2026-10-06).
- [x] Accept the AWS BAA in AWS Artifact (active from 2026-10-07).
- [x] Allow us-east-1 in the Organization's Region policy (2026-10-06).
- [ ] Create the production and non-production accounts and fill in the `wgi-nonprod` / `wgi-prod` profiles in `~/.aws/config`. Being confirmed. Step 2 waits on this.
- [ ] Agree the cut-over hours with Juliet. The planned window (Sunday 2026-10-11) passed without the move happening, so it needs a new date.
- [ ] Say go or no-go the night before the new window: go only if steps 1 to 4 have landed, Production is on all of PR #224's migrations, and the full end-to-end suite passes on staging.
- [ ] Export the DNS zone from Porkbun, then swap the four nameservers once the Route 53 zone is ready.
- [ ] Tell Juliet that staff will add an authenticator app or passkey at first sign-in, and may need to set a new password.
- [ ] Put the Resend API key in Secrets Manager in both accounts, and the Supabase database connection string in production's.
- [ ] Confirm admin on the GitHub repo and create the `production` environment with yourself as required reviewer.
- [ ] Click the AWS notification confirmation email when it arrives, so alarms reach you.
- [ ] Sign the BAA with FDHS (not needed for the cut-over; the eCW connection in INIT-2 needs it).
- [ ] Check the data with the clinic after the cut-over and sign off.
- [ ] Approve production deploys.

## The ask

Move the Westchase GI patient website and staff portal off Vercel and Supabase and onto AWS, and make it HIPAA-ready while you're there.

When you're done:
- everything runs in AWS accounts covered by AWS's Business Associate Addendum (BAA)
- every piece of infrastructure is Terraform in the repo
- the CI/CD pipeline is rebuilt from scratch
- the security basics HIPAA expects are in place

How the app looks and behaves shouldn't change, except that staff sign-in gets two-step login.

## Why this goes first

The website already collects real appointment requests. That means patient information sits on Supabase and Vercel today without a BAA, and this ticket closes that gap.

Everything after it (the eCW connection, the booking rules engine) builds on the new stack. FDHS also can't switch on the eCW connection until we're on a BAA-covered host.

## What you're walking into

- **The app.** Next.js 16 / React 19: the patient website plus the `/admin` staff portal. Five languages, middleware in `src/proxy.ts`, server actions and image optimization.
- **The Supabase client.** It appears in 23 source files (`@supabase/supabase-js`, `@supabase/ssr`), making 46 database-function calls (`.rpc`) and 58 table calls (`.from`). Scripts and end-to-end tests reference Supabase in 24 more files.
- **Supabase Auth for staff.** Covers password sign-in, magic and recovery links, invites and admin user management. Email templates are in `supabase/templates`.
- **Postgres.**
  - 55 SQL migrations, 126 functions, rollback scripts and `seed.sql`.
  - Extensions: `btree_gist` (powers the double-booking guard), `pg_trgm` and `unaccent`.
  - Grants reference Supabase's `anon` / `authenticated` / `service_role` about 377 times.
  - `staff_profiles.user_id` points at `auth.users`.
- **Vercel.** `@vercel/analytics`, `@vercel/speed-insights`, `VERCEL_ENV`, `VERCEL_GIT_COMMIT_SHA`, the `/api/preview-environment` route, and a shared preview-password sign-in in `src/app/admin/actions.ts`.
- **Email.** Resend handles staff notifications and portal email.
- **The best part of this codebase: the database is the authority.** Version checks, idempotency keys, exclusion constraints against double-booking, audit rows kept 6 years, and functions with an empty search path. None of it depends on Supabase, and all of it has to survive the move.

## Already decided

These are settled with Jason. Build on them rather than reopening them.

- **AWS layout.** An AWS Organization with separate production and non-production accounts in us-east-1. Only HIPAA-eligible services touch patient data. (*TAG: Jason, today 1 - create the production and non-production member accounts and fill in the `wgi-nonprod` / `wgi-prod` profiles in `~/.aws/config`. Every other step waits on this.*)
- **Infrastructure.** Terraform for everything, and DNS moves to Route 53. (*TAG: Jason, today 3 - export the zone from Porkbun first. Once the agent has created the Route 53 zone with the same records, swap the four nameservers in Porkbun (Domain Management → westchasegi.com → Authoritative Nameservers). Propagation can take 48h, so if this misses tonight, keep DNS at Porkbun for Sunday and move it next week.*)
- **Hosting.** The Next.js app runs as an always-on container on ECS Fargate behind a load balancer, with a web application firewall in front.
- **Database.** RDS for PostgreSQL in a single zone: encrypted, private, deletion-protected, with point-in-time recovery. Multi-AZ can be switched on later.
- **Database code.** Drizzle replaces supabase-js and owns the schema and migrations from here on (drizzle-kit).
  - The 126 functions and the double-booking guard stay as SQL, carried as custom migrations inside Drizzle's history. Don't rewrite database functions in TypeScript; the safety guarantees live there on purpose.
  - Our own roles replace Supabase's built-in ones: a migration owner, a least-privilege app role and a read-only reporting role.
- **Sign-in.** AWS Cognito. (*TAG: Jason, today 4 - tell Juliet that on Monday every staff member adds an authenticator app or passkey at first sign-in, and may need to set a new password: Cognito can't import Supabase's password hashes.*)
  - Two-step login is required for every staff account, using any authenticator app or a passkey. 
  - Sessions end after 8 hours idle and 24 hours absolute, with a screen lock after inactivity.
  - Per-account throttling and lockout.
  - Deactivation takes effect on the next request.
  - Previews and staging keep a preset developer sign-in for seeded staff accounts, held only in the non-production Cognito pool.
    - Why it's allowed: the Security Rule applies only to ePHI ([164.302](https://www.ecfr.gov/current/title-45/section-164.302)), and unique user IDs and authentication are required only for systems "that maintain electronic protected health information" ([164.312](https://www.ecfr.gov/current/title-45/section-164.312)). Fictional data isn't PHI ([160.103](https://www.ecfr.gov/current/title-45/section-160.103)). AWS's BAA only restricts where PHI goes ([AWS HIPAA FAQ](https://aws.amazon.com/compliance/hipaa-compliance/)). The MFA mandate is still a [proposed rule](https://www.govinfo.gov/content/pkg/FR-2025-01-06/html/2024-30983.htm).
    - This holds only while non-production has no real data, so production data never goes there. The login fails closed: off Vercel it needs `PORTAL_DEV_SIGN_IN=enabled`, and it never works when `APP_ENV` is `production` (`src/lib/portal/dev-sign-in.ts`). Note the scoping in the risk assessment.
- **Email.** Resend stays. No email may contain patient information, because Resend has no BAA.
  - Why it can stay: AWS's BAA covers only AWS's own services and doesn't dictate the email vendor ([AWS HIPAA FAQ](https://aws.amazon.com/compliance/hipaa-compliance/)). HIPAA requires a BAA only with vendors that create, receive, maintain or transmit PHI for us ([45 CFR 164.502(e)](https://www.ecfr.gov/current/title-45/section-164.502#p-164.502(e))). Resend "cannot sign a Business Associate Agreement" ([Resend security FAQ](https://resend.com/security/gdpr.md)), so it may only ever carry email that holds no PHI.
  - What it sends today (checked in code 2026-10-09), none of which carries PHI:
    - the new-request alert: fixed text plus a link to `/admin`, with no patient name, contact, reason or request link (`src/lib/portal/intake-notification.ts`)
    - its `[Test]` variant
    - the notification-recipient confirmation and the staff invite (`src/lib/portal/management-email.ts`)
  - Cognito sends the sign-in emails (password reset, MFA codes, temporary passwords) itself unless a [custom email sender Lambda trigger](https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-lambda-custom-email-sender.html) routes them to a third party. Use that trigger to send them through Resend. (*TAG: Jason, today 5 - put the Resend API key in Secrets Manager in both accounts, and the Supabase database connection string in production's, so the agent can wire up email and the data copy without ever seeing the values.*)
  - Guardrails: never add a patient field or a request-specific link to an email template. List Resend in `docs/compliance/` as a vendor with no BAA that receives no PHI. If an email ever needs to name a patient or go to a patient, it moves to SES (HIPAA-eligible) or a vendor that signs a BAA.
- **Environments.**
  - A preview environment per pull request: at most 2 open at once, destroyed when the PR merges or closes, sharing staging's load balancer and database server with one throwaway database each.
  - One staging environment, plus production.
  - Everything outside production uses fictional data. (clinic staff should be present in previews as part of the "everything outside prod")
- **Deploys.**
  - GitHub Actions authenticates to AWS with OIDC, so there are no long-lived keys.
  - Every PR runs lint, type check, and end-to-end tests, a migration dry run, a Terraform plan and a vulnerability scan.
  - Merging to `main` deploys to staging automatically. Production waits for Jason's one-click approval in a protected GitHub environment. (*TAG: Jason, today 6 - confirm you have admin on the repo (the clinic's GitHub account owns it), then create the `production` environment with yourself as required reviewer.*)
  - Migrations run as a pipeline step that stops on failure.
  - `main` is branch-protected, and Renovate or Dependabot opens update PRs.
- **Monitoring.** CloudWatch alarms (error rate, 5xx, latency, database health) go to Jason. Any third-party monitoring tool either has a BAA or receives no patient data. (*TAG: Jason, before Sunday - click the AWS notification confirmation email when it arrives, or alarms never reach you.*)
- **Security official.** Jason.

## How I'd approach it

This isn't a script, just the order that avoids pain:
1. Strip out what we're deleting (billing, Vercel analytics). Fix the future-dated migration file names. Map every Supabase and Vercel touchpoint in `docs/migration/inventory.md`.
2. Stand up the AWS foundation.
3. Move the database, sign-in, data access and email.
4. Set up hosting and the pipeline.
5. Cut over.
6. Decommission the old stack and write the paperwork.

Keep the app working and the existing end-to-end suite green at every step. That suite is the regression contract.

The cut-over is the one moment real data moves. Do it in a quiet window Jason sets with the clinic: (*TAG: Jason, today 2 - agree the exact hours with Juliet. The website says "please call us" and the portal is read-only for the whole window, so the front desk should expect calls, and Juliet checks the data before you sign off.*)
- Freeze writes on the old stack: the website says "please call us" and the portal goes read-only.
- Copy Supabase into RDS.
- Prove row counts and checksums match for every table.
- Switch DNS.
- Keep the old stack read-only as the fallback until Jason signs off.

## Effort

This is the foundation for everything else and our highest-stakes ticket, because it touches real patient data and security. Be thorough rather than fast. Many small, reviewable PRs beat a few big ones.

When you're unsure whether something meets HIPAA, look it up and cite what you found in the PR. Good sources are AWS's HIPAA-eligible services list and HHS guidance.

## What done looks like

Prove each item with evidence in the PRs: test output, a Terraform plan, a screenshot or a log.

- [ ] No `@supabase/*`, `@vercel/*`, `SUPABASE_*` or `VERCEL_*` is left in source, scripts, tests or config.
- [ ] Terraform can create a fresh environment from the repo alone; nothing exists only in the console.
- [ ] The AWS BAA is accepted, and every service holding patient data is on AWS's HIPAA-eligible list (list attached).
- [ ] The database is unreachable from the internet.
- [ ] The database, backups, logs and secrets are encrypted at rest with a customer-managed key in AWS KMS (Key Management Service). If encrypted data leaks and the key doesn't, it isn't a reportable breach under [HHS's safe harbor](https://www.hhs.gov/hipaa/for-professionals/breach-notification/guidance/index.html). RDS encryption can only be turned on when the database is created.
- [ ] A restore from backup has been rehearsed and written up.
- [ ] Every staff account requires two-step login (authenticator app or passkey).
- [ ] Session limits, lockout and instant deactivation all work, covered by end-to-end tests.
- [ ] Every view of a patient, request or appointment writes an append-only access row naming the staff member.
- [ ] App roles can't update or delete audit or access rows.
- [ ] Every response carries security headers: a Content-Security-Policy, `frame-ancestors 'none'`, HSTS and a strict referrer policy.
- [ ] Logs, errors, URLs and emails contain no patient details, shown by a written review plus a log sample.
- [ ] A no-op change flows from PR to preview to staging to an approved production deploy.
- [ ] A deliberately failing test blocks that flow.
- [ ] Previews cap at 2 and are destroyed on merge or close.
- [ ] The full existing end-to-end suite passes on staging, and production smoke tests pass.
- [ ] Cut-over row counts and checksums match for every table, and the clinic confirms the data looks right.
- [ ] A final encrypted export is stored in AWS, and only then are the Supabase and Vercel projects deleted.
- [ ] `docs/compliance/` holds:
  - [ ] the security risk assessment
  - [ ] policies for access control, change management, incident response and breach notification, backup and restore, and workstation use
  - [ ] Jason named as security official
  - [ ] a vendor list with BAA status
  - [ ] a BAA template for FDHS
- [ ] The README and ARCHITECTURE.md describe the new stack.

## Only Jason can do

- Create the AWS Organization, secure the root accounts, and accept the BAA in AWS Artifact on behalf of the company.
- Grant registrar access for the Route 53 move. (*TAG: Jason - no domain transfer needed; it's the nameserver swap in today 3.*)
- Sign the BAA with FDHS. (*TAG: Jason - not needed for Sunday; it gates the eCW connection in INIT-2.*)
- Set the cut-over window with the clinic and confirm the data afterwards. (*TAG: JASON - Sunday 10/11/26*) (*TAG: Jason, go/no-go Saturday night - as of today no migration code exists (no Terraform, still on Supabase). Sunday works only if steps 1–4 have landed and the full end-to-end suite passes on staging by Saturday night. If not, move the window rather than rush real patient data.*)
- Approve production deploys.

When you hit one of these, tell Jason exactly what you need and keep going on whatever doesn't depend on it.

## Kickoff prompt

```
We're moving westchase-gi off Vercel and Supabase onto AWS and making it HIPAA-ready on the way. The brief is docs/initiatives/INIT-1-aws-migration.md. Read it before anything else: it covers what exists today, every decision already made (Cognito, Fargate, Terraform, Drizzle, RDS, keeping Resend for PHI-free email, the environments and deploy flow), and what done looks like.

This is the foundation for everything we build next, and it's the one ticket that touches real patient data and security, so take it slow and be thorough. I'd rather have many small, careful PRs than a fast big-bang. The app should look and behave exactly the same when you're done, apart from two-step sign-in. The existing end-to-end suite is how we know nothing broke, so keep it green the whole way. The database functions and the double-booking guard are the best part of this codebase: carry them over as SQL inside Drizzle's migrations, and don't rewrite them in TypeScript.

Some steps need Jason: the AWS account and BAA, registrar access, the FDHS BAA, the cut-over window, and production approvals. When you reach one, tell him exactly what you need and carry on with whatever doesn't depend on it.

You're done when every item under "What done looks like" is proven with evidence (test runs, Terraform plans, screenshots, logs) in the PRs. Finish with a short report that walks through each item, pass or fail, and links the evidence.
```
