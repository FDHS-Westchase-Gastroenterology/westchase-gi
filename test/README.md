# Tests: what runs where, and how to add one

The suite has four tiers. The folder a test lives in says what it needs.

| Tier | Where | Needs | Runs in | Command |
| --- | --- | --- | --- | --- |
| Unit | `test/unit/` | Nothing; the database suites need `POSTGRES_URL` | CI `quality`, and `supabase-integration` with the database | `npm run test:unit` |
| Public browser | `e2e/public/` | A dev server, no credentials | CI `quality` | `npm run test:e2e:public` |
| Portal browser | `e2e/portal/` | The Supabase Preview Branch, the seed admin | CI `supabase-integration` | `npm run test:e2e:portal` |
| Boundaries | `e2e/boundaries/` | The Preview Branch, service and publishable keys | CI `supabase-integration` | `npm run test:e2e:boundaries` |

Nothing ever runs against Production. `e2e/harness/target-guard.ts` binds the project
reference to the URL, requires the Preview Branch marker, and rejects the Production reference
before the first database call.

## Browser tiers

- Specs import from `e2e/harness/` and declare no helper the harness already has: `env.ts`
  (`serviceDb`, `publishableDb`, `seedAdmin`, `runId`, `clientIps`), `session.ts` (`signIn`,
  `attemptSignIn`, `createStaffFixture`), `assert.ts` (`requireDecoded`, `requireText`,
  `expectDenied`).
- Every fixture address is on the reserved `.test` TLD (`*@example.test`); global setup sweeps
  those rows and disables notification recipients for the run, and teardown restores them.
- Projects are `chromium` and `no-js`; specs skip by reading `testInfo.project.name`. Select
  by path, never by renaming a project.
- Locally, `.env.local` targets the Preview Branch and `SUPABASE_PREVIEW_BRANCH=1` must be set
  on the command line. Never run two Playwright processes against the branch at once, and not
  while CI's integration job is running on the same pull request.
- The specs that issue raw SQL through `supabase db query` (`e2e/portal/telemetry.spec.ts`, and
  the boundary specs that use `e2e/boundaries/support.ts` for it) need the branch's direct Postgres
  URL in `POSTGRES_URL` or `POSTGRES_URL_NON_POOLING`; without it they refuse, by design, rather
  than run against the wrong database.

## Unit tier

- `node:test` on Node's own type stripping, loaded through `test/register.mjs`, so a test
  imports product modules by their `@/` paths. Files are `test/unit/**/*.test.ts`.
- A suite that needs a database skips unless `POSTGRES_URL` is set, and only reads. Point it at
  a local cluster built from the migrations (the way `npm run db:generate` builds one) or at the
  Preview Branch; the suites that hold a lock run only against a loopback database.
- `npm run db:parity` (`scripts/verify-drizzle-parity.mjs`) calls the same functions through
  PostgREST and through the Drizzle `rpc()` helper and requires equal results and errors. It
  refuses any target but the allowlisted Preview Branch, through `e2e/harness/target-guard.ts`.
