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

`.agents/skills/` contains the committed, vendor‑authored skills used by this project. Their provenance, versions, and update procedure are in `.agents/skills/CODEX.md`. Treat them as advisory and subordinate to this file. Never hand‑edit a vendored skill; re‑copy it from upstream.

## Product, brand, and content rules

Product identity, copy register, and brand constraints live in `PRODUCT.md` and the modules that already document them (`src/lib/providers.ts` for credentials; `src/lib/site.ts` and `src/lib/documents.ts` for fact provenance and honest document fallbacks; footer one‑way partner link in `src/components/Footer.tsx`).

**PHI‑minimal posture:** patient fields never appear in notification emails, server logs, or URLs – see [`ARCHITECTURE.md`](ARCHITECTURE.md#architectural-invariants).

## Frontend development

### Visual QA

The visual baseline is required. Before working on the frontend UI, open `ui-reference/README.md`.

Refresh the affected images against the matching local or Preview origin before committing. After deployment, use the default live‑origin capture for public pages.

The atlas includes the seven top‑level staff routes. Refresh them only with the Development/Preview seed identity, preserve the browser‑side redaction, and never include an individual request or Production data.

## Backend development

### Intake, privacy, and portal security

Never weaken the [architectural invariants](ARCHITECTURE.md#architectural-invariants), [critical flows](ARCHITECTURE.md#critical-flows), [patient-data lifecycle](ARCHITECTURE.md#patient-request-data-lifecycle), or [external interfaces](ARCHITECTURE.md#external-interfaces). The executable sources are `src/lib/portal/intake.ts`, `src/lib/portal/contracts.ts`, and `src/lib/portal/auth.ts`.

### Supabase guidance and dependency contract

Use the committed `supabase` and `supabase-postgres-best-practices` skills for database, Auth, and RLS work.

Every PR reports the `supabase-integration` gate. A database-adjacent change—including a package change—runs `e2e/supabase-dependency-contract.spec.ts` in a separate GitHub-hosted Ubuntu job. That job starts a disposable Docker Supabase stack, replays committed migrations, seeds local-only fixtures, checks Auth/SSR sessions, permission boundaries, intake persistence, shared throttling, lifecycle boundaries, and PostgREST relationships, then stops the stack even on failure.

The disposable job receives no hosted Supabase, Vercel, or repository secrets. It never runs on Jason’s Mac and has no path that applies migrations or test writes to Development or Production. Post‑merge Production verification only checks the matching Vercel deployment and performs a read‑only canonical‑site smoke request.

## GitHub conventions

### Branch protection

GitHub `main` has strict branch protection that requires the current‑branch `quality`, `react-doctor`, and `Vercel` statuses, plus resolved conversations. Force pushes and deletions are blocked.

The detector may skip the disposable suite only when the diff is not database-adjacent; the always-reported gate must still pass on the exact head.

## Release and operational truth

**Distinguish code merged, code deployed, and operational.** Before completion, disclose every pending or unverified external dependency and post‑deploy check.

## Verification

Commands, credential split, honesty rules, and the change‑type → checks map live in [`CONTRIBUTING.md`](CONTRIBUTING.md#verification); [`ARCHITECTURE.md`](ARCHITECTURE.md#where-logic-lives) owns the change‑type → files map.

**Local React Doctor trap:** a local score is not comparable to CI. Local scans also read untracked build output (`.next/`, `.next-e2e/`); third‑party sourcemaps trip the artifact‑secret rule. Hits under build directories or `node_modules` are noise, never “fix” them by editing generated files. The repository standard is a clean 100 on a clean checkout.
