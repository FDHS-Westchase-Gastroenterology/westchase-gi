# Memory

## 2026-08-23 22:16
HEAD e62a4fe
Candidate 2 loop 1 (Appointments queue) is committed on `codex/pi-candidate-2`. Rams
review_files scored 92/100 with three findings left as documented non-actionable:
chevron `aria-hidden` and pagination `tabular-nums` are false positives (icons.tsx `base()`
sets `aria-hidden` by default; `.portal-queue-pagination > p` already sets tabular-nums),
and the row `data-attention` color is emphasis-only — urgency is carried by the differing
next-action text itself. Local credentialed E2E needs
`PLAYWRIGHT_ALLOWED_SUPABASE_PROJECT_REF=$SUPABASE_BRANCH_PROJECT_REF` exported from
`.env.local` before `npx playwright test`; the Playwright chromium headless shell had to be
installed once with `npx playwright install chromium`.

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

## 2026-08-23 22:45
HEAD 0e8ca79
Candidate 2 loop 2 correction is committed on `codex/pi-candidate-2`: the queue waiting→location
separator is now real DOM text (` · ` in a `portal-ledger-sep` span; `margin-inline:
calc(0.4rem - 0.1925em)` restores the exact loop-1 16.11px gap because 0.1925em is Lato's space
advance). Renders pixel-identical (both atlas request PNGs byte-identical; no binary churn — other
portal routes drifted on live branch-DB data and were reverted). E2E VAL-ADMIN-017 now asserts the
innerText DOM-text contract. Rams 96/100, findings all pre-existing loop-1 typography frozen by
the brief. oxlint rewrote a loop-1 pagination span for format compliance (whitespace only).
