import { existsSync, readFileSync, unlinkSync } from "node:fs";
import { resolve } from "node:path";
import { z } from "zod";
import { serviceDb } from "./support";

const recipientSnapshotSchema = z.array(
  z.object({
    id: z.string(),
    active: z.boolean(),
  }),
);

const SNAPSHOT_PATH = resolve(process.cwd(), ".logs/recipients-snapshot.json");

/** Restores notification-recipient active flags captured by global setup. */
export default async function globalTeardown(): Promise<void> {
  if (!existsSync(SNAPSHOT_PATH)) return;

  const snapshot = recipientSnapshotSchema.parse(
    JSON.parse(readFileSync(SNAPSHOT_PATH, "utf8")),
  );
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
