# Contributing — Westchase GI

How to contribute to this repository: setup, verification, commit/PR/merge discipline, and
the path to production. [`ARCHITECTURE.md`](ARCHITECTURE.md) explains how the system runs,
where state lives, and which files own each behavior. Read its system map and the section for
your change before editing. The non-negotiable product and security rules are in
[`AGENTS.md`](AGENTS.md).

Product truth lives in `PRODUCT.md` (patient-site and staff-portal registers) and `DESIGN.md`.
Repository custody facts are summarized in [`README.md`](README.md); the design of every
external connection is in [`ARCHITECTURE.md`](ARCHITECTURE.md#external-interfaces).

## Before editing

1. Find the change in the architecture
   [common starting points](ARCHITECTURE.md#common-starting-points).
2. Read the matching execution path, source-of-truth entry, and trust boundary. Do not infer
   authorization, atomicity, or failure behavior from the UI.
3. For appointment-request states, commands, queue behavior, history, notifications, printing,
   or workflow controls, also read `src/lib/portal/workflow/contracts.ts`, which owns the state vocabulary and
   normalization rules.
4. For user-visible work, read `PRODUCT.md`, `DESIGN.md`, and
   [`ui-reference/README.md`](ui-reference/README.md).
5. Use the [change-type matrix](#by-change-type) to choose the required checks before coding.

## Setup

```bash
npm ci
cp .env.example .env.local   # fill in real values; this is the variable inventory
npx playwright install chromium
npm run dev                  # refresh fictional patients, then serve :3000
npm run dev:patients         # refresh the fictional queue without starting Next
npm run dev:mission          # the E2E stack's server on :3100
```

`npm run dev` replaces the `/seed` appointment-request rows with a random mix from
the name pool in `scripts/dev-patients.mjs` (15 patients: 10 new, 3 call-again
today, 1 stale, 1 later). `DEV_SEED=0` skips it. `npm run dev:mission` does not
seed, so E2E stays on `supabase/seed.sql`. Production targets are refused.

`.env.local` may point the default environment at the Git branch's ephemeral **Supabase
Preview Branch**; Production values live under the `_PROD`-suffixed names and in Vercel.
Never point local tests at Production — the E2E target guard requires an explicit Preview
Branch marker (or the optional loopback `local` sentinel) and rejects Production.

Node version is pinned in `.nvmrc`. It deliberately does not live in `engines.node`: Vercel
reads that field and would take Production off the version chosen in Project Settings.

## Verification

### Standing gates

Every change must pass these repository-wide checks:

```bash
npx oxlint
npx oxfmt --check
npx react-doctor@latest --verbose
npm run build
```

Oxlint must report zero warnings and errors, oxfmt must report no drift, React Doctor must score
100 on a clean checkout, and the production build must compile and typecheck. A focused check
adds coverage for the changed behavior; it does not replace these gates. UI-visible changes also
require the [visual evidence](#ui-changes) described below.

### What to run — without credentials

This set is exactly the CI `quality` job (`.github/workflows/ci.yml`). It needs no
`.env.local`, no Supabase project, and no secrets, so it is the complete verification
surface available to an agent or contributor working in a clean container:

```bash
npm ci --no-audit --no-fund
node --test .github/scripts/dependency-automation.test.cjs
npm run test:e2e-guard
npm run test:unit
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 \
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=ci-public-placeholder \
  SUPABASE_SERVICE_ROLE_KEY=ci-server-placeholder \
  npm run build
npx playwright install --with-deps chromium
npm run test:e2e:public
```

`npm run lint` (`oxlint` from the repository root) is the repository's sole linter command.
It is local-only until a dedicated findings PR lands; the `quality` job does not run it.
Oxlint recursively checks owned JavaScript and TypeScript files in every subdirectory — `src/`,
`e2e/`, `scripts/`, `.github/scripts/`, and root configs — with the migrated Next.js, React,
accessibility, import, and TypeScript rules plus the vendored anti-slop rules. Dependencies,
generated output, agent assets, and the plugin's own source are excluded. The Oxc editor
extension uses the same `.oxlintrc.json` for the whole workspace.

`npm run fmt` (`oxfmt`) is the repository formatter; `npm run fmt:check` reports drift
without writing. House rules live in `.oxfmtrc.json`: 100 columns, double quotes, semicolons,
trailing commas, preserved object wrapping, grouped imports, and Tailwind class order from
`src/app/globals.css`. Markdown and generated trees are left alone. Like oxlint, format
check is local-only until a dedicated findings PR lands.

`npm run doctor` and `node scripts/verify-no-secrets.mjs` also run with no credentials.

`npm run doctor` caveat: it scans the working tree, including untracked build output like
`.next/` and `.next-e2e/`, whose bundled third-party sourcemaps trip the artifact-secret
rule. A local score can sit far below the CI score for reasons unrelated to your change.
Read the path on every finding: anything under a build directory or `node_modules` is local
noise — never "fix" it by editing generated files. The repository standard is a clean 100
on a clean checkout.

### How to contribute with a Supabase Preview Branch

```bash
npm run test:e2e:boundaries                   # Auth, RLS, RPC, throttling, lifecycle, PostgREST
npm run test:e2e:portal                       # staff-portal journeys (boots :3100 itself)
npx playwright test e2e/portal/requests.spec.ts --project=chromium   # one spec
node scripts/verify-schema.mjs --target branch # schema, RLS, RPC, seed state
npm run ui:reference:portal                   # staff-route UI captures
```

Every PR gets its own hosted branch from Supabase GitHub Branching. The required
`Supabase Preview` check proves its configuration, migrations, and SQL seed deployed; the
required `supabase-integration` job then fetches that branch's ephemeral credentials, creates
the fictional portal Auth fixture, runs `verify-schema --target branch`, and exercises the
credentialed portal contract. The hosted branch is the PR's database for schema iteration,
application review, and destructive contract testing.

The Supabase Vercel integration is anchored to the Production parent project. When a PR opens,
Supabase assigns the matching branch credentials to that Vercel Preview and redeploys it. A valid
review environment has the same Git branch in GitHub, Supabase, and Vercel.

For a workstation run against the PR database, export credentials from
`supabase branches get <git-branch> --project-ref <production-ref> --output env`, map them to
the names in `.env.example`, and set `SUPABASE_PREVIEW_BRANCH=1`. `e2e/harness/target-guard.ts`
binds the project reference to the URL, requires the hosted-branch marker, and rejects
Production before the first database call. [`test/README.md`](test/README.md) describes the
tiers (unit, `e2e/public`, `e2e/portal`, `e2e/boundaries`), the shared harness, and how to add
a test. Never run two Playwright processes against the branch at once, nor one while CI's
integration job is running on the same pull request.

**Honesty rule:** if you cannot reach a Supabase project, run the credential-free set and say
plainly that the credentialed suite did not run. "Not run" is an acceptable answer; silently
implying a pass is not. Never describe the full suite as passing on the strength of the
smoke test.

### By change type

The checks below are added to the standing gates.

| Change | Read first | Additional checks |
| --- | --- | --- |
| Patient copy / locale content | [Localized patient reads](ARCHITECTURE.md#localized-patient-reads) and [trust boundaries](ARCHITECTURE.md#trust-boundaries) | `test:unit`, `test:e2e:public`; `e2e/portal/intake-form.spec.ts` when form behavior shifts |
| Intake form / API / persistence | [Patient appointment intake](ARCHITECTURE.md#patient-appointment-intake) | `src/lib/portal/contracts.test.mjs`, `e2e/portal/intake-api.spec.ts`, `e2e/portal/intake-form.spec.ts` |
| Portal page, route, or action | [Portal identity, authorization, and reads](ARCHITECTURE.md#portal-identity-authorization-and-reads); add `src/lib/portal/workflow/contracts.ts` for queue work | The unit tests beside the module, then the `e2e/portal/` spec for the route (`requests.spec.ts`, `lifecycle.spec.ts` for the work panel) |
| Migration, RLS, RPC, or seed | [State and persistence](ARCHITECTURE.md#state-and-persistence) and [trust boundaries](ARCHITECTURE.md#trust-boundaries) | `verify-schema --target branch` and `test:e2e:boundaries`; green `Supabase Preview` and `supabase-integration` on the exact head |
| Email paths | [Email](ARCHITECTURE.md#email) | `src/lib/portal/email.test.mjs` (in `test:unit`) |
| UI-visible change | `PRODUCT.md`, `DESIGN.md`, and [`ui-reference/README.md`](ui-reference/README.md) | Refresh covered `ui-reference/` images; before/after screenshots in the PR conversation; video when the change is a new workflow or has multiple authored steps |
| CI / dependency automation | [Common starting points](ARCHITECTURE.md#common-starting-points) | `node --test .github/scripts/dependency-automation.test.cjs`; policy and test change together |

Every PR reports both `Supabase Preview` and `supabase-integration`. Automatic branching applies
to every PR, and **Supabase changes only** remains disabled, so application and schema changes are
reviewed against the same isolated database. The integration job receives only branch-scoped
database credentials after the Supabase deployment succeeds; the parent access token exists only
in the credential-fetch step. It checks Auth refresh, SSR cookie sessions, closed Data API/RLS
boundaries, shared intake throttling, field caps, appointment-request-lifecycle boundaries, and
PostgREST persistence/relationships.

Preview Branches apply only migration files they have not recorded yet. Prefer a new forward
corrective migration after a pushed migration changes. If a pre-merge migration truly must be
rewritten, close and reopen the PR to recreate the branch and replay the complete lineage;
never hand-patch the hosted branch into an unreproducible state.

### UI changes

Open [`ui-reference/README.md`](ui-reference/README.md) before frontend work. Refresh the
affected images against the matching local or Preview origin; use the default live-origin
capture after deployment for public pages. The portal atlas covers only the seven top-level
staff routes with the Preview Branch seed identity, redacts in-browser, and never runs
against Production.

UI-visible work also has to satisfy the [visual evidence](AGENTS.md#visual-evidence) gate:
before and after screenshots in the pull-request conversation, or a video of the authored
path when the change is a new workflow or has more than one step. Committed atlas images
alone do not pass the gate.

## Commit messages

Use **imperative `type(scope): summary`** subjects and a short **why-focused** body:

- `fix(hours): align Carrollwood Friday close with front-desk sheet`
- `feat(i18n): add Vietnamese nav labels for prep hub`

**Prohibited:** vague or generated messages (`update files`, `fix stuff`, `WIP`, emoji-only
subjects).

## Pull requests

**The review-ready PR is the default path for all normal source, content, and UI changes.**
The template (`.github/PULL_REQUEST_TEMPLATE.md`) is the contract: summary/why, scope,
verification with evidence (paste output or CI links; check only what actually ran), UI
screenshots — or a workflow video — in the PR conversation for visible changes (or an
explicit N/A), medical/content provenance when
compliance-sensitive text changes (provider credentials are verbatim — see
`src/lib/providers.ts`), risk/rollback, and deployment impact.

Keep PRs small and single-purpose. Link the issue. Anything unverified (links, facts,
locales) stays out until verified — see `PRODUCT.md` design principle 1.

## Merging

`main` is protected and **is production**. As configured, it requires current-branch
`quality`, `react-doctor`, `Vercel`, and `supabase-integration` statuses plus resolved
conversations; force pushes and deletion are blocked. Treat every merge as patient-facing
unless the change is explicitly non-user-visible (tooling, governance, docs-only).

Before merge, confirm `Supabase Preview` and `supabase-integration` passed on the **exact
head**. Skipped, pending, missing, stale, or failed signals withhold the merge.

`Supabase Preview` is the Supabase integration's preview-branch check and is **required only
on PRs that change the database** — schema, migrations, or anything under `supabase/`. It
does not report on other PRs, so it is not a required status check on `main`: making it one
deadlocks every manifest-only or source-only PR behind a check that will never arrive.
Where it does report, it is a merge gate like any other, and the auto-merge controller
enforces it the same way.

A green React Doctor check proves execution, not a clean result. Inspect the report and require a
score of 100 on the exact head.

**Direct push to `main`** is for urgent production hotfixes only (admin), and must carry the
same verification evidence a PR would (CI green, live spot-check, rollback noted). Normal
changes never request a bypass.

## Dependency updates

Dependabot PRs travel a guarded automatic lane with three independent boundaries:

1. **Deterministic PR gates** (no-secret runner: clean install, policy self-test,
   build, public smoke) — authoritative.
2. **Best-effort read-only Codex review** of verified, manifest-only Dependabot commits. It
   can veto; it cannot override deterministic policy, and an unavailable or malformed
   response falls back to the deterministic gates rather than becoming a human gate.
3. **Trusted merge controller** — rechecks the exact SHA, changed paths, CI, React Doctor's
   exact-head result, Vercel preview, the automation decision, and mergeability; skips a
   failing candidate without stalling green siblings; updates behind branches through
   GitHub's API; merges at most one PR; then pauses until post-merge CI, React Doctor, the
   matching Vercel Production deployment, and a canonical live-site smoke succeed.

Every verified, manifest-only root npm update may enter the queue regardless of package
name/type, SemVer class, grouping, or tool ownership. Maintainer-modified, source-changing,
migration-changing, or otherwise untrusted PRs are rejected before review. Executable policy

- regression tests: `.github/scripts/dependency-automation.cjs` and
  `.github/scripts/dependency-automation.test.cjs` (they change together). SOP:
  `.github/codex/dependabot-sop-and-examples.md`. `OPENAI_API_KEY` is a repository Actions
  secret; never copy it into source, logs, PR text, Dependabot secrets, or an agent workspace.

## Shipping to production

1. Merge to `main` → required checks → automatic deploy on the clinic-owned Vercel project →
   exact-commit production verification against the canonical site.
2. **Migrations promote separately.** Keep the Supabase GitHub integration's **Deploy to
   production** switch off. A green Preview Branch and merged PR establish the exact
   migration lineage; apply that committed migration to Production only after the separate
   Production decision, then run `verify-schema.mjs --target prod`. Every new
   schema-changing migration ships with a rollback sibling in `supabase/rollbacks/` (migrations
   before `20260725170000` predate the convention); after an
   approved hosted rollback, mark versions reverted in the migration ledger before any later
   push.
3. **Environment changes** go through the Vercel environment store
   (`printf '%s' "$NEW_VALUE" | vercel env add NAME production`), never into shell history
   echoes, source, or `NEXT_PUBLIC_*`. Redeploy and spot-check after a change.
4. **Rotating a credential:** generate at the provider → update the Vercel targets (and
   `.env.local`) → redeploy → spot-check (test submission on a Preview URL;
   `verify-schema.mjs --target branch`). For the GitHub App private key: generate in the
   clinic-owned App settings, update Production, redeploy, prove the live GitHub status,
   then revoke the old key — and never make the Administration-capable key available to
   Preview.
5. **Password-recovery configuration:** verify Preview Branch and Production independently
   in Supabase Auth. Each needs its intended Site URL, the exact
   `/admin/auth/confirm` redirect allowlist, the repository recovery template, a one-hour OTP
   expiry, a 60-second same-user resend cooldown, custom SMTP, and disabled public signup.
   Inspect provider/Auth evidence without copying recipient addresses, email bodies, or
   bearer links. A code deploy does not prove these hosted settings.

## Operating the system

Day-to-day incident basics (the portal's Help page covers the front-desk view):

- **Form down / database unreachable:** patients see the truthful failure state with the
  office phone and text line — never a fake confirmation. Check Vercel status, then the
  Supabase project health dashboard.
- **Portal won't load:** verify the Vercel deployment is READY and the Supabase project is
  ACTIVE_HEALTHY. The patient site keeps working — they share infrastructure but fail
  independently.
- **Notifications not arriving:** the queue is the system of record — check the request
  there first, then Settings → recipients (is the address active?), the `request_events`
  rows (what did the provider say?), then the Resend dashboard.
- **Staff reset email not arriving:** confirm the expected address and active profile in
  Settings → Staff, ask the staff member to check Inbox and Spam or Junk, confirm the link is
  no more than one hour old, and have them use the public resend action after its cooldown.
  If it still fails, an authorized operator checks Supabase Auth audit evidence and SMTP
  delivery logs. Never request the password, bearer link, or copied email content.
- **Website shows Not configured:** confirm all three `PORTAL_GITHUB_APP_*` variables exist
  on that Vercel target and redeploy. Do not print their values while diagnosing; if it
  shows an upstream failure instead, check the App installation and permissions in the
  clinic account.
- **A secret leaked somewhere:** rotate it (above). The repo's history is provably clean
  (`node scripts/verify-no-secrets.mjs`) and must stay that way.

**Data export:** self-serve CSV from the queue (Export CSV, or
`GET /admin/requests/export?status=...` authenticated). For a full copy, Supabase dashboard
backups (plan-dependent) or `pg_dump` with the database password — the practice's data is
standard Postgres, no lock-in. A downloaded export is a clinic-controlled sensitive copy;
handle and dispose of it under clinic rules.

**Verifier toolbox:**

```bash
npm run build && npm run lint && npm run doctor   # build + lint + React Doctor (100 baseline)
npm run test:e2e-guard                            # target-guard matrix; no server/DB
npx playwright test                               # full E2E contract
node scripts/verify-schema.mjs --target branch    # Preview Branch schema/RLS/RPC/seed health
node scripts/verify-schema.mjs --target prod      # authorized Production maintenance action
node scripts/verify-no-secrets.mjs                # git history secret sweep
node scripts/verify-review-flyers.mjs             # QR destinations + artifact fidelity
```

## Common tasks

- **Add a patient PDF:** drop the file in `public/documents/`, set that entry's `file` in
  `src/lib/documents.ts` — the row (and, for disease sheets, the education page's take-home
  box) switches to a download link in all five languages. A slot with no real file keeps its
  honest fallback; never point at a path that does not exist.
- **Everything else** — provider updates, preps, blog posts, education topics, portal pages,
  migrations, SEO, CI: use the architecture [common starting points](ARCHITECTURE.md#common-starting-points)
  and the change-type → checks map under §Verification above.

## Access lifecycle

Repository access stays limited to maintainers with a concrete need. ASTXRTYS holds Write;
elevate to Admin only for a specific settings task, then return to Write, and revoke when the
engagement ends.
