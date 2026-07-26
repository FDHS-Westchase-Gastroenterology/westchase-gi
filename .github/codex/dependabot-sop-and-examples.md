# SOP and Example Tasks — Dependabot Codex automation

## Framing

- **Target system:** Dependabot pull requests in
  `FDHS-Westchase-Gastroenterology/westchase-gi`.
- **Task the harness must perform:** Semantically review an exact, verified
  dependency-update commit and veto unsafe automatic merges.
- **Why an agent (vs. deterministic software):** Deterministic software owns
  provenance, file scope, CI, deployment, and merge decisions. Codex is used
  only for repository-aware compatibility reasoning that fixed rules cannot
  reliably express.
- **Success criteria:** Every verified manifest-only npm update may enter the
  queue regardless of dependency name/type, SemVer class, or grouping. All
  required checks pass on the exact head; one PR merges at a time; the next
  waits for verified Production and live health. Incomplete metadata and valid
  retry/repair decisions receive bounded automatic attempts; concrete defects
  are rejected rather than delegated.
- **Constraints:** Patient-facing production; fail closed at provenance and
  deterministic gates; no credential or merge token in the agent sandbox; no
  PR-authored instructions; no branch-protection bypass; bounded API usage;
  exact-SHA audit trail. Codex availability is not a release or human gate.

## Runtime architecture and safety boundary

The word "local" in the Supabase integration job means local to an ephemeral
GitHub-hosted Ubuntu runner, not local to a maintainer workstation and not a
hosted Supabase project.

1. Dependabot creates the dependency commit.
2. The trusted preflight job reads GitHub/Dependabot metadata without checking
   out PR code. Only a verified Dependabot author, `main` target, root npm
   update, no maintainer changes, and a `package.json`/`package-lock.json`-only
   diff may reach Codex.
3. Codex attempts to check out the exact merge ref on its own GitHub Actions
   runner and acts only as a read-only semantic veto. It has no mutation token
   and cannot repair, push, or merge the PR. If the service is unavailable or
   its response is malformed, the workflow records that fact and continues to
   the authoritative deterministic gates.
4. A separate `ubuntu-latest` job starts Supabase in Docker, replays the
   committed migrations, generates local API keys, seeds local-only fixtures,
   starts the application, runs the contract, and executes `supabase stop`
   under `if: always()` after CLI setup succeeds. GitHub destroys the runner
   afterward.
5. That job has `contents: read`, does not receive hosted Supabase or deployment
   secrets, and cannot apply its migrations or test writes to Development or
   Production. The service key used by the contract belongs only to the
   disposable stack.
6. The trusted controller re-reads statuses for the exact SHA, requests a
   normal GitHub squash merge without bypass, and dispatches post-merge checks.
   Production verification waits for the matching Vercel deployment and sends
   a read-only `GET` to `https://westchasegi.com/en`; it does not run SQL,
   migrations, seeds, or write probes against the live database.

This is autonomous dependency review and verification, not a production
database-deployment agent. Codex remains read-only. Valid `retry` and `repair`
decisions trigger bounded exact-head attempts; GitHub's pull-request API updates
behind branches, and persistent failures are closed. `reject` closes a concrete
incompatible update. Source or migration work is never improvised inside a
secret-bearing dependency run.

## Automation SOP

1. Confirm the PR is open, targets `main`, is authored by `dependabot[bot]`,
   contains verified Dependabot commits, and changes only `package.json` and/or
   `package-lock.json`.
2. Read Dependabot metadata: ecosystem, directory, dependency names/type,
   semver update class, old/new versions, group, and maintainer-change flag.
3. Admit every update that passes the provenance and manifest-only boundary.
   Package identity, runtime/development classification, SemVer size, grouping,
   compiler ownership, and test-tool ownership do not change eligibility.
4. When Codex is available, review the exact diff for unexpected lockfile
   churn, scripts, engines, registries, transitive changes, and repository
   compatibility.
5. Run no-secret CI: clean install, policy self-check, lint, build, public
   Playwright smoke, and the isolated Supabase contract. The Supabase job uses
   disposable local keys only and verifies direct Auth refresh, SSR cookie
   sessions, closed Data API/RLS boundaries, and representative PostgREST
   persistence/relationships. Require React Doctor and Vercel preview success.
6. Bind the policy and automation decision to the exact head SHA using a commit
   status. Any new commit invalidates the prior authority.
7. Select the oldest exact-head-approved PR whose gates are green. A failing
   older PR does not stall a green sibling. Update a behind branch through
   GitHub's native pull-request API, re-verify the signed bot-only history, and
   explicitly dispatch the exact-head gates that token-authored updates do not
   trigger. After those real runs pass, attest their protected status contexts
   on the exact SHA. Close a conflicting branch, and give valid retry/repair
   decisions at most three exact-head attempts.
8. Dispatch post-merge CI, React Doctor, and Production verification. Verify
   the matching Vercel Production deployment and canonical live-site smoke.
9. Do not release another dependency PR until current `main` has successful
   post-merge checks and production verification.
10. Retry an incomplete metadata fetch without exposing the PR to Codex. Close
    genuinely untrusted or concretely rejected updates. Keep failed
    deterministic updates out of the merge set while the queue evaluates other
    green PRs. An unavailable or malformed model response is advisory and
    cannot prevent otherwise-green automation.

### Decision points

| Step | Decision | Inputs needed | Failure mode if wrong |
|---|---|---|---|
| 1 | Is the PR safe to expose to Codex? | Author, verified commits, base, changed files | Prompt injection or secret exposure |
| 3 | Is automatic review permitted? | Provenance, target, ecosystem, directory, changed files | Untrusted code reaches a secret-bearing job |
| 4 | Did Codex find a concrete compatibility issue? | Exact diff and repository usages | Semantic regression despite green mechanical checks |
| 6 | Is the decision current? | Reviewed SHA and current head SHA | Different code merges than was reviewed |
| 7 | May this PR merge now? | CI, React Doctor, Vercel, automation status, mergeability | Protection bypass or concurrent production changes |
| 8 | Is production healthy? | Exact main SHA, Vercel deployment/status, live response | Cascading dependency merges after a bad deployment |

## Example tasks

| # | Input / starting state | Expected outcome | Success criterion |
|---|---|---|---|
| 1 | `@types/react` direct-development patch; manifest-only diff; all checks green | Approve and merge exact SHA | One merge, followed by successful production verification |
| 2 | Direct-development minor update | Eligible | Version size alone does not block automation |
| 3 | `@supabase/supabase-js` production patch; disposable integration green | Eligible | Runtime patch merges only after Auth/data contract success |
| 4 | Other runtime update (`next`, React, Resend, or Zod) | Eligible | Exact-head deterministic gates pass; an available Codex review finds no blocker |
| 5 | TypeScript, Playwright, or React Doctor update | Eligible | The updated gate proves itself before merge |
| 6 | Grouped React + React DOM update | Eligible | Coupled peers are tested and merged together |
| 7 | PR changes a workflow, source file, or any non-manifest path | Reject and close | No OpenAI call and no merge authority |
| 8 | Maintainer commit appears on the Dependabot branch | Commit verification fails closed | Existing reviewed SHA cannot authorize new head |
| 9 | Codex identifies a concrete incompatibility not fixed by regeneration | Reject and close | Failed exact-head status and blocked label |
| 10 | Codex times out, exceeds quota, or returns malformed JSON | Continue through deterministic gates | Model availability cannot create a human gate |
| 11 | Dependabot refreshes the branch after approval | Verify bot signatures and explicitly dispatch gates on the new SHA | Controller rejects the stale status |
| 12 | First merge deploys unsuccessfully or live smoke fails | Queue pauses | No second dependency PR merges |
| 13 | Oldest PR fails install but a compatible sibling is green | Skip failure and merge green sibling | Rebased older PR gets a fresh exact-head run |

## Readiness evidence — 2026-07-24

PR #60 established the disposable Supabase gate and expanded the deterministic
lane. Its GitHub run passed clean install, lint, build, public smoke, React
Doctor, Vercel preview, and all three isolated Supabase contracts:

- password sign-in, refresh-token/user verification, SSR cookie persistence,
  reload, and logout;
- denied anonymous/authenticated Data API access plus permitted local
  service-client access; and
- application intake persistence, related event insertion, embedded PostgREST
  relationship reads, and cleanup.

The original policy admitted only four of the six Dependabot PRs opened that
day. That package/version allowlist was removed on 2026-07-26: the executable
regression now proves every trusted manifest-only update is eligible, including
all seven PRs from the 2026-07-26 batch.

| PR | Dependency | Result |
|---|---|---|
| #45 | `@supabase/supabase-js` patch | Eligible through the isolated Supabase runtime lane |
| #46 | TypeScript major | Eligible; compiler/build checks are authoritative |
| #47 | `tailwindcss` patch | Eligible direct-development patch |
| #48 | `@tailwindcss/postcss` patch | Eligible direct-development patch |
| #49 | React Doctor minor | Eligible; exact-head React Doctor must pass |
| #50 | ESLint patch | Eligible direct-development patch |

Run `node --test .github/scripts/dependency-automation.test.cjs` after any
policy edit. A documentation claim never expands eligibility; only a reviewed
policy-and-test change can do that.

## Sign-off

- [x] SOP reviewed with Jason through the agreed implementation policy
- [x] Example set agreed as the seed regression set
