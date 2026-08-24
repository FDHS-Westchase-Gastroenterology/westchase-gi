# Memory

## 2026-08-23 21:30
HEAD 103d21d
Pre-existing finding, not fixed in the pi-candidate-1 loop-2 commit: `npm run ui:reference:portal`
fails at `mobile-portal-audit at 320px` (351px content in a 320px viewport) on the current
Preview Branch data. Stash-verified independent of the loop-2 CSS change; the audit page's
`min-w-[640px]` table is not the direct cause, so find the 351px element before filing. Rams
also flagged three advisory, surface-wide Home patterns for a future design-led pass: disabled
`.btn` opacity 0.58, 0.82–0.86rem secondary type, and the `aria-hidden` amber attention dot
(labels are text beside it, so state is not color-only in the DOM).

## 2026-08-16 22:27
HEAD b9e8c58
Visual-evidence gate is now a standing contribution-loop item: UI-visible PRs need before/after screenshots in the conversation; workflows need a video. #236 evidence is posted against the current restacked head.

## 2026-08-16 22:05
HEAD e3ec91c
Rebased GitHub stack #237 (#224 ← #227 ← #236) onto current `main` and restacked #239 on the new #236 tip. Each layer has a standing-gate follow-up commit. Local gates on this tip: oxlint 0, oxfmt clean, React Doctor 100.
