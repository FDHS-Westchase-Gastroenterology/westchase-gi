import assert from "node:assert/strict";
import test from "node:test";

import { requestWorklistInputSchema, requestWorklistOutcomeSchema } from "./contracts.ts";
import { requestWorklistDatabaseSchema } from "./rows.ts";
import { readRequestWorklist } from "./service.ts";

const id = "7625d4d9-2948-4fa5-a095-a4a5cd94fd7a";

test("worklist reads bound response size without limiting how far into the matching set staff can page", () => {
  assert.equal(
    requestWorklistInputSchema.safeParse({ action: "page", offset: 2000, limit: 200 }).success,
    true,
  );
  for (const input of [
    { action: "page", limit: 201 },
    { action: "page", offset: -1 },
    { action: "page", statuses: [] },
    { action: "page", patientMessage: "not a search field" },
    { action: "page", receivedFrom: "2026-09-08T00:00:00Z", receivedTo: "2026-09-07T00:00:00Z" },
  ])
    assert.equal(requestWorklistInputSchema.safeParse(input).success, false);
  assert.equal(
    requestWorklistInputSchema.safeParse({
      action: "neighbors",
      requestId: id,
      query: "(literal),100%",
    }).success,
    true,
  );
});

test("request pages preserve complete counts and decode latest-activity fields from the database", () => {
  const parsed = requestWorklistDatabaseSchema.parse({
    ok: true,
    total: 1107,
    counts: { new: 1107, contacted: 0, scheduled: 0, closed: 0 },
    items: [
      {
        id,
        name: "TEST worklist",
        phone: "8135550100",
        location: "any",
        preferred_time: "any",
        locale: "en",
        status: "new",
        created_at: "2026-09-07T00:00:00Z",
        follow_up_at: null,
        legacy_review_required: false,
        version: 1,
        last_activity_at: "2026-09-08T00:00:00Z",
        last_activity_by: "staff@example.test",
        bucket: "new",
      },
    ],
    nextOffset: 1001,
    neighbors: { prevId: null, nextId: null, position: null },
  });
  assert.equal(parsed.total, 1107);
  assert.equal(parsed.items[0].lastActivityAt, "2026-09-08T00:00:00Z");
  assert.equal(parsed.items[0].lastActivityBy, "staff@example.test");
  assert.deepEqual(requestWorklistOutcomeSchema.parse(parsed), parsed);
});

test("neighbor reads keep search text in the RPC body and use the same explicit clock as a page", async () => {
  let called = 0;
  const db = {
    rpc(name, args) {
      called += 1;
      assert.equal(name, "portal_read_request_worklist");
      assert.equal(args.p_actor_id, id);
      assert.deepEqual(args.p_filter, {
        query: "(literal),100%",
        statuses: ["contacted"],
        buckets: null,
        location: null,
        receivedFrom: null,
        receivedTo: null,
        neighborId: id,
        now: "2026-09-07T12:00:00.000Z",
      });
      return {
        abortSignal: async () => ({ data: { ok: false, code: "unauthorized" }, error: null }),
      };
    },
  };
  assert.deepEqual(
    await readRequestWorklist(
      db,
      id,
      {
        action: "neighbors",
        requestId: id,
        query: "(literal),100%",
        statuses: ["contacted"],
      },
      new Date("2026-09-07T12:00:00Z"),
    ),
    { ok: false, code: "unauthorized" },
  );
  assert.equal(called, 1);
});
