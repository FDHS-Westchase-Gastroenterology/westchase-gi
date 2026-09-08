# Contributing — Westchase GI

How to contribute to this repository: setup, verification, commit/PR/merge discipline, and
the path to production. [`ARCHITECTURE.md`](ARCHITECTURE.md) explains how the system runs,
where state lives, and which files own each behavior. Read its system map and the section for
your change before editing. The non-negotiable product and security rules are in
[`AGENTS.md`](AGENTS.md).

Product truth lives in `PRODUCT.md` (patient-site and staff-portal registers) and `DESIGN.md`.
Repository custody facts are summarized in [`README.md`](README.md); the design of every
external connection is in [`ARCHITECTURE.md`](ARCHITECTURE.md#external-interfaces).

Jason uses Codex for backend work and Claude Code for all frontend work. The responsibility
split and how to handle shared changes are in [AGENTS.md](AGENTS.md#agent-responsibilities).
Claude Code implements and verifies the frontend against repository components and brand tokens.
Claude Design is optional; approval there is not a contribution or merge requirement.

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

Choose the database before publishing a new remote branch. Record the Git branch, intended
merge destination, database-owning integration branch, Supabase project reference (never its
credentials), and setup evidence in the PR or tracked handoff.

- A branch merging into another working branch inherits that branch's existing Preview database
  and migration baseline. The active portal integration branch is PR #224,
  `portal/appointment-workflow-experience`; all branches feeding it use its database.
- A new independent integration branch establishes a Preview database from its intended schema
  baseline. Record that baseline explicitly; do not assume Production contains unmerged work.
- `Supabase Preview` is required only during new remote branch setup. For a newly provisioned
  database, retain its successful configuration/migration/seed deployment evidence. For an
  inherited database, retain the owner's setup evidence and verify the new branch's connection.
  Neither child PR creation nor later commits require another database or another provisioning
  check. Creating or reconnecting a database requires fresh readiness verification.

The Vercel deployment must use the selected database's project reference and the intended Git
commit. Different Git branches may use the same Preview database. Verify that relationship
explicitly; matching Git branch names alone do not prove a valid environment.

For a workstation run, export credentials from
`supabase branches get <database-owning-git-branch> --project-ref <production-ref> --output env`,
map them to the names in `.env.example`, and set `SUPABASE_PREVIEW_BRANCH=1`.
`e2e/harness/target-guard.ts` binds the project reference to the URL, requires the hosted-branch
marker, and rejects Production before the first database call. [`test/README.md`](test/README.md)
describes the test tiers and shared harness.

Coordinate use of the database across the entire branch stack. Never run two Playwright
processes, fixture resets, or conflicting migrations against it concurrently, including CI jobs
from different PRs. Sequence schema changes with the integration branch owner and preserve
compatibility with other branches still using that database. Only fictional fixtures belong there.

### Automation alignment

The branch-selection policy above is the operating requirement. The checked-in automation still
needs these changes before it implements inheritance:

- `.github/workflows/supabase-dependency-integration.yml` listens for PRs targeting `main`, waits
  for `Supabase Preview` on each exact head, fetches credentials by the head Git branch name,
  and serializes runs by PR/ref. It must resolve the database owner for stacked PRs, reuse setup
  evidence, and serialize destructive work by database project reference.
- `.github/scripts/dependency-automation.cjs` treats any reported `Supabase Preview` status as a
  merge gate. It must distinguish setup readiness from checks for subsequent commits.
- Verify and align the hosted Supabase GitHub/Vercel integration and GitHub branch protection.
  Do not assume they inherit a database because the PR base changed. Keep automatic Production
  deployment disabled. Report a mismatch without bypassing protection or creating a redundant
  database merely to satisfy the old workflow.

Documentation changes do not perform these automation or hosted-configuration changes.

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
| Migration, RLS, RPC, or seed | [State and persistence](ARCHITECTURE.md#state-and-persistence) and [trust boundaries](ARCHITECTURE.md#trust-boundaries) | `verify-schema --target branch` and `test:e2e:boundaries`; documented migration deployment to the selected database and green `supabase-integration` on the exact head |
| Email paths | [Email](ARCHITECTURE.md#email) | `src/lib/portal/email.test.mjs` (in `test:unit`) |
| UI-visible change | `PRODUCT.md`, `DESIGN.md`, and [`ui-reference/README.md`](ui-reference/README.md) | Refresh covered `ui-reference/` images; before/after screenshots in the PR conversation; video when the change is a new workflow or has multiple authored steps |
| CI / dependency automation | [Common starting points](ARCHITECTURE.md#common-starting-points) | `node --test .github/scripts/dependency-automation.test.cjs`; policy and test change together |

`supabase-integration` remains the current-head database/application gate. It uses only the
selected Preview database's credentials, verifies schema/RLS/RPCs, and exercises Auth refresh,
SSR sessions, closed Data API boundaries, shared throttling, field caps, lifecycle boundaries,
and PostgREST persistence/relationships. A successful setup check does not replace these tests.
For schema changes, also record the migration versions applied to that database; a setup check
from an earlier commit cannot establish that a later migration was applied.

Preview Branches apply only migration files they have not recorded yet. Prefer a new forward
corrective migration after a pushed migration changes. If an unmerged migration must be rewritten,
coordinate a clean replay and verification with everyone using the database. Do not recreate a
shared database by closing/reopening a child PR, or hand-patch it into an unreproducible state.

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

`main` is protected and **is production**. The merge policy requires current-head `quality`,
`react-doctor`, `Vercel`, and `supabase-integration` statuses plus resolved conversations; force
pushes and deletion remain blocked. Verify actual protection before merging and report policy
mismatches without requesting a bypass. Treat every merge as patient-facing unless the change
is explicitly non-user-visible (tooling, governance, docs-only).

Before merge, confirm those checks passed on the **exact head** against the selected Preview
database, and retain the branch-setup record described above. Skipped, pending, missing, stale,
or failed required checks withhold the merge. `Supabase Preview` is required only for establishing
the remote branch's database setup, with inherited setup evidence for branches sharing an
integration database. It is not a recurring current-head or database-change-only requirement.

A green React Doctor check proves execution, not a clean result. Inspect the report and require a
score of 100 on the exact head.

**Direct push to `main`** is for urgent production hotfixes only (admin), and must carry the
same verification evidence a PR would (CI green, live spot-check, rollback noted). Normal
changes never request a bypass.

## Dependency updates

### Class-name helper updates

Components import `cn` directly from the `cn` package. `src/lib/utils.ts` re-exports it for
compatibility, and `components.json` retains its utils alias. See the upstream
[cn changelog](https://ui.shadcn.com/docs/changelog#september-2026---cn) and
[migration reference](https://ui.shadcn.com/docs/cli#migrate-cn).

When bringing older source into this convention, run from the repository root:

```bash
npx shadcn@latest migrate cn
```

Review the actual diff. The command replaces the old helper, rewrites supported package
imports, installs `cn`, and removes unused direct dependencies. Verify component imports
as well: code should use `from "cn"`, with `@/lib/utils` retained as a compatibility entry.
Scoped runs preserve old dependencies because unselected files may still need them.
Unsupported patterns require manual review; do not remove a package while source uses it.

This is a Tailwind v4 helper migration. It does not call for `init`, `apply`, a preset change,
or a component redesign. Preserve CSS, component recipes, variants, and server/client
boundaries. If class merging changes the rendered result, investigate it and satisfy the
visual-evidence gate for any resulting UI change.

Check both product source and `src/components/stock/`, since the latter supplies the design
bundle and the staff calendar. Keep its registry provenance and record the import migration
separately in `MANIFEST.json`. Regenerate the local bundle using
[DESIGN.md](DESIGN.md#local-bundle-pipeline); generated declarations and copied guidelines
must follow the updated source. Verify representative class combinations, including brand
colors, type utilities, variants, and caller overrides, against the previous helper. Run
the standing gates and report any unverified bundle or runtime behavior.

Remove `clsx` and `tailwind-merge` from direct dependencies once application and bundle
source no longer import them. They may remain as dependencies of packages such as
`class-variance-authority`; leave npm to maintain those lockfile entries. Commit the manifest
and lockfile together. A frontend dependency change still follows the normal PR checks;
it does not require a database migration or Production configuration change.

### Automated dependency updates

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
