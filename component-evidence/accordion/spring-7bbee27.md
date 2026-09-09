# Spring Accordion candidate — 7bbee27

Measured on September 8, 2026. This candidate removes the stock normal-collapse height bump and makes Enter activation immediate in the sampled layout. Ordinary pointer motion settles more slowly. **The candidate fails live reduced-motion preference changes and is not accepted as the final version.** That failure led to a separate correctness change at `aeefa5c4625bc38b33ae24316b59351b8f685d29`; these measurements do not describe that later commit.

The hosted retry saved **393 measured interactions plus 40 warm-ups** before losing its browser connection. Thirty-nine of forty scenario groups have ten measured repetitions; mobile tall reduced-motion reversal has three of ten. Seven repetitions were missing from that run and were subsequently measured in a separate session with one additional warm-up. The original runner exited with an error after 47 minutes; the evidence is **393 primary + 7 supplemental measured interactions**, not one completed frozen 400-run matrix. The table retains the original primary-run counts. All 393 saved measured interactions reached their correct final state and height within the observation window and retained prepared trigger focus.

## Version and environment

- Application SHA: `7bbee27af7679a8b8a5ed342ed5e8ee91fe0a90c`.
- Vercel deployment: `dpl_WK1r2wxvw8b9L9WNg1XLMZxwtNpQ`, READY Preview. The implementation agent independently verified its authenticated Preview environment endpoint against this exact SHA.
- [Immutable Preview Help page](https://westchase-6fiyqgvwk-jasongitdev-1290s-projects.vercel.app/admin/help).
- Browserbase session: `1551f43f-4a40-46cf-9a49-98fb215d91e0`, created 19:51:49 UTC with keep-alive enabled and a nominal 01:51:49 UTC next-day expiry. Run: 19:58:14–20:45:16 UTC.
- Linux Chromium 152.0.7977.83, visible page, en-US, device scale 1, two reported logical CPUs, zero touch points. Viewports: 1440×900 and 390×844. Mobile is viewport emulation, not a physical phone. No CPU or network throttling.
- Identical selected answer labels to stock: “What the appointment request queue is” and “Work an appointment request”. Expanded heights: desktop 133.516 / 1454.641px; mobile 257.031 / 2451.359px. Each is 8px shorter than stock, so this comparison does not hold panel geometry constant despite unchanged question/answer content.
- The same frozen measurement harness and 1.2-second observation window were used. No patient records or production systems were accessed by this measurement run.

## Observed height settling

Cells are **median milliseconds (minimum–maximum), n=10 unless marked**. Warm-ups are excluded. The final cell has only three measured repetitions. The clock starts at the last activation; reversal uses the second synthetic pointer-like click, with actual inter-click intervals of 70.2–73.9ms. This is not an INP measurement.

The common geometry-only criterion requires height within 1 CSS pixel of the final target for at least three trailing sampled frames and reports the first of those frames. This is observed geometric settling, not physical spring rest, configured duration, exact paint time, or perceived smoothness. The derivation and each per-run value are preserved in `geometry-summary.json`.

| Viewport / motion / answer | Pointer open | Pointer close | Enter open | Enter close | Synthetic reversal |
| --- | --- | --- | --- | --- | --- |
| Desktop / ordinary / short | 359.0 (353.2–362.1) | 360.0 (354.1–364.5) | 3.5 (3.1–4.4) | 2.8 (2.4–3.5) | 339.4 (331.7–345.6) |
| Desktop / ordinary / tall | 486.5 (478.7–494.1) | 487.3 (476.9–497.7) | 4.0 (3.8–4.3) | 3.9 (3.1–4.5) | 465.7 (460.0–481.5) |
| Desktop / reduced / short | 358.4 (353.1–367.6) | 357.6 (352.2–364.8) | 3.8 (3.4–4.8) | 3.5 (3.2–4.5) | 338.5 (330.7–346.3) |
| Desktop / reduced / tall | 490.2 (479.3–494.7) | 482.5 (478.3–491.7) | 6.0 (5.2–8.1) | 4.5 (4.3–6.3) | 469.3 (465.0–478.6) |
| Mobile viewport / ordinary / short | 396.3 (389.8–401.4) | 393.6 (386.0–401.0) | 3.2 (3.0–3.7) | 2.9 (2.5–3.6) | 375.5 (369.6–386.1) |
| Mobile viewport / ordinary / tall | 517.2 (506.0–522.7) | 514.9 (508.3–520.2) | 4.1 (3.8–5.8) | 3.2 (3.1–3.7) | 498.4 (491.8–506.4) |
| Mobile viewport / reduced / short | 392.7 (386.7–401.9) | 394.3 (385.1–400.1) | 3.7 (3.6–5.1) | 3.6 (3.2–5.4) | 374.6 (372.4–384.2) |
| Mobile viewport / reduced / tall | 513.3 (504.6–518.8) | 517.2 (507.5–521.3) | 6.4 (5.8–9.2) | 4.9 (4.6–6.9) | 495.9 (494.6–502.4), n=3 |

The raw records also retain the frozen runner's native-animation-aware values. Native animation introspection sees CSS animation but does not establish JavaScript MotionValue spring rest; the table above uses the same geometry-only derivation as the [stock report](stock-5e26ae1.md). The runner did not reach its final `summary.json` write. The separately derived geometry summary does not conceal that failure or invent the missing repetitions.

## Comparison and failures

| Observation | Stock | Candidate | Interpretation |
| --- | --- | --- | --- |
| Ordinary pointer opening/closing | Group medians approximately 201–211ms / 204–207ms | Approximately 359–517ms / 360–515ms | Longer settling; this is a motion choice, not a speed improvement. |
| Enter opening/closing | Group medians approximately 194–203ms | Approximately 3–4ms under ordinary preference | Height reaches its final value at the first observed post-activation layout. Frame sampling cannot establish exact paint latency. |
| Normal pointer collapse | Initial growth of 7.64–8.48px in all 40 ordinary runs | Zero sampled initial growth in all 40 ordinary runs | The specific stock closing bump is removed. |
| Synthetic reversal | Stock closure restarts toward full expanded height | Candidate keeps moving upward briefly, peaks below the expanded target, then closes | Compatible with preserving forward velocity when retargeting. Sampling does not prove subframe continuity or certify perceived quality. |
| Live reduced-motion preference | Shorter settling after the preference changes | Pointer/synthetic paths remain animated in all 113 saved reduced-preference cases | Accessibility policy failure in this exact candidate. |

The page remains mounted as the harness changes the real browser media preference. Its recorded `matchMedia` result becomes true, but the pointer spring still runs. Source inspection found that the installed Motion `useReducedMotion` hook captured its initial state without making mounted consumers reactive to later changes. The later correctness commit replaces that behavior with a reactive subscription. Reloading the candidate during this matrix would hide the live-change failure; this run deliberately did not do that.

During ordinary-motion reversal, the candidate's median sampled peak heights are 66.000px (desktop short), 719.844px (desktop tall), 127.328px (mobile short), and 1216.953px (mobile tall), against expanded heights of 133.516, 1454.641, 257.031, and 2451.359px. Those peaks occur a median 33.6–39.0ms after retargeting. Continued upward movement after reversing an opening spring is consistent with existing positive velocity; it is distinct from the unwanted growth when collapsing an already settled open panel.

One Long Animation Frame overlaps activation through geometric settling: desktop tall synthetic reversal, repetition 7, 53.9ms with zero reported blocking duration. Another 52.2ms entry appears later in the desktop tall Enter-close observation window, after geometric settling; it is not counted as motion-period evidence. The maximum sampled frame gap through settling is 33.4ms. The stock run had a 100ms maximum and two long-frame entries during settling, but these separate hosted runs cannot isolate component causation or establish a universal performance improvement.

Saved data contains zero incorrect final states, zero target-height failures, zero unsettled measured interactions, and no lost trigger focus. Focus was explicitly prepared by the harness; retention does not verify natural Tab order or general accessibility. These outcome checks do not override the reduced-motion failure.

## Supplemental completion of the final case

A separate driver ran the missing mobile tall reduced-motion reversal repetitions 4–10 on Browserbase session `f795ad34-9fb7-4509-80ac-a0177b25d27f` at 21:14:56–21:15:45 UTC. It loaded the exact 7b Preview under ordinary preference, waited for hydration, opened and closed the tall answer, then changed the real media preference to reduced motion while retaining the mounted page. Browser/environment values and the 2451.359px answer height matched the primary run. One fresh warm-up preceded the seven measured repetitions.

The driver extracts the frozen `observePanel` and `summarize` function text verbatim and preserves the same per-case preparation, 1.2-second window, and requested 70ms synthetic reversal. Its orchestration is a different script and a different session, with separate hashes and raw data. Actual reversal intervals were 70.4–77.1ms. These seven repetitions settled in a median **497.6ms (493.2–506.1), n=7**, compared with **495.9ms (494.6–502.4), n=3** in the interrupted primary group. All seven reached the correct final state/height and retained focus. Their continuing spring under the live reduced preference independently repeats the known 7b failure.

The original 433-record file is unchanged, and the table does not pool sessions. There are now 400 measured candidate cases across the two datasets, including 120 reduced-preference pointer/synthetic cases that retain animation. There is no claim of one successful full frozen run. The supplemental process exited without calling `browser.close()`; subsequent session reuse is checked by the session owner.

Supplemental artifacts are `.product-design-audit/accordion-candidate-supplement/samples.json`, `geometry-summary.json`, `resume.mjs`, and `collector-source.js`.

| Supplemental artifact | SHA-256 |
| --- | --- |
| Separate driver | `a90dccbf9ae8b2dbaa9190bbada1470be1e6ea5a82fc3e36e8f9750135258b2d` |
| Verbatim frozen collector and summarizer text | `bfece8092114276765c2e2cab793ce3f90685092356184ca5794bc717bfa33fd` |
| Supplemental raw measurements | `5043ed58a32dccdc5fbe8cb786898a1d67a126d8ae955cdf920302c100bea78d` |

## Interrupted execution and evidence

The retry ended after saving mobile tall reduced-motion reversal repetition 3. Its teardown `page.emulateMedia` call failed because the target page/context/browser had closed, masking the original error. The session had not reached its nominal expiry, but this alone does not identify why it closed. The frozen harness uses `browser.close()` during teardown, which can affect a managed provider's session lifecycle; later connection failure cannot independently establish the original cause. No unsaved repetitions are credited.

An earlier candidate attempt saved 30 measured interactions before an actionability timeout and is retained separately under `.product-design-audit/accordion-candidate/`. It is not pooled with this retry. Neither failure is evidence that an Accordion sample itself froze: the saved trajectories reach their targets, and the underlying disconnection cause remains unresolved.

The [published raw datasets, geometry summaries, and supplemental collector/driver](https://github.com/FDHS-Westchase-Gastroenterology/westchase-gi/tree/a0c2a6e940839f751d9fc815c7424caefa0f17a6/measurements) preserve the primary and supplemental runs separately. JSON files are compressed with gzip; decompress before checking the raw-data digests below. The implementation agent independently verified the primary counts, all final outcomes, the 40 normal-close trajectories, the seven supplemental repetition identities, and the verbatim collector.

Machine-local evidence:

- `.product-design-audit/accordion-candidate-retry/measurements/samples.json`: unchanged raw data, 433 total records.
- `.product-design-audit/accordion-candidate-retry/measurements/geometry-summary.json`: derived groups, explicit counts, and per-run values.
- `.product-design-audit/accordion-candidate-retry/execution.json`: failed exit status and timestamps.
- `.product-design-audit/accordion-candidate-retry/runner.log`: original terminal output.
- `.product-design-audit/accordion-candidate-retry/deployment.json`, `registry-accordion.json`, and `accordion-measurement.mjs`: frozen inputs.

| Artifact | SHA-256 |
| --- | --- |
| Candidate root source | `8d80f366311aa73cf957151f3875d7bb478b407c42ce57db32fe35fb2349721e` |
| Candidate motion helper source | `5399c9707f4e7987649b8eda63982f6c49a7ab5462b5a5dfafa462d5377a9d8e` |
| Candidate registry artifact | `09a912854c5b5f301735cff3f82bf662b9e431feeb4bb42875b6cad5e668ef5c` |
| Frozen harness | `70f705dcf48745776228ea609282d14f3f4ac98800a3d72ad0d70cd0ab26994c` |
| Incomplete retry raw measurements | `718d5f4e4c4972dfbee2dd40690537688787f098fa27a242058438fc9ca2287c` |

**Decision: specific continuity and keyboard improvements observed; live reduced-motion regression confirmed; primary candidate matrix interrupted, missing cases measured separately.** Corrected-head functional evidence, Apple Design motion review, workflow video, screenshots, and repository contribution gates remain separate responsibilities of the parent task. This report makes no full-matrix claim for the later correctness commit. Per-frame layout reads add measurement overhead, so visible quality also needs an uninstrumented review.
