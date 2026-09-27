# Backend performance baseline

Use this record before changing database queries, RPCs, indexes, pagination, or backend round
trips. Record the existing behavior first, compare the same operation and workload afterward,
and keep correctness, authorization, audit, and idempotency guarantees intact.

The first production observation is [2026-09-26](baselines/2026-09-26-production/REPORT.md).
It is a passive production observation, not a load test or a complete latency benchmark.
Its coverage register includes both the deployed application and the active portal branch.
An unavailable measurement is a gap, never a zero-millisecond result.

## Measurement boundaries

| Layer | Evidence | What it measures | Limits |
| --- | --- | --- | --- |
| PostgreSQL | `statements.json`, `context.json`, `indexes.json` | Successful top-level SQL execution, calls, rows, buffers, WAL, schema and workload context | Excludes HTTP/network, application work, and untracked planning; statement success does not establish business success or commit |
| Supabase API | `api-latency.json` | Gateway-observed origin response time, grouped by allowlisted route, method, and HTTP status | Excludes the full Next.js request and browser round trip; bounded retained logs, often sparse |
| Application | Currently unmeasured | Whole route/Server Action, auth, database calls, validation, email and other adapters | Needs separately deployed, privacy-preserving timing instrumentation |
| Controlled benchmark | Currently unmeasured | Repeatable individual command and read cases under specified concurrency/data size | Run writes on a coordinated fictional Preview target; do not describe Preview results as production results |

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

Full backend timing instrumentation should record a stable operation name, duration, outcome,
database-call count and aggregate duration, deploy SHA, and environment without request/patient
identifiers or payloads. Capture auth, database, email/GitHub, and total request time separately.
This is follow-up implementation work, not evidence present in the first baseline.
