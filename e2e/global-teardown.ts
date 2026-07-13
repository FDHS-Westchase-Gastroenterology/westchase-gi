import { existsSync, readFileSync, unlinkSync } from "node:fs";
import { resolve } from "node:path";
import { serviceDb } from "./support";

const SNAPSHOT_PATH = resolve(process.cwd(), ".logs/recipients-snapshot.json");

/** Restores notification-recipient active flags captured by global setup. */
export default async function globalTeardown(): Promise<void> {
  if (!existsSync(SNAPSHOT_PATH)) return;

  const snapshot = JSON.parse(readFileSync(SNAPSHOT_PATH, "utf8")) as Array<{
    id: string;
    active: boolean;
  }>;
  const db = serviceDb();

  for (const recipient of snapshot) {
    const { error } = await db
      .from("notification_recipients")
      .update({ active: recipient.active })
      .eq("id", recipient.id);
    if (error) {
      throw new Error(`Recipient restore failed: ${error.code}`);
    }
  }

  unlinkSync(SNAPSHOT_PATH);
}
