# SOP and Example Tasks — Dependabot Codex automation

## Framing

- **Target system:** Dependabot pull requests in
  `FDHS-Westchase-Gastroenterology/westchase-gi`.
- **Task the harness must perform:** Semantically review an exact, verified
  dependency-update commit and veto unsafe automatic merges.
- **Why an agent (vs. deterministic software):** Deterministic software owns
  provenance, version class, file scope, CI, deployment, and merge decisions.
  Codex is used only for repository-aware compatibility reasoning that fixed
  rules cannot reliably express.
- **Success criteria:** Only allowlisted patch updates to one direct development
  dependency can enter the queue; all required checks pass on the exact head;
  one PR merges at a time; the next waits for verified Production and live
  health; every other case stops for a human.
- **Constraints:** Patient-facing production; fail closed; no credential or
  merge token in the agent sandbox; no PR-authored instructions; no branch
  protection bypass; bounded API usage; exact-SHA audit trail.

## Human SOP

1. Confirm the PR is open, targets `main`, is authored by `dependabot[bot]`,
   contains verified Dependabot commits, and changes only `package.json` and/or
   `package-lock.json`.
2. Read Dependabot metadata: ecosystem, directory, dependency names/type,
   semver update class, old/new versions, group, and maintainer-change flag.
3. Classify the deterministic lane. Only one allowlisted direct development
   dependency receiving a patch update can be auto-merge eligible.
4. Review the exact diff for unexpected lockfile churn, scripts, engines,
   registries, transitive changes, and repository compatibility.
5. Run no-secret CI: clean install, policy self-check, lint, build, and public
   Playwright smoke. Require React Doctor and Vercel preview success.
6. Bind the policy and Codex decision to the exact head SHA using a commit
   status. Any new commit invalidates the prior authority.
7. If eligible and green, select at most one oldest PR, recheck every gate, and
   ask GitHub to squash-merge that exact head without bypassing protection.
8. Dispatch post-merge CI, React Doctor, and Production verification. Verify
   the matching Vercel Production deployment and canonical live-site smoke.
9. Do not release another dependency PR until current `main` has successful
   post-merge checks and production verification.
10. On ambiguity, conflict, stale SHA, malformed agent output, failed check,
    unexpected file, or failed deployment, stop and leave a human-visible
    label/comment.

### Decision points

| Step | Decision | Inputs needed | Failure mode if wrong |
|---|---|---|---|
| 1 | Is the PR safe to expose to Codex? | Author, verified commits, base, changed files | Prompt injection or secret exposure |
| 3 | Is automatic merge permitted? | Dependency type/name, semver class, group | Runtime or toolchain break reaches production |
| 4 | Did Codex find a concrete compatibility issue? | Exact diff and repository usages | Semantic regression despite green mechanical checks |
| 6 | Is the decision current? | Reviewed SHA and current head SHA | Different code merges than was reviewed |
| 7 | May this PR merge now? | CI, React Doctor, Vercel, Codex status, mergeability | Protection bypass or concurrent production changes |
| 8 | Is production healthy? | Exact main SHA, Vercel deployment/status, live response | Cascading dependency merges after a bad deployment |

## Example tasks

| # | Input / starting state | Expected outcome | Success criterion |
|---|---|---|---|
| 1 | `@types/react` direct-development patch; manifest-only diff; all checks green | Codex approves and controller merges exact SHA | One merge, followed by successful production verification |
| 2 | Allowlisted direct-development minor update | Human review | No successful `Dependabot Auto-Merge` status |
| 3 | Runtime dependency patch (`next`, React, Supabase, Resend, or Zod) | Human review | PR remains open with human-review label |
| 4 | TypeScript, ESLint, Playwright, React Doctor, or other gate/tool update | Human review | Toolchain update never enters automatic queue |
| 5 | PR changes a workflow, source file, or any non-manifest path | Agent does not run; human review | No OpenAI call and no merge authority |
| 6 | Maintainer commit appears on the Dependabot branch | Commit verification fails closed | Existing reviewed SHA cannot authorize new head |
| 7 | Policy-eligible patch but Codex identifies incompatible repository usage | Block | Failed exact-head status and blocked label |
| 8 | Codex times out or returns malformed JSON | Human review | No model-output parsing can accidentally approve |
| 9 | Dependabot refreshes the branch after approval | Rerun on new SHA | Controller rejects the stale status |
| 10 | First merge deploys unsuccessfully or live smoke fails | Queue pauses | No second dependency PR merges |

## Sign-off

- [x] SOP reviewed with Jason through the agreed implementation policy
- [x] Example set agreed as the seed regression set
