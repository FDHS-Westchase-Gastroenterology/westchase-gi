import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { z } from "zod";

import { jsonSchema } from "../../src/lib/json";
import { serviceDb } from "./env";

const SNAPSHOT_PATH = resolve(process.cwd(), ".logs/recipients-snapshot.json");

/**
 * Send hygiene (Resend free tier = 100 emails/day): the whole suite runs
 * with every notification recipient toggled INACTIVE. Specs that assert
 * notification behavior re-enable exactly what they need and restore it.
 * Global teardown restores the pre-run state from the snapshot.
 *
 * If a snapshot already exists, a previous run crashed before teardown —
 * that snapshot (not the current all-off DB state) is the truth to restore.
 */
export default async function globalSetup(): Promise<void> {
  const db = serviceDb();
  const { error: authAdminError } = await db.auth.admin.listUsers({
    page: 1,
    perPage: 1,
  });
  if (authAdminError) {
    throw new Error(`Auth Admin preflight failed: ${authAdminError.code ?? authAdminError.status}`);
  }

  if (!existsSync(SNAPSHOT_PATH)) {
    const { data, error } = await db.from("notification_recipients").select("id, active");
    if (error) {
      throw new Error(`Recipient snapshot failed: ${error.code}`);
    }
    mkdirSync(resolve(process.cwd(), ".logs"), { recursive: true });
    writeFileSync(SNAPSHOT_PATH, JSON.stringify(data), "utf8");
  } else {
    // Reuse the crashed run's snapshot; log count only.
    const prior = z.array(jsonSchema).parse(JSON.parse(readFileSync(SNAPSHOT_PATH, "utf8")));
    console.log(`[e2e] reusing existing recipient snapshot (${prior.length} rows)`);
  }

  const { error: disableError } = await db
    .from("notification_recipients")
    .update({ active: false })
    .neq("id", "00000000-0000-0000-0000-000000000000");
  if (disableError) {
    throw new Error(`Recipient disable failed: ${disableError.code}`);
  }

  await sweepStaleFixtures(db);
}

/**
 * Fixture hygiene: every spec cleans its own rows in `afterAll`, but a
 * cancelled run (the workflow uses `cancel-in-progress`) never reaches
 * those hooks, and the shared Preview Branch then carries orphaned rows
 * into the next run. Those rows change New-queue counts, print-packet
 * page counts, and prev/next chains. Every e2e fixture addresses the
 * reserved `.test` TLD (`*@example.test`, plus the deliberately odd
 * `queue-*` edge/unsafe shapes); seed rows use `@mock.com`, so the sweep
 * cannot touch them. Dependent rows cascade from `requests`.
 */
async function sweepStaleFixtures(db: ReturnType<typeof serviceDb>): Promise<void> {
  const fixtureEmail = "email.ilike.%.test,email.ilike.%@example.test%,email.like.queue-%";
  const { data: stale, error: staleError } = await db
    .from("requests")
    .delete()
    .or(fixtureEmail)
    .select("id");
  if (staleError) {
    throw new Error(`Stale fixture sweep failed: ${staleError.code}`);
  }
  // Audit rows about swept requests, and rows a fixture actor wrote, would
  // Otherwise accumulate across runs and push a run's own rows out of the
  // Activity page's window.
  const staleRows = z.array(z.object({ id: z.string() })).safeParse(stale);
  const staleIds = staleRows.success ? staleRows.data.map((row) => row.id) : [];
  for (let index = 0; index < staleIds.length; index += 100) {
    const { error: auditError } = await db
      .from("audit_log")
      .delete()
      .in("entity_id", staleIds.slice(index, index + 100));
    if (auditError) {
      throw new Error(`Stale audit sweep failed: ${auditError.code}`);
    }
  }
  const { error: actorAuditError } = await db
    .from("audit_log")
    .delete()
    .like("actor_email", "%@example.test");
  if (actorAuditError) {
    throw new Error(`Stale actor audit sweep failed: ${actorAuditError.code}`);
  }
  const { data: staleRecipients, error: recipientError } = await db
    .from("notification_recipients")
    .delete()
    .like("email", "ux-%@example.test")
    .select("id");
  if (recipientError) {
    throw new Error(`Stale recipient sweep failed: ${recipientError.code}`);
  }
  const count = stale.length + staleRecipients.length + (await sweepStaleScheduling(db));
  if (count > 0) {
    console.log(`[e2e] swept ${count} stale fixture rows left by an earlier run`);
  }
}

/**
 * Scheduling fixtures (TEST offices/providers/patients and the staff users
 * that created them) dispose themselves per spec; a cancelled run strands
 * them, and enough stale office cards squeeze the Locations grid until the
 * cards' buttons clip out of the cards and stop taking pointer events.
 */
async function sweepStaleScheduling(db: ReturnType<typeof serviceDb>): Promise<number> {
  const { data: staleStaff, error: staffError } = await db
    .from("staff_profiles")
    .select("user_id")
    .ilike("email", "%@example.test");
  if (staffError !== null) {
    throw new Error(`Stale staff sweep failed: ${staffError.code}`);
  }
  const staffRows = z.array(z.object({ user_id: z.string() })).safeParse(staleStaff);
  const staffIds = staffRows.success ? staffRows.data.map((row) => row.user_id) : [];
  const idRows = z.array(z.object({ id: z.string() }));
  const staleRows = async (
    table: "scheduling_locations" | "scheduling_providers" | "appointment_types" | "patients",
  ): Promise<readonly string[]> => {
    const ids = new Set<string>();
    const byName = await db.from(table).select("id").ilike("name", "TEST %");
    if (byName.error !== null) throw new Error(`Stale ${table} sweep failed: ${byName.error.code}`);
    const named = idRows.safeParse(byName.data);
    for (const row of named.success ? named.data : []) ids.add(row.id);
    if (staffIds.length > 0) {
      const byStaff = await db.from(table).select("id").in("created_by", staffIds);
      if (byStaff.error !== null) {
        throw new Error(`Stale ${table} sweep failed: ${byStaff.error.code}`);
      }
      const made = idRows.safeParse(byStaff.data);
      for (const row of made.success ? made.data : []) ids.add(row.id);
    }
    return [...ids];
  };
  const locationIds = await staleRows("scheduling_locations");
  const providerIds = await staleRows("scheduling_providers");
  const typeIds = await staleRows("appointment_types");
  const patientIds = await staleRows("patients");
  const appointmentOr = [
    ...(staffIds.length > 0 ? [`created_by.in.(${staffIds.join(",")})`] : []),
    ...(locationIds.length > 0 ? [`location_id.in.(${locationIds.join(",")})`] : []),
    ...(providerIds.length > 0 ? [`provider_id.in.(${providerIds.join(",")})`] : []),
    ...(patientIds.length > 0 ? [`patient_id.in.(${patientIds.join(",")})`] : []),
  ];
  if (appointmentOr.length > 0) {
    const { error: appointmentError } = await db
      .from("appointments")
      .delete()
      .or(appointmentOr.join(","));
    if (appointmentError !== null) {
      throw new Error(`Stale appointment sweep failed: ${appointmentError.code}`);
    }
  }
  for (const [table, list] of [
    ["scheduling_providers", providerIds],
    ["appointment_types", typeIds],
    ["scheduling_locations", locationIds],
  ] as const) {
    if (list.length === 0) continue;
    const { error } = await db
      .from(table)
      .delete()
      .in("id", [...list]);
    if (error !== null) throw new Error(`Stale ${table} sweep failed: ${error.code}`);
  }
  if (patientIds.length > 0) {
    const { error: linksError } = await db
      .from("patient_request_links")
      .delete()
      .in("patient_id", [...patientIds]);
    if (linksError !== null) {
      throw new Error(`Stale patient links sweep failed: ${linksError.code}`);
    }
    const { error: patientsError } = await db
      .from("patients")
      .delete()
      .in("id", [...patientIds]);
    if (patientsError !== null) {
      throw new Error(`Stale patients sweep failed: ${patientsError.code}`);
    }
  }
  for (const userId of staffIds) {
    const { error: tourError } = await db.from("staff_tours").delete().eq("staff_user_id", userId);
    if (tourError !== null) throw new Error(`Stale tours sweep failed: ${tourError.code}`);
    const { error: profileError } = await db.from("staff_profiles").delete().eq("user_id", userId);
    if (profileError !== null) {
      throw new Error(`Stale staff sweep failed: ${profileError.code}`);
    }
    await db.auth.admin.deleteUser(userId);
  }
  return (
    locationIds.length + providerIds.length + typeIds.length + patientIds.length + staffIds.length
  );
}
