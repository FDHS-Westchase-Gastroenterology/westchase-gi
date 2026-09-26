import { randomUUID } from "node:crypto";

import { expect } from "@playwright/test";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { savePatient } from "./patients";
import { createSchedulingFixture } from "./scheduling";

const requestSchema = z.object({
  id: z.uuid(),
  status: z.string(),
  version: z.number(),
  appointment_at: z.string().nullable(),
  follow_up_at: z.string().nullable(),
});

export async function readHandoffRequest(db: SupabaseClient, id: string) {
  const result = await db
    .from("requests")
    .select("id,status,version,appointment_at,follow_up_at")
    .eq("id", id)
    .single();
  expect(result.error).toBeNull();
  return requestSchema.parse(result.data);
}

export async function createHandoffFixture(db: SupabaseClient, prefix: string) {
  const fixture = await createSchedulingFixture(db, prefix);
  const requestIds: string[] = [];
  async function dispose() {
    if (requestIds.length > 0) {
      const removed = await db.from("requests").delete().in("id", requestIds);
      expect(removed.error).toBeNull();
    }
    await fixture.dispose();
  }
  async function addRequest(patientIndex = 0) {
    const requestId = randomUUID();
    requestIds.push(requestId);
    const inserted = await db.from("requests").insert({
      id: requestId,
      name: `TEST ${prefix} patient`,
      phone: "8135550100",
      email: `${prefix}-${requestId}@example.test`,
      locale: "en",
      location: "any",
      preferred_time: "any",
      source_path: "/e2e/appointment-handoff",
    });
    expect(inserted.error).toBeNull();
    const patient = await db
      .from("patients")
      .select("version")
      .eq("id", fixture.patientIds[patientIndex])
      .single();
    expect(patient.error).toBeNull();
    const version = z.object({ version: z.number() }).parse(patient.data).version;
    expect(
      await savePatient(db, fixture.staff.userId, {
        kind: "link_request",
        patientId: fixture.patientIds[patientIndex],
        expectedVersion: version,
        requestId,
      }),
    ).toMatchObject({ ok: true });
    return requestId;
  }
  try {
    const requestId = await addRequest();
    function booking(time = "10:00") {
      const input = fixture.booking(time);
      return {
        ...input,
        command: { ...input.command, sourceRequestId: requestId, requestVersion: 1 },
      };
    }
    return { ...fixture, requestId, addRequest, booking, dispose };
  } catch (error) {
    await dispose();
    throw error;
  }
}
