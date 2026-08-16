import { createHash, createHmac, randomUUID } from "node:crypto";
import { test, expect } from "@playwright/test";
import { en } from "../src/lib/dictionaries/en";
import {
  INTAKE_RATE_LIMIT,
  REQUEST_FIELD_LIMITS,
  intakeResponseSchema,
} from "../src/lib/portal/contracts";
import { requiredEnv, serviceDb } from "./support";

type IntakeFixture = Partial<ReturnType<typeof validPayload>> & {
  company?: string;
};

const db = serviceDb();

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
    email: `intake+${token}@example.test`,
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
    const body = intakeResponseSchema.parse(await response.json());
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

  test("VAL-INTAKE-001b: email is optional — empty email persists as null", async ({
    request,
  }) => {
    const payload = { ...validPayload(`${sourcePrefix}/no-email`), email: "" };
    const response = await request.post("/api/requests", {
      data: payload,
      headers: { "X-Forwarded-For": testIp("no-email") },
    });

    expect([200, 201]).toContain(response.status());
    const body = intakeResponseSchema.parse(await response.json());
    expect(body.ok).toBe(true);
    if (!body.ok) throw new Error("Expected an accepted intake response");

    const { data: row, error } = await db
      .from("requests")
      .select("id, email")
      .eq("id", body.id)
      .single();

    expect(error).toBeNull();
    expect(row).toEqual({ id: body.id, email: null });
  });

  test("stores a keyed client bucket instead of a plain address digest", async ({
    request,
  }) => {
    const clientIp = testIp("hmac-storage");
    const payload = validPayload(`${sourcePrefix}/hmac-storage`);
    const response = await request.post("/api/requests", {
      data: payload,
      headers: { "X-Forwarded-For": clientIp },
    });
    expect(response.status()).toBe(201);

    const expectedHash = createHmac(
      "sha256",
      requiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
    )
      .update("wgi:intake-rate-limit:client:v1\0")
      .update(clientIp.toLowerCase())
      .digest("hex");
    const plainHash = createHash("sha256")
      .update(clientIp.toLowerCase())
      .digest("hex");
    expect(expectedHash).not.toBe(plainHash);

    const expectedProbe = await db.rpc("portal_check_intake_rate_limit", {
      p_client_hash: expectedHash,
      p_limit: 1,
      p_window_seconds: INTAKE_RATE_LIMIT.windowSeconds,
    });
    expect(expectedProbe.error).toBeNull();
    expect(expectedProbe.data).toBe(false);

    const plainProbe = await db.rpc("portal_check_intake_rate_limit", {
      p_client_hash: plainHash,
      p_limit: 1,
      p_window_seconds: INTAKE_RATE_LIMIT.windowSeconds,
    });
    expect(plainProbe.error).toBeNull();
    expect(plainProbe.data).toBe(true);
  });

  test("VAL-INTAKE-003: server validation rejects bad input", async ({
    request,
  }) => {
    const invalidCases: Array<{
      field: "name" | "phone" | "email" | "message";
      makePayload: (sourcePath: string) => IntakeFixture;
    }> = [
      {
        field: "name",
        makePayload(sourcePath) {
          const payload: IntakeFixture = validPayload(sourcePath);
          delete payload.name;
          return payload;
        },
      },
      {
        field: "phone",
        makePayload(sourcePath) {
          const payload: IntakeFixture = validPayload(sourcePath);
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
      ...[
        "patient@example.com?subject=Injected",
        "patient@example.com%3Fsubject%3DInjected",
        "patient@example.com\r\nBcc:other@example.com",
        "patient@example.com%0D%0ABcc%3Aother%40example.com",
        "first@example.com,second@example.com",
        "first@example.com;second@example.com",
        `${"a".repeat(255)}@example.test`,
      ].map((email) => ({
        field: "email" as const,
        makePayload: (sourcePath: string) => ({
          ...validPayload(sourcePath),
          email,
        }),
      })),
      {
        field: "phone",
        makePayload: (sourcePath) => ({
          ...validPayload(sourcePath),
          phone: "555-0101",
        }),
      },
      {
        field: "name",
        makePayload: (sourcePath) => ({
          ...validPayload(sourcePath),
          name: "N".repeat(REQUEST_FIELD_LIMITS.name + 1),
        }),
      },
      {
        field: "phone",
        makePayload: (sourcePath) => ({
          ...validPayload(sourcePath),
          phone: "8".repeat(REQUEST_FIELD_LIMITS.phone + 1),
        }),
      },
      {
        field: "message",
        makePayload: (sourcePath) => ({
          ...validPayload(sourcePath),
          message: "M".repeat(REQUEST_FIELD_LIMITS.message + 1),
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
      const body = intakeResponseSchema.parse(await response.json());
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
    const body = intakeResponseSchema.parse(await response.json());
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

  test("no-JS success requires one patient-free, one-time receipt", async ({
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
    const receiptToken = receiptUrl.searchParams.get("receipt");
    expect(receiptUrl.pathname).toBe("/en/appointment/received");
    expect(receiptUrl.searchParams.get("status")).toBeNull();
    expect(receiptToken).toMatch(
      /^[0-9a-f-]{36}\.[A-Za-z0-9_-]{43}$/,
    );
    expect(location).not.toContain(payload.name);
    expect(location).not.toContain(payload.phone);
    expect(location).not.toContain(payload.email);
    expect(location).not.toContain(payload.message);

    await expect(
      countRows("requests", "source_path", payload.sourcePath),
    ).resolves.toBe(1);

    const claims = await Promise.all([
      request.get(location),
      request.get(location),
    ]);
    const bodies = await Promise.all(claims.map((claim) => claim.text()));
    expect(
      bodies.every((body) =>
        body.includes('<meta name="referrer" content="no-referrer"/>'),
      ),
    ).toBe(true);
    const renderedHeading = (body: string) =>
      body
        .match(/<h1[^>]*>([^<]+)<\/h1>/)?.[1]
        ?.replaceAll("&#x27;", "'");
    expect(bodies.map(renderedHeading).sort()).toEqual(
      [
        en.appointment.form.unknownHeading,
        en.requestReceipt.successHeading,
      ].sort(),
    );
    expect(renderedHeading(await (await request.get(location)).text())).toBe(
      en.appointment.form.unknownHeading,
    );

    for (const directPath of [
      "/en/appointment/received?status=success",
      "/en/appointment/received?receipt=malformed",
    ]) {
      expect(renderedHeading(await (await request.get(directPath)).text())).toBe(
        en.appointment.form.unknownHeading,
      );
    }

    const [eventId] = receiptToken!.split(".");
    const { data: event, error: eventError } = await db
      .from("request_events")
      .select("status")
      .eq("id", eventId)
      .single();
    expect(eventError).toBeNull();
    expect(event?.status).toBe("consumed");

    const failedPayload = {
      ...validPayload(`${sourcePrefix}/no-js-failed`),
      phone: "555",
    };
    const failed = await request.post("/api/requests/form", {
      form: failedPayload,
      headers: { "X-Forwarded-For": testIp("no-js-failed") },
      maxRedirects: 0,
    });
    const failedUrl = new URL(failed.headers().location);
    expect(failedUrl.searchParams.get("receipt")).toBeNull();
    expect(failedUrl.searchParams.get("failure")).toBe("1");
    expect(
      renderedHeading(await (await request.get(failedUrl.toString())).text()),
    ).toBe(en.requestReceipt.failureHeading);

    const honeypotPayload = {
      ...validPayload(`${sourcePrefix}/no-js-honeypot`),
      company: "Example Company",
    };
    const honeypot = await request.post("/api/requests/form", {
      form: honeypotPayload,
      headers: { "X-Forwarded-For": testIp("no-js-honeypot") },
      maxRedirects: 0,
    });
    const honeypotUrl = new URL(honeypot.headers().location);
    expect(honeypotUrl.searchParams.get("receipt")).toMatch(
      /^[0-9a-f-]{36}\.[A-Za-z0-9_-]{43}$/,
    );
    expect(
      renderedHeading(
        await (await request.get(honeypotUrl.toString())).text(),
      ),
    ).toBe(en.appointment.form.unknownHeading);

    await expect(
      countRows("requests", "source_path", `${sourcePrefix}/no-js-%`),
    ).resolves.toBe(0);
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
      const body = intakeResponseSchema.parse(await response.json());

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
