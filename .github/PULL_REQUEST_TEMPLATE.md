## Summary / why

<!-- One or two sentences: what changed and why it matters for patients, staff, or the practice. -->

## Scope

<!-- Routes, components, locales, content areas, or config touched. ARCHITECTURE.md §14 lists what
each kind of change usually touches. Link parity or strategy docs when relevant. -->

## Verification

These need no credentials and mirror the required CI checks. Run all of them:

- [ ] `npm run test:unit`
- [ ] `npm run test:e2e-guard`
- [ ] `npm run lint`
- [ ] `npm run build`
- [ ] `npm run doctor` — local React Doctor standard is 100; inspect the report, not just the status
- [ ] `PLAYWRIGHT_PUBLIC_SMOKE=1 npx playwright test e2e/smoke.spec.ts --project=chromium`

These run automatically against this PR's hosted Supabase Preview Branch. State the real
outcome — “not run” is acceptable before CI reports, silently implying a pass is not:

- [ ] `Supabase Preview` — configuration/migrations/seed passed on the exact head:
- [ ] `supabase-integration` — hosted branch schema + credentialed E2E passed:
- [ ] `node scripts/verify-schema.mjs --target branch` — included in the hosted gate; manual rerun / N/A:

<!-- Paste command output, CI links, or manual checks that back the boxes above. -->

## UI screenshots

<!-- Required for visible changes. Before/after or annotated captures, with viewport and locale
coverage noted. Refresh ui-reference/ images when a covered surface changed. N/A for non-UI
work — say so explicitly. -->

## Medical / content provenance

<!-- When copy, credentials, hours, prep instructions, or compliance-sensitive text changes: cite
the source (meeting decision, client-provided asset, recon evidence). Provider credentials are
verbatim; see AGENTS.md hard rule 1. N/A otherwise. -->

## Risk / rollback

<!-- What could break, how to detect it, and the rollback path (revert commit, redeploy prior
Vercel deployment, rollback migration in supabase/rollbacks/). -->

## Deployment impact

<!-- Does this merge to `main` trigger production? Any migration, env, DNS, or Vercel follow-up? -->
