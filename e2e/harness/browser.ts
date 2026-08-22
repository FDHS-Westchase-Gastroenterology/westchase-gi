import { chromium } from "playwright-core";
import type { Browser } from "playwright-core";

/**
 * Browser lifecycle for the E2E harness.
 *
 * Two providers, one contract:
 *
 * - `browserbase`: create a hosted Browserbase session with the
 *   `@browserbasehq/sdk`, then drive it with `playwright-core` over the
 *   session's CDP endpoint. `connectOverCDP` needs no local browser install,
 *   which is why CI never downloads Chromium anymore.
 * - `local`: launch the workstation's Google Chrome through `playwright-core`
 *   (`channel: "chrome"`). Development stays free of cloud cost; CI never
 *   uses this provider.
 *
 * Stagehand attaches to the same CDP endpoint when a spec needs an AI-driven
 * journey (`stagehandFor`), so one session serves both stacks.
 */

export type BrowserProvider = "browserbase" | "local";

export interface ManagedBrowser {
  browser: Browser;
  provider: BrowserProvider;
  sessionId?: string;
  /** CDP endpoint for the session, when the provider exposes one. */
  connectUrl?: string;
  close(): Promise<void>;
}

function readProvider(): BrowserProvider {
  const raw = process.env.E2E_BROWSER?.trim().toLowerCase();
  if (raw === "browserbase" || raw === "local") return raw;
  if (raw !== undefined && raw !== "") {
    throw new Error(`Unknown E2E_BROWSER "${raw}" (expected browserbase or local)`);
  }
  return process.env.CI !== undefined && process.env.CI !== "" ? "browserbase" : "local";
}

function requiredCredential(name: string): string {
  const value = process.env[name]?.trim();
  if (value === undefined || value === "") {
    throw new Error(`Missing ${name} for the browserbase E2E provider`);
  }
  return value;
}

export async function launchManagedBrowser(): Promise<ManagedBrowser> {
  const provider = readProvider();
  if (provider === "local") {
    const executablePath = process.env.E2E_CHROME_EXECUTABLE?.trim();
    const browser = await (executablePath === undefined || executablePath === ""
      ? chromium.launch({ channel: "chrome", headless: true })
      : chromium.launch({ executablePath, headless: true }));
    return {
      browser,
      provider,
      async close() {
        await browser.close();
      },
    };
  }

  const { Browserbase } = await import("@browserbasehq/sdk");
  const apiKey = requiredCredential("BROWSERBASE_API_KEY");
  const projectId = requiredCredential("BROWSERBASE_PROJECT_ID");
  const client = new Browserbase({ apiKey });
  const session = await client.sessions.create({ projectId });
  const browser = await chromium.connectOverCDP(session.connectUrl);

  let closed = false;
  return {
    browser,
    provider,
    sessionId: session.id,
    connectUrl: session.connectUrl,
    async close() {
      if (closed) return;
      closed = true;
      try {
        await browser.close();
      } finally {
        await client.sessions
          .update(session.id, { status: "REQUEST_RELEASE" })
          .catch((cause: unknown) => {
            console.warn(
              `[e2e] Browserbase release failed for session ${session.id}:`,
              cause instanceof Error ? cause.message : cause,
            );
          });
      }
    },
  };
}

/**
 * Attach a Stagehand instance to the harness browser's CDP endpoint for
 * AI-driven journeys (act/extract/observe). Returns `undefined` when the
 * current provider cannot expose a CDP URL.
 *
 * Deterministic specs never need this; it exists so a spec can graduate a
 * human-scale journey into the same session the assertions run against.
 */
/**
 * Model selection for AI journeys. `STAGEHAND_MODEL` (provider/model form)
 * wins; otherwise an Anthropic credential selects claude-sonnet-4-5; without
 * either, Stagehand's own default applies (OpenAI). Deterministic specs
 * never construct a Stagehand instance and need no model credential.
 */
function stagehandModelOptions() {
  const explicit = process.env.STAGEHAND_MODEL?.trim();
  if (explicit !== undefined && explicit !== "") {
    return { model: { modelName: explicit } };
  }
  const anthropicKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (anthropicKey !== undefined && anthropicKey !== "") {
    return {
      model: {
        modelName: "anthropic/claude-sonnet-4-5-20250929",
        clientOptions: { apiKey: anthropicKey },
      },
    };
  }
  return {};
}

export async function stagehandFor(managed: Readonly<ManagedBrowser>) {
  const { Stagehand } = await import("@browserbasehq/stagehand");
  const modelOptions = stagehandModelOptions();
  if (managed.provider === "browserbase" && managed.connectUrl !== undefined) {
    const stagehand = new Stagehand({
      env: "LOCAL",
      localBrowserLaunchOptions: { cdpUrl: managed.connectUrl },
      ...modelOptions,
    });
    await stagehand.init();
    return stagehand;
  }
  // Local provider: Stagehand launches its own Chrome for AI journeys.
  // That browser stays separate from the deterministic suite's instance.
  const stagehand = new Stagehand({
    env: "LOCAL",
    localBrowserLaunchOptions: { headless: true },
    ...modelOptions,
  });
  await stagehand.init();
  return stagehand;
}
