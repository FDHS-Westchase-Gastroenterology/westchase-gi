import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { z } from "zod";

import { jsonSchema } from "../../src/lib/json";
import { serviceDb } from "./env";
import { removeSchedulingFixture } from "./scheduling";
import { staffFixtureEmail } from "./session";

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

  /* The staff sweep goes first: the request sweep drops every fixture
     actor's audit rows, and the staff sweep's counts should include them. */
  await sweepStaleStaffFixtures(db);
  await sweepStaleFixtures(db);
}

/* The sweep removes only fixture staff accounts older than this. Each test's
   accounts live about three minutes, however long the run: its timeout (180
   seconds at most for a spec that makes one) plus the afterEach that removes
   them. So an account this old belongs to a test that has finished, even
   while another job or a long local run is still using the same branch. Keep
   this at least three times the longest a fixture lives. A describe that
   keeps an account across tests runs serially and stops at its first failure,
   so it adds one timeout at most. */
const STALE_STAFF_FIXTURE_MINUTES = 15;
const AUTH_USERS_PER_PAGE = 1000;
const AUTH_USERS_MAX_PAGES = 20;

/**
 * Staff fixture hygiene: a test that times out is abandoned mid-body, so its
 * `finally` never disposes the scheduling fixture it made. That admin's
 * offices, providers, visit types, patients and appointments stay on the
 * shared Preview Branch and change what later Settings and Schedule specs
 * see. This sweep finds those accounts by the address createStaffFixture
 * mints and removes them through the fixture's own cleanup. Age is read from
 * the Auth user's created_at, so an account a running spec just made is never
 * touched. An account whose cleanup fails is reported and left whole for the
 * next run, which deletes by owner and so finishes an interrupted cleanup.
 */
async function sweepStaleStaffFixtures(db: ReturnType<typeof serviceDb>): Promise<void> {
  const seedEmail = process.env.PORTAL_SEED_ADMIN_EMAIL?.trim().toLowerCase() ?? "";
  const cutoff = Date.now() - STALE_STAFF_FIXTURE_MINUTES * 60_000;
  const stale: { id: string; email: string }[] = [];
  // Collect every page before deleting anything, so removals cannot shift a later page.
  for (let page = 1; page <= AUTH_USERS_MAX_PAGES; page += 1) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: AUTH_USERS_PER_PAGE });
    if (error !== null) {
      throw new Error(`Stale staff fixture lookup failed: ${error.code ?? String(error.status)}`);
    }
    for (const user of data.users) {
      const email = user.email?.toLowerCase() ?? "";
      const createdAt = Date.parse(user.created_at);
      if (!staffFixtureEmail.test(email) || email === seedEmail) continue;
      if (Number.isNaN(createdAt) || createdAt > cutoff) continue;
      stale.push({ id: user.id, email });
    }
    if (data.users.length < AUTH_USERS_PER_PAGE) break;
  }
  console.log(
    `[e2e] stale staff fixtures older than ${String(STALE_STAFF_FIXTURE_MINUTES)} minutes: ${String(stale.length)}`,
  );
  for (const actor of stale) {
    const label = actor.email.replace(/-([0-9a-f]{4})[0-9a-f]{4}@/u, "-$1…@");
    try {
      const patients = await db.from("patients").select("id").eq("created_by", actor.id);
      if (patients.error !== null) {
        throw new Error(`patients lookup failed: ${patients.error.code}`);
      }
      const patientIds = z
        .array(z.object({ id: z.string() }))
        .parse(patients.data)
        .map((row) => row.id);
      const removed = await removeSchedulingFixture(db, actor.id, actor.email, patientIds);
      const counts = removed.map((row) => `${row.table} ${String(row.count)}`).join(", ");
      console.log(`[e2e] swept stale fixture ${label}: ${counts}`);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      console.warn(`[e2e] left stale fixture ${label} for the next run: ${reason}`);
    }
  }
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
  const count = stale.length + staleRecipients.length;
  if (count > 0) {
    console.log(`[e2e] swept ${count} stale fixture rows left by an earlier run`);
  }
}
