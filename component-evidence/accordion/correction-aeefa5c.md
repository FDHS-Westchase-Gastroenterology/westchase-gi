# Accordion correctness follow-up — aeefa5c

The focused hosted check confirms that the corrected component reacts to a real reduced-motion preference change while an opening spring is still moving. The answer was **77.28px short of its target when the browser delivered the media-query change**; the next sampled frame, 4.9ms later, was exactly at the target. Restoring ordinary preference restored the spring. This addresses the live-preference failure measured in [7bbee27](spring-7bbee27.md).

This is a **focused correctness check**, not a repeat of the two-viewport 400-interaction matrix. It contains one observed run per motion case on the desktop tall answer. It does not supply a new performance comparison or certify all accessibility behavior.

## Exact version and setup

- Application SHA: `aeefa5c4625bc38b33ae24316b59351b8f685d29`.
- Vercel deployment: `dpl_BfNtBHCJBkJvzgRSzdDjRWCsUVXu`, READY Preview. The implementation agent verified the authenticated Preview environment endpoint against this exact SHA.
- [Immutable Preview Help page](https://westchase-lng6m4u3s-jasongitdev-1290s-projects.vercel.app/admin/help).
- Browserbase session: `f795ad34-9fb7-4509-80ac-a0177b25d27f`. The preceding supplemental 7b run exited without `browser.close()`; the session owner then confirmed its health and signed into this corrected origin before testing.
- Desktop viewport: 1440×900. Answer: “Work an appointment request”, final height 1454.641px. Same hosted Linux Chromium 152 session as the supplemental run; no throttling or physical-device claim.
- Motion smoke: September 8, 2026, 21:16:24–21:16:48 UTC. Both smoke processes exited without closing the managed browser session.
- Pointer-like activations are synthetic MouseEvents with `detail: 1`; Enter uses real Playwright keyboard input and generated a browser-trusted click. Media changes use actual browser emulation, not a mocked `matchMedia` function.

## Observations

| Focused case | Observed result | Scope |
| --- | --- | --- |
| Ordinary opening interrupted by live reduced preference | Media event arrived 233.2ms after activation with height 1377.359px; target 1454.641px. The next sample 4.9ms later was exactly target and remained there. | Confirms an active spring stops with a substantial 77.28px distance remaining. |
| Live change back to ordinary preference | The next opening showed intermediate heights and settled geometrically after 497.4ms. | Confirms the mounted component resumes ordinary spring behavior. |
| Reduced preference set before page load | Opening reached its full target in the first post-input sample, 9.9ms after activation. | Confirms the reduced preference is honored when mounting. |
| Enter activation under ordinary preference | Opening reached its full target in the first post-input sample, 13.2ms after the generated click. | Confirms keyboard opening remains immediate at sampled-layout resolution. |

The media-query observer was installed before application scripts, so it read panel height before the component's reactive subscriber handled the event. Raw samples record browser clock timestamps, expanded state, height, and actual preference. The browser began reporting the new preference in a sampled `matchMedia` read shortly before dispatching the change event; the report anchors interruption to the actual event and does not equate those two timestamps.

Geometric settling uses the same 1px/trailing-three-frame criterion as the comparison reports. These are single observations, not medians. They establish browser-observed layout behavior, not exact paint latency, physical spring rest, or INP. The 4.9ms event-to-sample value includes sampling alignment and should not become an advertised performance claim.

## Server-rendered closed-panel check

A separate authenticated Help tab disabled JavaScript execution through CDP **before navigation**. The server-rendered DOM contained eight panels: all seven closed panels had native `hidden=""`, while the intentionally default-open workflow guide had no hidden attribute and carried its open state. This is the intended distinction after the correction.

All panel layout heights were zero in this no-JavaScript snapshot because the surrounding streamed Help content had not been revealed. Attempts to focus answer links also failed, but that enclosing hidden state confounds any claim that the panel alone prevented focus. This check therefore establishes the native hidden attributes on closed panels, not a working no-JavaScript portal or a complete keyboard-accessibility result. An earlier network-script-blocking snapshot is also retained in the main smoke JSON; the explicit script-execution-disabled check is the stronger server-rendered evidence.

## Artifacts

Machine-local evidence is under `.product-design-audit/accordion-correction-aeefa5c/`: `smoke.json`, `smoke.mjs`, `summary.json`, `ssr-check.json`, and `ssr-check.mjs`. It contains Help-only content and no credentials or patient data. The [published motion and server-rendered observations](https://github.com/FDHS-Westchase-Gastroenterology/westchase-gi/tree/a0c2a6e940839f751d9fc815c7424caefa0f17a6/measurements) are compressed JSON; decompress before checking the raw-data hashes.

| Artifact | SHA-256 |
| --- | --- |
| Corrected root source | `8d80f366311aa73cf957151f3875d7bb478b407c42ce57db32fe35fb2349721e` |
| Corrected motion helper source | `60ab5eac8006380f5b6641bafa105ed4747851ccb1f1665e12dff550742632ae` |
| Motion smoke driver | `55e40ede6d96e35b1bdbfe42cbda45bd59fe3fb72d3f7284e0defd8e629bedfb` |
| Motion smoke raw data | `3ed62ac2051d81dd579cd3c392d0dc729c014ca4e9856edf789d793bca6e291d` |
| Script-execution-disabled driver | `30ef884cb4d116775677e4a3788dab68896662059214e7a59053cffdcee900a2` |
| Server-rendered observation | `6039ac6582f63508170a6ec7db8ed556a4658b3b4949143b05691a06edef4c81` |

**Focused result: live reduced-motion interruption, restored ordinary motion, reduced preference before load, keyboard opening, and native hidden attributes on closed server-rendered panels all matched the intended behavior.** This focused run is not a complete matrix or mobile correction measurement; the separate functional and visual checks are recorded below.


## Corrected behavior

The frozen candidate continued to animate pointer disclosure when reduced motion was enabled after Help had loaded. Its Motion hook read the preference when mounted but did not subscribe the mounted component to subsequent changes. The correction uses a subscribed media-query store. Enabling reduced motion while a spring is active cancels the animation and sets the target height; the component continues to follow later preference changes.

Closed panels with `hiddenUntilFound` also lacked a native `hidden` attribute in the initial server HTML. The correction renders closed panels with boolean `hidden`, then upgrades that attribute to `hidden="until-found"` after hydration. This preserves native disclosure markup before JavaScript runs and browser-find behavior afterward. The HTML check does not claim that the entire Next.js portal works with JavaScript disabled.

## Repository verification

- Source commit: `aeefa5c4625bc38b33ae24316b59351b8f685d29`.
- [Immutable Help Preview](https://westchase-lng6m4u3s-jasongitdev-1290s-projects.vercel.app/admin/help).
- Vercel deployment: `dpl_BfNtBHCJBkJvzgRSzdDjRWCsUVXu`.
- Vercel MCP identified the exact Git SHA; authenticated CLI inspection confirmed READY Preview. The live `/api/preview-environment` endpoint returned `ok: true`, the same Git SHA, inherited Preview reference `gqzwcvwyhykscuidcmlh`, `clientKeySafe: true`, and `schemaCompatible: true`.
- Local checks: full oxlint and oxfmt passed; 354 unit tests and 12 test-safety checks passed; React Doctor 100; production build passed. The actual registry install succeeded and the design bundle regenerated with 100 component previews and all four assets copied. No palette CSS changed.
- Eight Help browser tests passed against the production build. They cover content, keyboard disclosure, linked answers, reduced motion before loading, live preference changes, mid-spring interruption, browser-find plus resize, and initial HTML disclosure state.
- Desktop and mobile Help atlas images were refreshed from the corrected local build and were byte-for-byte unchanged from the previous candidate's resting state.
- Exact source-head GitHub quality, React Doctor, and Vercel checks passed. Inherited-database integration remains a release dependency; the existing stack workflow does not supply a passing child-branch integration check.

| Artifact | SHA-256 |
| --- | --- |
| Accordion source | `8d80f366311aa73cf957151f3875d7bb478b407c42ce57db32fe35fb2349721e` |
| Motion adapter source | `60ab5eac8006380f5b6641bafa105ed4747851ccb1f1665e12dff550742632ae` |
| Registry artifact | `e5932563f4f2d647d5b7c9a48ae6bee9ab2881de4e9165277d97043e99129df8` |


## Visual evidence and motion review

The [correction PR comment](https://github.com/FDHS-Westchase-Gastroenterology/westchase-gi/pull/281#issuecomment-5591364135) contains before/after screenshots at 1440×900 and 390×844 and a 24-second workflow-video link. All four images were verified to load. The separate Browserbase video session `aa1d983b-d46b-46b0-be87-08074941adfd` captured only authenticated Help with account email hidden. It includes labeled “Evidence overlay” captions, which are not product UI. Its live preference switch happened near the spring's tail; the stronger 77.28px interruption evidence above comes from the focused measurement session.

Reduced-motion and keyboard actions in the video samples had no intermediate heights, and restoring normal motion restored the spring. The shared fictional queue badge changed from 7 to 10 between screenshots; the capture session made no application-data writes. Native inline GitHub video attachment remains blocked by browser file-upload access. Session cleanup completed.

| Before | After | Why |
| --- | --- | --- |
| Changing reduced motion after mount leaves pointer springs active. | Subscribe to the live preference and finish an active spring when reduction becomes enabled. | Respect the current preference without a reload. |
| Closed findable panels lack native hidden markup before hydration. | Render hidden first, then upgrade to hidden-until-found. | Preserve the initial disclosure boundary and later browser-find behavior. |
| Existing spring parameters and velocity retargeting | Unchanged | Keep the correctness fix separate from tuning the spring's feel. |

Motion verdict: the focused correction is supported under the agreed Apple Design behavior and explicit height-animation exception. Overall spring adoption still needs Jason's review. Physical-phone behavior and exhaustive assistive-technology acceptance remain unverified.
