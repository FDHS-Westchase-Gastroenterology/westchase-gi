# Governance — Westchase GI (`ASTXRTYS/westchase-gi`)

## Stewardship

This repository is maintained under the **ASTXRTYS** GitHub account until the Westchase GI site is shippable and a client-owned GitHub identity exists. Custody transfer to a practice-owned account is **deferred**; the future handoff uses a **new clean-snapshot repository** with verified production pipeline — not a rewrite of this history.

## Release discipline

- **`main` is production.** Merges to `main` run CI (React Doctor) and deploy automatically to Vercel (`westchase-gi.vercel.app`, later `westchasegi.com` at DNS cutover).
- Treat every merge as patient-facing unless the change is explicitly non-user-visible (tooling, governance, docs-only).

## Access lifecycle

- Repository access stays limited to maintainers who need it for the WGI rebuild.
- Dependabot, secret scanning, and push protection are enabled; address security alerts promptly.
- When the deferred client handoff completes, rotate deploy tokens and revoke ASTXRTYS-only access that is no longer required.

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
