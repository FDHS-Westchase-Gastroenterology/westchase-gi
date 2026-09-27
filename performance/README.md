# Backend performance baseline

Use this record before changing database queries, RPCs, indexes, pagination, or backend round
trips. Record the existing behavior first, compare the same operation and workload afterward,
and keep correctness, authorization, audit, and idempotency guarantees intact.

The first production observation is [2026-09-26](baselines/2026-09-26-production/REPORT.md).
It is a passive production observation, not a load test or a complete latency benchmark.
Its coverage register includes both the deployed application and the active portal branch.
An unavailable measurement is a gap, never a zero-millisecond result.

The [2026-09-27 application baseline](baselines/2026-09-27-preview/REPORT.md) adds 41 authenticated
API scenarios and 10 rendered browser workflows, measured against fictional Preview data through
an optimized local server. It includes repeatable collectors and privacy-safe runtime timing.
Keep this evidence separate from production SQL and Supabase API observations.

## Measurement boundaries

| Layer | Evidence | What it measures | Limits |
| --- | --- | --- | --- |
| PostgreSQL | `statements.json`, `context.json`, `indexes.json` | Successful top-level SQL execution, calls, rows, buffers, WAL, schema and workload context | Excludes HTTP/network, application work, and untracked planning; statement success does not establish business success or commit |
| Supabase API | `api-latency.json` | Gateway-observed origin response time, grouped by allowlisted route, method, and HTTP status | Excludes the full Next.js request and browser round trip; bounded retained logs, often sparse |
| Application | Preview runtime events and browser samples in the September 27 record | Instrumented handler/action totals, Supabase transport, and verified rendered workflows | Production instrumentation is not deployed; unwrapped adapters remain coverage gaps |
| Controlled benchmark | 41 API scenarios and 10 browser workflows in the September 27 record | Repeatable individual commands and reads at concurrency one with fictional Preview data | Preview results are not production results; sample count, workload and environment constrain comparisons |

PostgreSQL definitions come from the [PostgreSQL 17 statistics reference](https://www.postgresql.org/docs/17/pgstatstatements.html)
and [Supabase query statistics guide](https://supabase.com/docs/guides/database/extensions/pg_stat_statements).
`pg_stat_statements` does not supply percentiles. Do not derive p95/p99 from a mean and standard
deviation. API percentiles must come from individual timing observations.

## Capture a production observation

1. Verify the Supabase project is the default production branch. Record project reference,
   region, current source SHA, latest successful Production deployment SHA/status, and the
   applied database migration versions. A Git deployment does not prove schema promotion.
2. Execute [context.sql](context.sql), [statements.sql](statements.sql), and
   [indexes.sql](indexes.sql) through an authorized read-only SQL connection or Supabase
   `execute_sql`. Each script opens a read-only transaction with a statement timeout. They
   target PostgreSQL 17 with `extensions.pg_stat_statements`; verify compatibility first.
   Preserve the single JSON value returned by each script as `context.json`, `statements.json`,
   and `indexes.json` in a new dated baseline directory. Record each capture timestamp: these
   separate queries are not an atomic snapshot, and cumulative statistics are approximate.
3. Execute [api-latency.sql](api-latency.sql) through Supabase `query_logs`, with explicit
   `iso_timestamp_start` and `iso_timestamp_end` covering no more than 24 hours. Preserve the
   window with the results. The SQL is ClickHouse, not PostgreSQL. Extend the route allowlist
   only with static RPC/table routes from verified schema/source; dynamic paths stay `other`.
4. Refresh the CRUD coverage register from database call sites in both deployed and proposed
   code. Include dynamic RPC dispatch, direct table access, Auth administration, lifecycle
   SQL, and external integrations. Match observed fingerprints to these operations without
   exporting query text or parameters. Capture business-command coverage separately when one
   RPC accepts multiple command kinds.
5. Write a dated report: sample counts, means, min/max where useful, API p50/p95, resource
   totals, reset times, deployment/schema differences, observed limitations, and next questions.
   Link it here. Preserve previous snapshots rather than overwriting their evidence.

The initial collector exports only catalog names/hashes and aggregate statistics. It does not
export raw SQL, request bodies, query strings, patient/staff identities, JWTs, IPs, or individual
log entries. Normalized SQL can still contain sensitive literals, so do not add query text to
the saved results. The statement classifier matches known schema identifiers internally and
exports only those identifiers. Treat ambiguous/multiple matches as an aggregate family,
not proof of a specific endpoint. Roles other than `service_role` remain separate diagnostics.

Do not reset statistics, enable extensions, change configuration, deploy instrumentation,
run `EXPLAIN ANALYZE` writes, invoke mutation RPCs, or activate lifecycle jobs as part of this
capture. A transaction rollback does not make a production write benchmark operationally free.
If required statistics are unavailable, record the missing capability and obtain a separate
configuration decision. This procedure neither requires nor performs a migration.

## Compare an optimization

Capture paired snapshots around a fixed observation window before the change, and another
paired window after it. An all-time cumulative mean after deployment still contains the old
implementation. Never call the difference between those two means the optimization result.

For each stable `(dbid, userid, queryid, toplevel)` identity, first verify identical global
`stats_reset`, per-statement `stats_since`, and compatible server/schema context within the
pair. Reject decreasing counters. Missing/new fingerprints, deallocation, changed definition
hashes, or resets require a new observation window or explicitly qualified analysis.
`minmax_stats_since` controls whether min/max windows are comparable. PostgreSQL query IDs are
not portable across databases or major versions; semantic operation IDs bridge those cases.

```text
window_calls = end.calls - start.calls
window_total_ms = end.total_exec_time_ms - start.total_exec_time_ms
window_mean_ms = window_total_ms / window_calls       (only if window_calls > 0)
window_rows_per_call = (end.rows - start.rows) / window_calls
change_percent = 100 * (after_window_mean / before_window_mean - 1)
```

Use sums of elapsed time divided by sums of calls when combining fingerprints. Do not average
their means. Do not subtract cumulative min/max or percentile values. Compute API percentiles
from each complete log window; keep successes and failures separate. Record timed and untimed
sample counts. Low-volume writes may have too few observations to support tail-latency claims.

Hold these factors constant, or document how they differ: deployed code and function/index
definitions, database version/compute/region, client location, permissions and RLS path,
table/history cardinality, filters and result size, page/cursor position, new/replay/conflict
command mix, concurrency, cache temperature, and external dependencies. A faster empty query
does not establish improvement for a populated queue. Table row counts here are estimates.

Treat an improvement as demonstrated only when comparable observations improve the intended
metric and the relevant correctness checks pass. No latency SLO or regression threshold is
established by this first observation; agree those separately from measured results.

## Completing coverage

The [operation matrix](baselines/2026-09-26-production/REPORT.md#crud-coverage) names the missing
measurements. For unobserved deployed operations, collect passive traffic over an appropriate
window or exercise fictional equivalents on Preview. For undeployed operations, measure the
approved Preview implementation first and establish production observations after separately
authorized promotion.

For controlled CRUD comparisons, give each business command its own case: first write, exact
retry, version conflict, invalid/unauthorized request, and representative populated reads.
Include first/subsequent pages, search, long histories, concurrent booking/ledger changes, and
retention batches where applicable. Archive, cancel, reversal, amendment, unlink, and retention
are distinct operations; do not introduce hard deletes just to fill a CRUD column.

## Runtime timing

[`src/lib/portal/performance.ts`](../src/lib/portal/performance.ts) emits one `portal.performance`
JSON event for each instrumented handler or Server Action. Logging is enabled by default;
`PORTAL_PERFORMANCE_LOGS=0` disables it. Deployment uses the normal application release path;
adding this code does not deploy it or promote the database.

The instrumented boundaries are the seven patient/worklist/scheduling/billing/clinical API
handlers, eleven request Server Actions, both public intake handlers, and aggregate telemetry.
All request command actions start timing before their validation/auth work. Domain API handlers
start before same-origin checks and refine their label only after validated command parsing.
Authorization and business rules remain inside the measured callback.

The event contains only a version, fixed operation label, allowlisted command discriminator,
`success`/`rejected`/`redirect`/`thrown`, milliseconds, Supabase call count, failed transport count, and the
sum of Supabase time through response headers. The emitter never reads input URLs, payloads,
record IDs, staff identities, request headers, or exception text into a log. The runtime log
provider supplies deployment/environment/time metadata; preserve those with an export. Export
only these events and their safe metadata, not the provider's raw request log envelopes.

`thrown` includes Next.js redirect control flow and is **not an error-rate metric**. Creating a
request and redirecting successfully produces `thrown`; the browser benchmark separately proves
the successful destination. `redirect` covers returned HTTP 3xx responses; `rejected` covers returned HTTP errors or domain failures.
The failed-call count concerns HTTP/network failures; an RPC's HTTP 200 can still reject a command.
Logging failure cannot replace the original result or exception. Async-local state isolates
concurrent invocations. The supplied Supabase fetch function preserves the original Response/body.

Handler/action time excludes proxy work, framework request dispatch, later RSC rendering,
serialization/stream completion, browser transport, rendering, and animation. Supabase timing
includes Auth as well as PostgREST; it is not SQL execution time. Parallel call durations overlap:
**never subtract their sum from handler duration to estimate application CPU time**. It stops at
response headers, while handler time includes any subsequently awaited body decoding.

Page-render totals, staff/settings/Auth administration, GitHub, exports/printing, email transport,
and lifecycle jobs do not yet have individual total-duration wrappers. Auth/profile calls are
included when they run inside an instrumented boundary. The dated coverage register distinguishes
instrumented operations from those exercised by the controlled run.

## Repeat the controlled Preview measurement

Run one benchmark process at a time, with other fixture resets and migrations idle. These
collectors add uniquely named fictional data; they do not reset the existing cohort or delete
audit history. Core/API configuration runs provision one fictional administrator, disable its
signing permission, deactivate its profile and ban the Auth account before completion. Their
records and audit history remain. Browser runs use the existing seeded staff identity, create
fictional requests, and resolve each completed fixture. A failed run leaves its partial results
and may leave unresolved fictional records; inspect its run marker before any cleanup.

1. Select the integration branch's existing Preview database using the project branching skill.
   Check the project is healthy and load branch credentials privately. Align both project refs,
   `SUPABASE_PREVIEW_BRANCH=1`, the explicit Playwright allowlist, and distinct Production aliases.
   Set `VERCEL_ENV=preview` locally so `/api/preview-environment` can attest the server's binding.
   Both runners require this attestation and the existing E2E target guard before provisioning.
2. Install the locked dependencies and build with the intended Node version. The repo pins Node
   22 in `.nvmrc`; the first workstation capture used Node 26.7.0 and records that difference.
   Treat a Node-version change as a new baseline. Never use a development server for comparisons.
3. Start `npm run start -- --hostname 127.0.0.1 --port 62170` and redirect its output to a private,
   disposable runtime log. Keep that server dedicated to the serial benchmark. Change the port
   when occupied; pass the matching `http://localhost:<port>` origin below.
4. Run the core API, browser, and configuration cases sequentially. Each defaults to two warm-up
   iterations and twenty measured iterations. `--samples` accepts 1–50; small pilots cannot
   establish a tail-latency target. API timing runs from browser `fetch` through decoded response;
   browser timing waits for the verified rendered outcome. The scripts emit timing data only.

```bash
node --env-file=.env.local --import ./test/register.mjs scripts/benchmark-portal.mjs \
  --origin http://localhost:62170 --confirm-target <preview-ref> \
  --output <new-baseline>/api-samples.json
node scripts/correlate-portal-performance.mjs <new-baseline>/api-samples.json <private-runtime-log>
node --env-file=.env.local --import ./test/register.mjs scripts/benchmark-portal-browser.mjs \
  --origin http://localhost:62170 --confirm-target <preview-ref> \
  --output <new-baseline>/browser-samples.json
node --env-file=.env.local --import ./test/register.mjs scripts/benchmark-portal.mjs \
  --origin http://localhost:62170 --confirm-target <preview-ref> --configuration \
  --output <new-baseline>/configuration-samples.json
node scripts/correlate-portal-performance.mjs <new-baseline>/configuration-samples.json <private-runtime-log>
```

5. Before starting another API/configuration run, correlate that run with its dedicated log.
   The correlator refuses mismatched counts/operation labels. It has no cross-request IDs;
   do not use it on interleaved traffic or unrelated production logs.

```bash
node scripts/summarize-portal-performance.mjs <new-baseline>/api-samples.json <new-baseline>/api-summary.json
node scripts/summarize-portal-performance.mjs <new-baseline>/browser-samples.json <new-baseline>/browser-summary.json
```

Repeat correlation/summary for the configuration file immediately after that run. Keep the
build ID, source digest, runtime/browser versions, concurrency, warmups, fixture sizes and source
SHA with each result. The summary uses a conventional median and nearest-rank p95, separating
successes from expected failures. Review `metadata.completed` and fixture retirement before
calling a run successful. Stop the server and browsers when finished; do not commit raw logs,
credentials, storage state, screenshots containing non-fictional identities, or response bodies.

## Authenticated production browser reads

Use `scripts/benchmark-production-reads.mjs` only after authorization to use an existing staff
account. Load `PORTAL_PROD_ADMIN_EMAIL` and `PORTAL_PROD_ADMIN_PASSWORD` locally; the collector
can use the existing `PORTAL_SEED_ADMIN_*` pair when that same account and password are valid
in production. Preview alias credentials do not work on the production sign-in form. Never
provision an account, reset a password, or mint an administrator session to fill an access gap.

```bash
node scripts/benchmark-production-reads.mjs \
  --confirm-origin https://westchasegi.com \
  --deployment-sha <verified-production-sha> \
  --output performance/baselines/<date>-production-browser/browser-samples.json
node scripts/summarize-portal-performance.mjs \
  performance/baselines/<date>-production-browser/browser-samples.json \
  performance/baselines/<date>-production-browser/browser-summary.json
```

The collector signs in once and measures only home/list/detail/next-request reads. After login,
it blocks non-read network requests, including telemetry and acknowledgements. Playwright request
routing disables the browser HTTP cache: report that condition, and do not treat its navigation
timings as cache-equivalent to the Preview browser collector. Static assets may still benefit
from upstream CDN caches. No record mutation controls are clicked. It stores numeric timings and
static labels only; credentials, browser state, patient content, record paths, screenshots and
traces stay out of artifacts. A failed sign-in yields `completed:false` and no latency estimate.

The [September 27 access check](baselines/2026-09-27-production-browser/REPORT.md) records the
actual authentication result. A locally configured credential is not proof it is currently valid
on production.
