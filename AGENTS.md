# AGENTS.md, Westchase GI agent guide

Patient‑facing site for FDHS Westchase Gastroenterology (Tampa + Lutz). A faithful polish of the practice’s former vendor site: same identity, source‑grounded facts, repaired patient paths, plus the appointment‑request pipeline (POST → Supabase Postgres queue → PHI‑free staff notifications) and the authenticated staff portal at `/admin`.

This file gives an agent with no prior context a fast ramp‑up: the non‑negotiable rules, the environment truths, and pointers to deeper docs. The goal is autonomous work that is correct on the first pass.

[`MEMORY.md`](MEMORY.md) is an extremely lightweight scratch memory — short notes for little important things that are not yet (or do not belong as) durable product/architecture truth. Glance at it early; append sparingly; promote or delete when settled. Convention for each entry: a `##` heading with the local date and time, a line `HEAD` plus the short SHA from `git log -1 --format=%h` at write time, then the note body.

## Rule authority and ramp‑up

Read in this order, as the task requires:

1. **This file** – the domain‑specific rules and invariants below are hard requirements. They outrank everything, including vendored skills and general framework advice.
2. [`MEMORY.md`](MEMORY.md) – skim for open high‑signal notes that would otherwise be lost between sessions.
3. [`ARCHITECTURE.md`](ARCHITECTURE.md) – system design, module interfaces, external systems, and the change‑type → files map. Start here in an unfamiliar area.
4. [`CONTRIBUTING.md`](CONTRIBUTING.md) – the contribution process: setup, verification surface, commit/PR/merge discipline, and the path to production.
5. Product truth: `PRODUCT.md` (patient‑site brand register and staff‑portal product register) + `DESIGN.md` (design system). UI baseline: `ui‑reference/README.md`.

`README.md` is the human, user‑facing overview – cite it for the documented custody split, but do not treat it as developer documentation.

`.agents/skills/` contains the committed vendor skills and project workflow skills used by this
repository. Their provenance, versions, and update procedure are in `.agents/skills/CODEX.md`.
Treat vendor guidance as advisory and subordinate to this file. Never hand-edit a vendor skill;
re-copy it from upstream.

### Documentation style

Write living instructions as the current operating model: name the workflow, its invariants, and
the steps an agent performs. Historical rationale and chronology belong in dated evidence
records; operational docs stay present-tense and self-sufficient.

## Roles and responsibilities

Who is responsible for what is governed by the roles register in [`docs/roles/README.md`](docs/roles/README.md). The only defined role is the **Lead of Product Experience & Principal Design Engineer** ([`docs/roles/lead-of-product-experience.md`](docs/roles/lead-of-product-experience.md)), who owns product direction, design, the frontend experience, UI‑facing data contracts, and experience acceptance. Work inside that remit — writing a specification, documenting the need for a prototype, changing anything a user sees — is routed to the role (label `role:product-experience`), never absorbed by whoever noticed it.

## Product, brand, and content rules

Product identity, copy register, and brand constraints live in `PRODUCT.md` and the modules that already document them (`src/lib/providers.ts` for credentials; `src/lib/site.ts` and `src/lib/documents.ts` for fact provenance and honest document fallbacks; footer one‑way partner link in `src/components/Footer.tsx`).

**PHI‑minimal posture:** patient fields never appear in notification emails, server logs, or URLs – see [`ARCHITECTURE.md`](ARCHITECTURE.md#architectural-invariants).

## Frontend development

### Visual QA

The visual baseline is required. Before working on the frontend UI, open `ui-reference/README.md`.

Refresh the affected images against the matching local or Preview origin before committing. After deployment, use the default live‑origin capture for public pages.

The atlas includes the seven top‑level staff routes. Refresh them only with the Preview Branch seed identity, preserve the browser‑side redaction, and never include an individual request or Production data.

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

Automatic branching stays enabled for every PR; “Supabase changes only” and “Deploy to
production” stay disabled. Preview Branches contain no Production rows and may receive
destructive test writes. A PR merge never authorizes or performs a Production migration;
Production promotion and scheduler activation remain separate explicit actions.

## GitHub conventions

### Branch protection

GitHub `main` has strict branch protection that requires current-head `quality`,
`react-doctor`, `Vercel`, `Supabase Preview`, and `supabase-integration`, plus resolved
conversations. Force pushes and deletions are blocked. A skipped database check is not a
passing signal.

## Release and operational truth

**Distinguish code merged, code deployed, and operational.** Before completion, disclose every pending or unverified external dependency and post‑deploy check.

## Verification

Commands, credential split, honesty rules, and the change‑type → checks map live in [`CONTRIBUTING.md`](CONTRIBUTING.md#verification); [`ARCHITECTURE.md`](ARCHITECTURE.md#where-logic-lives) owns the change‑type → files map.

**Local React Doctor trap:** a local score is not comparable to CI. Local scans also read untracked build output (`.next/`, `.next-e2e/`); third‑party sourcemaps trip the artifact‑secret rule. Hits under build directories or `node_modules` are noise, never “fix” them by editing generated files. The repository standard is a clean 100 on a clean checkout.

## Agent skills

### Issue tracker

Issues live in this repo's GitHub Issues, managed with the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

The five canonical triage labels are used as-is (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
