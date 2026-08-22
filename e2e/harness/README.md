# E2E harness — Stagehand/Browserbase stack

The E2E suite runs on `node:test` through `tsx`, drives real browser sessions
through `playwright-core` (the driver Stagehand itself peers on), and hosts
those sessions on **Browserbase** in CI. The `@playwright/test` runner,
configs, CLI, reporters, and local browser downloads are gone.

## Layout

| Module | Responsibility |
| --- | --- |
| `browser.ts` | Browserbase session via `@browserbasehq/sdk` + `chromium.connectOverCDP`, or local Chrome (`channel: "chrome"`). `stagehandFor()` attaches Stagehand to the same session for AI-driven journeys. |
| `suite.ts` | The `test` API: describe/hooks/fixtures/skip/setTimeout/use, one browser per file, one context per test. |
| `expect.ts` | Playwright-compatible `expect` with auto-retrying locator matchers, `.not`, `.resolves`, `.rejects`, `expect.poll`. |
| `request.ts` | `playwright.request.newContext` shim (the `request` fixture itself is the native `context.request`). |
| `server.ts` | Boot/reuse the dev server on the harness base URL; tear down only what we started. |
| `global.ts` | Recipient snapshot hygiene ported from the retired Playwright global setup/teardown. |

## Environment contract

| Variable | Meaning |
| --- | --- |
| `E2E_BROWSER` | `browserbase` or `local`. Default: `browserbase` in CI, `local` otherwise. |
| `BROWSERBASE_API_KEY` / `BROWSERBASE_PROJECT_ID` | Required for the `browserbase` provider. |
| `E2E_BASE_URL` | App origin. Default `http://localhost:3100`. |
| `E2E_PROJECT` | `chromium` (default) or `no-js` (disables JavaScript in the test context). |
| `E2E_PUBLIC_SMOKE` | `1` skips the Supabase recipient snapshot (credential-free runs). |
| `E2E_TUNNEL` | `1` fronts localhost with a Cloudflare quick tunnel so Browserbase can reach it. |
| `E2E_CHROME_EXECUTABLE` | Optional executable override for the `local` provider. |
| `STAGEHAND_MODEL` | `provider/model` for `stagehandFor()` AI journeys. Falls back to Anthropic when `ANTHROPIC_API_KEY` is set; otherwise Stagehand's default (OpenAI). Deterministic specs need no model. |
| `E2E_ALLOWED_SUPABASE_PROJECT_REF` | Target-guard allowlist (was `PLAYWRIGHT_ALLOWED_SUPABASE_PROJECT_REF`). |

## Commands

```bash
npm run test:e2e         # full serial suite (chromium project)
npm run test:e2e:nojs    # full serial suite (no-JS project)
npm run test:e2e:smoke   # credential-free public smoke
```

`scripts/run-e2e.mjs` orchestrates: server, optional tunnel, serial `tsx --test`,
teardown, exit code.

## Migration notes for specs

- `import { test, expect } from "./harness";`
- Type imports come from `playwright-core` (`Page`, `BrowserContext`,
  `APIRequestContext`); `TestInfo` comes from `./harness`.
- `test.describe.configure({ mode: "serial" })` and `describe.serial` remain
  valid spellings (no-ops — node:test is serial within a file).
- `test.skip(condition, message)` works in test bodies; a file-scope skip needs
  manual conversion.
- `test.setTimeout(ms)` works in bodies and hooks.
- The `request` fixture and `page.request` are Playwright-native and share the
  context's cookies and baseURL.
