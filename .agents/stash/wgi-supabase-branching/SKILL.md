---
name: wgi-supabase-branching
description: Operates Westchase GI's Supabase Preview Branch workflow for schema migrations, Auth and RLS changes, branch credentials, CI verification, Vercel previews, and Production promotion. Use for any database or Supabase work in westchase-gi.
metadata:
  author: westchase-gi
  version: "1.0.0"
---

# Westchase GI Supabase Branching

## Sources of truth

Read these before database work:

1. `AGENTS.md` for hard invariants.
2. `ARCHITECTURE.md` for database responsibilities and isolation.
3. `CONTRIBUTING.md` for commands, required checks, and Production promotion.
4. The committed `supabase` and `supabase-postgres-best-practices` skills for provider guidance.

Repository rules and docs take precedence over vendor skills.

## Operating model

- Production is the schema parent.
- Every pull request receives a data-less Supabase Preview Branch associated with the same Git
  branch.
- `supabase/migrations/*.sql` is the forward lineage. Each schema-changing migration has a rollback
  sibling in `supabase/rollbacks/`.
- `supabase/seed.sql` and `scripts/seed-portal.mjs` create fictional branch fixtures.
- The Vercel Preview uses credentials for the matching Supabase branch.
- `Supabase Preview` and `supabase-integration` must pass on the exact PR head.
- Production migration and scheduler activation require separate explicit authorization.

## Branch workflow

1. Create the Git branch and open the pull request.
2. Wait for `Supabase Preview` to deploy configuration, migrations, and `supabase/seed.sql`.
3. Load branch credentials without printing them:

   ```bash
   supabase branches get <git-branch> \
     --project-ref <production-ref> \
     --output env
   ```

4. Map the returned values to `.env.example`, including:
   - `SUPABASE_BRANCH_PROJECT_REF`
   - `SUPABASE_PROJECT_REF`
   - `SUPABASE_PREVIEW_BRANCH=1`
   - `PLAYWRIGHT_ALLOWED_SUPABASE_PROJECT_REF`
   - `POSTGRES_URL`
   - `POSTGRES_URL_NON_POOLING`
5. Iterate on the hosted branch:
   - Use branch-scoped SQL queries for experiments and diagnosis.
   - Create the final lineage file with `supabase migration new <name>`.
   - Keep patient data out of branch fixtures.
   - Keep destructive writes inside the Preview Branch.
6. Verify:

   ```bash
   node scripts/seed-portal.mjs --target branch
   node scripts/verify-schema.mjs --target branch
   npx playwright test
   ```

7. Confirm the Vercel Preview and Supabase Preview Branch resolve to the same project reference.
8. Require current-head `Supabase Preview` and `supabase-integration` before merge.

## Migration iteration

Preview Branches record applied migration versions.

- Use a new forward corrective migration when a pushed migration needs another schema change.
- Recreate the Preview Branch when an unmerged migration must be rewritten, then verify the complete
  lineage from a clean branch.
- Do not hand-patch a branch and present it as migration verification.
- Run rollback rehearsal against the Preview Branch when the change requires it.

`POSTGRES_URL` uses Supabase's pooler. Database-query helpers validate the branch-scoped username
and use session mode on port 5432 so prepared statements work on GitHub-hosted runners.

## Production promotion

The merge establishes committed application and migration lineage. Production changes follow the
separate authorization procedure in `CONTRIBUTING.md`:

1. Identify the exact migration, rollback sibling, and application SHA.
2. Receive explicit Production authorization.
3. Apply the committed migration to Production.
4. Run `node scripts/verify-schema.mjs --target prod`.
5. Verify the deployed application and any separately authorized scheduler or worker activation.

## Documentation rule

Describe this workflow directly in present tense. State the branch model, commands, safety
invariants, and acceptance gates. Keep rationale and chronology in dated historical records.
