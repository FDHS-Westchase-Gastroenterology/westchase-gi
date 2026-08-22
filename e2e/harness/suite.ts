import {
  after as nodeAfter,
  before as nodeBefore,
  beforeEach as nodeBeforeEach,
  afterEach as nodeAfterEach,
  describe as nodeDescribe,
  test as nodeTest,
} from "node:test";
import type { TestContext } from "node:test";

import type {
  APIRequestContext,
  Browser,
  BrowserContext,
  BrowserContextOptions,
  Cookie,
  Page,
} from "playwright-core";

import { launchManagedBrowser } from "./browser";
import type { ManagedBrowser } from "./browser";
import { isPublicSmoke, setupRecipientSnapshot, teardownRecipientSnapshot } from "./global";
import { playwrightRequestShim } from "./request";
import { baseUrl, ensureServer } from "./server";
import type { ManagedServer } from "./server";

/**
 * The `test` surface for specs. Same shape as `@playwright/test`'s runner API
 * — describe/hooks/fixtures/skip/setTimeout/use — implemented on `node:test`
 * with one browser per file and one context per test.
 *
 * File-scope lifecycle (registered at import time, so they run before any
 * hook a spec registers):
 * 1. boot/reuse the dev server on the harness base URL,
 * 2. snapshot + disable notification recipients (unless public smoke),
 * 3. per test: fresh context + page + request fixture, closed afterward,
 * 4. after the file: restore recipients, close the browser, stop a
 *    self-started dev server.
 */

const DEFAULT_TEST_TIMEOUT_MS = 30_000;

/**
 * tsx/esbuild injects a `__name(fn)` helper into compiled functions, which
 * `page.evaluate` then cannot resolve inside the page. Define it (string
 * form, so the loader cannot rewrite the shim itself) in every context.
 */
const ESBUILD_NAME_SHIM = "globalThis.__name ??= (fn) => fn;";
let pendingDefaultTimeoutMs: number | undefined;

export interface TestInfo {
  project: { name: string };
}

export interface WorkerFixtures {
  browser: Browser;
  playwright: { request: typeof playwrightRequestShim };
  baseURL: string;
}

export interface TestFixtures extends WorkerFixtures {
  page: Page;
  context: BrowserContext;
  /** Playwright-native request context: shares cookies and baseURL. */
  request: APIRequestContext;
}

// Playwright hook signatures hand specs the live fixtures (Browser,
// BrowserContext, Page); those framework member types cannot be made readonly.
// oxlint-disable typescript/prefer-readonly-parameter-types -- Playwright fixtures carry framework member types (Browser, BrowserContext) that cannot be made readonly.
type TestFn = (fixtures: TestFixtures, testInfo: TestInfo) => void | Promise<void>;
type TestHook = (fixtures: TestFixtures, testInfo: TestInfo) => void | Promise<void>;
type PartialTestHook = (
  fixtures: Partial<TestFixtures>,
  testInfo: TestInfo,
) => void | Promise<void>;
type WorkerHook = (fixtures: WorkerFixtures, testInfo: TestInfo) => void | Promise<void>;
type PartialWorkerHook = (
  fixtures: Partial<WorkerFixtures>,
  testInfo: TestInfo,
) => void | Promise<void>;
// oxlint-enable typescript/prefer-readonly-parameter-types

interface FileContextOptions {
  readonly storageState?: {
    readonly cookies?: readonly Cookie[];
    readonly origins?: readonly unknown[];
  };
  readonly extraHTTPHeaders?: Readonly<Record<string, string>>;
  // oxlint-disable-next-line anti-slop/no-unsafe-dictionary-type -- `test.use()` accepts Playwright runner options (e.g. trace) the harness ignores; unknown is the honest value type.
  readonly [key: string]: unknown;
}

const fileOptions: FileContextOptions = {};
let managedBrowser: ManagedBrowser | undefined;
let managedServer: ManagedServer | undefined;

type BrowserMember = CallableFunction | undefined;

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- CallableFunction's call signature is not readonly-able; the guard only reads identity.
function isFunction(value: BrowserMember): value is CallableFunction {
  return value !== undefined;
}

function isCallable(value: boolean | (() => boolean)): value is () => boolean {
  // oxlint-disable-next-line anti-slop/no-runtime-typeof -- test.skip accepts either a boolean or a predicate; the runtime shape must be told apart before it can be called.
  return typeof value === "function";
}

let activeFixturesValue: TestFixtures | undefined;
let activeTestValue: { skip(message?: string): void } | undefined;
/** Set by `test.skip()` inside a beforeEach hook; the body is then not run. */
let pendingHookSkipMessage: string | undefined;
/** Set by a describe-scope `test.skip(condition, message)` at load time. */
let fileSkipMessage: string | undefined;
const testBudget = {
  startedAt: 0,
  deadline: Number.POSITIVE_INFINITY,
};

let clearWatcher: (() => void) | undefined;

function projectName(): string {
  const project = process.env.E2E_PROJECT?.trim();
  return project !== undefined && project !== "" ? project : "chromium";
}

function isNoJsProject(): boolean {
  return projectName() === "no-js";
}

async function getManagedBrowser(): Promise<ManagedBrowser> {
  managedBrowser ??= await launchManagedBrowser();
  return managedBrowser;
}

/**
 * The `browser` fixture honors the same file/project context defaults as the
 * per-test fixtures (baseURL, extraHTTPHeaders, storageState cookies, no-JS
 * mode), so contexts a spec creates itself — e.g. per-locale contexts in the
 * language chooser — resolve relative navigations exactly as they did under
 * `@playwright/test`'s config-level `use` options.
 */
const wrappedBrowsers = new WeakMap<ManagedBrowser, Browser>();

function wrappedBrowser(managed: Readonly<ManagedBrowser>): Browser {
  const cached = wrappedBrowsers.get(managed);
  if (cached !== undefined) return cached;

  const defaults: BrowserContextOptions = { baseURL: baseUrl() };
  if (isNoJsProject()) defaults.javaScriptEnabled = false;
  if (fileOptions.extraHTTPHeaders) {
    defaults.extraHTTPHeaders = fileOptions.extraHTTPHeaders;
  }
  const storageCookies = fileOptions.storageState?.cookies;

  const proxy = new Proxy(managed.browser, {
    get(target, property) {
      if (property === "newContext") {
        // oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- Playwright defines BrowserContextOptions with mutable members; the wrapper only spreads it.
        return async (options: Readonly<BrowserContextOptions> = {}) => {
          const context = await target.newContext({ ...defaults, ...options });
          await context.addInitScript(ESBUILD_NAME_SHIM);
          if (storageCookies !== undefined && storageCookies.length > 0) {
            await context.addCookies(storageCookies);
          }
          return context;
        };
      }
      // SAFETY: the proxy only forwards Browser members whose types are already known.
      // oxlint-disable-next-line anti-slop/no-reflect-get, typescript/no-unsafe-type-assertion -- Proxy passthrough must honor the original receiver; Reflect.get is typed any for symbol keys, and the proxy only forwards Browser members whose types are already known.
      const value = Reflect.get(target, property, target) as BrowserMember;
      return isFunction(value) ? value.bind(target) : value;
    },
  });
  wrappedBrowsers.set(managed, proxy);
  return proxy;
}

async function buildFixtures(): Promise<TestFixtures> {
  const managed = await getManagedBrowser();
  const url = baseUrl();
  const contextOptions: BrowserContextOptions = {
    baseURL: url,
    javaScriptEnabled: projectName() !== "no-js",
  };
  if (fileOptions.extraHTTPHeaders) {
    contextOptions.extraHTTPHeaders = fileOptions.extraHTTPHeaders;
  }

  const context = await managed.browser.newContext(contextOptions);
  if ((fileOptions.storageState?.cookies?.length ?? 0) > 0) {
    await context.addCookies(fileOptions.storageState?.cookies ?? []);
  }
  const page = await context.newPage();

  return {
    browser: wrappedBrowser(managed),
    context,
    page,
    request: context.request,
    playwright: { request: playwrightRequestShim },
    baseURL: url,
  };
}

class SkipSignal extends Error {
  constructor(message?: string) {
    super(message ?? "skipped");
    this.name = "SkipSignal";
  }
}

function buildTestInfo(): TestInfo {
  return { project: { name: projectName() } };
}

/**
 * Enforces the test timeout with a deadline `test.setTimeout` can replace
 * while the test is running (Playwright semantics: the whole-test budget).
 */
async function runWithTimeout(run: () => Promise<void>): Promise<void> {
  const expired = new Promise<never>((_, reject) => {
    const watcher = setInterval(() => {
      if (Date.now() >= testBudget.deadline) {
        clearInterval(watcher);
        reject(new Error(`Test timed out after ${testBudget.deadline - testBudget.startedAt}ms`));
      }
    }, 250);
    clearWatcher = () => {
      clearInterval(watcher);
    };
  });
  await Promise.race([run(), expired]);
}

function declareTest(name: string, fn: TestFn, only: boolean): void {
  // oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- node:test's TestContext exposes mutable members (skip/runOnly); the wrapper only calls skip().
  const wrapped = async (context: TestContext) => {
    const nodeContext = context;
    activeTestValue = nodeContext;
    testBudget.startedAt = Date.now();
    testBudget.deadline =
      testBudget.startedAt + (pendingDefaultTimeoutMs ?? DEFAULT_TEST_TIMEOUT_MS);
    pendingDefaultTimeoutMs = undefined;
    if (activeFixturesValue === undefined) {
      throw new Error("harness fixtures missing: was this test registered after module load?");
    }
    const fixtures = activeFixturesValue;
    if (pendingHookSkipMessage !== undefined) {
      const message = pendingHookSkipMessage;
      pendingHookSkipMessage = undefined;
      nodeContext.skip(message);
      return;
    }
    try {
      await runWithTimeout(async () => {
        await fn(fixtures, buildTestInfo());
      });
    } catch (error) {
      if (error instanceof SkipSignal) {
        nodeContext.skip(error.message);
        return;
      }
      throw error;
    } finally {
      activeTestValue = undefined;
      clearWatcher?.();
      clearWatcher = undefined;
    }
  };
  const options = fileSkipMessage === undefined ? {} : { skip: fileSkipMessage };
  if (only) {
    void nodeTest.only(name, options, wrapped);
  } else {
    void nodeTest(name, options, wrapped);
  }
}

export interface TestApi {
  (name: string, fn: TestFn): void;
  only(name: string, fn: TestFn): void;
  describe: DescribeFn & {
    configure(options: Readonly<{ mode?: string }>): void;
    serial(name: string, callback: () => void): void;
    only(name: string, callback: () => void): void;
  };
  beforeEach(fn: TestHook): void;
  afterEach(fn: PartialTestHook): void;
  beforeAll(fn: WorkerHook): void;
  afterAll(fn: PartialWorkerHook): void;
  skip(condition?: boolean | (() => boolean), message?: string): void;
  setTimeout(milliseconds: number): void;
  // oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- FileContextOptions keeps the open index signature test.use() requires; Readonly<> would break assignability from spec literals.
  use(options: FileContextOptions): void;
}

nodeBefore(async () => {
  managedServer = await ensureServer();
  await setupRecipientSnapshot();
});

nodeBeforeEach(async () => {
  pendingHookSkipMessage = undefined;
  activeFixturesValue = await buildFixtures();
  activeTestValue = {
    skip: (message?: string) => {
      pendingHookSkipMessage = message ?? "skipped";
    },
  };
});

nodeAfterEach(async () => {
  await activeFixturesValue?.context.close().catch(() => undefined);
  activeFixturesValue = undefined;
});

nodeAfter(async () => {
  try {
    await teardownRecipientSnapshot();
  } finally {
    await managedBrowser?.close();
    managedBrowser = undefined;
    await managedServer?.stop();
    managedServer = undefined;
  }
});

// `test.describe.configure({ mode: "serial" })` is a no-op: within a file,
// Node:test is already serial. Keep the spelling valid for migrated specs.
// A describe-scope `test.skip(condition, message)` applies only to the tests
// Declared inside that describe — restore the outer skip state on exit.
type DescribeFn = (name: string, callback: () => void) => void;
function scopedDescribe(name: string, callback: () => void): void {
  const outerSkip = fileSkipMessage;
  fileSkipMessage = undefined;
  try {
    void nodeDescribe(name, callback);
  } finally {
    fileSkipMessage = outerSkip;
  }
}
const describeWithAliases = Object.assign(scopedDescribe, {
  configure(_options: Readonly<{ mode?: string }>): void {},
  serial: scopedDescribe,
  only: scopedDescribe,
});

export const test: TestApi = Object.assign(
  (name: string, fn: TestFn) => {
    declareTest(name, fn, false);
  },
  {
    only(name: string, fn: TestFn) {
      declareTest(name, fn, true);
    },
    describe: describeWithAliases,
    beforeEach(fn: TestHook) {
      nodeBeforeEach(async () => {
        if (activeFixturesValue === undefined) {
          throw new Error("fixtures missing in beforeEach");
        }
        try {
          await fn(activeFixturesValue, buildTestInfo());
        } catch (error) {
          if (error instanceof SkipSignal) {
            pendingHookSkipMessage = error.message;
            return;
          }
          throw error;
        }
      });
    },
    afterEach(fn: PartialTestHook) {
      nodeAfterEach(async () => {
        await fn(activeFixturesValue ?? {}, buildTestInfo());
      });
    },
    beforeAll(fn: WorkerHook) {
      nodeBefore(async () => {
        const managed = await getManagedBrowser();
        await fn(
          {
            browser: wrappedBrowser(managed),
            playwright: { request: playwrightRequestShim },
            baseURL: baseUrl(),
          },
          buildTestInfo(),
        );
      });
    },
    afterAll(fn: PartialWorkerHook) {
      nodeAfter(async () => {
        await fn(
          {
            browser: managedBrowser === undefined ? undefined : wrappedBrowser(managedBrowser),
            playwright: { request: playwrightRequestShim },
            baseURL: baseUrl(),
          },
          buildTestInfo(),
        );
      });
    },
    skip(condition?: boolean | (() => boolean), message?: string) {
      const shouldSkip =
        condition === undefined ? true : isCallable(condition) ? condition() : condition;
      if (!shouldSkip) return;
      if (activeTestValue !== undefined) {
        activeTestValue.skip(message);
        return;
      }
      // Describe-scope skip at load time: apply to every subsequently
      // Registered test in this file (Playwright file-scope skip semantics).
      fileSkipMessage ??= message ?? "skipped";
    },
    setTimeout(milliseconds: number) {
      if (activeTestValue !== undefined) {
        testBudget.deadline = (testBudget.startedAt || Date.now()) + milliseconds;
        return;
      }
      // Called from a hook: node:test hooks have no timeout, so apply the
      // Budget to the next test instead of discarding it.
      pendingDefaultTimeoutMs = milliseconds;
    },
    // oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- FileContextOptions keeps the open index signature test.use() requires; Readonly<> would break assignability from spec literals.
    use(options: FileContextOptions) {
      Object.assign(fileOptions, options);
    },
  },
);

export { isPublicSmoke };
export { expect } from "./expect";
export type { Expectation } from "./expect";
