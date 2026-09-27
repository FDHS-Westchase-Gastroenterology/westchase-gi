# Verification — application performance baseline

The source change adds fixed-label timing around existing authenticated boundaries and the
Supabase transport. It changes no schema, authorization decision, validation rule, page appearance,
or business command. The runtime helper owns five behavioral tests: privacy and return identity,
concurrent scope isolation, transport/framework exception identity, disabled logging, and HTTP
redirect classification. The redirect regression was observed failing (`rejected` instead of
`redirect`) before the correction and passing afterward.

## Local checks

Checks run on the task checkout with locked dependencies and Node 22.23.3, matching `.nvmrc`'s
major version. The controlled timing runs separately record Node 26.7.0.

- `npm run test:unit`: 448 passed, 0 failed.
- `npm run test:e2e-guard`: 12 passed, 0 failed.
- `npx oxlint`: zero warnings/errors, repository-wide configuration.
- `npx oxfmt --check`: all matched files formatted.
- `npx react-doctor@latest --verbose`: 100/100, 431 source files. Generated `.next` output was
  moved outside the checkout for this scan; generated code was not edited to improve the score.
- `npm run build`: Next.js 16.3.5 optimized compile, TypeScript check and all 381 static pages passed on Node 22.23.3.
- Public Playwright suite: 21 passed, 14 expected cross-project skips. Used the documented
  development-server mode on an isolated port, with a temporary configuration that preserves
  the existing projects/tests and avoids `dev:mission` killing another checkout's port 3100.
  No `.env.local` or hosted credentials were available to this server; loopback CI placeholders
  were supplied. Browser screenshots/video/trace stayed disabled.
- Dependency automation: 14 tests passed. Local-only tracked-path and generated-ignore guards passed.
- Final performance JSON/Markdown credential-pattern scan: 25 files checked, zero credential findings.
  This is an artifact scan, not a claim that the optional full-history secret scanner passed.
- `git diff --check`: clean.

The initial Node-22 unit invocation nested `npx` inside `npx -c`, which propagated npm command
configuration and caused the two lint-plugin subprocess tests to receive no JSON. Running the
installed Node-22 executable through PATH resolved that launcher issue; the complete suite passed
without weakening or removing either test.

The extra public-suite run against `next start` reported one failure: its re-entry test wraps
**all** window fetches and expects a count of one. A controlled replay observed one appointment
POST and three unrelated Next.js prefetches (`/en/physicians`, `/en/contact`, `/en/appointment`).
The documented CI development-server configuration passed the entire public suite without source
or test changes. This production-mode harness limitation remains; the actual duplicate-submit
boundary produced one POST. Performance captures use `next start`, independent of that suite.

## Runtime proof

- Fresh Stagehand browser, managed optimized server, seeded Preview sign-in, observed request
  trigger and loaded full-record body. Inspected the 1440×900 capture with staff email masked.
  The companion card and populated sheet were both visible. Local evidence capture 1814,
  SHA-256 `9ade36fbfe6e1297a47d76110b1e1c3b28d4a58741e1f7f5950aeeb90749fdc6`.
  The initial server start raced an unfinished build; it was ended and restarted after completion.
  The completed session ended with `active:false`, `closed:true`, `devServerStopped:true` and
  no cleanup errors. A rejected screenshot path was corrected to the task checkout's `.logs`.
- API core: 700 measured calls, 35 scenarios, two prior warm-up iterations, no unexpected failures.
- Configuration/links: 120 measured calls, six scenarios, no unexpected failures.
- Browser: 200 workflow measurements across ten scenarios; another 120 TTFB/load values describe
  those same navigation samples. All expected visible results passed.
- Dedicated API/configuration accounts were deactivated and banned. Completed patients were
  archived and browser requests resolved; synthetic audit/history rows remain. Pilot artifacts
  are excluded from performance summaries and their accounts were also retired.
- The instrumentation patch's final review corrected HTTP-303 classification; it does not change
  the paths timed in these captures. Sample files retain the measured source digest/build ID.

## External and unexecuted checks

The selected database is inherited from PR #224: `gqzwcvwyhykscuidcmlh`, owner/integration target
`portal/appointment-workflow-experience`. The Supabase branch listing showed `ACTIVE_HEALTHY` and
`FUNCTIONS_DEPLOYED`; the running local app passed project/schema attestation. No new database,
migration, fixture reset, destructive lifecycle run, scheduler, or production promotion occurred.

The full credentialed/destructive E2E suite was not run. Its global setup disables all notification
recipients and sweeps `.test` request/audit fixtures across the shared Preview. The controlled
benchmark uses isolated additive fixtures instead. This is live authenticated functional and
timing evidence for the listed paths, not a substitute claim that every integration suite passed.

Exact-head hosted `quality`, `react-doctor`, `Vercel`, and `supabase-integration` remain required
before merge. The existing automation's inherited-database routing limitation is documented in
CONTRIBUTING.md; a missing or skipped integration check must not be described as passing. No merge
or production deployment is authorized by this local verification.

Existing local staff credentials were located and tried after explicit sign-in authorization.
The identity matches an active, onboarded production administrator, but production rejected the
stored password: two portal attempts and a direct Auth diagnostic (`invalid_credentials`, HTTP
400). Local backups match that password; configured Keychain entries are absent. No password
reset, account provisioning, or alternate administrator session was performed. The privacy-safe
[access record](../2026-09-27-production-browser/REPORT.md) contains zero measured browser samples.
Production page/save latency remains unmeasured; the local Preview results must not replace it.

No authored UI changed, so before/after UI-change evidence is N/A. Existing UI was exercised for
measurement, and no frontend style, motion, interaction, or component source was changed.
Rollback is to disable `PORTAL_PERFORMANCE_LOGS` or revert the instrumentation commit. No database
rollback is needed. Log storage/retention and production collection still require an operational
observation window after the normal release.
