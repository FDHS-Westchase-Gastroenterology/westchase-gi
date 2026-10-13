import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, describe, it } from "node:test";

import { z } from "zod";

import { openDatabase } from "@/lib/db/client";
import type { Database } from "@/lib/db/client";
import { readActivity } from "@/lib/portal/activity";

void describe("readActivity without a database", () => {
  void it("reports an unreachable database as unavailable", async () => {
    const db = openDatabase("postgresql://postgres@127.0.0.1:1/unused", undefined);
    try {
      assert.deepEqual(await readActivity(db, randomUUID(), {}, null), {
        ok: false,
        code: "unavailable",
      });
    } finally {
      await db.close();
    }
  });

  void it("refuses a limit outside 1 to 100 before reaching the database", async () => {
    const db = openDatabase("postgresql://postgres@127.0.0.1:1/unused", undefined);
    try {
      assert.deepEqual(await readActivity(db, randomUUID(), {}, null, 101), {
        ok: false,
        code: "invalid_command",
      });
    } finally {
      await db.close();
    }
  });
});

const postgresUrl = process.env.POSTGRES_URL?.trim() ?? "";

void describe("readActivity against the database", { skip: postgresUrl === "" }, () => {
  let db: Database;
  let staffId: string | null = null;

  before(async () => {
    db = openDatabase(postgresUrl, undefined);
    const rows = await db.transaction((sql) =>
      sql.unsafe(
        "select user_id::text as id from public.staff_profiles where active and onboarded_at is not null limit 1",
      ),
    );
    staffId =
      z
        .array(z.object({ id: z.string() }))
        .parse(rows)
        .at(0)?.id ?? null;
  });

  after(async () => {
    await db.close();
  });

  void it("passes the database's refusal of an unknown actor through", async () => {
    assert.deepEqual(await readActivity(db, randomUUID(), {}, null), {
      ok: false,
      code: "unauthorized",
    });
  });

  void it("reports a database error as unavailable", async () => {
    assert.deepEqual(await readActivity(db, "not-a-uuid", {}, null), {
      ok: false,
      code: "unavailable",
    });
  });

  void it("reads a page for an onboarded staff member", async (t) => {
    if (staffId === null) {
      t.skip("no onboarded staff member to read as");
      return;
    }
    const page = await readActivity(db, staffId, { categories: ["requests"] }, null, 2);
    assert.equal(page.ok, true);
  });
});
