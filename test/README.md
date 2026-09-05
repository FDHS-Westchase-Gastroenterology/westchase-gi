# Tests: what runs where, and how to add one

The suite has three tiers. The folder a test lives in says what it needs.

| Tier | Where | Needs | Runs in | Command |
| --- | --- | --- | --- | --- |
| Unit | `*.test.mjs` beside the module, plus `test/`, `scripts/`, `tools/` | Node only | CI `quality`, every local change | `npm run test:unit` (about 1 s) |
| Public browser | `e2e/public/` | A dev server, no credentials | CI `quality` | `npm run test:e2e:public` |
| Portal browser | `e2e/portal/` | The Supabase Preview Branch, the seed admin | CI `supabase-integration` | `npm run test:e2e:portal` |
| Boundaries | `e2e/boundaries/` | The Preview Branch, service and publishable keys | CI `supabase-integration` | `npm run test:e2e:boundaries` |

Nothing ever runs against Production. `e2e/harness/target-guard.ts` binds the project
reference to the URL, requires the Preview Branch marker, and rejects the Production reference
before the first database call; `npm run test:e2e-guard` is its own test.

## Unit tier

- A test is a `node:test` file named `<module>.test.mjs` next to the module it covers. It
  imports the module as `./module.ts`; `test/register.mjs` (registered once by the script)
  resolves `@/` to `src/`, extensionless relative imports to `.ts`, JSON imports, and stubs
  `server-only` and `client-only`. Do not write a resolve hook in a test.
- Name each test as the domain sentence it protects ("a new request offers the three contact
  attempts, booking, and the not-actionable close"), so a failure reads as what broke.
- One file: `node --import ./test/register.mjs --test src/lib/portal/workflow/machine.test.mjs`.
- Domain rules live here, not in the browser: the state machine (`workflow/machine.test.mjs`),
  the legal-action policy against the machine (`workflow/legal-actions.test.mjs`), the intake
  contract (`contracts.test.mjs`), queue order, paging, filters, labels, the work panel's model
  (`requests/[id]/workflow-panel-model.test.mjs`), and email delivery (`email.test.mjs`).
- Two guards also run here: `test/file-size-ratchet.test.mjs` fails when a product file outside
  `stock/`, `content/` and `dictionaries/` passes 400 lines unless it is in
  `test/file-size-allowlist.json` at or under its recorded size, and the list may only shrink;
  `tools/oxlint/anti-slop/no-contract-vocabulary-redeclaration.test.mjs` proves the lint rule
  that forbids restating a contract vocabulary (`REQUEST_STATES`, `STAFF_ROLES`, …) as a union,
  an `as const` array, or a `z.enum` argument.

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
- The specs under `e2e/boundaries` that issue raw SQL (`supabase db query`) need the branch's
  direct Postgres URL in `POSTGRES_URL_NON_POOLING`; without it they refuse, by design, rather
  than run against the wrong database.
