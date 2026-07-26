---
type: Repository Guide
title: Westchase GI Quickstart
description: Entry point to the Westchase Gastroenterology codebase, covering its patient website, staff portal, durable appointment intake, safety boundaries, and documentation map.
resource: README.md
tags: [quickstart, nextjs, healthcare, portal, multilingual]
---

# Westchase GI quickstart

## What this repository is

This is the standalone application for **FDHS Westchase Gastroenterology**, a two-location Tampa/Lutz practice. One Next.js 16 codebase serves two related products:

- A patient-facing site in English, Spanish, Vietnamese, Korean, and Arabic. It prioritizes call/text access, appointment requests, practice facts, provider information, preparation instructions, patient education, and forms.
- An English-only staff portal at `/admin`. Staff use it to work appointment requests, manage notification recipients and staff access, review activity, see website custody, manage GitHub maintainers, and print protected review flyers.

The previous vendor form could leave requests in an unmonitored queue. This repository’s central business guarantee is that the [appointment intake workflow](workflows/appointment-intake.md) records a valid request in Postgres before showing success. The queue—not email—is the system of record (`README.md`, `src/lib/portal/intake.ts`).

## Current delivery boundary

Repository documentation records the patient site and task-first portal as deployed at the canonical apex `https://westchasegi.com`; `main` is production. Delivered portal capabilities include the request queue, management surfaces, activity log, Website/maintainer controls, first-login tour and Help, and the integrated review-flyer printer. The docked website-change assistant is only a placeholder. Remaining external acceptance includes the full throwaway GitHub maintainer lifecycle and clinic-approved email canaries (`docs/PORTAL-PRODUCT.md`, `docs/PORTAL-OPS.md`, `docs/INTEGRATION-ACTIVATION.md`).

Lifecycle schema is present through migration `20260725170000`, but **no lifecycle Cron job exists and no retention deletion has run**. Activation remains gated by the approvals and custody controls in [operations and governance](operations-and-governance.md).

## Start locally

Prerequisites: Node.js 22, npm, and Chromium for Playwright when needed.

```bash
npm ci
cp .env.example .env.local   # fill values locally; never commit or paste them
npm run dev                  # patient site and portal on http://localhost:3000
npm run build
npm run lint
npm run doctor
npm run test:e2e-guard
```

Read `.env.example` only for variable names and use `docs/PORTAL-OPS.md` for setup. Do not point routine local tests at Production. `npx playwright test` is **not** a harmless default: it uses privileged setup and mutates only an explicitly allowlisted Development project or a loopback disposable stack. See [testing and source map](testing-and-source-map.md) before running it.

## Where to read next

- [Architecture overview](architecture/overview.md) — route trees, server/client boundaries, proxy behavior, Supabase access, and deployment shape.
- [Appointment intake workflow](workflows/appointment-intake.md) — validation, rate limiting, persistence, receipts, notification fan-out, staff triage, and audit.
- [Product and content domains](domain/product-and-content.md) — users, localization, content models, source-grounded facts, design rules, and portal scope.
- [Data and security](data-and-security.md) — entities, roles, authorization, RLS posture, retention, legal holds, and sensitive-data constraints.
- [Integrations](integrations.md) — Supabase, email, GitHub App, Vercel, DNS, custody, and explicit non-integrations.
- [Operations and governance](operations-and-governance.md) — environments, migrations, branch protection, releases, dependency automation, and lifecycle activation.
- [Testing and source map](testing-and-source-map.md) — safe verification layers, database boundaries, UI references, and change-oriented source locations.

## Non-negotiable rules

1. Patient-facing changes land in all five locale dictionaries; Arabic remains RTL. The staff portal is intentionally English-only.
2. Provider credentials, practice facts, source-mirror imagery, and clinical preparation text are source-controlled facts. Do not normalize, infer, re-encode, or silently reconcile them.
3. Appointment success follows durable persistence. Keep failure and unknown states distinct, retain call/text recovery, and never place patient fields in URLs, notification emails, or logs.
4. Treat names, contact details, optional reasons, and staff notes as sensitive even though intake is PHI-minimal and has no dedicated clinical fields.
5. Portal permissions come from `staff_profiles`, not user-editable Auth metadata. Privileged access remains server-only, and every staff-visible mutation is audited.
6. Normal changes use review-ready pull requests. Strict `main` protection requires current-branch `quality`, `react-doctor`, and `Vercel` statuses plus resolved conversations; force pushes and deletion are blocked (`GOVERNANCE.md`).
7. OpenWiki refresh is manual. Do not add or enable the generator-produced scheduled workflow; it does not meet the repository’s immutable-pin, exact-package, split-privilege, least-privilege, concurrency, fork/path, and manual-dry-run requirements.

## Authoritative source documents

Start with `README.md` and `AGENTS.md`, then consult `PRODUCT.md` and `DESIGN.md` for the patient product, `docs/PORTAL-PRODUCT.md` for the portal, `docs/PORTAL-OPS.md` for data and operational controls, `docs/INTEGRATION-ACTIVATION.md` for custody, and `GOVERNANCE.md` for release policy. Current source and migrations win when prose and behavior diverge; record any discrepancy rather than guessing.

## Backlog

- **Website-change assistant** — `src/app/admin/(portal)/assistant-launcher.tsx`: only a reserved launcher exists; defer workflow documentation until the capability is implemented.
- **External acceptance evidence** — `docs/PORTAL-OPS.md` and `docs/INTEGRATION-ACTIVATION.md`: clinic email canaries, Resend/Supabase custody, and the throwaway GitHub maintainer lifecycle remain operational follow-ups rather than code paths to describe as complete.
- **Translation and content reconciliation** — `README.md` pending confirmations and `src/lib/content/`: native-speaker review, known prep-source discrepancies, provider bios, and remaining PDF slots require practice evidence.
