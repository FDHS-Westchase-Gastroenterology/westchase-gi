import { createHash, randomUUID } from "node:crypto";

import { test, expect } from "@playwright/test";

import {
  INTAKE_RATE_LIMIT,
  REQUEST_FIELD_LIMITS,
  intakeResponseSchema,
} from "../../src/lib/portal/contracts";
import { serviceDb } from "../harness/env";
import { PATIENT_PHONE } from "./support";

test.use({ trace: "off" });

test.describe("Intake persistence, the shared rate limit, and field caps", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "The dependency contract runs once.");
  });

  test("persists an intake row and resolves its PostgREST relationship", async ({ request }) => {
    const token = randomUUID().slice(0, 8);
    const sourcePath = `/e2e/supabase-dependency/${token}`;
    const response = await request.post("/api/requests", {
      data: {
        name: `TEST Supabase ${token}`,
        phone: PATIENT_PHONE,
        email: `supabase-${token}@example.test`,
        location: "tampa",
        time: "morning",
        message: "TEST dependency contract — no medical details.",
        locale: "en",
        sourcePath,
      },
      headers: { "X-Forwarded-For": `2001:db8:${token.slice(0, 4)}::9` },
    });
    expect(response.status()).toBe(201);
    const body = intakeResponseSchema.parse(await response.json());
    expect(body.ok).toBe(true);
    if (!body.ok) throw new Error("Intake API did not return a request id");

    const db = serviceDb();
    try {
      const event = await db.from("request_events").insert({
        request_id: body.id,
        type: "dependency-contract",
        status: "recorded",
      });
      expect(event.error).toBeNull();

      const joined = await db
        .from("requests")
        .select("id, source_path, status, request_events(id, type, status)")
        .eq("id", body.id)
        .single();
      expect(joined.error).toBeNull();
      expect(joined.data).toMatchObject({
        id: body.id,
        source_path: sourcePath,
        status: "new",
      });
      // Intake itself records a `created` event (workflow authority migration),
      // Plus the event this test inserted through PostgREST. Delivery events may
      // Also exist when a recipient is active; they are valid children and do
      // Not change the relationship contract under test.
      expect(joined.data?.request_events).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ type: "created", status: "recorded" }),
          expect.objectContaining({
            type: "dependency-contract",
            status: "recorded",
          }),
        ]),
      );
    } finally {
      await db.from("requests").delete().eq("id", body.id);
    }
  });

  test("shares one atomic intake limit across fresh service clients and expiry", async () => {
    const claim = async (hash: string, limit: number, windowSeconds: number): Promise<boolean> => {
      const result = await serviceDb().rpc("portal_check_intake_rate_limit", {
        p_client_hash: hash,
        p_limit: limit,
        p_window_seconds: windowSeconds,
      });
      expect(result.error).toBeNull();
      return result.data === true;
    };
    const hash = (label: string) =>
      createHash("sha256").update(`${randomUUID()}:${label}`).digest("hex");

    const restartHash = hash("restart");
    await expect(claim(restartHash, 2, 1)).resolves.toBe(true);
    await expect(claim(restartHash, 2, 1)).resolves.toBe(true);
    await expect(claim(restartHash, 2, 1)).resolves.toBe(false);
    await new Promise((resolve) => {
      setTimeout(resolve, 1_100);
    });
    await expect(claim(restartHash, 2, 1)).resolves.toBe(true);

    const concurrentHash = hash("concurrent");
    const claims = await Promise.all(
      Array.from({ length: INTAKE_RATE_LIMIT.limit + 3 }, async () =>
        claim(concurrentHash, INTAKE_RATE_LIMIT.limit, INTAKE_RATE_LIMIT.windowSeconds),
      ),
    );
    expect(claims.filter(Boolean)).toHaveLength(INTAKE_RATE_LIMIT.limit);
    expect(claims.filter((allowed) => !allowed)).toHaveLength(3);
  });

  test("enforces intake field caps at the database boundary", async () => {
    const base = {
      name: "TEST database cap",
      phone: PATIENT_PHONE,
      email: "database-cap@example.test",
      location: "tampa",
      preferred_time: "morning",
      message: null,
      locale: "en",
      source_path: "/e2e/database-field-cap",
    };
    const oversized = [
      { ...base, name: "N".repeat(REQUEST_FIELD_LIMITS.name + 1) },
      { ...base, phone: "8".repeat(REQUEST_FIELD_LIMITS.phone + 1) },
      { ...base, email: "e".repeat(REQUEST_FIELD_LIMITS.email + 1) },
    ];

    for (const row of oversized) {
      const result = await serviceDb().from("requests").insert(row);
      expect(result.error?.code).toBe("23514");
    }
  });
});
