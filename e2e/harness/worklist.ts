import { randomUUID } from "node:crypto";

import { expect } from "@playwright/test";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function createWorklistRequests(db: SupabaseClient, count: number) {
  const query = `TEST worklist ${randomUUID().slice(0, 8)}`;
  const rows = Array.from({ length: count }, (_, index) => ({
    id: randomUUID(),
    name: `${query} ${String(index + 1).padStart(4, "0")}`,
    phone: "8135550100",
    email: `worklist-${randomUUID()}@example.test`,
    locale: "en",
    location: index % 2 ? "tampa" : "lutz",
    preferred_time: "any",
    source_path: "/e2e/worklist",
    created_at: new Date(Date.UTC(2026, 0, 1, 0, index)).toISOString(),
  }));
  const dispose = async () => {
    for (let offset = 0; offset < rows.length; offset += 100) {
      const ids = rows.slice(offset, offset + 100).map((row) => row.id);
      expect((await db.from("requests").delete().in("id", ids)).error).toBeNull();
      expect((await db.from("audit_log").delete().in("entity_id", ids)).error).toBeNull();
    }
  };
  try {
    for (let offset = 0; offset < rows.length; offset += 200) {
      expect((await db.from("requests").insert(rows.slice(offset, offset + 200))).error).toBeNull();
    }
    return { query, rows, dispose };
  } catch (error) {
    await dispose();
    throw error;
  }
}
