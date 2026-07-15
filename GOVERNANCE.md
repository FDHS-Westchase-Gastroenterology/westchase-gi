# Governance — Westchase GI (`FDHS-Westchase-Gastroenterology/westchase-gi`)

## Stewardship

The clinic-controlled personal GitHub account **FDHS-Westchase-Gastroenterology** owns this repository. The transfer completed on 2026-07-14 with issues, pull requests, and history intact. **ASTXRTYS** remains a Write collaborator for implementation work; Admin access is added only if a repository-settings task actually requires it.

The clinic also owns the Vercel Hobby account and replacement project named `westchase-gi`. The production alias and all application environment variables moved to that project, its push-to-deploy path was verified, and the former consultant-owned Vercel project was deleted.

## Release discipline

- **`main` is production.** Merges to `main` run CI (React Doctor) and deploy automatically to the clinic-owned Vercel project (`westchase-gi.vercel.app`, later `westchasegi.com` at DNS cutover).
- Treat every merge as patient-facing unless the change is explicitly non-user-visible (tooling, governance, docs-only).

## Access lifecycle

- Repository access stays limited to maintainers who need it for the WGI rebuild. ASTXRTYS currently has Write access.
- Dependabot, secret scanning, and push protection are enabled; address security alerts promptly.
- The clinic account owner must enable two-factor authentication. This is an owner-only control and is not yet recorded as complete.
- The `wgi-portal` GitHub App must be restricted from "all repositories" to only this repository. This is also owner-only and is not yet recorded as complete.
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
