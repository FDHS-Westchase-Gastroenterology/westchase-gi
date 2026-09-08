# Stock Accordion baseline — 5e26ae1

Measured on September 8, 2026. The complete hosted run contains **400 measured interactions plus 40 warm-ups**, covering two Help answers, both viewports, both motion preferences, and five scenarios. Every measured interaction reached the correct final expanded state and target height; all settled within the 1.2-second observation window.

Stock opening and closing generally reach their final height in about 200ms under ordinary motion, including keyboard activation. The clearest continuity issue is a small increase in height at the beginning of a normal collapse: **7.64–8.48 CSS pixels in all 40 ordinary-motion pointer-close runs**. This establishes a concrete comparison point for the spring candidate. It does not establish that the overall stock experience feels poor.

## Version and environment

- Application Git SHA: `5e26ae1726b3e9b25c79b6ca0a3548e37ee21f8b`.
- Vercel deployment: `dpl_7e95Phoa4FR9GeSdmtkvrjj6ohPZ`, READY Preview verified by the implementation agent; its Preview environment endpoint also returned this exact Git SHA.
- [Immutable Preview Help page](https://westchase-cbm4wz0w1-jasongitdev-1290s-projects.vercel.app/admin/help).
- Browserbase session: `a03b08ed-ad82-4744-ba37-39fb8f4cf8ea`. The runner attached through CDP and disconnected when complete; it did not end the MCP-owned session.
- Browser: Linux Chromium 152, visible page, en-US, device scale 1, two reported logical CPUs, zero touch points. Viewports: 1440×900 and 390×844. Median observed frame cadence across the run was approximately 16.7ms. Mobile results are viewport emulation, not physical-phone measurements.
- Same exact answer labels throughout: “What the appointment request queue is” (short) and “Work an appointment request” (tall).
- Expanded heights: desktop 141.516px / 1462.641px; mobile 265.031px / 2459.359px. Heights match between ordinary and reduced motion runs.
- No CPU or network throttling was applied. No telemetry was added, and no patient records were read or changed.

## Observed height settling

Each cell is **median milliseconds (minimum–maximum), n=10**. One warm-up for each case is excluded. The clock starts at the last activation event; for reversal, that is the second click. Reversal clicks are synthetic pointer-like MouseEvents with `detail: 1`, requested 70ms apart; measured intervals ranged from 70.3 to 82.2ms, and their actual timestamps are preserved. They do not constitute a real-input INP measurement.

This table uses a common **geometry-only** criterion: panel height within 1 CSS pixel of its final target for at least three trailing sampled frames, with the reported time at the first of those stable frames. It is a browser observation, not physical spring rest, source animation duration, exact paint time, or perceived smoothness.

| Viewport / motion / answer | Pointer open | Pointer close | Enter open | Enter close | Synthetic reversal |
| --- | --- | --- | --- | --- | --- |
| Desktop / ordinary / short | 200.6 (191.8–221.6) | 204.4 (190.5–264.1) | 202.8 (190.2–211.8) | 198.9 (191.4–212.7) | 210.0 (204.1–218.9) |
| Desktop / ordinary / tall | 210.6 (192.2–236.1) | 207.4 (190.0–225.3) | 201.3 (190.5–214.0) | 198.7 (187.5–211.2) | 209.4 (201.3–218.1) |
| Desktop / reduced / short | 36.1 (22.0–46.7) | 56.1 (41.3–64.8) | 30.6 (23.0–37.2) | 49.4 (42.2–57.6) | 63.0 (54.8–70.8) |
| Desktop / reduced / tall | 36.5 (26.4–50.2) | 59.3 (50.3–70.5) | 35.3 (23.6–56.3) | 51.5 (45.3–58.7) | 63.2 (55.7–72.6) |
| Mobile viewport / ordinary / short | 200.8 (194.0–215.2) | 205.1 (199.5–215.1) | 196.9 (188.5–201.8) | 194.2 (187.8–205.1) | 207.0 (202.4–223.1) |
| Mobile viewport / ordinary / tall | 203.5 (191.0–212.7) | 204.2 (191.0–212.1) | 197.7 (191.7–203.0) | 199.3 (194.1–206.2) | 208.2 (206.1–216.8) |
| Mobile viewport / reduced / short | 37.5 (23.2–48.1) | 48.4 (41.9–63.4) | 26.4 (22.2–32.9) | 44.4 (35.4–49.5) | 57.7 (50.6–66.3) |
| Mobile viewport / reduced / tall | 38.9 (29.0–45.2) | 57.0 (41.9–65.2) | 32.7 (21.5–46.9) | 42.5 (36.7–49.9) | 54.5 (45.3–62.2) |

The runner's original `summary.json` additionally waits for observable native panel animations to stop, ignoring animations on hidden panels. That native-animation check can observe stock CSS animation but cannot see a JavaScript MotionValue spring. Both summaries are preserved; use the geometry-only table above for the CSS-versus-JavaScript comparison. Ordinary stock native-aware medians range roughly 207–224ms, and the complete values remain in the raw summary.

Reduced-motion height settling is shorter but not literally zero in these observations. The table includes layout/event scheduling and frame sampling. It should not be interpreted as evidence that a long decorative animation remains enabled.

## Trajectories, frames, and correctness

Normal collapse initially increases panel height before shrinking. The ordinary-motion pointer-close increase is 8.484px for the desktop short answer, 8.359px for desktop tall, 7.969px for mobile short, and 7.641px for mobile tall. All ten runs of each case show the same sampled increase. This is a useful target for the candidate's continuity review.

The Long Animation Frames API was available. Two measured interactions contained a long frame in the activation-to-settling interval: desktop short pointer close, repetition 6 (114.2ms), and desktop tall pointer open, repetition 3 (50.9ms). Both entries reported zero blocking duration. The largest sampled frame gap through geometric settling was 100ms. These outliers describe this hosted run; they do not isolate the component as the cause or support a universal frame-rate claim.

There were **zero final-state failures, zero unsettled measured runs, and retained trigger focus at the end of all measured interactions**. The runner explicitly focuses the trigger as preparation, so this is retention evidence only. It does not prove Tab order, focus visibility, Space/arrow handling, linked-answer opening, or general accessibility. Full trajectories, input trust flags, opacity samples, and environment records are retained for inspection.

## Evidence and reproducibility

The complete raw samples and both summaries are preserved as compressed JSON on the [PR evidence branch](https://github.com/FDHS-Westchase-Gastroenterology/westchase-gi/tree/c9efb7cb0ef92622ae8ccb3b02e2ceb02a135692/measurements). Decompress them before checking the raw-data digest below. The original working copies and supporting artifacts remain at the following machine-local paths. Separate before/after screenshots and the workflow-video link are in the [PR conversation](https://github.com/FDHS-Westchase-Gastroenterology/westchase-gi/pull/281#issuecomment-5590446770); native inline video attachment remains pending.

- Raw measurements: `.product-design-audit/accordion-stock/measurements/samples.json`.
- Original summary: `.product-design-audit/accordion-stock/measurements/summary.json`.
- Geometry-only summary and all derived per-run values: `.product-design-audit/accordion-stock/measurements/geometry-summary.json`.
- Frozen harness: `.product-design-audit/accordion-stock/accordion-measurement.mjs`.
- Verified deployment manifest: `.product-design-audit/accordion-stock/deployment.json`.
- Frozen stock registry artifact: `.product-design-audit/accordion-stock/registry-accordion.json`.

| Artifact | SHA-256 |
| --- | --- |
| Stock component source at application SHA | `2d71379ed0338dbaded50cc2a3de76ea7ca07fcbf1cf71e05420f1ec6d94e8d1` |
| Stock registry artifact | `e5933185da51d049ee766d4cb67939ea8b319752188df9577c0b59870adb0251` |
| Corrected frozen measurement harness | `70f705dcf48745776228ea609282d14f3f4ac98800a3d72ad0d70cd0ab26994c` |
| Complete raw measurements | `bae4a341ae134a22dbf108105f6d3dcab5c284332fd5fd6142dfa2230e115cae` |

An initial run was rejected because its observer resolved the panel through the trigger's `aria-controls`, which Base UI removes as collapse begins while the panel remains visible. That made closing appear almost instantaneous. The corrected observer queries within the accordion item and ignores native animation objects on hidden panels; the full matrix was restarted from scratch. The rejected dataset and old harness remain under `.product-design-audit/accordion-stock/invalid-aria-controls-harness/` and must not be used in comparisons. The correction changed the measurement method, not the baseline application.

## Review status

**Baseline measurement complete; candidate comparison and visual judgment pending.** This report does not replace the separate post-authentication workflow video, desktop/mobile screenshots, functional checks, Apple Design-led motion review, or full repository contribution gates. No recording was exported or published by this measurement run. Instrumentation reads layout every frame and adds overhead; compare the same frozen harness and verify the final feel without instrumentation. Differences smaller than the run-to-run variation remain inconclusive.
