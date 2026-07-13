import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
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

  if (!existsSync(SNAPSHOT_PATH)) {
    const { data, error } = await db
      .from("notification_recipients")
      .select("id, active");
    if (error) {
      throw new Error(`Recipient snapshot failed: ${error.code}`);
    }
    mkdirSync(resolve(process.cwd(), ".logs"), { recursive: true });
    writeFileSync(SNAPSHOT_PATH, JSON.stringify(data ?? []), "utf8");
  } else {
    // Reuse the crashed run's snapshot; log count only.
    const prior = JSON.parse(readFileSync(SNAPSHOT_PATH, "utf8")) as unknown[];
    console.log(
      `[e2e] reusing existing recipient snapshot (${prior.length} rows)`,
    );
  }

  const { error: disableError } = await db
    .from("notification_recipients")
    .update({ active: false })
    .neq("id", "00000000-0000-0000-0000-000000000000");
  if (disableError) {
    throw new Error(`Recipient disable failed: ${disableError.code}`);
  }
}
