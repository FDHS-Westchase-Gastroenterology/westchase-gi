import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import type { AuditEntry } from "@/app/admin/(portal)/audit/audit-sentences";
import {
  externalAuditSummary,
  readExternalOutcomes,
} from "@/app/admin/(portal)/audit/technical-record-rows";
import { asJsonObject, jsonSchema } from "@/lib/json";
import type { Json, JsonObject } from "@/lib/json";
import { beginExternalAudit, finishExternalAudit } from "@/lib/portal/audit";

const BEGIN_ID = "6f9a3c2e-1b4d-4e8f-9a7c-2d5e8f1b3c4a";
const OPEN_ID = "0b1c2d3e-4f5a-4b6c-8d7e-9f0a1b2c3d4e";

/** One request the Data API client sent. */
interface SentRequest {
  readonly method: string;
  readonly url: URL;
  readonly body: Json;
}

/** What the stand-in Data API answers, in order: a status and a JSON body. */
interface Answer {
  readonly status: number;
  readonly body: Json;
}

/** A Data API client and the requests it has sent. */
interface RecordingClient {
  readonly client: SupabaseClient;
  readonly sent: SentRequest[];
}

/**
 * A real supabase-js client whose requests go to a stand-in for the Data API, which records
 * each one and replies with `answers` in order (201 and no body once they run out).
 */
function recordingClient(answers: readonly Answer[]): RecordingClient {
  const sent: SentRequest[] = [];
  let next = 0;
  // oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- the fetch signature supabase-js calls
  async function fetchStandIn(input: string | URL | Request, init?: RequestInit) {
    const text = z.string().optional().parse(init?.body) ?? "null";
    sent.push({
      method: init?.method ?? "GET",
      url: new URL(input instanceof Request ? input.url : input),
      body: jsonSchema.parse(JSON.parse(text)),
    });
    const answer = answers[next] ?? { status: 201, body: null };
    next += 1;
    return Promise.resolve(
      new Response(answer.body === null ? null : JSON.stringify(answer.body), {
        status: answer.status,
        headers: { "content-type": "application/json" },
      }),
    );
  }
  const client = createClient("https://stand-in.supabase.test", "service-role-key", {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: fetchStandIn },
  });
  return { client, sent };
}

function writes(sent: readonly SentRequest[]): JsonObject[] {
  return sent.filter(({ method }) => method === "POST").map(({ body }) => asJsonObject(body) ?? {});
}

const MISSING_COLUMN = { status: 400, body: { code: "PGRST204", message: "column" } };

void describe("external audit rows", () => {
  void it("records the outcome as a row of its own and never edits the pending row", async () => {
    const { client, sent } = recordingClient([{ status: 201, body: { id: BEGIN_ID } }]);
    const audit = await beginExternalAudit(client, {
      actorEmail: "admin@mock.com",
      action: "maintainers.invite",
      entity: "repository_maintainers",
      entityId: null,
      detail: { target_login: "octocat" },
    });
    await finishExternalAudit(client, audit, "succeeded", { provider_status: 201 });

    assert.deepEqual(
      sent.map(({ method, url }) => `${method} ${url.pathname}`),
      ["POST /rest/v1/audit_log", "POST /rest/v1/audit_log"],
    );
    const [begin, outcome] = writes(sent);
    assert.equal(begin.action, "maintainers.invite");
    assert.deepEqual(begin.detail, { target_login: "octocat", outcome: "pending" });
    assert.deepEqual(outcome, {
      actor_email: "admin@mock.com",
      action: "audit.external_outcome",
      entity: "audit_log",
      entity_id: BEGIN_ID,
      detail: { provider_status: 201, outcome: "succeeded" },
      source: "staff",
      correlation_id: begin.correlation_id,
    });
  });

  void it("writes the outcome row without provenance on a pre-provenance schema", async () => {
    const { client, sent } = recordingClient([MISSING_COLUMN]);
    await finishExternalAudit(
      client,
      { id: BEGIN_ID, actorEmail: "admin@mock.com", correlationId: OPEN_ID },
      "failed",
    );
    const [, legacy] = writes(sent);
    assert.equal(Object.hasOwn(legacy, "source"), false);
    assert.equal(Object.hasOwn(legacy, "correlation_id"), false);
    assert.deepEqual(legacy.detail, { outcome: "failed" });
  });

  void it("throws when the outcome row cannot be written", async () => {
    const { client } = recordingClient([
      { status: 403, body: { code: "42501", message: "permission denied" } },
    ]);
    await assert.rejects(
      finishExternalAudit(
        client,
        { id: BEGIN_ID, actorEmail: "admin@mock.com", correlationId: OPEN_ID },
        "succeeded",
      ),
      { message: "External audit finish failed: 42501" },
    );
  });
});

function entry(id: string, detail: JsonObject): AuditEntry {
  return {
    id,
    actor_email: "admin@mock.com",
    action: "maintainers.invite",
    entity: "repository_maintainers",
    entity_id: null,
    detail,
    at: "2026-10-13T12:00:00Z",
  };
}

void describe("the Technical record's external outcomes", () => {
  void it("reads the outcome row first, then an outcome written in place, else unconfirmed", () => {
    const outcomes = new Map([[BEGIN_ID, "succeeded" as const]]);
    assert.deepEqual(
      externalAuditSummary(entry(BEGIN_ID, { target_login: "a", outcome: "pending" }), outcomes),
      { target: "a", outcome: "succeeded" },
    );
    assert.deepEqual(
      externalAuditSummary(entry(OPEN_ID, { target_login: "b", outcome: "failed" }), outcomes),
      { target: "b", outcome: "failed" },
    );
    assert.deepEqual(
      externalAuditSummary(entry(OPEN_ID, { target_login: "c", outcome: "pending" }), outcomes),
      { target: "c", outcome: "unconfirmed" },
    );
    assert.equal(externalAuditSummary(entry(OPEN_ID, {}), outcomes), null);
  });

  void it("asks only for the outcome rows of the external changes on the page", async () => {
    const { client, sent } = recordingClient([
      {
        status: 200,
        body: [
          { entity_id: BEGIN_ID, detail: { outcome: "failed" } },
          { entity_id: OPEN_ID, detail: { outcome: "unconfirmed" } },
        ],
      },
    ]);
    const outcomes = await readExternalOutcomes(client, [
      entry(BEGIN_ID, { target_login: "a" }),
      entry(OPEN_ID, { target_login: "b" }),
      entry("00000000-0000-4000-8000-000000000000", {}),
    ]);
    assert.deepEqual([...outcomes], [[BEGIN_ID, "failed"]]);
    const [read] = sent;
    assert.equal(read.method, "GET");
    assert.equal(read.url.searchParams.get("action"), "eq.audit.external_outcome");
    assert.equal(read.url.searchParams.get("entity"), "eq.audit_log");
    assert.equal(read.url.searchParams.get("entity_id"), `in.(${BEGIN_ID},${OPEN_ID})`);
  });

  void it("skips the read when the page has no external changes", async () => {
    const { client, sent } = recordingClient([]);
    assert.equal((await readExternalOutcomes(client, [entry(OPEN_ID, {})])).size, 0);
    assert.equal(sent.length, 0);
  });
});
