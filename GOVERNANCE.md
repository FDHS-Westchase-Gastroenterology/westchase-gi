# Governance — Westchase GI (`FDHS-Westchase-Gastroenterology/westchase-gi`)

## Stewardship

The clinic-controlled personal GitHub account **FDHS-Westchase-Gastroenterology** owns this repository. The transfer completed on 2026-07-14 with issues, pull requests, and history intact. **ASTXRTYS** remains a Write collaborator for implementation work; Admin access is added only if a repository-settings task actually requires it.

The clinic also owns the Vercel Hobby account and replacement project named `westchase-gi`. The production alias and required application variables moved to their intended targets there (the GitHub App credentials are Production-only), its push-to-deploy path was verified, and the former consultant-owned Vercel project was deleted.

## Release discipline

- **`main` is production.** Merges to `main` run CI (React Doctor) and deploy automatically to the clinic-owned Vercel project. The site has been live at canonical `https://westchasegi.com` since the 2026-07-18 DNS cutover; `www` redirects to the apex and `westchase-gi.vercel.app` remains attached.
- Treat every merge as patient-facing unless the change is explicitly non-user-visible (tooling, governance, docs-only).
- React Doctor is a required status check, but the current GitHub Action is advisory (`blocking: none`): a green check proves that the scan completed, not that it scored 100. Inspect the published score and findings before merge; the repository standard remains a clean 100 local baseline.
- The current post-merge full-project snapshot at `1b2f142` is 85/100 with zero errors and one warning. The PR/local changed-scope 100 result is useful evidence but is not the current `main` score.

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

Branch protection requires the **react-doctor** status check on `main` but allows admin bypass for documented emergencies. Do not use bypass for routine work.

## Related policy

- Pull request template: `.github/PULL_REQUEST_TEMPLATE.md`
- Code ownership: `.github/CODEOWNERS`
- Dependency updates: `.github/dependabot.yml`
