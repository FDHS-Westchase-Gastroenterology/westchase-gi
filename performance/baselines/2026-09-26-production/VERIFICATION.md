# Verification of the baseline record

Verified on 2026-09-26 EDT / 2026-09-27 UTC against source
`dc69845eab392679678477f3259ffab8fd38681a` plus the baseline documentation and evidence files.
No application, migration, test, dependency, or UI source was changed.

## Required repository gates

The final gate run used an isolated checkout with `npm ci --no-audit --no-fund`, without
`.env.local` or generated output carried over from the working repository.

| Check | Result |
| --- | --- |
| `npx oxlint` | Exit 0, no warnings or errors emitted |
| `npx oxfmt --check` | Passed: all 477 matched files use the correct format |
| `npx react-doctor@latest --verbose` | 100/100; 424 files scanned; no issues |
| `npm run build` | Passed with Next.js 16.3.5; production compile, TypeScript, and all 381 static pages completed |
| `git diff --check` | Passed |

The build used the documented no-credentials environment:

```bash
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 \
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=ci-public-placeholder \
  SUPABASE_SERVICE_ROLE_KEY=ci-server-placeholder \
  npm run build
```

An initial build attempt with a symlink to the working repository's dependencies was rejected
by Turbopack because the symlink left its filesystem root. Installing the lockfile dependencies
inside the isolated checkout resolved that environment issue; all standing gates were rerun
and passed afterward. Initial JSON formatting differences were also fixed before the final run.

## Evidence validation

- Parsed all eight JSON evidence artifacts successfully.
- Checked 261 unique `(dbid, userid, queryid, toplevel)` identities, string-preserved query IDs,
  positive sample counts, and execution means against total time divided by calls.
- Reconciled 44 RPC coverage records: 15 observed, five deployed without observed service-role
  calls, 24 absent. Unavailable timings remain null.
- Inventoried 119 direct table call sites across the recorded branch and deployed source SHAs
  using the TypeScript syntax tree; every call was classified as select/insert/update/delete.
- Reconciled all 37 operation-family totals against the underlying service-role statements.
- Confirmed 173 API requests and 173 timings in the fixed log window.
- Confirmed the context and statement snapshots have identical statement-reset metadata,
  and the catalog lists 20 applied migrations.
- Confirmed PostgreSQL collector scripts use read-only transactions with local timeouts.
  The three collectors executed successfully against the verified production project.
- Confirmed evidence contains no raw statement text. Capture queries select only catalog
  metadata and aggregate counters; the log query allowlists static paths and omits queries,
  payloads, tokens, IPs and identities.

No unit/E2E tests or visual capture were added or run: the change is documentation, SQL
observation queries and saved aggregate evidence, with no application behavior or schema change.
No Supabase integration, production write benchmark, runtime instrumentation, or deployment
was performed. Live measurements do not establish application acceptance-test coverage.

## Supplemental check limitation

`node scripts/verify-no-secrets.mjs` could not complete its existing all-ref history scan.
The diagnostic reproducer established `ENOBUFS` from the script's 256-MiB `spawnSync` buffer
during `git log --all -p`; the branch-range query itself completed. No history finding was
reported, and this is not a claim that repository history passed the scanner. The scanner was
not modified as part of the baseline task. Its history-only scan does not replace review of
the new aggregate artifacts.
