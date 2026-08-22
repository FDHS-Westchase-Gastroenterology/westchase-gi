import { spawn } from "node:child_process";
import { existsSync } from "node:fs";

/**
 * Dev-server lifecycle. Replaces the `@playwright/test` `webServer` config:
 * boot `npm run dev:mission` on :3100 when nothing is serving, reuse an
 * already-running stack, and tear down only what this process started.
 */

const PORT = Number(process.env.E2E_PORT ?? 3100);
const HEALTH_PATH = process.env.E2E_HEALTH_PATH ?? "/en";

export function baseUrl(): string {
  const override = process.env.E2E_BASE_URL?.trim();
  return override !== undefined && override !== "" ? override : `http://localhost:${PORT}`;
}

async function isServing(url: string): Promise<boolean> {
  try {
    const response = await fetch(new URL(HEALTH_PATH, url), {
      redirect: "follow",
      signal: AbortSignal.timeout(2_000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

export interface ManagedServer {
  url: string;
  startedHere: boolean;
  stop(): Promise<void>;
}

export async function ensureServer(): Promise<ManagedServer> {
  const url = baseUrl();
  if (await isServing(url)) {
    return {
      url,
      startedHere: false,
      async stop() {},
    };
  }

  const hasEnvLocal = existsSync(".env.local");
  const child = hasEnvLocal
    ? spawn("npm", ["run", "dev:mission"], {
        stdio: ["ignore", "ignore", "pipe"],
        env: process.env,
        detached: true,
      })
    : spawn("npx", ["next", "dev", "-p", String(PORT)], {
        stdio: ["ignore", "ignore", "pipe"],
        env: process.env,
        detached: true,
      });

  const output: string[] = [];
  child.stderr.on("data", (chunk) => {
    output.push(String(chunk));
    if (output.length > 200) output.shift();
  });

  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(
        `dev server exited early (code ${child.exitCode}):
${output.join("")}`,
      );
    }
    if (await isServing(url)) {
      return {
        url,
        startedHere: true,
        // oxlint-disable-next-line typescript/require-await -- The ManagedServer contract returns Promise<void>; process.kill is synchronous.
        async stop() {
          if (child.pid !== undefined) {
            process.kill(-child.pid, "SIGTERM");
          }
        },
      };
    }
    await new Promise((resolve) => {
      setTimeout(resolve, 1_000);
    });
  }
  throw new Error(`dev server did not become ready on ${url}`);
}
