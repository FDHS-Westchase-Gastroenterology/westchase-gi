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
4. The `supabase` and `supabase-postgres-best-practices` vendor skills for provider guidance.

Repository rules and docs take precedence over vendor skills.

## Operating model

- Choose the database from the intended merge destination. A child branch inherits its
  integration branch's Preview database and migration baseline. Branches feeding PR #224
  (`portal/appointment-workflow-experience`) use its existing database.
- An independent integration branch establishes a Preview database from its documented schema
  baseline. Production need not contain that branch's unmerged migration lineage.
- `supabase/migrations/*.sql` is the forward lineage. Each schema-changing migration has a rollback
  sibling in `supabase/rollbacks/`.
- Branch fixtures are fictional. Coordinate migrations, resets, and destructive tests across all
  branches sharing the database, including `npm run dev` fixture replacement and CI.
- Vercel and local work use the selected database reference, which can belong to another Git branch.
- `Supabase Preview` is required only when establishing a new remote branch. An inherited database
  reuses its owner's setup evidence; subsequent commits do not need another provisioning check.
- `supabase-integration` verifies the exact PR head against the selected database. Schema changes
  need applied-migration evidence and the change-specific tests in `CONTRIBUTING.md`.
- Production migration and scheduler activation require separate explicit authorization.

## Branch workflow

1. Identify the intended merge destination and database-owning integration branch before publishing.
2. Record the Git branch, merge destination, database owner, project reference, and setup evidence
   in the PR or tracked handoff. New databases need successful setup evidence; inherited databases
   reuse the owner's evidence and require verification of the new branch's connection.
3. Load credentials without printing them:

   ```bash
   supabase branches get <database-owning-git-branch> \
     --project-ref <production-ref> \
     --output env
   ```

4. Map values to `.env.example`, including `SUPABASE_BRANCH_PROJECT_REF`, `SUPABASE_PROJECT_REF`,
   `SUPABASE_PREVIEW_BRANCH=1`, `PLAYWRIGHT_ALLOWED_SUPABASE_PROJECT_REF`, `POSTGRES_URL`, and
   `POSTGRES_URL_NON_POOLING`. Keep Production outside the test target.
5. Coordinate with everyone using the database before migrations, fixture resets, or destructive
   tests. Create final migration lineage with `supabase migration new <name>`.
6. In an agreed exclusive test window, run the appropriate checks:

   ```bash
   node scripts/seed-portal.mjs --target branch
   node scripts/verify-schema.mjs --target branch
   npx playwright test
   ```

7. Confirm the exact-head Vercel Preview resolves to the selected database project reference.
8. Require current-head `supabase-integration` and the other contribution gates before merge.
   Retain setup evidence; do not demand a new `Supabase Preview` check on every head.
9. Read `CONTRIBUTING.md` "Automation alignment" before relying on CI for inherited databases.
   Report mismatches without bypassing protection or creating redundant databases.

## Migration iteration

Preview Branches record applied migration versions.

- Use a new forward corrective migration when a pushed migration needs another schema change.
- Coordinate a clean replay with everyone using the database when an unmerged migration must be
  rewritten, then verify the complete lineage. Do not recreate a shared database via a child PR.
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
