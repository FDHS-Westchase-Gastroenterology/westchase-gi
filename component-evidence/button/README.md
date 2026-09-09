# Button review candidate

Jason requested the proposed stock-button diff in custom source, installed into the prescribed PR #281 worktree for his Preview review. Before/after captures are explicitly waived for this iteration. No screenshots, recordings, or extended measurements are prerequisites for this checkpoint.

## Behavior

Immediate pressed feedback: transform scale(0.97) and opacity 0.8, with no timed transition. Reduced motion removes the transform and retains opacity feedback. Popup triggers share the pressed state; disabled and aria-disabled controls are excluded. Activation handlers remain with Base UI and the existing consumer.

Shared source: `/Users/Jason/Desktop/design/custom/ui/button.tsx`. WGI reusable source: `src/components/registry/button.tsx`. Installed copy: `src/components/ui/registry-button.tsx`. `npm run registry:install:button` builds the registry and installs the component through shadcn. Source and installed copy match. Shared source retains the buttonVariants export required by its existing registry consumers; WGI keeps that helper private to satisfy React Doctor. This is the only source adaptation.

Stock `base-nova/` is unchanged. Jason explicitly requested preparing custom/ before his portal review; this is an unapproved candidate, not a promoted default.

## Review surfaces

Fourteen portal modules import the candidate: request search, request creation, workflow actions, call-again actions, request notes, current feedback, print chooser, print controls, activity filters, recipient settings, staff settings, software access, release-briefing action, and error recovery.

The candidate uses the custom registry's stock-derived geometry and paint, resolved through the portal's existing semantic theme. The existing patient Button and tour-specific amber variant remain separate. Plain links, disclosure controls, and other specialized controls are outside this candidate.

## Motion review

| Before | After | Why |
| --- | --- | --- |
| Stock transition-all, shared across focus and press states | transition-none | Immediate keyboard/focus feedback; no unintended animated properties |
| Press translates down 1px, excluding popup triggers | Immediate 0.97 compression and 0.8 opacity on enabled controls | Consistent press acknowledgement, including popup triggers |
| No local reduced-motion exception | Compression only under no-preference; opacity in both modes | Keep feedback without movement when reduction is requested |

Source review: **Approve** for the requested immediate-state candidate. No new animation duration, easing, spring, event handler, or dependency. Jason's visual judgment is pending; opacity 0.8 is a proposed value, not a contrast certification.

## Verification

- Registry build and actual shadcn installation passed.
- Headless installed Chrome exercised server-rendered installed Button markup with the compiled portal stylesheet. Normal and popup press/release, native disabled state, Enter/Space activation, visible keyboard focus, five rapid clicks, initial reduced-motion load, and live preference changes while held passed. No animation was running during the sampled press states.
- This was an isolated component correctness check with the actual stylesheet, not an authenticated portal workflow test or physical-device test.
- Standing gate results and exact deployment are recorded in the PR checkpoint comment after push.

Next decision: Jason reviews the button in PR #281's Preview. No merge or Production release is authorized. Full credentialed portal journeys and physical-device interaction remain unverified.
