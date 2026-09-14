# Staff home list: the scrollbar thumb is the scroll position (issue #302)

Before: `bccfac1` (`portal/appointment-workflow-experience`, the #303 elastic thumb). After: `a302b8f`.
Captured 2026-09-13 from the local Playwright harness origin (this session's harness on :3101, Preview
Branch seed identity, fictional data; names, phones, the greeting and the session identity replaced in
the browser before capture; the sign-in form never recorded). Viewports 1440×900 and 390×844, DPR 2.

| File | State |
| --- | --- |
| `*-rest-top-1440x900.png` | `/admin`, list at the top |
| `*-rest-end-1440x900.png` | scrolled to the end, pointer away |
| `*-held-past-end-1440x900.png` | thumb grabbed and dragged 180 px past the end, held |
| `*-wheel-past-end-1440x900.png` | six wheel notches past the end, mid-burst |
| `*-forced-colors-held-past-end-1440x900.png` | the held state under `forced-colors: active` |
| `*-rest-end-390x844.png`, `*-held-past-end-390x844.png` | the same at the mobile regression viewport |
| `*-rail.png` | the rail column of the matching capture, 44 px of gutter either side |
| `compare-*-rail-3x.png` | before (left) and after (right) rail crops at the pushed end, 3× |
| `*-metrics.json` | thumb transform, height, width, children, ink transform, rail size and scroll range per state, plus 43 sampled frames after release |
| `videos/*-wheel-drag-past-ends-1440x900.mp4` | wheel to the end and six notches past it, thumb drag 180 px past the end and release, twelve-notch burst past the start; cursor drawn in; same script before and after |
