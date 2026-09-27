# Production browser access check — 2026-09-27 UTC

**No production browser latency samples were collected.** Local staff credentials exist, but the
stored password was rejected by production. This is an authentication result, not a performance
result and not evidence that the production portal is slow.

The authorized existing identity was confirmed to match a production Auth account with a
confirmed email and an active, onboarded administrator profile. Two normal deployed-portal
sign-in attempts returned the generic login error. A single direct Supabase Auth diagnostic
returned `invalid_credentials` (HTTP 400). No credentials or identity values are exported.

The main checkout's two local environment backups and the two preserved worktree environments
contained the same identity/password pair. The two Keychain entries configured by the local
Stagehand launcher were absent. The Preview alias is not a production login mechanism.

[The sanitized browser artifact](browser-samples.json) preserves the final one-sample diagnostic
attempt with `authenticated:false`, `completed:false`, a visible login error, and an empty
observation list. The initial 20-sample attempt also stopped at sign-in with no observations.
The read collector is ready for a valid existing credential; no additional password attempts
are made automatically. A fresh successful run must replace this access check with a separately
dated measurement artifact rather than summarize an empty run.

No account was provisioned, password reset, staff profile changed, or administrator session
minted. No patient/request records were created, edited or deleted. Authentication attempts may
appear in normal production security logs. Production database/API evidence remains in the
[September 26 baseline](../2026-09-26-production/REPORT.md); successful fictional-data API and
browser timings are in the [September 27 Preview baseline](../2026-09-27-preview/REPORT.md).

The attempted origin was `https://westchasegi.com`; the production application SHA recorded
earlier in this investigation was `ddcbf23d8f25361a01a3777a1392bcfe529de0f2`. No deployment,
schema promotion, or scheduler change was performed.
