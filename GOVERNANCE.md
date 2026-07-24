# Governance — Westchase GI (`FDHS-Westchase-Gastroenterology/westchase-gi`)

## Stewardship

The clinic-controlled personal GitHub account **FDHS-Westchase-Gastroenterology** owns this repository. The transfer completed on 2026-07-14 with issues, pull requests, and history intact. **ASTXRTYS** remains a Write collaborator for implementation work; Admin access is added only if a repository-settings task actually requires it.

The clinic also owns the Vercel Hobby account and replacement project named `westchase-gi`. The production alias and required application variables moved to their intended targets there (the GitHub App credentials are Production-only), its push-to-deploy path was verified, and the former consultant-owned Vercel project was deleted.

## Release discipline

- **`main` is production.** Merges to `main` run the required quality and React Doctor checks, deploy automatically to the clinic-owned Vercel project, and run an exact-commit Production verification against the canonical site. The site has been live at canonical `https://westchasegi.com` since the 2026-07-18 DNS cutover; `www` redirects to the apex and `westchase-gi.vercel.app` remains attached.
- Treat every merge as patient-facing unless the change is explicitly non-user-visible (tooling, governance, docs-only).
- React Doctor remains an advisory required status while the current full-project findings are reconciled: a green check proves execution, not a clean result. The dependency controller additionally refuses automatic merge when an exact-head PR scan reports errors; manifest-only Dependabot changes normally publish the explicit "no React files changed" result.
- The current full-project snapshot at `c0d0b6e` is 65/100 with two reported errors and four warnings. Treat those diagnostics as hypotheses requiring source review; the repository standard remains a clean 100 local baseline.

## Automated dependency lane

Dependabot updates use three independent boundaries:

1. **Deterministic PR gates:** a no-secret runner performs a clean install, policy self-test,
   lint, build, and public Playwright smoke. React Doctor execution and Vercel preview are
   separate required checks.
2. **Read-only Codex review:** only verified Dependabot commits targeting `main` with a
   manifest-only diff reach Codex. The agent receives the OpenAI credential through its
   protected proxy but no GitHub mutation or merge credential. Its decision is tied to the exact
   head SHA and can veto but cannot override deterministic policy.
3. **Trusted merge controller:** only patch updates to one allowlisted direct development
   dependency can enter the queue. The controller rechecks the exact SHA, changed paths, CI,
   React Doctor's exact-head result, Vercel preview, Codex status, and GitHub mergeability; it merges at most one PR
   without bypassing protection. The next PR waits for post-merge CI, React Doctor, the matching
   Vercel Production deployment, and a canonical live-site smoke.

Major, minor, runtime, grouped, compiler/build/test/CI-tool, source-changing, stale, conflicting,
failed-agent, or ambiguous updates remain human-gated. The executable policy and seed regression
cases live in `.github/scripts/dependency-automation.cjs` and
`.github/codex/dependabot-sop-and-examples.md`. `OPENAI_API_KEY` is a repository Actions secret;
never copy its value into source, logs, PR text, Dependabot secrets, or the agent workspace.

## Access lifecycle

- Repository access stays limited to maintainers who need it for the WGI rebuild. ASTXRTYS currently has Write access.
- Dependabot version updates are configured and vulnerability alerts are enabled. GitHub secret scanning (including non-provider patterns and validity checks), push protection, Dependabot security updates, automated security fixes, and private vulnerability reporting are currently disabled in the transferred repository; review and enable the intended controls from the owner account, and address alerts promptly.
- The clinic account owner should enable two-factor authentication. This is an owner-only defense-in-depth control and is not yet recorded as complete; it does not gate the portal interface.
- The `wgi-portal` GitHub App should be narrowed from "all repositories" to only this repository. This owner-only defense-in-depth task can happen independently because every portal token is already restricted to the numeric repository ID.
- Revoke ASTXRTYS access when consulting work ends. Elevate it to Admin only for a concrete settings task, then return it to Write.

## Commit messages

Use **imperative `type(scope): summary`** subjects and a short **why-focused body**. Examples:

- `fix(hours): align Carrollwood Friday close with front-desk sheet`
- `feat(i18n): add Vietnamese nav labels for prep hub`

**Prohibited:** vague or generated messages (`update files`, `fix stuff`, `WIP`, emoji-only subjects).

## Pull requests vs direct push

| Path | When |
|---|---|
| **Review-ready PR** (default) | All normal source, content, and UI changes |
| **Admin direct push to `main`** | Urgent production hotfixes only — must include equivalent verification evidence (CI green, live spot-check, rollback noted) as a PR would |

Branch protection requires **quality**, **react-doctor**, and **Vercel**, requires the branch to
be current with `main`, and rejects force-pushes/deletion. Admin bypass remains reserved for
documented emergencies; automation never uses it.

## Related policy

- Pull request template: `.github/PULL_REQUEST_TEMPLATE.md`
- Code ownership: `.github/CODEOWNERS`
- Dependency updates: `.github/dependabot.yml`
