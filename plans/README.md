# Animation plans — staff portal home modal diff

Audit stamp: commit `08bd929`, branch `portal/appointment-workflow-experience`.
Scope: the modal work in the current diffs (`PortalModal`, `PortalCalendar`,
`sheet-line.tsx`, `portal-workbench.css`, `globals.css` motion registry).
Findings 1–3 are corrective; 4–5 are additive polish. The underlying motion is
otherwise sound — no HIGH-severity findings.

| # | Plan | Severity | Status |
|---|------|----------|--------|
| 001 | Fix the dead reduced-motion calendar crossfade | MEDIUM | TODO |
| 002 | Remove dead durations from reduced-motion reveal overrides | LOW | DONE |
| 003 | Tokenize the reveal's hardcoded 200ms fade | LOW | DONE |
| 004 | Confirm a calendar pick with a micro settle | LOW | DONE |
| 005 | Confirm the day commit on the trigger | LOW | DONE |

## Recommended execution order

1. **001** — the only user-visible bug (reduced-motion fade never runs).
2. **002** — same file and same cascade mechanism as 001; do them together so
   the reduced-motion story is cleaned up once.
3. **003** — trivial token rename, no behavior change; safe any time.
4. **004** and **005** — independent additive polish; either order. Both touch
   `sheet-line.tsx`/`portal-workbench.css`, so rebase the second on the first.

## Dependencies

- 002 depends on nothing but shares its rationale with 001; if 001's cascade
  diagnosis is ever invalidated (e.g. the blanket reset leaves `@layer base`),
  re-check 002's premise before executing.
- 004 and 005 both edit `portal-workbench.css` and, in 005's case,
  `sheet-line.tsx`; execute sequentially, not in parallel worktrees.

## Verification bar

Every plan inherits the repository's standing gates: `npx oxlint` (zero
warnings/errors), `npx oxfmt --check`, `npx react-doctor@latest --verbose`
(100), `npm run build`, and — since all five plans are UI-visible — visual
evidence in the PR conversation (before/after screenshots; a video for the
commit-handoff path in 005).
