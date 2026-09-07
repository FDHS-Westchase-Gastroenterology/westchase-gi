import { createHmac, randomUUID } from "node:crypto";

import { expect } from "@playwright/test";
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  schedulingCommandOutcomeSchema,
  schedulingInputSchema,
} from "../../src/lib/portal/scheduling/contracts";
import type { SchedulingInput } from "../../src/lib/portal/scheduling/contracts";
import { resolveAppointmentStart } from "../../src/lib/portal/scheduling/time";
import { removePatients, savePatient } from "./patients";
import { createStaffFixture } from "./session";

type SchedulingWrite = Extract<SchedulingInput, { action: "configure" | "command" }>;

export async function saveScheduling(
  db: SupabaseClient,
  actorId: string,
  input: Readonly<SchedulingWrite>,
) {
  const parsed = schedulingInputSchema.parse(input);
  if (parsed.action !== "configure" && parsed.action !== "command")
    throw new Error("Expected a scheduling command");
  let command;
  if (parsed.command.kind === "book" || parsed.command.kind === "reschedule") {
    const { start, ...fields } = parsed.command;
    const startsAt = resolveAppointmentStart(start);
    if (startsAt === null) throw new Error("Invalid fixture time");
    command = { ...fields, startsAt };
  } else if (parsed.command.kind === "cancel") {
    const { callAgainOn, ...fields } = parsed.command;
    command = {
      ...fields,
      callAgainAt:
        callAgainOn === null ? null : resolveAppointmentStart({ date: callAgainOn, time: "08:00" }),
    };
  } else command = parsed.command;
  const result = await db.rpc(
    parsed.action === "configure"
      ? "portal_save_scheduling_config"
      : "portal_execute_appointment_command",
    {
      p_actor_id: actorId,
      p_idempotency_key: parsed.idempotencyKey,
      p_fingerprint: createHmac("sha256", "TEST scheduling acceptance fixture")
        .update(JSON.stringify({ actorId, action: parsed.action, command: parsed.command }))
        .digest("hex"),
      p_command: command,
    },
  );
  expect(result.error).toBeNull();
  return schedulingCommandOutcomeSchema.parse(result.data);
}

export function schedulingFixtureDate(days = 14) {
  return new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
}

export async function createSchedulingFixture(db: SupabaseClient, prefix: string) {
  const staff = await createStaffFixture(db, {
    prefix,
    displayName: "TEST Scheduling Admin",
    role: "admin",
  });
  const patientIds: string[] = [];
  const providerIds: string[] = [];
  const locationIds: string[] = [];
  const typeIds: string[] = [];
  async function dispose() {
    const appointments = await db.from("appointments").delete().eq("created_by", staff.userId);
    expect(appointments.error).toBeNull();
    for (const table of ["scheduling_providers", "appointment_types", "scheduling_locations"]) {
      const removed = await db.from(table).delete().eq("created_by", staff.userId);
      expect(removed.error).toBeNull();
    }
    await removePatients(db, patientIds);
    const audits = await db.from("audit_log").delete().eq("actor_email", staff.email);
    expect(audits.error).toBeNull();
    await staff.dispose();
  }
  async function save(input: Readonly<SchedulingWrite>) {
    return saveScheduling(db, staff.userId, input);
  }
  try {
    for (const label of ["First", "Second"]) {
      const patient = await savePatient(db, staff.userId, {
        kind: "create",
        patient: { name: `TEST ${prefix} ${label}` },
      });
      if (!patient.ok) throw new Error("Scheduling patient fixture failed");
      patientIds.push(patient.patientId);
      const location = await save({
        action: "configure",
        idempotencyKey: randomUUID(),
        command: { kind: "save_location", name: `TEST ${prefix} ${label}` },
      });
      if (!location.ok) throw new Error("Scheduling location fixture failed");
      locationIds.push(location.id);
    }
    const type = await save({
      action: "configure",
      idempotencyKey: randomUUID(),
      command: {
        kind: "save_appointment_type",
        name: `TEST ${prefix} Visit`,
        durationMinutes: 30,
        bufferBeforeMinutes: 5,
        bufferAfterMinutes: 5,
      },
    });
    if (!type.ok) throw new Error("Scheduling type fixture failed");
    const typeId = type.id;
    typeIds.push(typeId);
    const hours = locationIds.flatMap((locationId) =>
      Array.from({ length: 7 }, (_, weekday) => ({
        locationId,
        weekday,
        openMinute: 480,
        closeMinute: 1080,
        validFrom: "2026-01-01",
        validTo: null,
      })),
    );
    for (const label of ["First", "Second"]) {
      const provider = await save({
        action: "configure",
        idempotencyKey: randomUUID(),
        command: {
          kind: "save_provider",
          name: `TEST ${prefix} ${label}`,
          hours,
          exceptions: [],
        },
      });
      if (!provider.ok) throw new Error("Scheduling provider fixture failed");
      providerIds.push(provider.id);
    }
    function booking(time = "10:00", patientIndex = 0, providerIndex = 0, locationIndex = 0) {
      return {
        action: "command",
        idempotencyKey: randomUUID(),
        command: {
          kind: "book",
          patientId: patientIds[patientIndex],
          providerId: providerIds[providerIndex],
          locationId: locationIds[locationIndex],
          appointmentTypeId: typeId,
          expectedTypeVersion: 1,
          start: { date: schedulingFixtureDate(), time },
        },
      } as const;
    }
    return { staff, patientIds, providerIds, locationIds, typeId, hours, save, booking, dispose };
  } catch (error) {
    await dispose();
    throw error;
  }
}
