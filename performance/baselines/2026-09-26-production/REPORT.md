# Production backend baseline — 2026-09-26

Production's observed SQL reads are inexpensive at its current small data volume. The largest
identified application SQL cost is the shared intake/telemetry rate limiter. Recent Supabase
API origin latency is substantially greater than the historical SQL execution averages, but
the windows differ and these observations do not identify the cause of that difference.

This establishes a historical database baseline and a partial API baseline. It does **not**
establish a complete benchmark for every CRUD operation or full backend request latency.
The active portal branch has substantial database functionality absent from production.

## Identity and collection

| Item | Verified value |
| --- | --- |
| Production | `Westchase-Gi`, `gfvrjaoxamvshzplxmep`, Supabase default branch, `us-east-2` |
| Source inventory | `portal/appointment-workflow-experience`, `dc69845eab392679678477f3259ffab8fd38681a` |
| Latest successful GitHub Production deployment | `ddcbf23d8f25361a01a3777a1392bcfe529de0f2`, 2026-09-20 20:53:04 UTC, deployment `6557576561` |
| Database context captured | 2026-09-27 01:59:35 UTC / September 26, 21:59:35 EDT |
| Query statistics captured | 2026-09-27 02:00:11 UTC |
| API observation window | 2026-09-26 02:00:00 through 2026-09-27 02:00:00 UTC |
| PostgreSQL | 17.6, Supabase release 17.6.1.141 |
| Applied migrations | 20, latest `20260729172311`; complete versions in `context.json` |
| Query statistics reset | 2026-07-12 22:29:18.916669 UTC; no statement evictions recorded |
| Database statistics reset | 2026-06-30 00:50:05.916450 UTC; different from query statistics window |
| Collection | Passive read-only catalog/statistics queries and aggregated logs; no business RPC executions or application-table reads |

The deployment is corroborated by its [GitHub success status](https://api.github.com/repos/FDHS-Westchase-Gastroenterology/westchase-gi/deployments/6557576561/statuses).
The live application was not exercised, and no deployment-time environment binding was probed.
Production database identity was verified through Supabase's default-branch metadata.

The collector did not mutate application records, schema, settings, migration history or jobs,
and did not reset statistics. Observation queries themselves contribute normal monitoring counters.
The files contain aggregate metrics and code/schema identifiers; no raw SQL or application rows.
No load was generated to manufacture write samples.

## Observed database execution

The following table uses **only `service_role` top-level statements** with an identified
application RPC or relation. It includes historical traffic from multiple releases and may
include previous administrative/test activity using that role. It cannot distinguish those
origins. Each family combines fingerprints by `sum(total time) / sum(calls)`. Counts describe
successful SQL executions, not necessarily accepted business commands or committed mutations.
PostgREST `rows` often counts an enclosing response row rather than application rows.

Request reads average **0.287 ms** across 8,323 calls; staff-profile reads average **0.131 ms**
across 4,635 calls. The shared limiter averages **9.413 ms** across 11,819 calls and accounts
for about **74.5%** of identified service-role application execution time. This RPC is used
by both public intake and site telemetry; its count is not an appointment-submission count.
RPC durations include internal SQL because tracking is top-level only.

Means below are database execution milliseconds. Max is the largest retained execution, not
p95. Small samples are descriptive only. Direct table families pool filters, count queries,
detail reads, exports, and historical shapes; they are not individual route timings.

| SQL family / RPC | Calls | Shapes | Mean ms | Max ms | Total ms |
| --- | ---: | ---: | ---: | ---: | ---: |
| `portal_check_intake_rate_limit` | 11,819 | 1 | 9.413 | 83.728 | 111255.608 |
| `portal_record_analytics_event` | 11,678 | 1 | 2.060 | 62.279 | 24052.448 |
| `SELECT requests` | 8,323 | 52 | 0.287 | 11.890 | 2389.275 |
| `INSERT request_events` | 165 | 1 | 13.327 | 28.623 | 2199.021 |
| `portal_log_call_outcome` | 145 | 1 | 12.722 | 63.970 | 1844.630 |
| `INSERT requests` | 169 | 3 | 9.072 | 26.950 | 1533.094 |
| `SELECT audit_log` | 2,331 | 29 | 0.609 | 13.657 | 1418.486 |
| `portal_add_request_note` | 149 | 1 | 9.433 | 37.121 | 1405.530 |
| `SELECT request_events` | 1,414 | 17 | 0.699 | 13.394 | 988.009 |
| `SELECT staff_profiles` | 4,635 | 42 | 0.131 | 4.731 | 608.993 |
| `portal_update_request_status` | 47 | 1 | 9.685 | 38.391 | 455.194 |
| `SELECT notification_recipients` | 818 | 17 | 0.488 | 6.342 | 399.122 |
| `portal_open_staff_release` | 8 | 1 | 16.025 | 36.167 | 128.199 |
| `SELECT portal_release_states` | 392 | 1 | 0.321 | 4.720 | 125.821 |
| `INSERT audit_log` | 53 | 3 | 1.564 | 14.504 | 82.884 |
| `portal_complete_staff_onboarding` | 9 | 1 | 9.076 | 12.346 | 81.683 |
| `portal_set_staff_tour_dismissed` | 16 | 1 | 4.799 | 20.981 | 76.787 |
| `INSERT staff_profiles` | 23 | 4 | 2.246 | 7.256 | 51.649 |
| `UPDATE request_events` | 54 | 1 | 0.942 | 3.046 | 50.844 |
| `portal_close_request` | 6 | 1 | 8.083 | 32.202 | 48.496 |
| `INSERT notification_recipients` | 12 | 3 | 3.526 | 9.282 | 42.315 |
| `portal_record_staff_password_reset` | 2 | 1 | 12.977 | 15.821 | 25.953 |
| `portal_record_staff_release_dismiss` | 3 | 1 | 7.037 | 16.307 | 21.112 |
| `UPDATE audit_log` | 2 | 1 | 9.463 | 16.881 | 18.926 |
| `portal_record_staff_release_guide_open` | 2 | 1 | 6.189 | 9.277 | 12.378 |
| `UPDATE requests` | 1 | 1 | 9.614 | 9.614 | 9.614 |
| `UPDATE staff_profiles` | 7 | 2 | 1.373 | 5.341 | 9.613 |
| `portal_preview_data_lifecycle` | 1 | 1 | 8.605 | 8.605 | 8.605 |
| `DELETE requests` | 5 | 2 | 1.449 | 3.457 | 7.245 |
| `SELECT portal_release_states,staff_profiles` | 8 | 1 | 0.728 | 3.020 | 5.823 |
| `DELETE notification_recipients` | 3 | 1 | 1.836 | 5.301 | 5.507 |
| `DELETE request_events` | 1 | 1 | 3.898 | 3.898 | 3.898 |
| `portal_set_request_legal_hold` | 2 | 1 | 1.221 | 1.278 | 2.442 |
| `UPDATE notification_recipients` | 2 | 1 | 0.698 | 0.728 | 1.396 |
| `portal_acknowledge_staff_release` | 1 | 1 | 1.248 | 1.248 | 1.248 |
| `DELETE audit_log` | 12 | 5 | 0.065 | 0.183 | 0.778 |
| `DELETE staff_profiles` | 8 | 3 | 0.061 | 0.088 | 0.487 |

## Recent Supabase API origin latency

173 gateway requests were present in the explicit 24-hour window. All 173 had an origin timing.
172 returned 2xx and one Auth token request returned 400; no 5xx response was present in this
window. This is neither an application-wide success rate nor an uptime guarantee.

| Route / method | HTTP | n | Mean ms | p50 ms | p95 ms | Max ms |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| `portal_check_intake_rate_limit` POST | 200 | 85 | 274.659 | 189 | 622 | 683 |
| `portal_record_analytics_event` POST | 200 | 84 | 68.940 | 61 | 93 | 648 |
| `requests` POST | 201 | 1 | 85 | 85 | 85 | 85 |
| `request_events` POST | 201 | 1 | 74 | 74 | 74 | 74 |
| `notification_recipients` GET | 200 | 1 | 55 | 55 | 55 | 55 |
| `/auth/v1/token` POST | 400 | 1 | 625 | 625 | 625 | 625 |

Single-observation percentiles merely repeat that observation. Even n=84–85 gives limited tail
evidence; these are observed values, not service-level targets. Status groups remain separate.
Latency is `response.origin_time`, the field Supabase's [API report queries](https://github.com/supabase/supabase/blob/master/apps/studio/components/interfaces/Reports/SharedAPIReport/SharedAPIReport.constants.ts)
use for response speed; its [report UI](https://github.com/supabase/supabase/blob/master/apps/studio/components/interfaces/Reports/SharedAPIReport/SharedAPIReport.tsx)
labels the unit milliseconds. Exact sample quantiles were computed in ClickHouse.

The 622 ms observed p95 makes the limiter's API path a useful investigation target. It does not
prove slow SQL, pool starvation, cold starts, or network overhead. Do not subtract the historical
9.413 ms SQL mean from the recent 274.659 ms API mean: those are unmatched workloads/windows.
No Next.js route, Server Action, email, browser, or full Auth administration latency was measured.

## Database workload context

Database size was **14,535,827 bytes (13.86 MiB)**. Application tables were small:

| Relation | Estimated live rows | Estimated dead rows | Total bytes including indexes |
| --- | ---: | ---: | ---: |
| `public.requests` | 162 | 80 | 147,456 |
| `public.request_events` | 1,503 | 0 | 532,480 |
| `public.audit_log` | 417 | 27 | 212,992 |
| `public.staff_profiles` | 10 | 19 | 65,536 |
| `public.notification_recipients` | 9 | 5 | 65,536 |
| `public.portal_release_states` | 3 | 11 | 32,768 |
| `private.analytics_daily` | 5,579 | 52 | 1,130,496 |
| `private.intake_rate_limits` | 1 | 25 | 81,920 |

These are statistics estimates, not exact patient counts. Do not extrapolate these timings to
a large patient/appointment database. Sequential scans over tiny tables are not by themselves
evidence of missing indexes. Index identities, sizes, definition hashes and scan counts are
preserved in `indexes.json`; execution plans were not collected.

At capture there were six database backends and no blocked sessions in the later index snapshot.
Database counters reported zero deadlocks and zero temporary-file bytes over their recorded
window. This is a point-in-time/cumulative observation, not a resource saturation assessment.
CPU, memory pressure, compute tier, concurrent traffic distribution, and pool wait time were
not measured. `shared_buffers` was 28,672 8-KiB pages (224 MiB); `max_connections` was 60.

`pg_stat_statements.track=top`, planning tracking is off, I/O timing is off, and function
tracking is `none`. Consequently there is no nested-statement breakdown, planning-time baseline,
or measured I/O duration. Zero timing fields for disabled collection are not evidence of zero cost.

## CRUD coverage

The inventory reconciles **44 RPC names** from deployed/branch source and the live public
function catalog: **15 observed**, **5 present without observed service-role calls**, and
**24 absent from production**. All 119 direct table call sites across the two code revisions
are preserved in `direct-access-inventory.json`. `rpc-coverage.json` includes source file/line
references, deployment presence, query IDs and measurements. Source references are tied to the
recorded SHAs; line numbers can change afterward.

| Domain | Create / update / delete semantics | Read paths | Production coverage |
| --- | --- | --- | --- |
| Public request intake | Deployed direct request insert, notification/receipt-event insert, and one-time receipt consumption update; branch replaces request insertion with atomic outbox RPC | Recipient and retained event reads | Direct SQL families observed; only one recent create API sample. Atomic outbox RPC/table absent |
| Staff-created requests | `portal_create_staff_request` | Current request read models | Create RPC absent |
| Deployed request workflow | Add note, status update, log call, close, undo call | Queue, detail, history, CSV/counts | Note/status/log-call/close observed; undo has no observed calls. Read families measured, individual route timing unavailable |
| Branch request workflow | `record_contact_attempt`, `record_contact_and_close`, `confirm_booking_handoff`, `close_request`, `reopen_request`, `set_call_again`, `undo_latest_transition`, `classify_legacy_closure` | Worklist RPC, transitions, receipts, full record, atomic print packet | Command/worklist/print RPCs and new transition/receipt tables absent; legacy timings are not substitutes |
| Patient registry | Create, demographic update, archive/restore, link/unlink request; no hard-delete API | Search, detail, revisions, linked requests | All three RPCs and patient tables absent |
| Scheduling | Book, reschedule, cancel, check in, complete, no-show, undo; save location/type/provider configuration | Availability, catalog, configuration/history, appointment list/detail | All eight RPCs and scheduling tables absent |
| Billing | Charge, payment, adjustment, refund, reversal; entries append rather than edit/delete | Patient ledger, balance and history | Both RPCs and ledger tables absent |
| Clinical | Create note/reference, update draft, sign, amend, enter in error, grant/revoke signer; no destructive record API | Patient list, record/revisions, signers | All four RPCs and clinical tables absent |
| Notification recipients | Add, toggle, relabel, remove; compatibility path also uses direct table writes and compensation | Settings and intake recipient reads | Direct C/R/U/D observed. Add/toggle/remove RPCs absent; relabel RPC present without observed calls. Existing code contains compatibility handling |
| Staff management | Auth create/invite, ban/deactivate, role change, onboarding, password reset, failed-invite cleanup | Staff profile and Auth user lookups | Profile SQL and onboarding/reset RPCs observed; compound operation and Auth admin latency unavailable |
| Staff preferences/releases | Tour dismissal; open, acknowledge, hide, guide-open, dismiss release | Release-state reads | All except hide observed; samples often very small |
| Audit | Append metadata; update external-action outcome from pending to succeeded/failed/unconfirmed | Filtered audit page, detail and export evidence | SQL families observed; historical DELETE samples are not a product audit-deletion API |
| Data lifecycle | Legal hold, authorized early deletion, batch retention cleanup | Lifecycle preview | Legal hold and preview have tiny samples. Early deletion and lifecycle runner have no observed service-role calls; scheduler state not inspected or changed |
| Aggregate analytics / throttling | Counter upsert; rate-limit claim and expiry cleanup | Internal aggregate state | Both RPCs observed; per-event/allowed-versus-denied split unavailable |
| Authentication/session | Sign in/out, OTP, recovery, password changes, token/session refresh | Auth `getUser`, profile authorization | Profile SQL observed; one failed token API sample. No complete Auth latency baseline |
| GitHub / email / static content | GitHub integration mutations, Resend notifications, source-owned patient content | Repository integration reads, static localized content | Outside production-database CRUD; provider and whole-backend latency unmeasured |

No production migration or rollout is implied by this matrix. The source branch intentionally
contains work not yet promoted. The three absent recipient RPCs also appear in deployed code;
their absence is paired with existing compatibility paths, not evidence that requests succeeded
through those missing RPCs.

### RPC register

`observed` refers to retained service-role SQL statistics, not an active benchmark.

| RPC | Production measurement | Calls | Mean ms |
| --- | --- | ---: | ---: |
| `portal_acknowledge_staff_release` | observed | 1 | 1.248 |
| `portal_add_notification_recipient` | absent from production | — | — |
| `portal_add_request_note` | observed | 149 | 9.433 |
| `portal_available_appointment_slots` | absent from production | — | — |
| `portal_check_intake_rate_limit` | observed | 11819 | 9.413 |
| `portal_close_request` | observed | 6 | 8.083 |
| `portal_complete_staff_onboarding` | observed | 9 | 9.076 |
| `portal_create_request_with_outbox` | absent from production | — | — |
| `portal_create_staff_request` | absent from production | — | — |
| `portal_delete_request_early` | no observed calls | — | — |
| `portal_execute_appointment_command` | absent from production | — | — |
| `portal_execute_billing_command` | absent from production | — | — |
| `portal_execute_clinical_command` | absent from production | — | — |
| `portal_execute_patient_command` | absent from production | — | — |
| `portal_execute_request_command` | absent from production | — | — |
| `portal_hide_staff_release` | no observed calls | — | — |
| `portal_list_appointments` | absent from production | — | — |
| `portal_list_clinical_signers` | absent from production | — | — |
| `portal_list_patient_clinical_records` | absent from production | — | — |
| `portal_log_call_outcome` | observed | 145 | 12.722 |
| `portal_open_staff_release` | observed | 8 | 16.025 |
| `portal_prepare_new_request_print_packet` | absent from production | — | — |
| `portal_preview_data_lifecycle` | observed | 1 | 8.605 |
| `portal_read_appointment` | absent from production | — | — |
| `portal_read_clinical_record` | absent from production | — | — |
| `portal_read_patient` | absent from production | — | — |
| `portal_read_patient_billing` | absent from production | — | — |
| `portal_read_request_worklist` | absent from production | — | — |
| `portal_read_scheduling_config` | absent from production | — | — |
| `portal_record_analytics_event` | observed | 11678 | 2.060 |
| `portal_record_staff_password_reset` | observed | 2 | 12.977 |
| `portal_record_staff_release_dismiss` | observed | 3 | 7.037 |
| `portal_record_staff_release_guide_open` | observed | 2 | 6.189 |
| `portal_remove_notification_recipient` | absent from production | — | — |
| `portal_run_data_lifecycle` | no observed calls | — | — |
| `portal_save_scheduling_config` | absent from production | — | — |
| `portal_scheduling_catalog` | absent from production | — | — |
| `portal_search_patients` | absent from production | — | — |
| `portal_set_request_legal_hold` | observed | 2 | 1.221 |
| `portal_set_staff_tour_dismissed` | observed | 16 | 4.799 |
| `portal_toggle_notification_recipient` | absent from production | — | — |
| `portal_undo_call_outcome` | no observed calls | — | — |
| `portal_update_recipient_label` | no observed calls | — | — |
| `portal_update_request_status` | observed | 47 | 9.685 |

## How to use this baseline

1. Preserve this observation as the pre-optimization historical record. Use the
   [repeatable capture and comparison procedure](../../README.md) for interval measurements.
2. First investigate the shared limiter's complete API path with matching-window SQL deltas
   and request timings. Its cumulative execution cost is the largest identified family, but
   total cost alone does not prove user-facing harm or justify changing its protection.
3. Measure each undeployed CRUD command on coordinated fictional Preview data, separating
   initial writes, retries, conflicts and populated reads. Establish production observations
   only after separately authorized promotion and representative real traffic.
4. Add privacy-preserving whole-backend timing as a separate change if full route/Server Action
   baselines are needed. Keep email, GitHub, Auth, database and total durations distinguishable.

No application optimization, instrumentation deployment, database migration, synthetic production
write, statistics reset, or scheduler activation was performed. No post-deploy check applies
to this documentation-only change. Full backend timing, controlled load tests, absent RPC
promotion and unobserved operation samples remain outstanding dependencies for complete coverage.

## Evidence files

- `metadata.json`: project/source/deployment identity and collection boundaries.
- `context.json`: capture timestamp, settings, migrations, function definition hashes, table and database counters.
- `statements.json`: all 261 captured fingerprints for the four selected API roles, with query text omitted.
- `indexes.json`: extension versions, index hashes/sizes/counters and blocked-session count.
- `api-latency.json`: fixed-window allowlisted route/status aggregates.
- `rpc-coverage.json`: all 44 RPCs and their explicit measurement gaps.
- `direct-access-inventory.json`: direct table operations and source call sites for both revisions.
- `operation-summary.json`: call-weighted service-role application families, derived from `statements.json`.
- `VERIFICATION.md`: local verification results and scope.
