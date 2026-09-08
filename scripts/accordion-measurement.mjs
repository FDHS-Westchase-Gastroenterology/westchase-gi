import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import { chromium } from "@playwright/test";

const [manifestPath, outputPath] = process.argv.slice(2);
if (!manifestPath || !outputPath) {
  throw new Error("Usage: node scripts/accordion-measurement.mjs deployment.json output-directory");
}
const deployment = JSON.parse(await readFile(manifestPath, "utf8"));
const origin = new URL(deployment.url);
if (
  deployment.target !== "preview" ||
  !deployment.id?.startsWith("dpl_") ||
  !/^[a-f0-9]{40}$/.test(deployment.sha ?? "") ||
  !deployment.verifiedAt ||
  origin.protocol !== "https:" ||
  !origin.hostname.endsWith(".vercel.app") ||
  origin.hostname.includes("-git-") ||
  origin.pathname !== "/" ||
  origin.search ||
  origin.hash ||
  origin.username ||
  origin.password
) {
  throw new Error(
    "Require Vercel-verified immutable Preview manifest: id, sha, url, target, verifiedAt",
  );
}
let cdp;
try {
  cdp = new URL(process.env.BROWSERBASE_CDP_URL ?? "https://missing.invalid");
} catch {
  throw new Error("BROWSERBASE_CDP_URL is not a valid connection URL");
}
if (cdp.protocol !== "wss:" || !cdp.hostname.endsWith(".browserbase.com")) {
  throw new Error(
    "Set BROWSERBASE_CDP_URL to the existing authenticated Browserbase session connection URL",
  );
}
const directory = resolve(outputPath);
await mkdir(directory, { recursive: true });
const digest = createHash("sha256")
  .update(await readFile(new URL(import.meta.url)))
  .digest("hex");
const browser = await chromium.connectOverCDP(cdp.href).catch(() => {
  throw new Error("Browserbase connection failed; check the session and secret connection URL");
});
const context = browser.contexts()[0];
const page = context
  .pages()
  .find((candidate) => candidate.url().startsWith(`${origin.origin}/admin`));
if (!page) {
  await browser.close();
  throw new Error("Authenticate a Browserbase tab on this exact Preview origin before measurement");
}
const originalViewport = page.viewportSize();
const records = [];
const environments = [];
const triggerSelector = '[data-slot="accordion-trigger"]';

async function idle() {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise((done) => setTimeout(done, 700));
  });
}

async function setOpen(trigger, open) {
  if ((await trigger.getAttribute("aria-expanded")) !== String(open)) {
    await trigger.click();
  }
  await idle();
}

// This function runs in the page. All timestamps share performance.now()'s clock.
function observePanel(config) {
  const trigger = document.querySelectorAll('[data-slot="accordion-trigger"]')[config.index];
  const panel = () => document.getElementById(trigger.getAttribute("aria-controls"));
  const read = () => {
    const element = panel();
    return {
      height: element?.getBoundingClientRect().height ?? 0,
      opacity: element ? Number(getComputedStyle(element).opacity) : 0,
      activeAnimations:
        element
          ?.getAnimations({ subtree: true })
          .filter((animation) => animation.playState === "running").length ?? 0,
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
    trigger.click();
    setTimeout(() => trigger.click(), 70);
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

try {
  await page.goto(`${origin.origin}/admin/help`);
  if (!page.url().startsWith(`${origin.origin}/admin/help`))
    throw new Error("Help navigation requires an authenticated Preview session");
  await page.locator(triggerSelector).first().waitFor();
  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    for (const reducedMotion of ["no-preference", "reduce"]) {
      await page.emulateMedia({ reducedMotion });
      const triggers = page.locator(triggerSelector);
      const choices = [];
      for (let index = 0; index < (await triggers.count()); index += 1) {
        const trigger = triggers.nth(index);
        await setOpen(trigger, false);
        await setOpen(trigger, true);
        const height = await trigger.evaluate(
          (element) =>
            document.getElementById(element.getAttribute("aria-controls"))?.getBoundingClientRect()
              .height ?? 0,
        );
        choices.push({ index, height, label: await trigger.innerText() });
        await setOpen(trigger, false);
      }
      choices.sort((left, right) => left.height - right.height);
      if (choices.length < 2 || choices[0].height <= 0)
        throw new Error("Need at least two measurable Help accordion answers");
      const environment = await page.evaluate(() => ({
        userAgent: navigator.userAgent,
        language: navigator.language,
        devicePixelRatio,
        hardwareConcurrency: navigator.hardwareConcurrency,
        visibility: document.visibilityState,
        reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches,
        touchPoints: navigator.maxTouchPoints,
      }));
      environments.push({
        viewport,
        reducedMotion,
        browserVersion: browser.version(),
        environment,
        choices,
      });
      const selected = deployment.panels
        ? deployment.panels.map((label) => choices.find((choice) => choice.label === label))
        : [choices[0], choices.at(-1)];
      if (selected.length !== 2 || selected.some((choice) => !choice)) {
        throw new Error("Manifest panels must match two exact baseline answer labels");
      }
      for (const choice of selected) {
        const trigger = triggers.nth(choice.index);
        for (const scenario of [
          "pointer-open",
          "pointer-close",
          "keyboard-open",
          "keyboard-close",
          "synthetic-reversal",
        ]) {
          for (let repetition = 0; repetition <= 10; repetition += 1) {
            const opening = scenario.endsWith("open");
            await setOpen(trigger, scenario.endsWith("close"));
            await trigger.scrollIntoViewIfNeeded();
            await trigger.focus();
            await idle();
            await page.evaluate(observePanel, {
              index: choice.index,
              synthetic: scenario === "synthetic-reversal",
            });
            if (scenario.startsWith("pointer")) await trigger.click();
            else if (scenario.startsWith("keyboard")) await trigger.press("Enter");
            const run = await page.evaluate(() => window.__accordionMeasurement);
            if (run.error) throw new Error(`Measurement failed: ${run.error}`);
            records.push({
              viewport,
              reducedMotion,
              choice,
              scenario,
              repetition,
              warmup: repetition === 0,
              summary: summarize(run, opening ? choice.height : 0, opening),
              run,
            });
            await writeFile(
              resolve(directory, "samples.json"),
              `${JSON.stringify({ schemaVersion: 1, deployment, harnessSha256: digest, environments, records }, null, 2)}\n`,
            );
          }
        }
      }
    }
  }
  const groups = new Map();
  for (const record of records.filter((item) => !item.warmup)) {
    const key = `${record.viewport.width}/${record.reducedMotion}/${record.choice.label}/${record.scenario}`;
    const group = groups.get(key) ?? [];
    group.push(record.summary);
    groups.set(key, group);
  }
  const summary = Array.from(groups, ([scenario, values]) => {
    const times = values
      .map((value) => value.settleAfterLastActivationMs)
      .filter((value) => value !== null)
      .sort((left, right) => left - right);
    return {
      scenario,
      runs: values.length,
      settledRuns: times.length,
      medianSettlingMs: times.length
        ? (times[Math.floor((times.length - 1) / 2)] + times[Math.floor(times.length / 2)]) / 2
        : null,
      minSettlingMs: times[0] ?? null,
      maxSettlingMs: times.at(-1) ?? null,
      finalStateFailures: values.filter(
        (value) => !value.finalExpandedCorrect || value.finalHeightErrorPx > 1,
      ).length,
    };
  });
  await writeFile(
    resolve(directory, "summary.json"),
    `${JSON.stringify({ deployment, harnessSha256: digest, summary }, null, 2)}\n`,
  );
  console.log(`Accordion measurement saved: ${directory}`);
} finally {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  if (originalViewport) await page.setViewportSize(originalViewport);
  await browser.close();
}
