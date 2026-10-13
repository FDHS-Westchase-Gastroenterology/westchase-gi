import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, describe, it } from "node:test";

import { z } from "zod";

import { openDatabase } from "@/lib/db/client";
import type { Database } from "@/lib/db/client";
import { rpc, rpcStatement } from "@/lib/db/rpc";

void describe("rpcStatement", () => {
  void it("passes the arguments sent, by name, through a typed record of the JSON body", () => {
    assert.equal(
      rpcStatement("portal_read_activity", ["p_limit", "p_categories", "p_actor_id"]),
      'select to_json(public."portal_read_activity"(' +
        '"p_actor_id" := _."p_actor_id", "p_categories" := _."p_categories", "p_limit" := _."p_limit"' +
        "))::text as data from json_to_record($1::text::json) as _(" +
        '"p_actor_id" uuid, "p_categories" text[], "p_limit" integer)',
    );
  });

  void it("calls a function with no arguments without a body", () => {
    assert.equal(
      rpcStatement("portal_booking_interval", []),
      'select to_json(public."portal_booking_interval"())::text as data',
    );
  });

  void it("refuses an argument the function does not declare", () => {
    assert.throws(
      () => rpcStatement("portal_name_key", ["p_name", "p_extra"]),
      /portal_name_key has no argument p_extra/u,
    );
  });
});

/* The rest runs against a migrated database, read-only: CI's Preview Branch, or a local
   cluster built from supabase/migrations. Without POSTGRES_URL it is skipped. */
const postgresUrl = process.env.POSTGRES_URL?.trim() ?? "";
const connected = postgresUrl !== "";
const loopback =
  connected && /^(?:localhost|127\.0\.0\.1|\[::1\])$/u.test(new URL(postgresUrl).hostname);

void describe("rpc against the database", { skip: !connected }, () => {
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

  void it("returns a scalar result as its JSON value", async () => {
    const [direct] = z
      .tuple([z.object({ minutes: z.number() })])
      .parse(
        await db.transaction((sql) =>
          sql.unsafe("select public.portal_booking_interval() as minutes"),
        ),
      );
    assert.deepEqual(await rpc(db, "portal_booking_interval", {}), {
      data: direct.minutes,
      error: null,
    });
    assert.deepEqual(await rpc(db, "portal_name_key", { p_name: "Ann-Marie O'Brien" }), {
      data: " ann marie obrien",
      error: null,
    });
  });

  void it("returns a jsonb result as parsed JSON and lets omitted arguments default", async () => {
    assert.deepEqual(await rpc(db, "portal_read_activity", { p_actor_id: randomUUID() }), {
      data: { ok: false, code: "unauthorized" },
      error: null,
    });
  });

  void it("passes JSON arrays as SQL arrays", async (t) => {
    if (staffId === null) {
      t.skip("no onboarded staff member to read as");
      return;
    }
    const page = await rpc(db, "portal_read_activity", {
      p_actor_id: staffId,
      p_categories: ["requests"],
      p_limit: 1,
    });
    assert.equal(page.error, null);
    assert.equal(z.object({ ok: z.literal(true) }).safeParse(page.data).success, true);
    assert.deepEqual(
      await rpc(db, "portal_read_activity", { p_actor_id: staffId, p_categories: ["nope"] }),
      { data: { ok: false, code: "invalid_command" }, error: null },
    );
  });

  void it("reports a bad argument with its SQLSTATE, message, details and hint", async () => {
    assert.deepEqual(await rpc(db, "portal_read_activity", { p_actor_id: "not-a-uuid" }), {
      data: null,
      error: {
        code: "22P02",
        message: 'invalid input syntax for type uuid: "not-a-uuid"',
        details: null,
        hint: null,
      },
    });
    const date = await rpc(db, "portal_read_activity", {
      p_actor_id: randomUUID(),
      p_from: "2026-02-30",
    });
    assert.equal(date.error?.code, "22008");
    const limit = await rpc(db, "portal_read_activity", {
      p_actor_id: randomUUID(),
      p_limit: 2 ** 40,
    });
    assert.equal(limit.error?.code, "22003");
  });

  void it("reports a signal aborted before the call without querying", async () => {
    const controller = new AbortController();
    controller.abort();
    const result = await rpc(db, "portal_booking_interval", {}, controller.signal);
    assert.equal(result.data, null);
    assert.ok(result.error !== null);
    assert.equal(result.error.code, "");
    assert.equal(result.error.hint, "Request was aborted (timeout or manual cancellation)");
  });

  /* Holding a lock on a shared Preview database would stall everyone using it, so these run
     only against a local cluster. */
  void describe("a statement that cannot finish", { skip: !loopback }, () => {
    async function whileStaffLocked(call: () => Promise<void>): Promise<void> {
      const holder = openDatabase(postgresUrl, undefined);
      try {
        await holder.transaction(async (sql) => {
          await sql.unsafe("lock table public.staff_profiles in access exclusive mode");
          await call();
        });
      } finally {
        await holder.close();
      }
    }

    void it("is cancelled when the caller aborts", async () => {
      await whileStaffLocked(async () => {
        const started = Date.now();
        const result = await rpc(
          db,
          "portal_read_activity",
          { p_actor_id: randomUUID() },
          AbortSignal.timeout(200),
        );
        assert.equal(result.data, null);
        assert.ok(result.error !== null);
        assert.equal(result.error.code, "");
        assert.match(result.error.message, /^TimeoutError: /u);
        assert.ok(Date.now() - started < 4000);
      });
      assert.equal((await rpc(db, "portal_booking_interval", {})).error, null);
    });

    void it("is cancelled after 8 seconds as PostgREST's statement timeout", async () => {
      await whileStaffLocked(async () => {
        const result = await rpc(db, "portal_read_activity", { p_actor_id: randomUUID() });
        assert.deepEqual(result, {
          data: null,
          error: {
            code: "57014",
            message: "canceling statement due to statement timeout",
            details: null,
            hint: null,
          },
        });
      });
      assert.equal((await rpc(db, "portal_booking_interval", {})).error, null);
    });
  });
});
