# AGENTS.md, Westchase GI agent guide

Read this first. It has the hard rules, environment facts, and pointers to the rest. The aim is work that is right on the first pass.

[`MEMORY.md`](MEMORY.md) is scratch memory: short notes that are not (or not yet) durable product or architecture truth. Glance at it early. Append sparingly. Promote or delete when settled. Each entry: a `##` heading with the local date and time, a line `HEAD` plus the short SHA from `git log -1 --format=%h` at write time, then the note body.

## Rule authority and ramp-up

Read in this order, as the task requires:

1. This file: the domain-specific rules and invariants below are hard requirements. They outrank everything, including vendored skills and general framework advice.
2. [`MEMORY.md`](MEMORY.md): skim for open notes that would otherwise be lost between sessions.
3. [`ARCHITECTURE.md`](ARCHITECTURE.md): system design, module interfaces, external systems, and the change-type → files map. Start here in an unfamiliar area.
4. [`CONTRIBUTING.md`](CONTRIBUTING.md): setup, verification, commit/PR/merge discipline, and the path to production.
5. Product truth: `PRODUCT.md` (patient-site brand register and staff-portal product register) plus `DESIGN.md` (design system). UI baseline: `ui-reference/README.md`.

`README.md` is the user-facing overview. Cite it for the documented custody split. Do not treat it as developer documentation.

`.agents/skills/` holds the committed, vendor-authored skills this project uses. Provenance, versions, and the update procedure are in `.agents/skills/CODEX.md`. Treat them as advisory and subordinate to this file. Never hand-edit a vendored skill; re-copy it from upstream.

## Contribution loop

Commits on a worktree are allowed. Use them while you work.

The standing lint gates are:

- `npx oxlint` reports zero warnings and zero errors under the repository's configured rules. Do not skip rules or narrow the scan to make the gate pass.
- `npx react-doctor@latest --verbose` reports a score of 100.

An extra linter you are asked to run, including a single oxlint rule, is added to the loop. It does not replace the standing gates. Example: you are given a rule, you fix its findings, and that rule goes quiet. You still run full `npx oxlint` and React Doctor. Passing the extra check is not a pass of the loop.

Order: run the extra check, fix what it finds, then run both standing gates. If a standing gate fails, fix those findings and rerun every check that already passed, including the extra one. A later fix can reopen an earlier lint.

Do not finish the turn until every check in the loop is clean: the extra linters you were given, plus `npx oxlint` with zero warnings and zero errors, plus React Doctor at 100. The same bar applies before you open a pull request or merge a worktree into a branch. A warning, an error, or a score below 100 is a failed gate.

Local React Doctor trap: a local score is not comparable to CI. Local scans also read untracked build output (`.next/`, `.next-e2e/`). Third-party sourcemaps trip the artifact-secret rule. Hits under build directories or `node_modules` are noise. Never "fix" them by editing generated files. The 100 that counts is a clean checkout of the work you are about to share.

## Product, brand, and content rules

Product identity, copy register, and brand constraints live in `PRODUCT.md` and the modules that already document them (`src/lib/providers.ts` for credentials; `src/lib/site.ts` and `src/lib/documents.ts` for fact provenance and honest document fallbacks; footer one-way partner link in `src/components/Footer.tsx`).

## Frontend development

### Visual QA

The visual baseline is required. Before working on the frontend UI, open `ui-reference/README.md`.

Refresh the affected images against the matching local or Preview origin before committing. After deployment, use the default live-origin capture for public pages.

The atlas includes the seven top-level staff routes. Refresh them only with the Development/Preview seed identity, keep the browser-side redaction, and never include an individual request or Production data.

## Backend development

### Intake, privacy, and portal security

Never weaken the [architectural invariants](ARCHITECTURE.md#architectural-invariants), [critical flows](ARCHITECTURE.md#critical-flows), [patient-data lifecycle](ARCHITECTURE.md#patient-request-data-lifecycle), or [external interfaces](ARCHITECTURE.md#external-interfaces). The executable sources are `src/lib/portal/intake.ts`, `src/lib/portal/contracts.ts`, and `src/lib/portal/auth.ts`.

### Supabase guidance and dependency contract

Use the committed `supabase` and `supabase-postgres-best-practices` skills for database, Auth, and RLS work.

Every PR reports the `supabase-integration` gate. A database-adjacent change, including a package change, runs `e2e/supabase-dependency-contract.spec.ts` in a separate GitHub-hosted Ubuntu job. That job starts a disposable Docker Supabase stack, replays committed migrations, seeds local-only fixtures, checks Auth/SSR sessions, permission boundaries, intake persistence, shared throttling, lifecycle boundaries, and PostgREST relationships, then stops the stack even on failure.

The disposable job receives no hosted Supabase, Vercel, or repository secrets. It never runs on Jason's Mac and has no path that applies migrations or test writes to Development or Production. After merge, Production verification only checks the matching Vercel deployment and does a read-only canonical-site smoke request.

## GitHub conventions

### Branch protection

GitHub `main` requires the current-branch `quality`, `react-doctor`, and `Vercel` statuses, plus resolved conversations. Force pushes and deletions are blocked.

The detector may skip the disposable suite only when the diff is not database-adjacent. The always-reported gate must still pass on the exact head.

## Release and operational truth

Distinguish code merged, code deployed, and operational. Before you finish, name every pending or unverified external dependency and post-deploy check.

## Verification

Commands, credential split, honesty rules, and the change-type → checks map live in [`CONTRIBUTING.md`](CONTRIBUTING.md#verification). [`ARCHITECTURE.md`](ARCHITECTURE.md#where-logic-lives) owns the change-type → files map.

Lint gates for pull requests and worktree merges live in [Contribution loop](#contribution-loop).

## Agent skills

### Issue tracker

Issues live in this repo's GitHub Issues, managed with the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

The five canonical triage labels are used as-is (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `CONTEXT.md` plus `docs/adr/` at the repo root. See `docs/agents/domain.md`.
