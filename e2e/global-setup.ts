import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { z } from "zod";

import { jsonSchema } from "../src/lib/json";
import { serviceDb } from "./support";

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
