---
type: Operations Guide
title: Operations, Releases, and Governance
description: Environment discipline, schema operations, lifecycle activation, production releases, strict branch protection, dependency automation, and scheduled-workflow constraints.
resource: GOVERNANCE.md
tags: [operations, governance, releases, branch-protection, automation]
---

# Operations, releases, and governance

## Environment discipline

The default local configuration is Development. Production uses separate `_PROD` operator values and Vercel Production runtime settings (`docs/PORTAL-OPS.md`). Never read, copy, log, or commit values from local secret files.

Normal local start:

```bash
npm ci
npm run dev
npm run build
npm run lint
npm run doctor
npm run test:e2e-guard
```

Full Playwright, schema verification, seeding, migration, and lifecycle commands are privileged operations. Read [testing and source map](testing-and-source-map.md) and the relevant runbook first.

## Schema and lifecycle operations

All schema changes use committed SQL in `supabase/migrations/`, Development first, then Production only after verification. `scripts/verify-schema.mjs --target dev|prod` checks schema/RLS/seed expectations but uses privileged credentials and temporary data; Production mode is an authorized maintenance action, not a casual read-only check.

Lifecycle migration `20260725170000` is present in both hosted schemas according to repository docs. It adds preview/run functions and controls but deliberately schedules no Cron and performs no deletion. Activation requires all gates in `docs/PORTAL-OPS.md`: records/privacy classification, practice-controlled Supabase and compliance posture, disposable/Development forward and rollback proof, field-cap preflight, and approved count-only Production preview.

If activated later, the operator must record job name, schedule, last success, and alert owner outside this repository. Backups are recovery copies, not archives; restore occurs only in an isolated restricted environment followed by lifecycle preview/run and validation. The manual rollback is under `supabase/rollbacks/`, refuses incompatible lifecycle state, and cannot restore deleted rows. These procedures protect the [data and security model](data-and-security.md).

## Release discipline

`main` is production. Normal source, content, and UI changes use review-ready pull requests; urgent direct pushes are exceptional and require equivalent verification and rollback evidence (`GOVERNANCE.md`). Treat merges as patient-facing unless clearly tooling/docs-only.

Repository-recorded strict branch protection requires current-branch:

- `quality`;
- `react-doctor`;
- `Vercel`;
- resolved conversations.

Force pushes and branch deletion are blocked. Approving reviews are not currently required. Every path-triggered disposable integration job must also pass on the exact head even when it is not a repository-setting required check.

React Doctor’s workflow is advisory in execution: green proves the tool ran, not that the report is clean. The repository’s local standard is 100, and the dependency controller separately rejects exact-head errors.

Commit subjects use imperative `type(scope): summary`, with a short why-focused body. Code ownership and the PR template live under `.github/`.

## Automated dependency lane

Dependabot makes version changes; deterministic policy, a read-only Codex review, and a trusted merge controller provide independent boundaries (`AGENTS.md`, `GOVERNANCE.md`, `.github/scripts/dependency-automation.cjs`).

Automatic merge is limited to a verified, ungrouped, single-package, manifest-only npm patch to `main`, for narrowly allowlisted direct dependencies. Grouped, minor/major, source/migration-changing, maintainer-modified, stale, conflicting, ambiguous, or failed-agent changes stop for a human.

Package-changing PRs run a no-secret, disposable local Supabase integration job. It starts a loopback Docker stack, replays committed migrations, tests Auth/SSR/RLS/PostgREST/intake/lifecycle behavior, and destroys the stack without backup. It has no hosted Supabase, Vercel, or repository secrets and no path to Development or Production. This no-hosted-database boundary is a core automation invariant.

The controller rechecks exact SHA, changed paths, deterministic checks, React Doctor, Vercel Preview, Codex, and mergeability; it requests at most one ordinary merge, then waits for post-merge checks, exact Production deployment, and canonical smoke. It cannot use prose or agent judgment to widen eligibility.

## Production integrations and custody

The portal’s GitHub App, email, Supabase, Vercel, and DNS boundaries are detailed in [integrations](integrations.md). Operationally important open items include Supabase/Resend account custody, hosted Auth sender correction, clinic-inbox email canaries, the full throwaway GitHub maintainer acceptance pass, owner 2FA, and repo-only App installation scope. Keep each open until dated evidence exists.

## OpenWiki refresh

OpenWiki is intentionally manual. No OpenWiki workflow is committed or enabled.
From a clean branch based on current `main`, use the reviewed generation contract
in `openwiki/INSTRUCTIONS.md` and the exact CLI version:

```bash
npx --yes openwiki@0.2.0 code --update --print \
  "Refresh only this standalone repository's code wiki; follow openwiki/INSTRUCTIONS.md."
```

Review every generated page against current source. Discard any generated
`CLAUDE.md` or `.github/workflows/openwiki-update.yml`, restore unrelated source
changes, validate front matter and links, run the ordinary documentation checks,
and merge only the reviewed `openwiki/**` output plus the bounded `AGENTS.md`
pointer through a separate protected PR.

The generator-produced scheduled workflow must remain **disabled/not merged**.
It schedules daily execution while using mutable action tags, an unpinned global
`openwiki` install, combined model/tracing secrets with repository write
privileges, and no concurrency, fork/path restrictions, or recorded manual dry
run.

Do not activate scheduled documentation automation until a replacement demonstrates all of the following:

1. every action pinned to an immutable commit;
2. OpenWiki installed at an exact reviewed package version;
3. generation separated from any write/PR job so secret-bearing execution has read-only least privilege;
4. minimal explicit permissions and no persisted checkout credentials;
5. concurrency/cancellation controls;
6. trusted event, fork, branch, and path controls;
7. generated-path-only writes;
8. a successful manual dry run and reviewed diff before any schedule is enabled.

Documentation generation itself must not modify source code or lifecycle/production configuration.

## Operational change checklist

- Dependency or workflow: run policy self-tests and relevant path-triggered disposable integration on the exact head.
- Portal/data change: migration plus rollback where appropriate, Development verification, authorization tests, and no Production E2E.
- UI change: inspect and refresh the UI atlas against the right origin.
- Integration change: preserve server-only credentials, least privilege, honest unavailable states, and provider-specific acceptance evidence.
- Release: verify current-branch checks, conversations, disposable jobs, deployment, canonical smoke, and rollback path.
