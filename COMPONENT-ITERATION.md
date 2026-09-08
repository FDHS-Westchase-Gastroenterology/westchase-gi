# Component iteration workflow

Operating workflow for component iterations. Each measurement report separately records what
was implemented and verified.

## Scope and authority

Work through the shadcn catalog alphabetically, beginning with Accordion. Before implementation,
state the stock behavior, the proposed change, its source, any conflicting guidance, and the
reason the change should help. Apple Design leads motion decisions; the other supplied skills
provide supplementary guidance. Preserve accessibility and the application's visual identity.

For Accordion, use the Help page's explanatory topics. Keep the title, introduction, and portal
tour action visible. Allow multiple answers to remain open and preserve navigation to existing
section anchors. The approved height-animation exception is limited to the expanding panel and
requires browser performance and reversal checks. A non-bouncy spring with damping ratio 1.0
and response 0.3 seconds is the current starting hypothesis, not a verified library configuration
or a measured settling duration.

## Version sequence

1. Adopt the unchanged stock behavior in the real application. Complete the intended content
   grouping and layout before measuring. Record upstream source/version and any visual adaptation.
   Commit this as the stock behavior baseline and deploy its exact commit to Preview.
2. Hand the immutable Preview URL and commit to the measurement agent. Capture the baseline
   before changing behavior. Keep this deployment available for comparison.
3. Change the reusable registry source for one coherent behavioral hypothesis. Rebuild or package
   the component, then install/update the application copy through a repeatable path. Commit the
   source and its consumed application version together so the deployed version is unambiguous.
4. Deploy that exact commit. The measurement agent runs the same protocol and reports changes
   against both stock and the last reviewed version.
5. Jason reviews the real Help page and the concise comparison report. Refine in a new commit;
   preserve reviewed commit IDs. Do not rewrite measured history to add later results.

The root registry.json packages reusable stock source. Run npm run registry:install:accordion
to build the local item, install it into src/components/ui/accordion.tsx with the shadcn CLI, and
format the installed copy. Product code imports the installed component. Keep source and installed
behavior synchronized. The later independent registry extraction remains a separate step in
REGISTRY-DEFAULTS.md.

## Commit record

Each behavior commit is one component version. Use its full commit SHA as the authoritative ID;
labels such as Accordion v1 are human-readable names, not package release versions. Infrastructure
and evidence-only commits are labeled separately and do not imply a behavior change.

Example subject:

    feat(accordion): use a non-bouncy spring that preserves reversal

The body records:

- Previous behavior and the interaction this change should improve.
- Approach, actual library parameters, and relevant input/reduced-motion handling.
- Source of the decision and any approved exception.
- Registry source and application adoption relationship.
- Checks completed before committing, plus the report location for subsequent Preview results.

Use implementation facts rather than aspirational claims. Do not call an improvement measured
until the report exists. Preview measurements necessarily happen after the commit they measure;
record them in a separate evidence commit or durable report, linked from the PR conversation.

## Measurement protocol

Vercel establishes which deployment and commit are under review and whether the deployment is
healthy. Browser instrumentation supplies component interaction measurements. Product traffic
analytics and page-level responsiveness scores do not alone describe an accordion's animation.

For every run, record the full commit SHA, deployment ID and fixed URL, component source/version,
browser/version, viewport, machine or remote-browser environment, display/sampling cadence,
reduced-motion setting, throttling, content fixture, script version, warmup, and repeat count.
Use the same conditions for before and after. Keep desktop and mobile-viewport results separate;
a desktop browser with a mobile viewport does not establish physical-phone performance.

Run ordinary opening and closing, short and long answers, repeat activation during movement,
multiple open answers, keyboard activation, reduced motion, and section-anchor navigation.
Collect timing traces and video after authentication using fictional Preview identity only.

Report:

- Input to observed pressed-state change and input to observed panel movement, with the browser
  sampling resolution stated. These are estimates, not direct display-photon measurements.
- Time to settle at the final height. Define a fixed pixel tolerance and stable-frame window in
  the measurement script before baseline capture; do not equate spring response with duration.
- Panel-height trajectory during reversal, including visible jumps or overshoot and how detected.
- Frame intervals and long tasks, explicitly distinguishing sampled frame gaps from confirmed
  dropped display frames. Use browser performance traces for layout/paint costs where available.
- Correctness: no clipped content, lost focus, inaccessible answers, or broken anchors; keyboard
  and reduced-motion behavior match the contract.

Start with one warmup and ten measured repetitions per case. Define settling as within one CSS
pixel of the target for three sampled frames with no continuing movement; retain the full
trajectory to detect slow residual motion. Report median, spread, and sample count. Establish normal baseline variation
before labeling a small difference a regression. Do not collapse feel into a single score or treat
a faster settling time as automatically better. Jason's interactive review remains required.

Measure using browser timestamps, never elapsed tool-call time. Precise synthetic reversal
sequences test motion trajectories but are labeled synthetic and do not establish real-input INP.
Use ordinary browser pointer and keyboard actions for input correctness and responsiveness.
Run benchmarks sequentially in a stable environment so concurrent measurements do not compete.

Vercel capability verification: the selected plugin documentation search succeeded. Available
Vercel tools include deployment inspection and Web Analytics event/count queries; they do not
expose panel-frame or spring-settling measurements. Speed Insights is a separate page-performance
product, not an Accordion motion profiler. No analytics configuration or production data was
changed or queried for this workflow proposal.

References: [Web Analytics API](https://vercel.com/docs/analytics/web-analytics-api),
[Speed Insights](https://vercel.com/docs/speed-insights),
[deployment URLs](https://vercel.com/docs/deployments/overview),
[Long Animation Frames](https://developer.chrome.com/docs/web-platform/long-animation-frames),
[INP](https://web.dev/articles/inp).

## Agent responsibilities and handoff

The main agent owns scope, component source, registry consumption, behavior decisions, and commits.
A measurement subagent owns deployment verification, the fixed browser protocol, raw artifacts,
and the comparison report. It works against immutable deployments while the main agent continues
independent work. It does not edit component source or change its acceptance criteria to obtain a
better result. Shared database writes, fixture resets, and migrations require coordination.

Each handoff names baseline and candidate SHAs and URLs, the protocol version, expected change,
approved exceptions, and artifact destination. Reports state completed, failed, or unavailable
measurements; absent evidence is not a pass. Return a short report to the main agent, keeping raw
traces accessible without filling the main conversation with logs.

Keep report summaries in tracked repository files and link them in the PR conversation. Large
videos/traces use an approved artifact destination, with stable links and no credentials. A report
must identify the implementation SHA it measured even when the report is committed afterward.

## Review and release

Present Jason with stock and candidate Preview links, a short interaction video, the behavior
change in plain language, and a compact measurement comparison with limitations. A candidate is
reviewable while clearly labeled incomplete; it is not accepted or merge-ready until the standing
repository checks, required visual evidence, and relevant behavior checks pass.

This workflow uses bounded subagent runs during active work. It does not create a recurring
automation or promise that an agent continues indefinitely after the task ends. Production
telemetry, paid add-ons, database changes, and production releases are not required to compare
these component versions.
