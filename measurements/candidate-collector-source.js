function observePanel(config) {
  const trigger = document.querySelectorAll('[data-slot="accordion-trigger"]')[config.index];
  const item = trigger.closest('[data-slot="accordion-item"]');
  const panel = () => item.querySelector('[data-slot="accordion-content"]');
  const read = () => {
    const element = panel();
    return {
      height: element?.getBoundingClientRect().height ?? 0,
      opacity: element ? Number(getComputedStyle(element).opacity) : 0,
      activeAnimations: element?.hasAttribute("hidden")
        ? 0
        : (element
            ?.getAnimations({ subtree: true })
            .filter((animation) => animation.playState === "running").length ?? 0),
      expanded: trigger.getAttribute("aria-expanded"),
      focused: document.activeElement === trigger,
    };
  };
  const initial = read();
  const samples = [];
  const events = [];
  const longFrames = [];
  let start = null;
  let observer;
  let resolveRun;
  window.__accordionMeasurement = new Promise((done) => {
    resolveRun = done;
  });
  const supported = PerformanceObserver.supportedEntryTypes.includes("long-animation-frame");
  if (supported) {
    observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        longFrames.push({
          startTime: entry.startTime,
          duration: entry.duration,
          blockingDuration: entry.blockingDuration,
        });
      }
    });
    observer.observe({ type: "long-animation-frame" });
  }
  const eventListener = (event) => {
    if (event.type === "keydown" && !["Enter", " "].includes(event.key)) return;
    events.push({
      type: event.type,
      time: performance.now(),
      eventTime: event.timeStamp,
      trusted: event.isTrusted,
    });
    if (start === null && ["click", "keydown"].includes(event.type)) {
      start = performance.now();
      requestAnimationFrame(sample);
    }
  };
  const types = ["pointerdown", "click", "keydown", "keyup"];
  for (const type of types) trigger.addEventListener(type, eventListener, true);
  const timeout = setTimeout(() => finish("input-timeout"), 12000);
  function finish(error = null) {
    clearTimeout(timeout);
    for (const type of types) trigger.removeEventListener(type, eventListener, true);
    observer?.disconnect();
    resolveRun({
      error,
      initial,
      start,
      samples,
      events,
      longFrames,
      longFramesSupported: supported,
      final: read(),
    });
  }
  function sample(frameTime) {
    const observation = read();
    const time = performance.now();
    samples.push({ time, frameTime, ...observation });
    if (time - start >= 1200) finish();
    else requestAnimationFrame(sample);
  }
  if (config.synthetic) {
    const activate = () =>
      trigger.dispatchEvent(
        new MouseEvent("click", {
          bubbles: true,
          cancelable: true,
          detail: 1,
          view: window,
        }),
      );
    activate();
    setTimeout(activate, 70);
  }
}

function summarize(run, target, opening) {
  const activation = run.events.find((event) => ["click", "keydown"].includes(event.type));
  const lastActivation = run.events
    .filter((event) => ["click", "keydown"].includes(event.type))
    .at(-1);
  const after = run.samples.filter((sample) => sample.time >= (lastActivation?.time ?? Infinity));
  const lastUnsettled = after.findLastIndex(
    (sample) => Math.abs(sample.height - target) > 1 || sample.activeAnimations > 0,
  );
  const settled = after.length - lastUnsettled - 1 >= 3 ? after[lastUnsettled + 1] : null;
  const first = run.samples.find((sample) => Math.abs(sample.height - run.initial.height) > 1);
  const intervals = run.samples
    .slice(1)
    .map((sample, index) => sample.frameTime - run.samples[index].frameTime);
  const observationIntervals = run.samples
    .slice(1)
    .map((sample, index) => sample.time - run.samples[index].time);
  return {
    firstHeightChangeMs: first && activation ? first.time - activation.time : null,
    settleAfterLastActivationMs:
      settled && lastActivation ? settled.time - lastActivation.time : null,
    maxFrameIntervalMs: intervals.length ? Math.max(...intervals) : null,
    maxObservationIntervalMs: observationIntervals.length
      ? Math.max(...observationIntervals)
      : null,
    finalHeightErrorPx: Math.abs(run.final.height - target),
    finalExpandedCorrect: run.final.expanded === String(opening),
    focusRetained: run.final.focused,
    longFrameCount: run.longFramesSupported
      ? run.longFrames.filter(
          (entry) =>
            entry.startTime + entry.duration >= run.start &&
            entry.startTime <= (settled?.time ?? Infinity),
        ).length
      : null,
    measuredReversalIntervalMs:
      run.events.filter((event) => event.type === "click").length === 2
        ? run.events.filter((event) => event.type === "click")[1].time -
          run.events.filter((event) => event.type === "click")[0].time
        : null,
  };
}
