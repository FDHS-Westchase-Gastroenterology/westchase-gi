import { test, expect } from "@playwright/test";

/* Every response carries the security headers from next.config.ts, and
   src/proxy.ts runs after them, so the admin subtree keeps its stricter
   Referrer-Policy. Each row is a raw response (no redirects followed) of a
   different kind: a page, the localized 404, a metadata route, a /public
   file, a route handler, the proxy's locale and sign-in redirects, and an
   admin page. The status pins the kind, so a row cannot pass by landing
   somewhere else. */

const SENT_EVERYWHERE = {
  "strict-transport-security": "max-age=63072000; includeSubDomains",
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
  "content-security-policy": "frame-ancestors 'none'",
  "permissions-policy": "camera=(), microphone=(), geolocation=()",
} as const;

const PUBLIC_REFERRER_POLICY = "strict-origin-when-cross-origin";
const ADMIN_REFERRER_POLICY = "no-referrer";

interface ResponseRow {
  readonly path: string;
  readonly status: number;
  readonly referrerPolicy: string;
}

const ROWS: readonly ResponseRow[] = [
  { path: "/en", status: 200, referrerPolicy: PUBLIC_REFERRER_POLICY },
  { path: "/en/does-not-exist", status: 404, referrerPolicy: PUBLIC_REFERRER_POLICY },
  { path: "/robots.txt", status: 200, referrerPolicy: PUBLIC_REFERRER_POLICY },
  {
    path: "/images/brand/favicon-fdhs-32.png",
    status: 200,
    referrerPolicy: PUBLIC_REFERRER_POLICY,
  },
  { path: "/api/preview-environment", status: 404, referrerPolicy: PUBLIC_REFERRER_POLICY },
  { path: "/", status: 307, referrerPolicy: PUBLIC_REFERRER_POLICY },
  { path: "/admin", status: 307, referrerPolicy: ADMIN_REFERRER_POLICY },
  { path: "/admin/login", status: 200, referrerPolicy: ADMIN_REFERRER_POLICY },
];

// The dev server compiles each route on its first request.
const FIRST_COMPILE_MS = 120_000;

test.describe("security headers on every response", () => {
  test.describe.configure({ timeout: FIRST_COMPILE_MS });

  for (const row of ROWS) {
    test(`${row.path} (${String(row.status)})`, async ({ request }) => {
      const response = await request.get(row.path, {
        maxRedirects: 0,
        timeout: FIRST_COMPILE_MS,
      });
      expect(response.status()).toBe(row.status);

      const headers = response.headers();
      for (const [name, value] of Object.entries(SENT_EVERYWHERE)) {
        expect(headers[name], name).toBe(value);
      }
      expect(headers["referrer-policy"], "referrer-policy").toBe(row.referrerPolicy);
    });
  }
});
