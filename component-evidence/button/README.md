# Approved Button default

Jason tested the PR Preview and approved general staff-portal adoption on September 9, 2026, while asking that controls with their own interaction behavior be preserved. Before/after capture remains explicitly waived for this iteration.

## Behavior and packaging

Enabled buttons immediately compress to 0.97 and use 0.8 opacity while pressed, with no timed transition. Reduced motion removes compression and retains opacity feedback. Disabled and aria-disabled controls are excluded.

Reusable source: `src/components/registry/button.tsx` and `registry-button-variants.ts`. Installed source: `src/components/ui/registry-button.tsx` and `registry-button-variants.ts`. The separate helper lets server-rendered links share the recipe without importing a client component. Both files are registered and installed through `npm run registry:install:button`. Shared Desktop source retains its existing combined file and helper export; behavior is identical. Stock sources remain unchanged.

## Portal adoption

Ordinary actions and button-style links use the approved custom recipe across Home, Appointments, request entry and detail, printing, review flyers, recent work, settings, software access, help, the tour, error recovery, and password setup/recovery. Local layout and color overrides remain where needed. Former amber recipe calls use the custom primary variant.

## Preserved controls

| Controls | Existing behavior retained | Source |
| --- | --- | --- |
| Filter editor choices and Apply | Existing editor selection states and Apply timing | `(home)/filter-bar.tsx`, `home.css` |
| Home empty-state Clear filters | Authored 130ms press response | `(home)/home-dashboard.tsx`, `home.css` |
| Home record Save and Open full record | Existing press response; pointer/keyboard distinction for opening the panel | `(home)/record-card.tsx` |
| Full-record resize grip, Close, and Call link | Drag/keyboard resizing and authored press response | `(home)/full-record-sheet.tsx`, `home.css` |
| Calendar days/navigation, outcome choices, checkbox and radio controls | Specialized selection and focus behavior | Home controls and shared calendar/selection components |
| Recent-work type filters | Selected pill styling and 150ms color transition | `audit/recent-work-controls.tsx` |
| See what changed, What's new, and release-summary Close | Existing opening/closing choreography | `portal-release-briefing.tsx` |
| Add note trigger | Existing reveal/focus choreography already layered on the custom Button | `requests/[id]/request-notes.tsx`, `portal-workbench.css` |
| Appointments utility Print trigger and Export CSV link | Existing quiet-link color response; Home Print receives the custom recipe through its supplied classes | `requests/print-chooser.tsx`, `portal-workbench.css` |
| Sign in and Forgot password? | Held pending press for Sign in; dedicated 150ms press for Forgot password | `login/login-form.tsx` |

All source paths above are relative to `src/app/admin/(portal)/` except the authentication path, which is relative to `src/app/admin/`. Navigation tabs and plain text links retain their navigation styling.

## Motion review

| Before | After | Why |
| --- | --- | --- |
| Ordinary actions mixed the old shared transition with separate native buttons | Approved instant compression and opacity response | Consistent acknowledgement without waiting for an animation |
| Button-style links used the old shared recipe | Same approved recipe as action buttons | Consistent behavior for the same visual control |
| Specialized controls have authored interaction behavior | Preserved | Honor Jason's exception boundary |

**Verdict: Approve.** No new timings, curves, springs, or activation handlers. Reduced-motion feedback remains immediate and stationary.

## Verification and release boundary

The registry installs both source files. Focused browser checks use the installed component with compiled portal CSS and cover press/release, popup triggers, disabled state, keyboard activation and focus, repeated activation, and initial/live reduced-motion preferences. This is an isolated component check, not a full authenticated workflow test. Standing gate and Preview deployment results are recorded in the PR conversation. No merge or Production release is authorized.

## Home filter integration — September 9

Jason approved adapting the custom default to Home filters. Add filter and suggestion pills now use the shared Button with their existing shape, border, labels, and counts. Their former local timed compression is removed. Active filter capsules retain separate edit/remove controls with immediate background feedback; the remove control has an explicit pressed tint. Mouse/trackpad hover styling is gated separately from pressed/open states. Open editor tints persist, and reduced motion retains the shared opacity cue on standalone pills without movement.

| Before | After | Why |
| --- | --- | --- |
| Standalone pills animate compression over 130ms | Shared immediate compression and opacity | Match the approved default for repeated actions |
| Capsule edit/remove colors transition over 130ms | Immediate colors; explicit remove press tint | Preserve the split control and feedback without movement |
| Ungated filter hover styles | Fine-pointer hover only | Avoid mouse-only hover feedback on touch |

Motion verdict: **Approve** for this bounded change. The editor, Apply, calendar, and popover animation remain outside it. Focused checks use installed Button markup with compiled portal CSS plus Home CSS, covering press/release, keyboard, disabled state, reduced-motion changes, split-control tint, and coarse-pointer hover exclusion. They do not constitute a full live portal workflow audit. Captures remain waived for this iteration.
