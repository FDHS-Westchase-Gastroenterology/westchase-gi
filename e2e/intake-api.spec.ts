import { createHash, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import {
  INTAKE_RATE_LIMIT,
  type IntakeResponse,
} from "../src/lib/portal/contracts";

function loadLocalEnv() {
  const contents = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");

  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const separator = line.indexOf("=");
    if (separator < 1) continue;

    const key = line.slice(0, separator).replace(/^export\s+/, "").trim();
    let value = line.slice(separator + 1).trim();
    const quote = value[0];
    if (
      (quote === `"` || quote === `'`) &&
      value.endsWith(quote)
    ) {
      value = value.slice(1, -1);
    }

    if (process.env[key] === undefined) process.env[key] = value;
  }
}

function requiredEnv(...names: string[]): string {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }

  throw new Error(`Missing test environment: ${names.join(" or ")}`);
}

loadLocalEnv();

const db = createClient(
  requiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
  requiredEnv("SUPABASE_SECRET_KEY", "SUPABASE_SERVICE_ROLE_KEY"),
  {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  },
);

const runId = randomUUID().replaceAll("-", "");
const sourcePrefix = `/e2e/intake-api/${runId}`;

function testIp(label: string): string {
  const hex = createHash("sha256")
    .update(`${runId}:${label}`)
    .digest("hex");
  return `2001:db8:${hex.slice(0, 4)}:${hex.slice(4, 8)}::1`;
}

function validPayload(sourcePath: string) {
  const token = randomUUID().slice(0, 8);
  return {
    name: `TEST Intake ${token}`,
    phone: "8135550101",
    email: `intake-${token}@example.test`,
    location: "tampa",
    time: "morning",
    message: "TEST submission only — no medical details.",
    locale: "en",
    sourcePath,
  };
}

async function countRows(table: string, column: string, pattern: string) {
  const { count, error } = await db
    .from(table)
    .select("id", { count: "exact", head: true })
    .like(column, pattern);

  expect(error).toBeNull();
  return count ?? 0;
}

test.describe("intake API contract", () => {
  test.describe.configure({ mode: "serial" });

  let enabled = false;
  let recipientState: Array<{ id: string; active: boolean }> = [];

  test.beforeAll(async ({}, workerInfo) => {
    enabled = workerInfo.project.name === "chromium";
    if (!enabled) return;

    const { data, error } = await db
      .from("notification_recipients")
      .select("id, active");
    expect(error).toBeNull();
    recipientState = data ?? [];

    if (recipientState.length > 0) {
      const { error: disableError } = await db
        .from("notification_recipients")
        .update({ active: false })
        .in(
          "id",
          recipientState.map((recipient) => recipient.id),
        );
      expect(disableError).toBeNull();
    }
  });

  test.beforeEach(async ({}, testInfo) => {
    test.skip(
      testInfo.project.name !== "chromium",
      "The API contract is browser-independent and runs once.",
    );
  });

  test.afterAll(async () => {
    if (!enabled) return;

    const cleanup = await db
      .from("requests")
      .delete()
      .like("source_path", `${sourcePrefix}%`);

    const restoreResults = await Promise.all(
      recipientState.map((recipient) =>
        db
          .from("notification_recipients")
          .update({ active: recipient.active })
          .eq("id", recipient.id),
      ),
    );

    expect(cleanup.error).toBeNull();
    for (const result of restoreResults) {
      expect(result.error).toBeNull();
    }
  });

  test("VAL-INTAKE-001: valid POST persists durably", async ({
    request,
  }) => {
    const payload = validPayload(`${sourcePrefix}/valid`);
    const response = await request.post("/api/requests", {
      data: payload,
      headers: { "X-Forwarded-For": testIp("valid") },
    });

    expect([200, 201]).toContain(response.status());
    const body = (await response.json()) as IntakeResponse;
    expect(body.ok).toBe(true);
    if (!body.ok) throw new Error("Expected an accepted intake response");

    const { data: row, error } = await db
      .from("requests")
      .select(
        "id, name, phone, email, location, preferred_time, message, locale, source_path, status",
      )
      .eq("id", body.id)
      .single();

    expect(error).toBeNull();
    expect(row).toEqual({
      id: body.id,
      name: payload.name,
      phone: payload.phone,
      email: payload.email,
      location: payload.location,
      preferred_time: payload.time,
      message: payload.message,
      locale: payload.locale,
      source_path: payload.sourcePath,
      status: "new",
    });
  });

  test("VAL-INTAKE-003: server validation rejects bad input", async ({
    request,
  }) => {
    const invalidCases: Array<{
      field: "name" | "phone" | "email";
      makePayload: (sourcePath: string) => Record<string, unknown>;
    }> = [
      {
        field: "name",
        makePayload(sourcePath) {
          const payload: Record<string, unknown> = validPayload(sourcePath);
          delete payload.name;
          return payload;
        },
      },
      {
        field: "phone",
        makePayload(sourcePath) {
          const payload: Record<string, unknown> = validPayload(sourcePath);
          delete payload.phone;
          return payload;
        },
      },
      {
        field: "email",
        makePayload: (sourcePath) => ({
          ...validPayload(sourcePath),
          email: "not-an-email",
        }),
      },
      {
        field: "phone",
        makePayload: (sourcePath) => ({
          ...validPayload(sourcePath),
          phone: "555-0101",
        }),
      },
    ];

    for (const [index, invalidCase] of invalidCases.entries()) {
      const sourcePath = `${sourcePrefix}/validation/${index}`;
      const response = await request.post("/api/requests", {
        data: invalidCase.makePayload(sourcePath),
        headers: {
          "X-Forwarded-For": testIp(`validation-${index}`),
        },
      });

      expect(response.status()).toBe(400);
      const body = (await response.json()) as IntakeResponse;
      expect(body.ok).toBe(false);
      if (body.ok) throw new Error("Expected a validation failure");
      expect(body.code).toBe("validation");
      expect(body.fieldErrors).toHaveProperty(invalidCase.field);
    }

    await expect(
      countRows(
        "requests",
        "source_path",
        `${sourcePrefix}/validation/%`,
      ),
    ).resolves.toBe(0);
  });

  test("VAL-INTAKE-004: honeypot silently drops bots", async ({
    request,
  }) => {
    const payload = {
      ...validPayload(`${sourcePrefix}/honeypot`),
      company: "Example Company",
    };
    const response = await request.post("/api/requests", {
      data: payload,
      headers: { "X-Forwarded-For": testIp("honeypot") },
    });

    expect([200, 201]).toContain(response.status());
    const body = (await response.json()) as IntakeResponse;
    expect(body.ok).toBe(true);
    if (!body.ok) throw new Error("Expected a success-shaped honeypot response");

    await expect(
      countRows(
        "requests",
        "source_path",
        `${sourcePrefix}/honeypot`,
      ),
    ).resolves.toBe(0);
    await expect(
      countRows("request_events", "request_id", body.id),
    ).resolves.toBe(0);
  });

  test("no-JS form POST uses a patient-data-free receipt URL", async ({
    request,
  }) => {
    const payload = validPayload(`${sourcePrefix}/no-js`);
    const response = await request.post("/api/requests/form", {
      form: payload,
      headers: { "X-Forwarded-For": testIp("no-js") },
      maxRedirects: 0,
    });

    expect(response.status()).toBe(303);
    const location = response.headers().location;
    expect(location).toBeTruthy();
    const receiptUrl = new URL(location);
    expect(receiptUrl.pathname).toBe("/en/appointment/received");
    expect(receiptUrl.searchParams.get("status")).toBe("success");
    expect(location).not.toContain(payload.name);
    expect(location).not.toContain(payload.phone);
    expect(location).not.toContain(payload.email);
    expect(location).not.toContain(payload.message);

    await expect(
      countRows("requests", "source_path", payload.sourcePath),
    ).resolves.toBe(1);
  });

  test("VAL-INTAKE-005: rate limiting stops rows at the cap", async ({
    request,
  }) => {
    const pinnedIp = testIp("rate-limit");

    for (let index = 0; index <= INTAKE_RATE_LIMIT.limit; index += 1) {
      const response = await request.post("/api/requests", {
        data: validPayload(`${sourcePrefix}/rate/${index}`),
        headers: { "X-Forwarded-For": pinnedIp },
      });
      const body = (await response.json()) as IntakeResponse;

      if (index < INTAKE_RATE_LIMIT.limit) {
        expect([200, 201]).toContain(response.status());
        expect(body.ok).toBe(true);
      } else {
        expect(response.status()).toBe(429);
        expect(body).toEqual({ ok: false, code: "rate_limited" });
      }
    }

    await expect(
      countRows("requests", "source_path", `${sourcePrefix}/rate/%`),
    ).resolves.toBe(INTAKE_RATE_LIMIT.limit);
  });
});
