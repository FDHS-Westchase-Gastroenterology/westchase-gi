# Accordion measurement record

Each version is measured on the Help page of its immutable Vercel Preview deployment. The baseline uses the agreed FAQ organization and stock Accordion behavior; subsequent versions keep the same content, initial state, and selected answers. Apple Design leads the behavior review. Measurements inform that review; shorter settling time alone does not demonstrate improvement.

The measurement agent owns the script and records. The implementation agent owns the component and import. Run measurements sequentially in one dedicated Browserbase session; another agent can prepare the next commit while the previous immutable deployment is measured.

## Prepare the run

1. Inspect the exact deployment with Vercel MCP. Verify it is a ready **Preview**, its Git SHA matches the version being reviewed, and its URL is the deployment's unique URL rather than the moving branch alias. Save the verified values in `deployment.json` outside the source tree. The script validates the manifest's shape; it does not authenticate its claims with Vercel itself. Production and local origins are rejected.
2. Start the hosted Browserbase session and sign in using the established fictional Preview identity. Leave an authenticated tab on that exact origin. Follow the repository's existing sign-in and recording procedure; never record the sign-in form. This script neither creates accounts nor reads credentials or patient records.
3. Supply that session's WebSocket connection URL through the secret environment variable `BROWSERBASE_CDP_URL`. Obtain it through the existing Browserbase session tooling. Do not paste it into reports, shell history, tracked files, or tool output. Attaching through CDP must be available before claiming this runner is usable.
4. Use the installed `@playwright/test`; no new dependency or application telemetry is needed. Save outputs to a unique location outside the repository, then review the data and copy only the intended evidence into a version's evidence record.

Example manifest, with placeholders replaced from the verified deployment:

```json
{
  "id": "dpl_VERIFIED_ID",
  "sha": "FULL_40_CHARACTER_GIT_SHA",
  "url": "https://UNIQUE_DEPLOYMENT.vercel.app/",
  "target": "preview",
  "verifiedAt": "ISO_8601_TIMESTAMP",
  "componentSourceSha256": "SOURCE_DIGEST_RECORDED_BY_IMPLEMENTATION_AGENT",
  "registryArtifactSha256": "REGISTRY_ARTIFACT_DIGEST_RECORDED_BY_IMPLEMENTATION_AGENT"
}
```

Invoke from the worktree, with the connection environment already supplied securely:

```sh
node scripts/accordion-measurement.mjs /absolute/path/deployment.json /absolute/path/accordion-results
```

For the baseline, the runner selects the shortest and tallest rendered answers at each viewport. Read `samples.json`, agree the two intended answers, and set the optional `panels` array to their exact labels in both baseline and candidate manifests before making a final comparison. Keeping those two labels identical prevents changing the test content between versions. If the first exploratory run selected different answers by viewport, rerun the baseline with explicit labels.

## What the script does

It attaches to the existing Browserbase session, opens `/admin/help`, and runs 1440×900 and 390×844 viewports with ordinary and reduced motion preferences. Mobile viewport testing is desktop-browser emulation, not proof on a physical phone. Each of two answers receives pointer opening/closing, Enter-key opening/closing, and a synthetic reversal. Every scenario has one warm-up and ten measured repetitions, executed sequentially. A full run takes several minutes; keep the browser session available throughout.

The reversal uses browser-side `.click()` calls separated by a requested 70ms timer. The report records the actual interval, since browser timers are not exact. This is explicitly **synthetic trajectory testing**, not a real pointer/keyboard responsiveness or INP measurement. Ordinary scenarios use Playwright input actions. The runner focuses triggers to prevent Playwright actionability delays from contaminating keyboard preparation.

Each run samples panel height, opacity, expanded state, focus, and active animations using the browser's clock for 1.2 seconds after activation. It records input events and whether the browser marks them trusted. The first-height-change measure begins at click/activation, not pointer-down; it does not assess pressed-state feedback. Each observation records `performance.now()` immediately after its layout read; the animation-frame callback timestamp is retained separately as `frameTime`. Activation-to-observation and settling use observation time, since a callback's frame timestamp can precede the input that triggered it. Frame intervals use `frameTime`; observation intervals are also reported and include callback scheduling and instrumentation time. Neither proves the exact screen-presentation time.

Settling requires height within 1 CSS pixel of the final target, no running panel animation, and at least three trailing sampled frames meeting both conditions. Results are null when the observation window does not demonstrate settling. Keyboard keydown and the browser-generated click are both retained; summaries measure after the last activation event. Review raw events when interpreting keyboard timing. The script saves the entire height trajectory for continuity/velocity inspection, but does not automatically certify reversal smoothness.

`samples.json` holds environment, raw samples, warm-ups, scenario outcomes, and the script digest. `summary.json` holds median/range settling and final-state failures. Neither contains login credentials, cookies, connection URLs, or patient content; labels come only from the Help questions. There is no Vercel Web Analytics event submission.

## Report template

- Component version / Git SHA:
- Baseline Git SHA:
- Source and registry artifact digests:
- Vercel deployment ID / immutable Preview URL / readiness verification:
- Browserbase session ID / recording link (exclude connection credentials):
- Harness digest / raw sample and summary paths:
- Selected question labels / unchanged content confirmed:
- Browser version / viewport / device scale / motion preference / observed frame cadence:
- Run count / warm-ups / missing or unsupported measurements:

| Scenario | Baseline median and range | Candidate median and range | Final state | Visual verdict |
| --- | --- | --- | --- | --- |
| Short answer opening/closing | Pending | Pending | Pending | Pending |
| Tall answer opening/closing | Pending | Pending | Pending | Pending |
| Synthetic reversal, actual interval recorded | Pending | Pending | Pending | Pending |
| Keyboard opening/closing | Pending | Pending | Pending | Pending |
| Reduced motion | Pending | Pending | Pending | Pending |

- Long frames, frame intervals, and trajectory findings:
- Functional checks performed outside this runner: Tab/arrow/Space navigation, focus visibility, multiple open answers, linked-answer opening, resize/content changes, and pressed-state appearance:
- Separate video showing the authored Help workflow after authentication:
- Apple Design motion review, including accepted height-animation exception:
- Decision: improved / unchanged / regressed / inconclusive, with the evidence that supports it:
- Limitations and remaining checks:

## Interpretation and limits

Vercel MCP identifies the immutable deployment; the browser supplies the component measurements. Web Analytics counts and Speed Insights are different tools and cannot replace this trajectory record. [Vercel deployments](https://vercel.com/docs/deployments/overview), [Web Analytics API](https://vercel.com/docs/analytics/web-analytics-api), [Speed Insights](https://vercel.com/docs/speed-insights).

Long Animation Frames detect rendering updates delayed beyond 50ms in supported Chromium browsers. Zero entries does not establish uninterrupted display-rate motion; inspect frame intervals and the recording too. INP describes responsiveness through the next paint, not complete animation duration. This script does not claim to measure INP. [Chrome Long Animation Frames](https://developer.chrome.com/docs/web-platform/long-animation-frames), [Interaction to Next Paint](https://web.dev/articles/inp).

The instrumentation itself reads layout once per frame and can add overhead. Use the same harness for both versions and confirm the visible result without sampling. Browserbase host load can vary; record browser/environment and rerun both versions together when differences are small or noisy. No CPU/network throttling or physical-device claim is made. The 1.2-second window bounds a run; a slower or continuously moving component must be reported as unsettled, not given a made-up duration.

The runner collects measurements only. It does not upload recordings, post PR comments, run the contribution gates, judge accessibility exhaustively, or certify the source/artifact digests. Finish the Browserbase session with the established session-owner tool and export the separately captured visual evidence. The parent task remains responsible for the full contribution loop and PR evidence.
