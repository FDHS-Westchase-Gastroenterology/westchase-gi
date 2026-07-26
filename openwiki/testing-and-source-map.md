---
type: Testing Reference
title: Testing and Source Map
description: Verification layers, destructive-target protections, no-hosted-database CI boundaries, UI baselines, and a change-oriented source map.
resource: e2e
tags: [testing, playwright, ci, source-map, safety]
---

# Testing and source map

## Verification layers

Use the narrowest layer that proves the change.

### Static and no-database checks

```bash
npm run lint
npm run build
npm run doctor
npm run test:e2e-guard
node --test .github/scripts/dependency-automation.test.cjs
node --test src/lib/portal/request-query.test.mjs
node scripts/verify-review-flyers.mjs
```

`npm run test:e2e-guard` exercises the target-safety matrix without a server or database. CI’s `quality` job has read-only contents permission, receives no repository secrets, uses nonfunctional local placeholders for build, and runs public smoke with:

```bash
PLAYWRIGHT_PUBLIC_SMOKE=1 npx playwright test e2e/smoke.spec.ts --project=chromium
```

Public smoke disables global database setup/teardown and the no-JS project. It is the normal no-secret, no-hosted-database browser check.

### Full Playwright suite

```bash
npx playwright test
npx playwright test e2e/intake-api.spec.ts
```

This suite is serial (`workers: 1`) because shared Development Auth rate-limits sign-ins and recovery. Credential-bearing runs retain no screenshots, traces, video, or HTML report.

**Important:** the full suite mutates its database target. Global setup uses privileged access, snapshots and disables notification recipients, and teardown restores state. `e2e/target-guard.ts` permits only:

- a hosted Development Supabase project whose URL/reference exactly match an explicit allowlist and differ from explicit Production URL/reference; or
- a loopback disposable stack with project reference and allowlist set to `local`.

Production is rejected even if someone tries to allowlist it. Do not run full Playwright until the target guard inputs are understood and verified.

### Disposable Supabase integration

`.github/workflows/supabase-dependency-integration.yml` is the preferred no-hosted-database integration boundary for package and data-path changes. It installs a pinned Supabase CLI, starts a loopback Docker stack, seeds local fixtures, runs representative Auth/SSR/RLS/PostgREST/intake/request/lifecycle/scale tests, and always stops the stack without backup. It receives no repository or deployment secrets.

Do not replace this with a Development or Production CI target. That separation is enforced by [operations and governance](operations-and-governance.md).

### Privileged operational verification

`scripts/verify-schema.mjs --target dev|prod`, seeding, migrations, lifecycle functions, and full hosted tests require runbook review and authorization. Production schema verification creates/deletes temporary data and is not read-only. `scripts/verify-no-secrets.mjs` sweeps git history; use it when the task permits history inspection and never expose any match content.

## What the suites cover

| Area | Representative specs |
|---|---|
| Public routes, redirects, metadata, locale behavior | `smoke.spec.ts`, `language-chooser.spec.ts` |
| Intake JSON/no-JS, truthful states, caps, receipts | `intake-api.spec.ts`, `intake-form.spec.ts` |
| Leak and output hygiene | `leak-hygiene.spec.ts`, `portal-admin-server.spec.ts` |
| Auth, invite/recovery, roles, closed seams | `portal-auth.spec.ts`, `portal-seams.spec.ts`, `portal-admin-server.spec.ts` |
| Queue, export, pagination, lifecycle | `portal-requests.spec.ts`, `portal-scale.spec.ts`, `portal-lifecycle.spec.ts` |
| Portal home/shell/UX/management | `portal-home.spec.ts`, `portal-shell.spec.ts`, `portal-admin-ux.spec.ts` |
| Email, Website/GitHub, flyers | `portal-email.spec.ts`, `portal-maintainers.spec.ts`, `portal-website.spec.ts`, `portal-review-flyers.spec.ts` |
| Disposable Supabase contract | `supabase-dependency-contract.spec.ts` |

Tests verify the [architecture](architecture/overview.md), [appointment workflow](workflows/appointment-intake.md), [data controls](data-and-security.md), and [integrations](integrations.md) as one system.

## Visual baseline

`docs/ui-reference/README.md` indexes desktop/mobile PNGs for representative public pages, Arabic RTL, admin login, and seven top-level portal routes. Before frontend work, inspect the relevant image.

- `npm run ui:reference` captures the canonical live public site.
- `npm run ui:reference -- http://localhost:3000` captures a local/Preview public change.
- `npm run ui:reference:portal -- http://localhost:3000` captures portal routes with the Development/Preview identity.

Portal capture is read-only, redacts account/queue data in the browser, omits request details, and must never target Production. Inspect changed images before committing.

## Change-oriented source map

| Change | Start here | Then verify/watch |
|---|---|---|
| Practice facts, locations, links, locale helpers | `src/lib/site.ts` | metadata/JSON-LD, header/footer, maps, forms, sitemap |
| Patient copy/localization | `src/lib/dictionaries/en.ts`, sibling dictionaries | all five shapes, Arabic RTL, language chooser |
| Providers/services | `src/lib/providers.ts`, `src/lib/services.ts` | exact credentials, source evidence, localized HTML |
| Blog/education/preps | `src/lib/content/` | static params, legacy redirects, provenance, all locales |
| Public PDFs | `src/lib/documents.ts`, `public/documents/` | honest fallback, matching ID, download behavior |
| Patient route/layout/SEO | `src/app/[locale]/`, `src/lib/metadata.ts` | locale validation, canonical/hreflang, sitemap, UI atlas |
| Legacy redirects/root locale/admin perimeter | `next.config.ts`, `src/proxy.ts` | redirect order, query scrubbing, auth seams |
| Intake contract/API | `src/lib/portal/contracts.ts`, `src/app/api/requests/`, `src/lib/portal/intake.ts` | caps, honeypot, atomic rate limit, durable success, receipt privacy |
| Portal auth/data access | `src/lib/portal/auth.ts`, `src/lib/portal/server.ts` | `staff_profiles`, role checks, server-only service client |
| Queue and lifecycle | `src/app/admin/(portal)/requests/`, latest migrations | audit atomicity, closure disposition, holds, retention |
| Staff/recipient management | `src/lib/portal/management.ts`, Settings routes | self-protection, role matrix, email outcomes, audit |
| GitHub maintainers/custody | `src/lib/portal/integrations.ts`, maintainer modules | exact repo ID, App permissions, no PAT/Preview secret |
| Email | `src/lib/portal/email*.ts`, `intake-notification.ts` | PHI-free text, timeout/idempotency, Auth SMTP separation |
| Review flyers | `src/lib/review-targets.json`, `src/lib/review-flyers.ts`, admin flyer routes | pinned hashes, protected assets, admin-only downloads |
| Schema/RLS | `supabase/migrations/`, `scripts/verify-schema.mjs` | forward/rollback, closed Data API, disposable integration |
| CI/dependencies/releases | `.github/workflows/`, `.github/scripts/`, `GOVERNANCE.md` | immutable pins, exact SHA, least privilege, branch checks |

## Selecting verification

- Content-only localized edit: lint, build, affected public smoke/UI reference.
- Intake or queue edit: guard test, lint/build, focused intake/portal specs against an approved target, and disposable integration when schema/dependencies are involved.
- Auth/security edit: guard test plus anonymous/staff/admin seams and disposable Supabase contract.
- Migration: forward/rollback and repeatability on disposable local first, then authorized Development; Production only under the operations runbook.
- Workflow/dependency edit: dependency-policy unit tests, target guard, quality, and every exact-head path-triggered job.
