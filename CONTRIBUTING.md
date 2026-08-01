# Contributing — Westchase GI

How to contribute to this repository: setup, verification, commit/PR/merge discipline, and
the path to production. Read [`ARCHITECTURE.md`](ARCHITECTURE.md) for the system design and
the where-logic-lives map this guide references. The non-negotiable product and security
rules are in [`AGENTS.md`](AGENTS.md) — read its hard rules before editing anything.

Product truth lives in `PRODUCT.md` (patient-site and staff-portal registers) and `DESIGN.md`.
Repository custody facts are summarized in [`README.md`](README.md); the design of every
external connection is in [`ARCHITECTURE.md`](ARCHITECTURE.md#external-interfaces).

## Setup

```bash
npm ci
cp .env.example .env.local   # fill in real values; this is the variable inventory
npx playwright install chromium
npm run dev                  # patient site + portal on :3000
npm run dev:mission          # the E2E stack's server on :3100
```

`.env.local` points the DEFAULT environment at a **development** Supabase project; production
values live under the `_PROD`-suffixed names and in the Vercel environment store. Never point
local tests at production — the E2E target guard refuses, but don't rely on it.

Node version is pinned in `.nvmrc`. It deliberately does not live in `engines.node`: Vercel
reads that field and would take Production off the version chosen in Project Settings.

## Verification

### What to run — without credentials

This set is exactly the CI `quality` job (`.github/workflows/ci.yml`). It needs no
`.env.local`, no Supabase project, and no secrets, so it is the complete verification
surface available to an agent or contributor working in a clean container:

```bash
npm ci --no-audit --no-fund
node --test .github/scripts/dependency-automation.test.cjs
npm run test:e2e-guard
npm run test:unit
npm run lint
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 \
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=ci-public-placeholder \
  SUPABASE_SERVICE_ROLE_KEY=ci-server-placeholder \
  npm run build
npx playwright install --with-deps chromium
PLAYWRIGHT_PUBLIC_SMOKE=1 npx playwright test e2e/smoke.spec.ts --project=chromium
```

`npm run doctor` and `node scripts/verify-no-secrets.mjs` also run with no credentials.

`npm run doctor` caveat: it scans the working tree, including untracked build output like
`.next/` and `.next-e2e/`, whose bundled third-party sourcemaps trip the artifact-secret
rule. A local score can sit far below the CI score for reasons unrelated to your change.
Read the path on every finding: anything under a build directory or `node_modules` is local
noise — never "fix" it by editing generated files. The repository standard is a clean 100
on a clean checkout.

### What to run — with a development Supabase project

```bash
npx playwright test                          # full serial E2E suite (boots :3100 itself)
npx playwright test e2e/smoke.spec.ts        # focused file
node scripts/verify-schema.mjs --target dev  # schema, RLS, seed state
npm run ui:reference:portal                  # staff-route UI captures
```

These need `.env.local` pointing at a development project — never Production.
`e2e/target-guard.ts` enforces this; see
[test isolation](ARCHITECTURE.md#test-isolation-and-release-model). The suite covers the
intake API contract, form states across all five locales, the no-JS fallback, portal auth/RLS
boundaries, the queue lifecycle, management surfaces, Website custody, and leak hygiene.

**Honesty rule:** if you cannot reach a Supabase project, run the credential-free set and say
plainly that the credentialed suite did not run. "Not run" is an acceptable answer; silently
implying a pass is not. Never describe the full suite as passing on the strength of the
smoke test.

### By change type

| Change | Required checks |
|---|---|
| Patient copy / locale content | `test:unit`, `lint`, `build`, public smoke; E2E intake-form + language-chooser when behavior shifts |
| Intake form / API / persistence | Above + `npx playwright test` (intake specs) |
| Portal page, route, or action | Above + `npx playwright test` (portal specs) |
| Migration, RLS, RPC, or seed | Above + `verify-schema.mjs --target dev`; disposable-contract job runs in CI on the exact head |
| Email paths | `npx playwright test e2e/portal-email.spec.ts` |
| UI-visible change | Refresh covered `ui-reference/` images; before/after screenshots in the PR |
| CI / dependency automation | `node --test .github/scripts/dependency-automation.test.cjs` — policy and test change together |

Every PR reports the `supabase-integration` gate. When the workflow's diff detector finds a
database-adjacent change—including a package change—it runs
`e2e/supabase-dependency-contract.spec.ts` against a disposable local Supabase stack. That job
receives no hosted secrets and checks Auth refresh, SSR cookie sessions, closed Data API/RLS
boundaries, shared intake throttling, field caps, appointment-request-lifecycle boundaries, and PostgREST
persistence/relationships.

### UI changes

Open [`ui-reference/README.md`](ui-reference/README.md) before frontend work. Refresh the
affected images against the matching local or Preview origin; use the default live-origin
capture after deployment for public pages. The portal atlas covers only the seven top-level
staff routes with the Development/Preview seed identity, redacts in-browser, and never runs
against Production.

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
screenshots for visible changes (or an explicit N/A), medical/content provenance when
compliance-sensitive text changes (provider credentials are verbatim — see
`src/lib/providers.ts`), risk/rollback, and deployment impact.

Keep PRs small and single-purpose. Link the issue. Anything unverified (links, facts,
locales) stays out until verified — see `PRODUCT.md` design principle 1.

## Merging

`main` is protected and **is production**. As configured, it requires current-branch
`quality`, `react-doctor`, and `Vercel` statuses plus resolved conversations; force pushes
and deletion are blocked. Treat every merge as patient-facing unless the change is
explicitly non-user-visible (tooling, governance, docs-only).

Before merge, confirm the always-reported `supabase-integration` gate passed on the **exact
head**. A skipped disposable suite is legitimate only when its detector found no
database-adjacent change. Pending, missing, stale, or failed signals withhold the merge.

React Doctor is advisory: a green check proves execution, not a clean result — inspect the
report rather than the badge.

**Direct push to `main`** is for urgent production hotfixes only (admin), and must carry the
same verification evidence a PR would (CI green, live spot-check, rollback noted). Normal
changes never request a bypass.

## Dependency updates

Dependabot PRs travel a guarded automatic lane with three independent boundaries:

1. **Deterministic PR gates** (no-secret runner: clean install, policy self-test, lint,
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
+ regression tests: `.github/scripts/dependency-automation.cjs` and
`.github/scripts/dependency-automation.test.cjs` (they change together). SOP:
`.github/codex/dependabot-sop-and-examples.md`. `OPENAI_API_KEY` is a repository Actions
secret; never copy it into source, logs, PR text, Dependabot secrets, or an agent workspace.

## Shipping to production

1. Merge to `main` → required checks → automatic deploy on the clinic-owned Vercel project →
   exact-commit production verification against the canonical site.
2. **Migrations promote separately.** Apply to development first
   (`supabase link` + `supabase db push`), verify, then make the production decision
   explicitly — merging a migration PR does not authorize production promotion. Every new
   schema-changing migration ships with a rollback sibling in `supabase/rollbacks/` (migrations
   before `20260725170000` predate the convention); after an
   approved hosted rollback, mark versions reverted in the migration ledger before any later
   push.
3. **Environment changes** go through the Vercel environment store
   (`printf '%s' "$NEW_VALUE" | vercel env add NAME production`), never into shell history
   echoes, source, or `NEXT_PUBLIC_*`. Redeploy and spot-check after a change.
4. **Rotating a credential:** generate at the provider → update the Vercel targets (and
   `.env.local`) → redeploy → spot-check (test submission on a preview URL;
   `verify-schema.mjs --target dev`). For the GitHub App private key: generate in the
   clinic-owned App settings, update Production, redeploy, prove the live GitHub status,
   then revoke the old key — and never make the Administration-capable key available to
   Preview.

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
node scripts/verify-schema.mjs --target dev       # schema/RLS/seed health (--target prod is an authorized maintenance action)
node scripts/verify-no-secrets.mjs                # git history secret sweep
node scripts/verify-review-flyers.mjs             # QR destinations + artifact fidelity
```

## Common tasks

- **Add a patient PDF:** drop the file in `public/documents/`, set that entry's `file` in
  `src/lib/documents.ts` — the row (and, for disease sheets, the education page's take-home
  box) switches to a download link in all five languages. A slot with no real file keeps its
  honest fallback; never point at a path that does not exist.
- **Everything else** — provider updates, preps, blog posts, education topics, portal pages,
  migrations, SEO, CI: use the architecture [change-type → files map](ARCHITECTURE.md#where-logic-lives)
  and the change-type → checks map under §Verification above.

## Access lifecycle

Repository access stays limited to maintainers with a concrete need. ASTXRTYS holds Write;
elevate to Admin only for a specific settings task, then return to Write, and revoke when the
engagement ends.
