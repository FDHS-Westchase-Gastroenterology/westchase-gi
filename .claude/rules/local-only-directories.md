# Local-only directories

The paths listed below are gitignored and never committed, even if a branch already carried them. `local-only-paths.json` is the single source of truth: it generates this list, the `.gitignore` managed block, the pre-commit hook, and the CI check.

- A `.gitignore` rule does nothing for a file git already tracks. Untrack with `git rm -r --cached <dir>`; that keeps the files on disk.
- Add a path by editing `local-only-paths.json` and running `npm run local-only:write`. Never hand-edit `.gitignore` or this file.
- Never untrack a path because it looks like tooling. Check `main`, CI workflows, `package.json`, and imports first; the `loadBearing` list records paths that failed that test.

<!-- BEGIN generated from local-only-paths.json -->

Local-only (gitignored, never committed, even if a branch already carried them): `.agents/`, `.codex/skills/`, `.cursor/`, `.design-sync/`, `.ds-sync/`, `.impeccable/surfaces/`, `.logs/`, `.product-design-audit/`, `.vercel/`, `backend-memos/`, `ds-bundle/`, `plans/`, `screenshots/`, `MEMORY.md`, `docs/`.
Reasons, first-tracked dates and leak history: `local-only-paths.json`.

**Must stay tracked** (the guard refuses to run if the list above overlaps one): `scripts/`, `.vscode/`, `ui-reference/`, `.github/`, `src/`, `e2e/`, `supabase/`, `tools/`, `public/`, `private/`, `.claude/`.
Reasons and incidents: `local-only-paths.json`.

<!-- END generated from local-only-paths.json -->
