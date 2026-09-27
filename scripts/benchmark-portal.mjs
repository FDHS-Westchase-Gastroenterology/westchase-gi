/** Controlled, serial Preview benchmark. See performance/README.md before running. */
import { randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { parseArgs } from "node:util";

import { chromium } from "@playwright/test";

import { loadLocalEnv, serviceDb } from "../e2e/harness/env.ts";
import { createStaffFixture, signIn } from "../e2e/harness/session.ts";
import { assertSafeE2ETarget } from "../e2e/harness/target-guard.ts";
import { capturePerformanceSource } from "./portal-performance-source.mjs";

const { values } = parseArgs({
  options: {
    origin: { type: "string" },
    output: { type: "string" },
    samples: { type: "string", default: "20" },
    configuration: { type: "boolean", default: false },
    "confirm-target": { type: "string" },
  },
});
loadLocalEnv();
assertSafeE2ETarget(process.env);
const origin = new URL(values.origin ?? "");
if (origin.protocol !== "http:" || origin.hostname !== "localhost" || origin.pathname !== "/") {
  throw new Error("Benchmark requires a localhost production build");
}
const projectRef = process.env.SUPABASE_BRANCH_PROJECT_REF;
if (!projectRef || values["confirm-target"] !== projectRef)
  throw new Error("Confirm Preview target");
const samples = Number(values.samples);
if (!Number.isInteger(samples) || samples < 1 || samples > 50) throw new Error("Use 1–50 samples");
if (!values.output) throw new Error("An output path is required");
const output = resolve(values.output);
const attestation = await fetch(new URL("/api/preview-environment", origin)).then((r) => r.json());
if (!attestation.ok || !attestation.schemaCompatible || attestation.projectRef !== projectRef) {
  throw new Error("Application Preview attestation failed");
}
const run = randomUUID().slice(0, 8);
const observations = [];
const metadata = {
  startedAt: new Date().toISOString(),
  source: capturePerformanceSource(),
  projectRef,
  run,
  samples,
  warmups: 2,
  suite: values.configuration ? "configuration-and-links" : "core",
  concurrency: 1,
  runtime: "local next start; remote Preview Supabase",
  viewport: "1440x900",
  percentileMethod: "nearest rank; warmups excluded; success and failure separate",
  completed: false,
  fixtureAccountRetired: false,
};
function save() {
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, JSON.stringify({ metadata, observations }, null, 2) + "\n");
}
function record(operation, iteration, durationMs, ok, status = 200) {
  observations.push({
    operation,
    phase: iteration < 2 ? "warmup" : "measured",
    duration_ms: Math.round(durationMs * 100) / 100,
    ok,
    status,
  });
  save();
}
const db = serviceDb();
let staff = null;
const browser = await chromium.launch({ channel: "chrome", headless: true });
metadata.browser = browser.version();
const context = await browser.newContext({
  baseURL: origin.origin,
  viewport: { width: 1440, height: 900 },
});
const page = await context.newPage();
page.setDefaultTimeout(30_000);
async function api(operation, path, body, iteration, expectedOk = true) {
  const result = await page.evaluate(
    async ({ path, body }) => {
      const start = performance.now();
      const response = await fetch(
        path,
        body === null
          ? { cache: "no-store" }
          : {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify(body),
            },
      );
      const data = await response.json();
      return { data, status: response.status, duration: performance.now() - start };
    },
    { path, body },
  );
  record(operation, iteration, result.duration, result.data.ok === true, result.status);
  if (result.data.ok !== expectedOk)
    throw new Error(`${operation}: ${result.status}/${result.data.code ?? "unexpected result"}`);
  return result.data;
}
const command = (value) => ({ action: "command", idempotencyKey: randomUUID(), command: value });
const patientCommand = (value) => ({ idempotencyKey: randomUUID(), command: value });
const schedule = (op, body, i) => api(`scheduling.${op}`, "/api/admin/scheduling", body, i);
const billing = (op, body, i) => api(`billing.${op}`, "/api/admin/billing", body, i);
const clinical = (op, body, i) => api(`clinical.${op}`, "/api/admin/clinical", body, i);
const patient = (op, body, i) => api(`patients.${op}`, "/api/admin/patients", body, i);
const content = {
  kind: "note",
  title: "Synthetic performance record",
  noteText: "Fictional benchmark only.",
};
let signerVersion = 0;
try {
  staff = await createStaffFixture(db, {
    prefix: "performance",
    displayName: `Benchmark ${run}`,
    role: "admin",
  });
  await signIn(page, staff);
  const enabled = await clinical(
    "set_signer",
    command({ kind: "set_signer", userId: staff.userId, expectedVersion: 0, enabled: true }),
    0,
  );
  signerVersion = enabled.version;
  let location = await schedule(
    "save_location",
    {
      action: "configure",
      idempotencyKey: randomUUID(),
      command: { kind: "save_location", name: `Benchmark ${run}` },
    },
    0,
  );
  let type = await schedule(
    "save_appointment_type",
    {
      action: "configure",
      idempotencyKey: randomUUID(),
      command: { kind: "save_appointment_type", name: `Benchmark ${run}`, durationMinutes: 30 },
    },
    0,
  );
  const day = new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10);
  const hours = Array.from({ length: 7 }, (_, weekday) => ({
    weekday,
    locationId: location.id,
    openMinute: 480,
    closeMinute: 1080,
    validFrom: day,
    validTo: null,
  }));
  let provider = await schedule(
    "save_provider",
    {
      action: "configure",
      idempotencyKey: randomUUID(),
      command: { kind: "save_provider", name: `Benchmark ${run}`, hours, exceptions: [] },
    },
    0,
  );
  const fixtureClock = Date.now();
  for (let i = 0; i < samples + 2; i += 1) {
    if (values.configuration) {
      location = await schedule(
        "save_location",
        {
          action: "configure",
          idempotencyKey: randomUUID(),
          command: {
            kind: "save_location",
            id: location.id,
            expectedVersion: location.version,
            name: `Benchmark ${run} ${i}`,
          },
        },
        i,
      );
      type = await schedule(
        "save_appointment_type",
        {
          action: "configure",
          idempotencyKey: randomUUID(),
          command: {
            kind: "save_appointment_type",
            id: type.id,
            expectedVersion: type.version,
            name: `Benchmark ${run} ${i}`,
            durationMinutes: 30,
          },
        },
        i,
      );
      provider = await schedule(
        "save_provider",
        {
          action: "configure",
          idempotencyKey: randomUUID(),
          command: {
            kind: "save_provider",
            id: provider.id,
            expectedVersion: provider.version,
            name: `Benchmark ${run} ${i}`,
            hours,
            exceptions: [],
          },
        },
        i,
      );
      const signer = await clinical(
        "set_signer",
        command({
          kind: "set_signer",
          userId: staff.userId,
          expectedVersion: signerVersion,
          enabled: i % 2 === 1,
        }),
        i,
      );
      signerVersion = signer.version;
      const patientFixture = await patient(
        "create",
        patientCommand({ kind: "create", patient: { name: `Benchmark link ${run} ${i}` } }),
        -1,
      );
      const requestId = randomUUID();
      const staged = await db.from("requests").insert({
        id: requestId,
        name: `Benchmark link ${run} ${i}`,
        phone: "8135550199",
        location: "tampa",
        preferred_time: "morning",
        locale: "en",
        source_path: `/performance/${run}`,
        status: "closed",
        closure_reason: "not_actionable",
        closed_at: new Date().toISOString(),
      });
      if (staged.error) throw new Error(`Request fixture: ${staged.error.code}`);
      const linked = await patient(
        "link_request",
        patientCommand({
          kind: "link_request",
          patientId: patientFixture.patientId,
          expectedVersion: patientFixture.version,
          requestId,
        }),
        i,
      );
      const unlinked = await patient(
        "unlink_request",
        patientCommand({
          kind: "unlink_request",
          patientId: patientFixture.patientId,
          expectedVersion: linked.version,
          requestId,
        }),
        i,
      );
      await patient(
        "retire_fixture",
        patientCommand({
          kind: "set_archived",
          patientId: patientFixture.patientId,
          expectedVersion: unlinked.version,
          archived: true,
        }),
        -1,
      );
      console.log(`Completed configuration iteration ${i + 1}/${samples + 2}`);
      continue;
    }
    const fields = {
      name: `Benchmark ${run} ${i}`,
      phone: "8135550199",
      email: `benchmark-${run}-${i}@example.test`,
    };
    const created = await patient("create", patientCommand({ kind: "create", patient: fields }), i);
    const patientId = created.patientId;
    await api(
      "patients.search",
      "/api/admin/patients/search",
      { query: `Benchmark ${run}`, limit: 50 },
      i,
    );
    await api("patients.read", `/api/admin/patients/${patientId}`, null, i);
    const updateBody = patientCommand({
      kind: "update",
      patientId,
      expectedVersion: created.version,
      patient: { ...fields, name: `${fields.name} updated` },
    });
    const updated = await patient("update", updateBody, i);
    await patient("update.replay", updateBody, i);
    await api(
      "patients.update.stale",
      "/api/admin/patients",
      { ...updateBody, idempotencyKey: randomUUID() },
      i,
      false,
    );
    const archived = await patient(
      "archive",
      patientCommand({
        kind: "set_archived",
        patientId,
        expectedVersion: updated.version,
        archived: true,
      }),
      i,
    );
    const restored = await patient(
      "restore",
      patientCommand({
        kind: "set_archived",
        patientId,
        expectedVersion: archived.version,
        archived: false,
      }),
      i,
    );
    await api("requests.worklist", "/api/admin/request-worklist", { action: "page", limit: 50 }, i);
    await schedule(
      "catalog",
      { action: "catalog", entity: "provider", query: `Benchmark ${run}` },
      i,
    );
    await schedule(
      "read_config",
      { action: "read_config", entity: "provider", id: provider.id },
      i,
    );
    await schedule(
      "availability",
      {
        action: "availability",
        providerId: provider.id,
        locationId: location.id,
        appointmentTypeId: type.id,
        patientId,
        date: day,
      },
      i,
    );
    const booking = {
      kind: "book",
      patientId,
      providerId: provider.id,
      locationId: location.id,
      appointmentTypeId: type.id,
      expectedTypeVersion: type.version,
      start: { date: day, time: "09:00" },
    };
    const booked = await schedule("book", command(booking), i);
    await schedule("appointments", { action: "appointments", patientId }, i);
    await schedule("read_appointment", { action: "read_appointment", id: booked.id }, i);
    const moved = await schedule(
      "reschedule",
      command({
        kind: "reschedule",
        id: booked.id,
        expectedVersion: booked.version,
        providerId: provider.id,
        locationId: location.id,
        start: { date: day, time: "10:00" },
      }),
      i,
    );
    const cancelled = await schedule(
      "cancel",
      command({
        kind: "cancel",
        id: booked.id,
        expectedVersion: moved.version,
        reason: "Synthetic benchmark",
      }),
      i,
    );
    const undone = await schedule(
      "undo",
      command({ kind: "undo", id: booked.id, expectedVersion: cancelled.version }),
      i,
    );
    await schedule(
      "retire_booking",
      command({
        kind: "cancel",
        id: booked.id,
        expectedVersion: undone.version,
        reason: "Synthetic benchmark finished",
      }),
      -1,
    );
    // Arrival and no-show require today/past fixtures. Stage only this run's
    // Appointments outside the timed interval; never alter the application clock.
    const stageAppointment = async (offset) => {
      const startsAt = new Date(fixtureClock - (i * 3 + offset + 2) * 60_000).toISOString();
      const endsAt = new Date(Date.parse(startsAt) + 60_000).toISOString();
      const id = randomUUID();
      const staged = await db.from("appointments").insert({
        id,
        patient_id: patientId,
        provider_id: provider.id,
        location_id: location.id,
        appointment_type_id: type.id,
        starts_at: startsAt,
        ends_at: endsAt,
        duration_minutes: 1,
        buffer_before_minutes: 0,
        buffer_after_minutes: 0,
        reserved_from: startsAt,
        reserved_until: endsAt,
        created_by: staff.userId,
        updated_by: staff.userId,
      });
      if (staged.error) throw new Error(`Appointment fixture: ${staged.error.code}`);
      return id;
    };
    const arrivalId = await stageAppointment(0);
    const checkedIn = await schedule(
      "check_in",
      command({ kind: "check_in", id: arrivalId, expectedVersion: 1 }),
      i,
    );
    await schedule(
      "complete",
      command({ kind: "complete", id: arrivalId, expectedVersion: checkedIn.version }),
      i,
    );
    const missedId = await stageAppointment(1);
    await schedule("no_show", command({ kind: "no_show", id: missedId, expectedVersion: 1 }), i);
    await billing("read", { action: "read", patientId }, i);
    const charge = await billing(
      "charge",
      command({
        kind: "charge",
        patientId,
        expectedVersion: 0,
        amountCents: 10000,
        description: "Synthetic benchmark",
        serviceDate: day,
      }),
      i,
    );
    const payment = await billing(
      "payment",
      command({
        kind: "payment",
        patientId,
        expectedVersion: charge.version,
        amountCents: 10000,
        description: "Synthetic benchmark",
        method: "external",
      }),
      i,
    );
    const refund = await billing(
      "refund",
      command({
        kind: "refund",
        patientId,
        expectedVersion: payment.version,
        paymentId: payment.entryId,
        amountCents: 1000,
        description: "Synthetic benchmark",
      }),
      i,
    );
    const adjustment = await billing(
      "adjustment",
      command({
        kind: "adjustment",
        patientId,
        expectedVersion: refund.version,
        amountCents: -1000,
        description: "Synthetic benchmark",
      }),
      i,
    );
    await billing(
      "reverse",
      command({
        kind: "reverse",
        patientId,
        expectedVersion: adjustment.version,
        entryId: adjustment.entryId,
        description: "Synthetic benchmark",
      }),
      i,
    );
    const draft = await clinical("create", command({ kind: "create", patientId, content }), i);
    const edited = await clinical(
      "update_draft",
      command({
        kind: "update_draft",
        recordId: draft.id,
        expectedVersion: draft.version,
        content: { ...content, noteText: "Updated fictional benchmark." },
      }),
      i,
    );
    const signed = await clinical(
      "sign",
      command({ kind: "sign", recordId: draft.id, expectedVersion: edited.version }),
      i,
    );
    const amended = await clinical(
      "amend",
      command({ kind: "amend", recordId: draft.id, expectedVersion: signed.version, content }),
      i,
    );
    await clinical(
      "enter_in_error",
      command({
        kind: "enter_in_error",
        recordId: amended.id,
        expectedVersion: amended.version,
        reason: "Synthetic benchmark",
      }),
      i,
    );
    await clinical("list", { action: "list", patientId }, i);
    await clinical("read", { action: "read", recordId: draft.id }, i);
    await clinical("signers", { action: "signers", limit: 100 }, i);
    await patient(
      "retire_fixture",
      patientCommand({
        kind: "set_archived",
        patientId,
        expectedVersion: restored.version,
        archived: true,
      }),
      -1,
    );
    console.log(`Completed API iteration ${i + 1}/${samples + 2}`);
  }
  metadata.completed = true;
} finally {
  if (staff !== null && signerVersion > 0) {
    await clinical(
      "set_signer",
      command({
        kind: "set_signer",
        userId: staff.userId,
        expectedVersion: signerVersion,
        enabled: false,
      }),
      -1,
    ).catch(() => {});
  }
  if (staff !== null) {
    const profile = await db
      .from("staff_profiles")
      .update({ active: false })
      .eq("user_id", staff.userId);
    const account = await db.auth.admin.updateUserById(staff.userId, { ban_duration: "876000h" });
    metadata.fixtureAccountRetired = profile.error === null && account.error === null;
  }
  metadata.finishedAt = new Date().toISOString();
  save();
  await browser.close();
}
