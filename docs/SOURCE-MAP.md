# Source map — where to change what, and how to prove it

This file answers two questions that nothing else in the repository answers: **which files does a
given change touch**, and **which checks can actually run in the environment you are working in**.

It is a routing table, not a specification. When this file and the code disagree, the code is
right and this file is stale — fix it in the same pull request. Product rules live in
`AGENTS.md` (hard rules), `PRODUCT.md` and `DESIGN.md` (patient site), and
`docs/PORTAL-PRODUCT.md` (staff portal). Read the hard rules before editing anything.

## Two constraints that break naive changes

- **Five locales are type-enforced.** `src/lib/dictionaries/en.ts` defines
  `export type Dictionary = typeof en`, so a key missing from `es`, `vi`, `ko`, or `ar` is a build
  error, not a runtime gap. Content libraries use the `Bi` type in `src/lib/content/types.ts` for
  the same reason. Arabic is RTL through `localeDir` in `src/lib/site.ts`.
- **The portal is server-authorized.** Every `/admin` page, route handler, and server action calls
  `requireRole` from `src/lib/portal/auth.ts`, which reads `staff_profiles` through the service
  client. Never authorize from user-editable metadata, and never move a portal secret into a
  `NEXT_PUBLIC_*` variable.

## Where to edit

### Patient-facing copy, any locale

- **Edit:** `src/lib/dictionaries/en.ts`, then the same keys in `es.ts`, `vi.ts`, `ko.ts`, `ar.ts`.
- **Also:** page-level facts live in `src/lib/site.ts`, `services.ts`, `resources.ts`,
  `testimonials.ts`; rendering in `src/app/[locale]/**/page.tsx` and `src/components/`.
- **Test:** `e2e/intake-form.spec.ts`, `e2e/language-chooser.spec.ts`, `e2e/smoke.spec.ts`.
- **Note:** portal strings are English-only and live inline in `src/app/admin/`, not in the
  dictionaries.

### A provider or their credentials

- **Edit:** `src/lib/providers.ts`.
- **Also:** `src/lib/review-targets.json` (review destinations), headshots under
  `public/images/staff/`, `src/app/[locale]/physicians/page.tsx`, and the `meta.physicians`
  entries in all five dictionaries.
- **Constraint:** credentials are verbatim and identical in every language. See `AGENTS.md`
  hard rule 1 before touching a title.

### A patient document or PDF slot

- **Edit:** `src/lib/documents.ts`; drop the file in `public/documents/`.
- **Also:** `src/components/DocumentList.tsx`, plus `topicForDocument` in
  `src/lib/content/education/index.ts` and `prepForDocument` in `src/lib/content/preps/index.ts`
  if the slot links to an on-site page.
- **Constraint:** `file` stays `null` until a real PDF exists. A slot with no file falls back to
  the staffed text line or the on-site page; never point at a path that is not there.

### Procedure-prep content

- **Edit:** the handout module under `src/lib/content/preps/`, registered through its `index.ts`.
- **Also:** the matching `docId` in `src/lib/documents.ts`,
  `src/app/[locale]/procedure-prep/[slug]/page.tsx`, `src/components/PrepBody.tsx` for inline
  syntax, `src/app/sitemap.ts`, and legacy redirects in `next.config.ts`.
- **Constraint:** English and Spanish prep bodies are separately transcribed from the practice's
  scans. Source discrepancies are preserved in comments and are open questions for the practice,
  not bugs to normalize.

### A blog post

- **Edit:** add the post to `src/lib/content/blog/batch1.ts`, `batch2.ts`, or `batch3.ts`.
- **Also:** `src/app/sitemap.ts` and the legacy redirect map in `next.config.ts`, which keys off
  the post's `legacyPath`.

### A patient-education topic

- **Edit:** `src/lib/content/education/procedures.ts`, `conditions-a.ts`, or `conditions-b.ts`.
- **Also:** `relatedDocId` linkage into `src/lib/documents.ts`, `src/app/sitemap.ts`, and the
  legacy education redirects in `next.config.ts`.

### Appointment form fields, validation, or the API contract

- **Edit:** `src/lib/portal/contracts.ts` (`requestInputSchema`, `REQUEST_FIELD_LIMITS`,
  `IntakeResponse`), then `src/components/AppointmentForm.tsx`, `src/app/api/requests/route.ts`,
  and `src/app/api/requests/form/route.ts`.
- **Also:** the `appointment.form` strings in all five dictionaries, and the column mapping plus
  length constraints in `src/lib/portal/intake.ts` and the migrations.
- **Test:** `e2e/intake-form.spec.ts`, `e2e/intake-api.spec.ts`,
  `e2e/supabase-dependency-contract.spec.ts`.
- **Constraint:** the honeypot field is deliberately absent from the schema and its submission
  returns a success-shaped response. `IntakeResponse` is the only permitted response shape.

### Intake persistence, throttling, or the receipt flow

- **Edit:** `src/lib/portal/intake.ts`.
- **Also:** `INTAKE_RATE_LIMIT` and `receiptPath` in `src/lib/portal/contracts.ts`,
  `src/lib/portal/intake-notification.ts`, the `portal_check_intake_rate_limit` RPC in
  `supabase/migrations/20260725133049_harden_intake_rate_limits.sql`, and
  `src/app/[locale]/appointment/received/page.tsx`.
- **Constraint:** success renders only after the durable insert; the no-JS path answers `303` with
  a short-lived one-time receipt token; throttling keys off an HMAC, never a raw address; and no
  patient value reaches a URL or a log line. `AGENTS.md` hard rule 10 governs.

### A staff portal page or route

- **Edit:** the route under `src/app/admin/`, with `requireRole` first.
- **Also:** `src/app/admin/(portal)/portal-nav.tsx` if it belongs in navigation, the relevant
  `actions.ts`, and the matcher plus public-path allowlist in `src/proxy.ts` for any new path.
- **Test:** `e2e/portal-home.spec.ts`, `portal-shell.spec.ts`, `portal-requests.spec.ts`,
  `portal-admin-ux.spec.ts`, `portal-admin-server.spec.ts`, `portal-seams.spec.ts`.
- **Note:** occasional tasks are reached from Home or Settings rather than holding a permanent
  nav slot.

### Portal authorization, roles, or sessions

- **Edit:** `src/lib/portal/auth.ts`; session plumbing in `src/lib/portal/server.ts` and
  `src/proxy.ts`.
- **Also:** `StaffRole` and `AUDIT_ACTIONS` in `src/lib/portal/contracts.ts`, the auth entry
  routes under `src/app/admin/`, and `staff_profiles` in the migrations.
- **Test:** `e2e/portal-auth.spec.ts`, `e2e/portal-admin-server.spec.ts`.
- **Constraint:** login, reset request, and one-time-link confirmation are the only public
  session-establishment boundaries, and they stay generic and fail-closed.

### A table, column, RLS policy, or RPC

- **Edit:** a new timestamped file in `supabase/migrations/`, with a rollback sibling in
  `supabase/rollbacks/`.
- **Also:** the assertions in `scripts/verify-schema.mjs` (table list, RPC signatures, retired
  objects), `supabase/seed.sql` and `scripts/seed-portal.mjs` if fixtures change, and the reading
  code in `src/lib/portal/`.
- **Test:** `e2e/supabase-dependency-contract.spec.ts`; `e2e/portal-lifecycle.spec.ts` and
  `e2e/portal-scale.spec.ts` run only against a disposable local stack.
- **Constraint:** RLS stays enabled with no anonymous grants and no authenticated write policies —
  every write goes through a service-role server action, and every staff-visible mutation writes
  an `audit_log` row.

### Notification email

- **Edit:** `src/lib/portal/intake-notification.ts` for the appointment ping,
  `src/lib/portal/management-email.ts` for staff and recipient mail,
  `src/lib/portal/email-provider.ts` for transport.
- **Test:** `e2e/portal-email.spec.ts`, `e2e/portal-admin-ux.spec.ts`.
- **Constraint:** the appointment notification carries zero patient fields — a stable notice and a
  portal link. Failure logs never print recipients or content.

### The Website custody surface and GitHub App

- **Edit:** `src/app/admin/(portal)/settings/software/` and `src/lib/portal/integrations.ts`.
- **Constraint:** authentication is the clinic-owned GitHub App only, through the three
  `PORTAL_GITHUB_APP_*` server-only variables. Never a personal access token, never client-side.
  The portal does not connect to or manage Vercel.

### SEO, metadata, canonical URLs, sitemap, redirects

- **Edit:** `src/lib/metadata.ts`, `src/lib/site.ts`, `src/app/sitemap.ts`, `src/app/robots.ts`,
  and the `redirects()` block in `next.config.ts`.
- **Test:** `e2e/smoke.spec.ts` asserts canonical, hreflang, sitemap, robots, and JSON-LD origin.
- **Constraint:** the canonical origin is the apex `https://westchasegi.com`. Locale routing for
  `/` lives in `src/proxy.ts`, not in `next.config.ts`.

### Design tokens, typography, shared UI

- **Edit:** `src/app/globals.css` for tokens and component classes, `src/lib/fonts.ts` for faces.
- **Also:** read `docs/ui-reference/README.md` first and refresh the affected images.
- **Constraint:** use the CSS variables rather than ad-hoc colors; `:lang()` blocks remap fonts
  for Vietnamese, Korean, and Arabic. Source-mirror graphics stay byte-exact.

### Proxy behavior — locale routing, redirects, header scrubbing

- **Edit:** `src/proxy.ts`. There is no `middleware.ts`.
- **Test:** `e2e/smoke.spec.ts`, `e2e/language-chooser.spec.ts`, `e2e/leak-hygiene.spec.ts`.
- **Constraint:** the matcher is an explicit list, so a new protected path must be added to it.
  Legacy patient-bearing query parameters are scrubbed with a redirect before the document loads.

### CI, dependency automation, release gating

- **Edit:** `.github/workflows/` and `.github/scripts/dependency-automation.cjs`.
- **Constraint:** executable policy and `.github/scripts/dependency-automation.test.cjs` change
  together. Prose never widens the provenance or manifest-only boundary. See
  `.github/codex/dependabot-sop-and-examples.md`.

## What to run

### Without any credentials

This set is exactly the CI `quality` job in `.github/workflows/ci.yml`. It needs no `.env.local`,
no Supabase project, and no secrets, so it is the complete verification surface available to an
automated agent working in a clean container:

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

One caveat on `npm run doctor`: it scans the working tree, including untracked build output like
`.next/` and `.next-e2e/`. Bundled third-party sourcemaps in those directories trigger the
artifact-secret rule, so a local score can sit far below the CI score for reasons that have
nothing to do with your change. Check the path on each finding — anything under a build directory
or `node_modules` is local noise.

### Requiring a development Supabase project

These need `.env.local` pointing at a development project — never Production. The guard in
`e2e/target-guard.ts` refuses to run when `SUPABASE_PROJECT_REF` does not match
`PLAYWRIGHT_ALLOWED_SUPABASE_PROJECT_REF`, and rejects the Production reference outright.

```bash
npx playwright test                          # full serial suite
node scripts/verify-schema.mjs --target dev  # schema, RLS, seed state
npm run ui:reference:portal                  # staff-route captures
```

An agent that cannot reach a Supabase project must run the no-credential set and say plainly that
the credentialed suite did not run. Do not describe the full suite as passing on the strength of
the smoke test.
