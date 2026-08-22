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

`.agents/skills/` holds the committed vendor skills and project workflow skills this repository
uses. Provenance, versions, and the update procedure are in `.agents/skills/CODEX.md`. Treat
vendor guidance as advisory and subordinate to this file. Never hand-edit a vendored skill;
re-copy it from upstream.

### Documentation style

Write living instructions as the current operating model: name the workflow, its invariants, and
the steps an agent performs. Historical rationale and chronology belong in dated evidence
records; operational docs stay present-tense and self-sufficient.

## Contribution loop

Commits on a worktree are allowed. Use them while you work.

The standing gates are:

- `npx oxlint` reports zero warnings and zero errors under the repository's configured rules. Do not skip rules or narrow the scan to make the gate pass.
- `npx oxfmt --check` reports that every matched file already matches `.oxfmtrc.json`. Do not skip files or narrow the scan to make the gate pass. If it fails, run `npx oxfmt` and check again.
- `npx react-doctor@latest --verbose` reports a score of 100.
- `npm run build` completes a production compile and typecheck with no errors. Oxlint, oxfmt, and React Doctor can all pass while this fails, so they do not replace it. Do not skip it, narrow it, or substitute `tsc --noEmit`. Use the no-credentials environment in [`CONTRIBUTING.md`](CONTRIBUTING.md#verification) when `.env.local` is absent. If the build cannot run, say so; the loop has not passed.
- Visual evidence is in the pull-request conversation for every UI-visible change. A single-state change needs before and after screenshots. A new workflow or a feature with more than one authored step needs a video of that path. A clean lint score with no visual evidence is a failed loop.

An extra linter you are asked to run, including a single oxlint rule, is added to the loop. It does not replace the standing gates. Example: you are given a rule, you fix its findings, and that rule goes quiet. You still run full `npx oxlint`, `npx oxfmt --check`, React Doctor, and `npm run build`. Passing the extra check is not a pass of the loop.

Order: run the extra check, fix what it finds, then run the standing gates. If a standing gate fails, fix those findings and rerun every check that already passed, including the extra one. A later fix can reopen an earlier lint, undo formatting, or break the production build.

Do not finish the turn until every check in the loop is clean: the extra linters you were given, plus `npx oxlint` with zero warnings and zero errors, plus `npx oxfmt --check` with no drift, plus React Doctor at 100, plus `npm run build` with a successful compile and typecheck, plus visual evidence in the pull-request conversation when the change is UI-visible. The same bar applies before you open a pull request or merge a worktree into a branch. Formatting drift, a warning, an error, a score below 100, a failed production build, or a UI change whose PR conversation has no screenshots — or no video when the change is a workflow — is a failed gate.

Local React Doctor trap: a local score is not comparable to CI. Local scans also read untracked build output (`.next/`, `.next-e2e/`). Third-party sourcemaps trip the artifact-secret rule. Hits under build directories or `node_modules` are noise. Never "fix" them by editing generated files. The 100 that counts is a clean checkout of the work you are about to share.

## Product, brand, and content rules

Product identity, copy register, and brand constraints live in `PRODUCT.md` and the modules that already document them (`src/lib/providers.ts` for credentials; `src/lib/site.ts` and `src/lib/documents.ts` for fact provenance and honest document fallbacks; footer one-way partner link in `src/components/Footer.tsx`).

## Frontend development

### Visual QA

The visual baseline is required. Before working on the frontend UI, open `ui-reference/README.md`.

Refresh the affected images against the matching local or Preview origin before committing. After deployment, use the default live-origin capture for public pages.

The atlas includes the seven top-level staff routes. Refresh them only with the Preview Branch seed identity, keep the browser-side redaction, and never include an individual request or Production data.

### Visual evidence

This gate sits beside oxlint, oxfmt, React Doctor, and `npm run build`. An agent that changes a visible UI surface does not finish, open a pull request, or merge a worktree until the pull-request conversation contains visual evidence of that change.

What to post:

- **Still change** — one screen, one state, or a copy/layout/color shift: before and after screenshots of every affected surface at the viewports the change is authored for. Desktop is 1440×900 and mobile is 390×844 when both apply.
- **Workflow or multi-step feature** — a new path, a handoff, or any change whose meaning is the sequence of steps: a video of the authored path. Screenshots may sit beside the video; they do not replace it.

How to post it:

- Put the evidence in a pull-request conversation comment, not only the PR body and not only the committed `ui-reference/` atlas.
- Capture from a local or Preview origin with fictional identity. Never Production. Never real patient or staff data. Never record the sign-in form; start a workflow video after the session exists.
- Atlas pages may be embedded from `ui-reference/` at the merge-base SHA (before) and the exact head SHA (after), the same way #227 does.
- Request-detail and other patient-data surfaces stay out of `ui-reference/`. Host those captures on a disposable `assets/pr-<number>-ui-evidence` branch and embed them in the comment.
- Name the before SHA and the after SHA. For a stack of UI commits, show how each commit changed the screen, not only the branch tip.
- Do not finish the turn until the comment is posted and the images — and the video, when required — render.

## Backend development

### Intake, privacy, and portal security

Never weaken the [architectural invariants](ARCHITECTURE.md#architectural-invariants), [critical flows](ARCHITECTURE.md#critical-flows), [patient-data lifecycle](ARCHITECTURE.md#patient-request-data-lifecycle), or [external interfaces](ARCHITECTURE.md#external-interfaces). The executable sources are `src/lib/portal/intake.ts`, `src/lib/portal/contracts.ts`, and `src/lib/portal/auth.ts`.

### Supabase guidance and dependency contract

Use the project-authored `wgi-supabase-branching` skill first, then the committed `supabase` and
`supabase-postgres-best-practices` vendor skills for database, Auth, and RLS work.

Every PR receives an isolated hosted Supabase Preview Branch and reports two database checks:
`Supabase Preview` deploys configuration, migrations, and fictional SQL seed data;
`supabase-integration` fetches only that branch's credentials, creates the fictional Auth
fixture, verifies schema/RLS/RPCs, and exercises Auth/SSR sessions, permission boundaries,
intake persistence, shared throttling, lifecycle boundaries, and PostgREST relationships.
Together, these checks are the database release gate for the exact PR head.

Automatic branching stays enabled for every PR; "Supabase changes only" and "Deploy to
production" stay disabled. Preview Branches contain no Production rows and may receive
destructive test writes. A PR merge never authorizes or performs a Production migration;
Production promotion and scheduler activation remain separate explicit actions.

## GitHub conventions

### Branch protection

GitHub `main` requires the current-head `quality`, `react-doctor`, `Vercel`, `Supabase Preview`,
and `supabase-integration` statuses, plus resolved conversations. Force pushes and deletions
are blocked. A skipped database check is not a passing signal.

## Release and operational truth

Distinguish code merged, code deployed, and operational. Before you finish, name every pending or unverified external dependency and post-deploy check.

## Verification

Commands, credential split, honesty rules, and the change-type → checks map live in [`CONTRIBUTING.md`](CONTRIBUTING.md#verification). [`ARCHITECTURE.md`](ARCHITECTURE.md#where-logic-lives) owns the change-type → files map.

Lint, format, production-build, and visual-evidence gates for pull requests and worktree merges live in [Contribution loop](#contribution-loop).

## Agent skills

### Issue tracker

Issues live in this repo's GitHub Issues, managed with the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

The five canonical triage labels are used as-is (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `CONTEXT.md` plus `docs/adr/` at the repo root. See `docs/agents/domain.md`.
