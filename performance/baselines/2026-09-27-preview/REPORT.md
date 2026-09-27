# Application performance baseline — 2026-09-27 UTC

The application layer is now measured. The controlled run completed **820 authenticated API
observations across 41 scenarios** and **200 rendered browser workflows across 10 scenarios**.
Each scenario has 20 measured samples after two warm-up iterations. The API set contains 800
successful operations and 20 deliberately stale updates, all correctly rejected. Every measured
browser workflow reached its expected visible state. There were no unexpected failures in the
completed runs. Separate pilot failures are retained and excluded.

This is an **optimized localhost application using the fictional shared Supabase Preview**, not
live-production browser latency. Keep the [production SQL/API observation](../2026-09-26-production/REPORT.md)
as its own baseline. No production records, schema, settings, instrumentation, or deployment were
changed by these captures.

## What deserves attention

- Ordinary authenticated APIs cluster near 210–220 ms median. Their successful p95 values range
  from 219 to 327 ms. The paired server records show three Supabase calls per invocation: cookie
  identity verification, staff authorization, and the domain operation. Their summed time through
  response headers accounts for most handler time on this workstation-to-Preview path. These
  measurements combine network, Auth and Data API work; they do not isolate SQL or prove that a
  particular region is responsible.
- Saving a note takes **1,089 ms median / 1,871 ms p95** to the refreshed visible note. Its maximum
  is 2,996 ms. The action itself has a 212 ms median in the separate diagnostic capture. Investigate
  the action response, revalidation and rendering path before optimizing the note insert alone.
- Contact completion takes **889 ms median / 965 ms p95** to the visible confirmation; its action
  makes five Supabase calls. Undo takes **952 ms median / 1,200 ms p95**, with six calls inside the
  action. Repeated reads and revalidation are concrete candidates for a later paired experiment.
- Opening the full record takes **615 ms median / 1,210 ms p95** through loaded content. Its server
  read makes seven calls, some in parallel. The card alone is 172 ms median and involves no new
  record read at that boundary. Preserve the distinction when evaluating an optimization.

These are measured candidates, not authorization to change auth, audit, idempotency, business
rules, or frontend behavior. No optimization is included in this change.

## Browser results

All times are milliseconds. Navigation rows run from the browser navigation start until the
expected page content is visible after document load. Interaction rows include Playwright click
and readiness overhead, with two animation frames after the verified result. Creation crosses
documents and uses Node's monotonic clock around click-to-visible-detail. These are conservative
controlled elapsed times, not field RUM or exact physical input-to-paint measurements.

| Workflow | Samples | Median | p95 | Maximum |
| --- | ---: | ---: | ---: | ---: |
| `create_request` | 20 | 846.05 | 1143.71 | 1886.17 |
| `home` | 20 | 595.55 | 989.30 | 1284.10 |
| `next_request` | 20 | 366.30 | 669.80 | 1337.10 |
| `open_card` | 20 | 172.20 | 285.10 | 298.90 |
| `open_full_record` | 20 | 614.80 | 1209.60 | 1210.40 |
| `request_detail` | 20 | 328.30 | 560.00 | 578.70 |
| `requests` | 20 | 604.00 | 751.20 | 1560.00 |
| `save_contact_close` | 20 | 889.45 | 965.40 | 1101.70 |
| `save_note` | 20 | 1089.45 | 1871.20 | 2995.70 |
| `undo` | 20 | 951.60 | 1199.50 | 1267.70 |

[Browser summary](browser-summary.json) also records navigation TTFB and document-load timings;
these are additional metrics from the same navigation samples, not extra independent workflows.
[Raw timing observations](browser-samples.json) contain no names, record IDs, URLs, cookies, or
response bodies. The full-record readiness condition requires loaded body sections and no
loading skeleton; a visible header alone is insufficient.

## Authenticated API results

API elapsed time begins immediately before browser `fetch` and ends after response JSON decoding.
It includes server auth/validation, the domain call, and response transfer/decoding. It excludes
any unbuilt frontend. Success/replay/stale cases remain distinct. Configuration timing covers
updates to this run's configuration; initial creates are setup/warm-up observations.

| Operation | Outcome | Samples | Median | p95 | Maximum |
| --- | --- | ---: | ---: | ---: | ---: |
| `billing.adjustment` | success | 20 | 212.75 | 232.70 | 235.30 |
| `billing.charge` | success | 20 | 214.50 | 241.00 | 253.00 |
| `billing.payment` | success | 20 | 214.60 | 326.60 | 363.60 |
| `billing.read` | success | 20 | 209.00 | 234.60 | 261.20 |
| `billing.refund` | success | 20 | 211.75 | 234.60 | 245.80 |
| `billing.reverse` | success | 20 | 210.70 | 271.40 | 287.90 |
| `clinical.amend` | success | 20 | 214.90 | 233.10 | 239.70 |
| `clinical.create` | success | 20 | 210.80 | 226.10 | 243.90 |
| `clinical.enter_in_error` | success | 20 | 209.45 | 223.00 | 231.30 |
| `clinical.list` | success | 20 | 212.50 | 231.80 | 239.20 |
| `clinical.read` | success | 20 | 214.05 | 231.20 | 256.00 |
| `clinical.set_signer` | success | 20 | 213.40 | 235.50 | 249.10 |
| `clinical.sign` | success | 20 | 212.65 | 222.60 | 274.30 |
| `clinical.signers` | success | 20 | 211.20 | 236.80 | 262.70 |
| `clinical.update_draft` | success | 20 | 211.90 | 232.30 | 361.10 |
| `patients.archive` | success | 20 | 211.40 | 235.30 | 238.60 |
| `patients.create` | success | 20 | 210.45 | 242.20 | 255.80 |
| `patients.link_request` | success | 20 | 207.75 | 231.50 | 249.60 |
| `patients.read` | success | 20 | 209.85 | 240.00 | 246.70 |
| `patients.restore` | success | 20 | 212.65 | 231.40 | 246.60 |
| `patients.search` | success | 20 | 208.30 | 219.30 | 219.30 |
| `patients.unlink_request` | success | 20 | 209.20 | 232.20 | 237.10 |
| `patients.update` | success | 20 | 211.15 | 231.30 | 233.40 |
| `patients.update.replay` | success | 20 | 213.40 | 235.30 | 239.20 |
| `patients.update.stale` | expected stale rejection | 20 | 210.60 | 237.50 | 240.60 |
| `requests.worklist` | success | 20 | 218.20 | 252.50 | 286.20 |
| `scheduling.appointments` | success | 20 | 210.55 | 233.00 | 240.40 |
| `scheduling.availability` | success | 20 | 222.45 | 272.60 | 292.80 |
| `scheduling.book` | success | 20 | 212.90 | 229.70 | 260.60 |
| `scheduling.cancel` | success | 20 | 209.90 | 238.10 | 247.60 |
| `scheduling.catalog` | success | 20 | 214.40 | 223.30 | 225.70 |
| `scheduling.check_in` | success | 20 | 213.75 | 237.90 | 247.70 |
| `scheduling.complete` | success | 20 | 211.20 | 232.80 | 235.90 |
| `scheduling.no_show` | success | 20 | 212.10 | 260.20 | 298.20 |
| `scheduling.read_appointment` | success | 20 | 211.25 | 237.40 | 242.20 |
| `scheduling.read_config` | success | 20 | 210.15 | 219.00 | 247.80 |
| `scheduling.reschedule` | success | 20 | 213.75 | 220.40 | 260.50 |
| `scheduling.save_appointment_type` | success | 20 | 215.35 | 251.70 | 255.00 |
| `scheduling.save_location` | success | 20 | 212.80 | 239.00 | 293.70 |
| `scheduling.save_provider` | success | 20 | 219.60 | 234.20 | 345.30 |
| `scheduling.undo` | success | 20 | 214.40 | 224.30 | 242.20 |

[Core summary](api-summary.json) and [configuration/link summary](configuration-summary.json)
include paired backend means and Supabase call counts. Their raw observations were matched to
819 and 181 server events respectively, including warm-up/setup/retirement calls. Every expected
operation/detail label matched the dedicated server's serial log sequence. This correspondence
must not be applied to interleaved production traffic.

## Server Action diagnostic boundary

These samples include the two warm-up iterations and the final fixture-closing actions. They are
not paired browser percentiles, so do not subtract the two distributions. All request creations
successfully redirected; the logger preserves framework throws and records them as `thrown`,
which is not equivalent to failure.

| Action | Samples | Median ms | p95 ms | Supabase calls |
| --- | ---: | ---: | ---: | ---: |
| `requests.createStaffRequest` | 22 | 217.36 | 253.75 | 3 |
| `requests.addRequestNote` | 22 | 212.22 | 421.17 | 3 |
| `requests.readFullRecord` | 22 | 223.68 | 285.91 | 7 |
| `requests.recordContactAndClose` | 44 | 355.05 | 398.12 | 5 |
| `requests.undoLatestTransition` | 22 | 418.88 | 517.04 | 6 |

The [action diagnostic summary](action-server-summary.json) contains only aggregates. Durations
end when the action callback returns or throws, before later framework rendering and browser
updates. Supabase time stops at response headers and includes Auth traffic. Parallel transport
sums can exceed elapsed action time.

## Conditions and repeatability

- Source base: `f38d8b4d36cfe26ecfa7a93279b662eef4480411`, with the instrumentation patch identified
  by the source digest in each sample file. Measurement build: `4owmuMSN1svRDUR301LT2`.
  Final review subsequently corrected the unexercised native intake form's HTTP-303 telemetry
  classification from `rejected` to `redirect` and added a regression test. The captured source
  digest identifies the measured build; the review correction does not change the measured
  2xx/409 API paths or Server Action behavior.
- Next.js 16.3.5, Node **26.7.0**, Chrome 153.0.8010.53; desktop 1440 × 900; no artificial CPU/network
  throttling; one sequential client; warm browser/cache conditions after two warm-up iterations.
  The repo pins Node 22. These captures use the workstation's Node 26 and **must not be treated
  as a Node-22/Vercel comparison**. Verification separately uses the pinned Node 22 runtime.
- Target: shared Preview `gqzwcvwyhykscuidcmlh`, owned by integration branch
  `portal/appointment-workflow-experience` / PR #224; verified non-default, `ACTIVE_HEALTHY`, with
  `FUNCTIONS_DEPLOYED` status. Each runner passed the explicit target guard and the running app's
  schema/project attestation before writes. This task inherits that database; it provisions no
  new Supabase project or branch and applies no migration.
- Main API window: 03:11:58–03:15:08 UTC. Other exact windows are in the corresponding sample files.
  They are controlled runs, not a load/concurrency test. Nearest-rank p95 at n=20 is the second
  slowest observation and is only an initial tail estimate. Do not establish an SLO from it.
- API runs create their own fictional admin and patient/configuration records. Accounts are
  deactivated and banned at completion; successful fixture patients are archived. Contact and
  billing/clinical history remain intact. Browser fixtures are resolved through normal UI actions.
  Prior data is not reset or swept. Cardinalities grow during the run; the
  [post-run counts](cardinality-after.json) are context, not a before/after preservation audit.
- Check-in and no-show require current/past appointments. Only this run's dedicated appointment
  fixtures are staged directly outside the timer, with matching reserved intervals. Timed actions
  still pass normal authenticated endpoints, state/version rules and database constraints.
- Two aborted setup pilots are recorded in `pilot-api-samples.json` and `pilot-2-api-samples.json`.
  They exposed the future-date check-in rule and an overlapping fixture interval. A fixed staging
  clock resolved the overlap. Their accounts were retired, their measurements are excluded, and
  their synthetic historical rows remain. No application rule was weakened to make the run pass.

Use the [repeatable procedure](../../README.md#repeat-the-controlled-preview-measurement). Retain
runtime, source, data-size and cache conditions for comparisons. The recorded baseline includes
instrumentation overhead; any before/after optimization comparison should keep it enabled.

## Supabase guidance and how this compares

Supabase's current [detection guidance](https://supabase.com/docs/guides/observability/detecting)
uses an interval mean of at least 100 ms, at least 2× the previous interval and at least 20 calls
per interval for its query-regression check. That is a database alert condition, not a promised
portal/API latency or a universal p95 target. The prior production snapshot's identified query
means were below 100 ms, but it did not contain the paired intervals needed to evaluate that
regression condition. Its top-level SQL statistics cannot yield p95.

The local API/browser times here measure different boundaries and cannot be graded against that
SQL threshold. A proposed internal starting budget could be ordinary authenticated API p95 below
500 ms and common completed UI interactions below 1 second, with expensive exports and long
histories classified separately. **These are proposals, not adopted SLOs or Supabase promises.**
Against those proposals, all successful API scenarios fit; note saves, full-record opening,
request creation and Undo merit investigation at the browser boundary. Production comparison
requires its own authenticated observations and deployed timing evidence.

## Coverage and remaining work

| Area | Present evidence | Remaining measurement |
| --- | --- | --- |
| Production Postgres / Supabase API | Passive SQL and edge latency snapshot in the prior dated record | Paired production windows and additional low-volume CRUD traffic |
| Request experience | Home, list, detail, next-record, card, full record, create, note, contact-and-close, Undo | Mobile/constrained networks, cold sessions, long histories and other workflow variants |
| Request commands | All eleven request actions instrumented; five action names exercised in this run | Contact follow-up, manual booking, manual close, reopen, callback correction and legacy-classification distributions |
| Patients | Create/search/read/update/archive/restore/link/unlink; replay and stale-version results | Identity conflicts, long histories and future patient screens |
| Scheduling | All API action families and seven appointment commands; configuration updates | Coordinated request-to-booking cases, concurrency/conflict tails and future scheduling screens |
| Billing | Read, charge, payment, refund, adjustment, reversal | Large ledgers, conflicts, and future optional billing screens |
| Clinical | Create, edit draft, sign, amend, enter-in-error, reads and signer administration | Long content/history, document-reference variants and future optional clinical screens |
| Delete/lifecycle | Prior passive observations and explicit inventory; archive/cancel/reverse/correct measured where those are normal contracts | Exceptional deletion/retention runs require their own controlled, coordinated fixture window; no invented hard-delete endpoint |
| Other backend boundaries | Intake and aggregate telemetry instrumented; Auth/profile round trips included in measured handlers | Live intake/email, staff/settings administration, GitHub, exports/print and lifecycle total durations |

Live-production staff browser timing remains unmeasured after an actual credential check. The
existing local staff identity matches an active, onboarded production administrator, but both
the deployed sign-in form and a direct Supabase Auth check rejected the stored password; Auth
returned `invalid_credentials` (HTTP 400). Local backups contain the same password and the
configured Stagehand Keychain entries are absent. See the [access evidence](../2026-09-27-production-browser/REPORT.md).
No account was changed or reset. A read-only production collector is ready for a valid existing
session. Runtime timing will produce production evidence after the normal, separately authorized
production rollout. No paid observability upgrade is required for these structured log events;
log retention and collection windows still matter.

See [verification](VERIFICATION.md) for executed checks and outstanding integration/release gates.
