import { inspect } from "node:util";

import type { Locator, Page } from "playwright-core";

/**
 * Playwright-compatible `expect` for node:test.
 *
 * Generic assertions wrap `node:assert/strict`; locator and page assertions
 * poll until the expectation timeout (default 5s) so transient rendering
 * settles the same way `@playwright/test`'s auto-retrying matchers did.
 */

const DEFAULT_TIMEOUT_MS = 5_000;
const POLL_INTERVAL_MS = 100;

/** Options shared by every polling matcher. */
interface PollOptions {
  readonly timeout?: number;
}

/** Text matchers that can read inner text instead of text content. */
interface TextMatchOptions extends PollOptions {
  readonly useInnerText?: boolean;
}

/**
 * A matcher invocation: sync matchers return void, polling matchers a
 * promise. `never[]` parameters keep every concrete matcher signature
 * assignable to this rest shape.
 */
// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- Rest parameters cannot take readonly array types; the never[] shape is a variance shim, not a runtime contract.
type MatcherFn = (...args: never[]) => void | Promise<void>;

/**
 * The dynamically addressed matcher dictionary one assertion exposes. `toBe`
 * is guaranteed on every surface; the index signature reaches the rest.
 */
interface MatcherSurface {
  readonly toBe: MatcherFn;
  readonly [matcher: string]: MatcherFn;
}

/**
 * Asymmetric matchers (`expect.any`, `expect.objectContaining`,
 * `expect.arrayContaining`). A marker travels through deepEqual/subsetMatch
 * and is interpreted wherever it appears on the expected side.
 */
interface AsymmetricMarker {
  readonly __asymmetric: true;
  readonly kind: "any" | "objectContaining" | "arrayContaining";
  readonly ctor?: abstract new (...args: never[]) => object;
  readonly template?: unknown;
  readonly items?: readonly unknown[];
}

// Structural decoding core. This IS the boundary parser the anti-slop rules
// Ask for: `expect()` receives arbitrary, unparsed values from page
// Evaluates, HTTP bodies, and spec authors. `unknown` marks that unparsed
// Input honestly; typeof/Array.isArray are the decoder's primitives. The
// Record reinterpretations are how a decoded object is read. Every retained
// Assertion still carries a SAFETY comment stating its invariant.
// oxlint-disable anti-slop/no-unknown-parameters, anti-slop/no-runtime-typeof, anti-slop/no-unsafe-dictionary-type, typescript/no-unsafe-type-assertion -- Decoder internals: unparsed input is the domain here, and typeof plus record reads are the parser itself.
function isAsymmetric(value: unknown): value is AsymmetricMarker {
  return (
    typeof value === "object" &&
    value !== null &&
    // SAFETY: duck-typed marker read — the marker is a plain literal built below.
    (value as { __asymmetric?: boolean }).__asymmetric === true
  );
}

function matchesAny(ctor: abstract new (...args: never[]) => object, actual: unknown): boolean {
  // SAFETY: BigIntConstructor has no construct signature, so the marker's
  // Constructor union cannot express it; identity comparison is the check.
  // oxlint-disable-next-line anti-slop/no-chained-type-assertions, typescript/no-unsafe-type-assertion -- The marker ctor type cannot name BigIntConstructor; identity comparison against the widened builtin is the only spelling TypeScript accepts.
  if (ctor === (BigInt as unknown as abstract new (...args: never[]) => object)) {
    return typeof actual === "bigint";
  }
  switch (ctor) {
    case String:
      return typeof actual === "string" || actual instanceof String;
    case Number:
      return typeof actual === "number" || actual instanceof Number;
    case Boolean:
      return typeof actual === "boolean" || actual instanceof Boolean;
    case Function:
      return typeof actual === "function";
    default:
      return actual instanceof ctor;
  }
}

function asymmetricMatches(expected: AsymmetricMarker, actual: unknown): boolean {
  if (expected.kind === "any") {
    return expected.ctor !== undefined && matchesAny(expected.ctor, actual);
  }
  if (expected.kind === "objectContaining") {
    if (actual === null || typeof actual !== "object" || Array.isArray(actual)) return false;
    // SAFETY: decoded above — actual is a non-array, non-null object.
    const actualRecord = actual as Record<string, unknown>;
    // SAFETY: the marker builder guarantees template is an object literal.
    return Object.entries(expected.template as Record<string, unknown>).every(([key, value]) =>
      matchValue(actualRecord[key], value),
    );
  }
  if (!Array.isArray(actual)) return false;
  return (expected.items ?? []).every((item) =>
    actual.some((element) => matchValue(element, item)),
  );
}

/** Structural equality that understands asymmetric markers. */
function matchValue(actual: unknown, expected: unknown): boolean {
  if (isAsymmetric(expected)) return asymmetricMatches(expected, actual);
  if (Array.isArray(expected)) {
    return (
      Array.isArray(actual) &&
      expected.length === actual.length &&
      expected.every((item, index) => matchValue(actual[index], item))
    );
  }
  if (expected !== null && typeof expected === "object") {
    if (actual === null || typeof actual !== "object" || Array.isArray(actual)) return false;
    // SAFETY: both sides decoded to non-null, non-array objects above.
    const expectedRecord = expected as Record<string, unknown>;
    // SAFETY: decoded on the line above — actual is a non-null, non-array object.
    const actualRecord = actual as Record<string, unknown>;
    const expectedKeys = Object.keys(expectedRecord);
    const actualKeys = Object.keys(actualRecord);
    return (
      expectedKeys.length === actualKeys.length &&
      expectedKeys.every((key) => matchValue(actualRecord[key], expectedRecord[key]))
    );
  }
  return Object.is(actual, expected);
}

function deepEqual(actual: unknown, expected: unknown): boolean {
  return matchValue(actual, expected);
}

/** Subset matching for `toMatchObject`: expected keys must match, extras pass. */
function subsetMatch(actual: unknown, expected: unknown): boolean {
  if (isAsymmetric(expected)) return asymmetricMatches(expected, actual);
  if (expected === null || typeof expected !== "object") {
    return Object.is(actual, expected);
  }
  if (
    actual === null ||
    typeof actual !== "object" ||
    Array.isArray(expected) !== Array.isArray(actual)
  ) {
    return false;
  }
  if (Array.isArray(expected)) {
    return (
      Array.isArray(actual) &&
      actual.length >= expected.length &&
      expected.every((item, index) => subsetMatch(actual[index], item))
    );
  }
  // SAFETY: decoded above — actual is a non-null, non-array object.
  return Object.entries(expected).every(
    ([key, value]) =>
      key in (actual as Record<string, unknown>) &&
      subsetMatch((actual as Record<string, unknown>)[key], value),
  );
}

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- Playwright text expectations accept plain RegExp, which cannot be made readonly.
function textMatches(text: string, expected: string | RegExp, exact: boolean): boolean {
  if (expected instanceof RegExp) return expected.test(text);
  return exact ? text.trim() === expected : text.includes(expected);
}

function stringify(value: unknown): string {
  return typeof value === "string" ? JSON.stringify(value) : inspect(value, { depth: 6 });
}

/** Jest-style falsiness without boolean coercion: false, 0, 0n, "", null, undefined, NaN. */
function isFalsyValue(value: unknown): boolean {
  return (
    value === false ||
    value === 0 ||
    value === BigInt(0) ||
    value === "" ||
    value === null ||
    value === undefined ||
    value !== value
  );
}

function isLocator(value: unknown): value is Locator {
  return (
    typeof value === "object" &&
    value !== null &&
    // SAFETY: duck-typed probe — the property test decides the type, not the cast.
    typeof (value as Locator).isVisible === "function" &&
    // SAFETY: duck-typed probe — the property test decides the type, not the cast.
    typeof (value as Locator).count === "function"
  );
}

function isPage(value: unknown): value is Page {
  return (
    typeof value === "object" &&
    value !== null &&
    // SAFETY: duck-typed probe — the property test decides the type, not the cast.
    typeof (value as Page).url === "function"
  );
}

class AssertionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AssertionError";
  }
}

async function pollUntil<T>(
  read: () => T | Promise<T>,
  check: (value: T) => boolean,
  timeoutMs: number,
  describeValue: (value: T) => string,
  hint?: string,
): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  let lastValue: T;
  for (;;) {
    lastValue = await read();
    if (check(lastValue)) return lastValue;
    if (Date.now() >= deadline) {
      throw new AssertionError(
        `${hint === undefined ? "" : `${hint}\n`}Timed out after ${timeoutMs}ms waiting for expectation\nReceived: ${describeValue(lastValue)}`,
      );
    }
    await new Promise((resolve) => {
      setTimeout(resolve, POLL_INTERVAL_MS);
    });
  }
}
// oxlint-enable anti-slop/no-unknown-parameters, anti-slop/no-runtime-typeof, anti-slop/no-unsafe-dictionary-type, typescript/no-unsafe-type-assertion

/**
 * Builds the matcher surface for one concrete target. `negated` inverts
 * every matcher (`.not`), `timeoutMs` bounds polling matchers, and `hint` is
 * the Playwright-style custom message included in every failure.
 */
// The matcher surface is the public boundary: every matcher accepts the
// Arbitrary expected/actual values the assertion is pointed at, narrows them
// With typeof, and reinterprets them through record reads.
// oxlint-disable anti-slop/no-unknown-parameters, anti-slop/no-runtime-typeof, anti-slop/no-unsafe-dictionary-type, typescript/no-unsafe-type-assertion, typescript/prefer-readonly-parameter-types -- Boundary surface: unparsed expected values are the input domain, and Playwright-shaped RegExp/array/predicate parameters cannot be made readonly.
function buildMatchers(
  target: unknown,
  negated: boolean,
  timeoutMs: number,
  hint?: string,
): MatcherSurface {
  const requireLocator = (): Locator => {
    if (!isLocator(target)) throw new AssertionError("this matcher requires a locator");
    return target;
  };
  const requirePage = (): Page => {
    if (!isPage(target)) throw new AssertionError("this matcher requires a page");
    return target;
  };

  const prefix = () => (hint === undefined ? "" : `${hint}\n`);
  const sync = (name: string, condition: boolean, detail: string) => {
    if (negated ? condition : !condition) {
      throw new AssertionError(
        `${prefix()}${negated ? "not." : ""}${name} failed${detail ? `\n${detail}` : ""}`,
      );
    }
  };

  // TextContent resolves to null for elementless locators; callers apply
  // Their own `?? ""` so null travels through unchanged.
  const readText = async (): Promise<string | null> => {
    const locator = requireLocator();
    try {
      return await locator.innerText();
    } catch {
      const fallback = await locator.textContent();
      return fallback;
    }
  };

  const withTimeout = (options?: PollOptions) => options?.timeout ?? timeoutMs;

  const surface = {
    toBe(expected: unknown) {
      sync(
        "toBe",
        Object.is(target, expected),
        `expected ${stringify(target)} to be ${stringify(expected)}`,
      );
    },
    toEqual(expected: unknown) {
      sync("toEqual", deepEqual(target, expected), "");
    },
    toStrictEqual(expected: unknown) {
      sync("toStrictEqual", deepEqual(target, expected), "");
    },
    toBeNull() {
      sync("toBeNull", target === null, `received ${stringify(target)}`);
    },
    toBeUndefined() {
      sync("toBeUndefined", target === undefined, `received ${stringify(target)}`);
    },
    toBeDefined() {
      sync("toBeDefined", target !== undefined, "value is undefined");
    },
    toBeTruthy() {
      sync("toBeTruthy", !isFalsyValue(target), `received ${stringify(target)}`);
    },
    toBeFalsy() {
      sync("toBeFalsy", isFalsyValue(target), `received ${stringify(target)}`);
    },
    toContain(expected: unknown) {
      if (typeof target === "string") {
        sync(
          "toContain",
          target.includes(String(expected)),
          `${stringify(target)} does not contain ${stringify(expected)}`,
        );
      } else if (Array.isArray(target)) {
        sync(
          "toContain",
          target.some((item) => deepEqual(item, expected)),
          `array does not contain ${stringify(expected)}`,
        );
      } else {
        throw new AssertionError(`toContain expects a string or array, received ${typeof target}`);
      }
    },
    toMatch(expected: string | RegExp) {
      sync(
        "toMatch",
        typeof target === "string" &&
          (expected instanceof RegExp ? expected.test(target) : target.includes(expected)),
        `${stringify(target)} does not match ${String(expected)}`,
      );
    },
    toHaveLength(expected: number) {
      // SAFETY: targets reaching this matcher are arrays, strings, or node
      // Lists. Null/undefined stays in the union so the optional chain is load-bearing.
      const sized = target as { length?: number } | null | undefined;
      sync("toHaveLength", sized?.length === expected, `received length ${String(sized?.length)}`);
    },
    toHaveProperty(key: string | string[], expected?: unknown) {
      const path = Array.isArray(key) ? key : key.split(".");
      let cursor: unknown = target;
      for (const segment of path) {
        // SAFETY: walking an arbitrary object graph — record access is the operation itself.
        cursor = (cursor as Record<string, unknown> | undefined)?.[segment];
      }
      sync(
        "toHaveProperty",
        cursor !== undefined && (expected === undefined || deepEqual(cursor, expected)),
        `property ${path.join(".")} is ${stringify(cursor)}`,
      );
    },
    toMatchObject(expected: Record<string, unknown> | unknown[]) {
      sync("toMatchObject", subsetMatch(target, expected), `received ${stringify(target)}`);
    },
    toBeGreaterThan(expected: number) {
      // SAFETY: numeric matchers assert on numbers; the cast preserves the legacy NaN-comparison failure mode for non-numbers.
      sync("toBeGreaterThan", (target as number) > expected, `received ${String(target)}`);
    },
    toBeGreaterThanOrEqual(expected: number) {
      // SAFETY: numeric matchers assert on numbers; the cast preserves the legacy NaN-comparison failure mode for non-numbers.
      sync("toBeGreaterThanOrEqual", (target as number) >= expected, `received ${String(target)}`);
    },
    toBeLessThan(expected: number) {
      // SAFETY: numeric matchers assert on numbers; the cast preserves the legacy NaN-comparison failure mode for non-numbers.
      sync("toBeLessThan", (target as number) < expected, `received ${String(target)}`);
    },
    toBeLessThanOrEqual(expected: number) {
      // SAFETY: numeric matchers assert on numbers; the cast preserves the legacy NaN-comparison failure mode for non-numbers.
      sync("toBeLessThanOrEqual", (target as number) <= expected, `received ${String(target)}`);
    },
    toBeInstanceOf(constructor: unknown) {
      // SAFETY: instanceof requires a constructor; the matcher's own failure path covers non-constructors.
      sync(
        "toBeInstanceOf",
        target instanceof (constructor as abstract new (...args: never[]) => object),
        `received ${stringify(target)}`,
      );
    },
    toBeCloseTo(expected: number, precision = 2) {
      // SAFETY: numeric matchers assert on numbers; the cast preserves the legacy NaN-comparison failure mode for non-numbers.
      sync(
        "toBeCloseTo",
        Math.abs((target as number) - expected) < 10 ** -precision / 2,
        `received ${String(target)}`,
      );
    },

    async toBeVisible(options?: PollOptions) {
      await pollUntil(
        async () => requireLocator().isVisible(),
        (visible) => (negated ? !visible : visible),
        withTimeout(options),
        (visible) => `locator visible=${String(visible)}`,
        hint,
      );
    },
    async toBeHidden(options?: PollOptions) {
      await pollUntil(
        async () => requireLocator().isVisible(),
        (visible) => (negated ? visible : !visible),
        withTimeout(options),
        (visible) => `locator visible=${String(visible)}`,
        hint,
      );
    },
    async toBeEnabled(options?: PollOptions) {
      await pollUntil(
        async () => requireLocator().isEnabled(),
        (enabled) => (negated ? !enabled : enabled),
        withTimeout(options),
        (enabled) => `locator enabled=${String(enabled)}`,
        hint,
      );
    },
    async toBeDisabled(options?: PollOptions) {
      await pollUntil(
        async () => requireLocator().isEnabled(),
        (enabled) => (negated ? enabled : !enabled),
        withTimeout(options),
        (enabled) => `locator enabled=${String(enabled)}`,
        hint,
      );
    },
    async toBeEditable(options?: PollOptions) {
      await pollUntil(
        async () => requireLocator().isEditable(),
        (editable) => (negated ? !editable : editable),
        withTimeout(options),
        (editable) => `locator editable=${String(editable)}`,
        hint,
      );
    },
    async toBeFocused(options?: PollOptions) {
      await pollUntil(
        async () => requireLocator().evaluate((element) => document.activeElement === element),
        (focused) => (negated ? !focused : focused),
        withTimeout(options),
        (focused) => `locator focused=${String(focused)}`,
        hint,
      );
    },
    async toBeChecked(options?: PollOptions) {
      await pollUntil(
        async () => requireLocator().isChecked(),
        (checked) => (negated ? !checked : checked),
        withTimeout(options),
        (checked) => `locator checked=${String(checked)}`,
        hint,
      );
    },
    async toHaveCount(expected: number, options?: PollOptions) {
      await pollUntil(
        async () => requireLocator().count(),
        (count) => (negated ? count !== expected : count === expected),
        withTimeout(options),
        (count) => `count=${String(count)}`,
        hint,
      );
    },
    async toHaveText(expected: string | RegExp | string[], options?: TextMatchOptions) {
      await pollUntil(
        async () => {
          if (!Array.isArray(expected)) return readText();
          const texts = await requireLocator().allTextContents();
          return texts.length === expected.length
            ? texts
                .map((text, index) => (textMatches(text, expected[index], true) ? "1" : "0"))
                .join("")
            : `length=${String(texts.length)}`;
        },
        (value) => {
          const matches = Array.isArray(expected)
            ? value === expected.map(() => "1").join("")
            : textMatches(value ?? "", expected, true);
          return negated ? !matches : matches;
        },
        withTimeout(options),
        (value) => `text=${stringify(value ?? "")}`,
        hint,
      );
    },
    async toContainText(
      expected: string | RegExp | (string | RegExp)[],
      options?: TextMatchOptions,
    ) {
      await pollUntil(
        async () => {
          if (!Array.isArray(expected)) return readText();
          const texts = await requireLocator().allTextContents();
          return texts.length === expected.length
            ? texts
                .map((text, index) => (textMatches(text, expected[index], false) ? "1" : "0"))
                .join("")
            : `length=${String(texts.length)}`;
        },
        (value) => {
          const matches = Array.isArray(expected)
            ? value === expected.map(() => "1").join("")
            : textMatches(value ?? "", expected, false);
          return negated ? !matches : matches;
        },
        withTimeout(options),
        (value) => `text=${stringify(value ?? "")}`,
        hint,
      );
    },
    async toHaveValue(expected: string | RegExp, options?: PollOptions) {
      await pollUntil(
        async () => requireLocator().inputValue(),
        (value) => {
          const matches = textMatches(value, expected, true);
          return negated ? !matches : matches;
        },
        withTimeout(options),
        (value) => `value=${stringify(value)}`,
        hint,
      );
    },
    async toHaveAttribute(name: string, expected?: string | RegExp, options?: PollOptions) {
      await pollUntil(
        async () => requireLocator().getAttribute(name),
        (value) => {
          const result =
            expected === undefined
              ? value !== null
              : value !== null &&
                (expected instanceof RegExp ? expected.test(value) : value === expected);
          return negated ? !result : result;
        },
        withTimeout(options),
        (value) => `${name}=${stringify(value)}`,
      );
    },
    async toHaveCSS(name: string, expected: string, options?: PollOptions) {
      await pollUntil(
        async () =>
          requireLocator().evaluate((element) => getComputedStyle(element).getPropertyValue(name)),
        (value) => (negated ? value !== expected : value === expected),
        withTimeout(options),
        (value) => `${name}=${stringify(value)}`,
      );
    },
    async toHaveURL(expected: string | RegExp | ((url: URL) => boolean), options?: PollOptions) {
      await pollUntil(
        () => requirePage().url(),
        (url) => {
          const result =
            expected instanceof RegExp
              ? expected.test(url)
              : typeof expected === "function"
                ? expected(new URL(url))
                : new URL(url).toString() === new URL(expected, url).toString();
          return negated ? !result : result;
        },
        withTimeout(options),
        (url) => `url=${stringify(url)}`,
      );
    },
    async toHaveTitle(expected: string | RegExp, options?: PollOptions) {
      await pollUntil(
        async () => requirePage().title(),
        (title) => {
          const matches = textMatches(title, expected, true);
          return negated ? !matches : matches;
        },
        withTimeout(options),
        (title) => `title=${stringify(title)}`,
      );
    },
  };

  return surface;
}
// oxlint-enable anti-slop/no-unknown-parameters, anti-slop/no-runtime-typeof, anti-slop/no-unsafe-dictionary-type, typescript/no-unsafe-type-assertion, typescript/prefer-readonly-parameter-types

/** `.resolves` / `.rejects`: await the promise, then delegate to its value. */
// The resolver wraps whatever thenable the spec handed `expect()`; its
// Settled value is unparsed by definition, and the proxy surface is dynamic.
// oxlint-disable anti-slop/no-unknown-parameters, anti-slop/no-runtime-typeof, typescript/no-unsafe-type-assertion, typescript/prefer-readonly-parameter-types -- Boundary thenable: unknown is the honest input, typeof is the shape probe, and the proxy's dynamic members cannot be statically readonly.
function buildResolver(
  promise: unknown,
  negated: boolean,
  timeoutMs: number,
  mode: "resolves" | "rejects",
  hint?: string,
): ResolverExpectation {
  if (
    promise === null ||
    typeof promise !== "object" ||
    // SAFETY: duck-typed probe — the property test decides the type, not the cast.
    typeof (promise as Promise<unknown>).then !== "function"
  ) {
    throw new AssertionError(`${mode} requires a promise`);
  }
  // SAFETY: the typeof guard above proved the thenable shape.
  const thenable = promise as Promise<unknown>;
  // SAFETY: the proxy target is never read; every property routes through get.
  return new Proxy({} as ResolverExpectation, {
    get(_target, property) {
      if (property === "then") return undefined;
      return async (...args: unknown[]) =>
        thenable.then(
          async (value) => {
            if (mode === "rejects") {
              throw new AssertionError(
                `${hint === undefined ? "" : `${hint}\n`}expected the promise to reject, but it resolved`,
              );
            }
            return invokeMatcher(buildMatchers(value, negated, timeoutMs, hint), property, args);
          },
          async (cause: unknown) => {
            if (mode === "resolves") throw cause;
            return invokeMatcher(buildMatchers(cause, negated, timeoutMs, hint), property, args);
          },
        );
    },
  });
}
// oxlint-enable anti-slop/no-unknown-parameters, anti-slop/no-runtime-typeof, typescript/no-unsafe-type-assertion, typescript/prefer-readonly-parameter-types

function invokeMatcher(
  surface: MatcherSurface,
  property: string | symbol,
  args: readonly unknown[],
): void | Promise<void> {
  const matcher = surface[String(property)];
  if (!(matcher instanceof Function)) {
    throw new AssertionError(`matcher "${String(property)}" does not exist in this harness`);
  }
  // SAFETY: MatcherFn's never[] rest parameters are the assignability shim;
  // The args carry exactly the values the calling matcher declared.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- The never[] rest type is a variance shim, not a runtime contract; the concrete matcher validates its own arguments.
  return matcher(...(args as never[]));
}

/**
 * The public matcher surface. Mirrors the `@playwright/test` assertions the
 * suite uses: sync value matchers return void, locator/page matchers poll and
 * resolve when satisfied. `.not`, `.resolves`, and `.rejects` wrap the same
 * surface.
 */
// Public Playwright-compatible signatures: matchers accept arbitrary expected
// Values and Record/RegExp/predicate parameter shapes that the anti-slop
// Rules reject but migrated specs compile against.
// oxlint-disable anti-slop/no-unknown-parameters, anti-slop/no-unsafe-dictionary-type, typescript/prefer-readonly-parameter-types -- Public Playwright-shaped API: unknown expected values and Record parameters are the compat contract; RegExp/predicate unions cannot be readonly.
export interface Expectation {
  toBe(expected: unknown): void;
  toEqual(expected: unknown): void;
  toStrictEqual(expected: unknown): void;
  toBeNull(): void;
  toBeUndefined(): void;
  toBeDefined(): void;
  toBeTruthy(): void;
  toBeFalsy(): void;
  toContain(expected: unknown): void;
  toMatch(expected: string | RegExp): void;
  toHaveLength(expected: number): void;
  toHaveProperty(key: string | string[], expected?: unknown): void;
  toMatchObject(expected: Record<string, unknown> | unknown[]): void;
  toBeGreaterThan(expected: number): void;
  toBeGreaterThanOrEqual(expected: number): void;
  toBeLessThan(expected: number): void;
  toBeLessThanOrEqual(expected: number): void;
  toBeInstanceOf(constructor: unknown): void;
  toBeCloseTo(expected: number, precision?: number): void;
  toBeVisible(options?: { readonly timeout?: number }): Promise<void>;
  toBeHidden(options?: { readonly timeout?: number }): Promise<void>;
  toBeEnabled(options?: { readonly timeout?: number }): Promise<void>;
  toBeDisabled(options?: { readonly timeout?: number }): Promise<void>;
  toBeEditable(options?: { readonly timeout?: number }): Promise<void>;
  toBeFocused(options?: { readonly timeout?: number }): Promise<void>;
  toBeChecked(options?: { readonly timeout?: number }): Promise<void>;
  toHaveCount(expected: number, options?: { readonly timeout?: number }): Promise<void>;
  toHaveText(
    expected: string | RegExp | string[],
    options?: { readonly timeout?: number; readonly useInnerText?: boolean },
  ): Promise<void>;
  toContainText(
    expected: string | RegExp | (string | RegExp)[],
    options?: { readonly timeout?: number; readonly useInnerText?: boolean },
  ): Promise<void>;
  toHaveValue(expected: string | RegExp, options?: { readonly timeout?: number }): Promise<void>;
  toHaveAttribute(
    name: string,
    expected?: string | RegExp,
    options?: { readonly timeout?: number },
  ): Promise<void>;
  toHaveCSS(name: string, expected: string, options?: { readonly timeout?: number }): Promise<void>;
  toHaveURL(
    expected: string | RegExp | ((url: URL) => boolean),
    options?: { readonly timeout?: number },
  ): Promise<void>;
  toHaveTitle(expected: string | RegExp, options?: { readonly timeout?: number }): Promise<void>;
  not: Expectation;
  /** Promise-aware matchers: each resolves (or rejects) before asserting. */
  resolves: ResolverExpectation;
  rejects: ResolverExpectation;
}
// oxlint-enable anti-slop/no-unknown-parameters, anti-slop/no-unsafe-dictionary-type, typescript/prefer-readonly-parameter-types

/** `resolves`/`rejects` matcher surface: every matcher returns a promise. */
// oxlint-disable anti-slop/no-unknown-parameters, anti-slop/no-unsafe-dictionary-type, typescript/prefer-readonly-parameter-types -- Public Playwright-shaped API: unknown expected values and Record parameters are the compat contract.
export interface ResolverExpectation {
  toBe(expected: unknown): Promise<void>;
  toEqual(expected: unknown): Promise<void>;
  toBeNull(): Promise<void>;
  toBeUndefined(): Promise<void>;
  toBeDefined(): Promise<void>;
  toBeTruthy(): Promise<void>;
  toBeFalsy(): Promise<void>;
  toContain(expected: unknown): Promise<void>;
  toMatch(expected: string | RegExp): Promise<void>;
  toHaveLength(expected: number): Promise<void>;
  toHaveProperty(key: string | string[], expected?: unknown): Promise<void>;
  toMatchObject(expected: Record<string, unknown> | unknown[]): Promise<void>;
  toBeGreaterThan(expected: number): Promise<void>;
  toBeGreaterThanOrEqual(expected: number): Promise<void>;
  toBeLessThan(expected: number): Promise<void>;
  toBeLessThanOrEqual(expected: number): Promise<void>;
  toBeInstanceOf(constructor: unknown): Promise<void>;
  toBeCloseTo(expected: number, precision?: number): Promise<void>;
}
// oxlint-enable anti-slop/no-unknown-parameters, anti-slop/no-unsafe-dictionary-type, typescript/prefer-readonly-parameter-types

// oxlint-disable anti-slop/no-unknown-parameters -- The assertion target is unparsed by definition; the matchers decode it.
function expectationFor(
  target: unknown,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  negated = false,
  hint?: string,
): Expectation {
  const surface = buildMatchers(target, negated, timeoutMs, hint);
  const expectation = { ...surface };
  // `not`, `resolves`, and `rejects` are lazy: eager `not` would recurse
  // Through its own `not`. Eager resolvers reject non-promise targets.
  Object.defineProperty(expectation, "not", {
    get: () => expectationFor(target, timeoutMs, !negated, hint),
  });
  Object.defineProperty(expectation, "resolves", {
    get: () => buildResolver(target, negated, timeoutMs, "resolves", hint),
  });
  Object.defineProperty(expectation, "rejects", {
    get: () => buildResolver(target, negated, timeoutMs, "rejects", hint),
  });
  // SAFETY: the spread copy carries every matcher above; only the three lazy
  // Getters below were added beyond them, and Expectation names exactly those.
  // oxlint-disable-next-line anti-slop/no-chained-type-assertions, typescript/no-unsafe-type-assertion -- The matcher dictionary is built dynamically; no single static type can name both the spread surface and the lazy getters.
  return expectation as unknown as Expectation;
}

function expectImpl(target: unknown, message?: string): Expectation {
  return expectationFor(target, DEFAULT_TIMEOUT_MS, false, message);
}
// oxlint-enable anti-slop/no-unknown-parameters

/**
 * Asymmetric matcher statics. Markers are interpreted by `toEqual`,
 * `toStrictEqual`, `toMatchObject`, `toContain`, `toContainText`-style deep
 * comparisons, and `expect.poll` checks — the same positions Playwright's
 * expect understands them.
 */
function anyMatcher(constructor: abstract new (...args: never[]) => object): AsymmetricMarker {
  return { __asymmetric: true, kind: "any", ctor: constructor };
}

// oxlint-disable-next-line anti-slop/no-unsafe-dictionary-type, typescript/prefer-readonly-parameter-types -- Playwright's objectContaining takes an open template record; the matcher decodes it key by key.
function objectContaining(template: Record<string, unknown>): AsymmetricMarker {
  return { __asymmetric: true, kind: "objectContaining", template };
}

function arrayContaining(items: readonly unknown[]): AsymmetricMarker {
  return { __asymmetric: true, kind: "arrayContaining", items };
}

/** Values `expect.poll` observes: results of page, HTTP, or counter reads. */
type PolledValue = string | number | boolean | null | object;

export const expect = Object.assign(expectImpl, {
  any: anyMatcher,
  objectContaining,
  arrayContaining,
  // Poll() takes the spec's arbitrary callback and per-check predicates;
  // Polled values arrive unparsed and are decoded with typeof and record reads.
  // oxlint-disable anti-slop/no-unknown-parameters, anti-slop/no-runtime-typeof, anti-slop/no-unsafe-dictionary-type, typescript/no-unsafe-type-assertion -- Boundary poll surface: unparsed values are the domain, decoded with typeof and record reads.
  poll(
    callback: () => PolledValue | Promise<PolledValue>,
    options?: { readonly timeout?: number; readonly intervals?: readonly number[] },
  ): PollSurface {
    const timeout = options?.timeout ?? DEFAULT_TIMEOUT_MS;
    const intervals = options?.intervals ?? [POLL_INTERVAL_MS];
    const pollFor =
      (name: string, check: (value: unknown, expected: unknown) => boolean) =>
      async (expected?: unknown) => {
        const deadline = Date.now() + timeout;
        let attempt = 0;
        for (;;) {
          const value = await callback();
          if (check(value, expected)) return;
          if (Date.now() >= deadline) {
            throw new AssertionError(
              `expect.poll(...).${name} timed out after ${timeout}ms\nReceived: ${stringify(value)}`,
            );
          }
          const wait = intervals[Math.min(attempt, intervals.length - 1)] ?? POLL_INTERVAL_MS;
          attempt += 1;
          await new Promise((resolve) => {
            setTimeout(resolve, wait);
          });
        }
      };
    return {
      toBe: pollFor("toBe", (value, expected) => Object.is(value, expected)),
      toEqual: pollFor("toEqual", (value, expected) => deepEqual(value, expected)),
      // SAFETY: toMatchObject's PollSurface contract admits arrays; subsetMatch decodes both shapes.
      toMatchObject: pollFor("toMatchObject", (value, expected) =>
        subsetMatch(value, expected as Record<string, unknown>),
      ),
      toBeTruthy: pollFor("toBeTruthy", (value) => !isFalsyValue(value)),
      toContain: pollFor("toContain", (value, expected) =>
        typeof value === "string"
          ? value.includes(String(expected))
          : Array.isArray(value)
            ? value.some((item) => deepEqual(item, expected))
            : false,
      ),
      // SAFETY: polled sizes come from arrays/strings/node lists; null and
      // Undefined stay in the union so the optional chain is load-bearing.
      toHaveLength: pollFor(
        "toHaveLength",
        (value, expected) => (value as { length?: number } | null | undefined)?.length === expected,
      ),
      toBeGreaterThan: pollFor(
        "toBeGreaterThan",
        // SAFETY: numeric poll checks decode with typeof before comparing.
        (value, expected) => typeof value === "number" && value > (expected as number),
      ),
      toBeGreaterThanOrEqual: pollFor(
        "toBeGreaterThanOrEqual",
        // SAFETY: numeric poll checks decode with typeof before comparing.
        (value, expected) => typeof value === "number" && value >= (expected as number),
      ),
      toBeLessThan: pollFor(
        "toBeLessThan",
        // SAFETY: numeric poll checks decode with typeof before comparing.
        (value, expected) => typeof value === "number" && value < (expected as number),
      ),
      toBeLessThanOrEqual: pollFor(
        "toBeLessThanOrEqual",
        // SAFETY: numeric poll checks decode with typeof before comparing.
        (value, expected) => typeof value === "number" && value <= (expected as number),
      ),
      toBeNull: pollFor("toBeNull", (value) => value === null),
    };
  },
  // oxlint-enable anti-slop/no-unknown-parameters, anti-slop/no-runtime-typeof, anti-slop/no-unsafe-dictionary-type, typescript/no-unsafe-type-assertion
});

// oxlint-disable anti-slop/no-unknown-parameters, anti-slop/no-unsafe-dictionary-type, typescript/prefer-readonly-parameter-types -- Public Playwright-shaped API: unknown expected values and Record parameters are the compat contract.
export interface PollSurface {
  toBe(expected: unknown): Promise<void>;
  toEqual(expected: unknown): Promise<void>;
  toMatchObject(expected: Record<string, unknown> | unknown[]): Promise<void>;
  toBeTruthy(): Promise<void>;
  toContain(expected: unknown): Promise<void>;
  toHaveLength(expected: number): Promise<void>;
  toBeGreaterThan(expected: number): Promise<void>;
  toBeGreaterThanOrEqual(expected: number): Promise<void>;
  toBeLessThan(expected: number): Promise<void>;
  toBeLessThanOrEqual(expected: number): Promise<void>;
  toBeNull(): Promise<void>;
}
// oxlint-enable anti-slop/no-unknown-parameters, anti-slop/no-unsafe-dictionary-type, typescript/prefer-readonly-parameter-types
