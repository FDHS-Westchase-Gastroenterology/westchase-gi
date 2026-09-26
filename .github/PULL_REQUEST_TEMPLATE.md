## Summary / why

<!-- One or two sentences: what changed and why it matters for patients, staff, or the practice. -->

## Scope

<!-- Routes, components, locales, content areas, or config touched. ARCHITECTURE.md §14 lists what
each kind of change usually touches. Link parity or strategy docs when relevant. -->

## Verification

These need no credentials and mirror the required CI checks. Run all of them:

- [ ] `npm run test:unit`
- [ ] `npm run test:e2e-guard`
- [ ] `npm run build`
- [ ] `npm run doctor` — local React Doctor standard is 100; inspect the report, not just the status
- [ ] `npm run test:e2e:public`

Record the selected Preview database and actual verification outcome. Follow CONTRIBUTING.md
for shared database setup and automation limitations. “Not run” is acceptable before checks
complete; silently implying a pass is not:

- Database owner / project reference / intended merge destination:
- Branch setup: new database setup evidence or inherited owner setup evidence (link):
- `Supabase Preview` — required only for new remote branch setup; inherited / already established / result:
- [ ] `supabase-integration` — selected database schema + credentialed E2E passed on the exact head:
- [ ] `Vercel` — exact-head Preview uses the selected database project reference:
- [ ] `node scripts/verify-schema.mjs --target branch` — included in the hosted gate; manual rerun / N/A:

<!-- Paste command output, CI links, or manual checks that back the boxes above. -->

## UI screenshots

<!-- Required for visible changes. Post before/after evidence in the PR conversation, not only
here. A new workflow or multi-step feature needs a video of the authored path. Refresh
ui-reference/ when a covered surface changed. N/A for non-UI work — say so explicitly. -->

## Medical / content provenance

<!-- When copy, credentials, hours, prep instructions, or compliance-sensitive text changes: cite
the source (meeting decision, client-provided asset, recon evidence). Provider credentials are
verbatim; see AGENTS.md hard rule 1. N/A otherwise. -->

## Risk / rollback

<!-- What could break, how to detect it, and the rollback path (revert commit, redeploy prior
Vercel deployment, rollback migration in supabase/rollbacks/). -->

## Deployment impact

<!-- Does this merge to `main` trigger production? Any migration, env, DNS, or Vercel follow-up? -->
