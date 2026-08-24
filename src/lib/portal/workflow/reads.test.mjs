import assert from "node:assert/strict";
import { register } from "node:module";
import test from "node:test";
import { pathToFileURL } from "node:url";

register(
  `data:text/javascript,${encodeURIComponent(`
    const srcRoot = ${JSON.stringify(new URL("../../../", import.meta.url).href)};
    export async function resolve(specifier, context, nextResolve) {
      if (specifier === "server-only") {
        return {
          url: "data:text/javascript,export%20{}",
          shortCircuit: true,
        };
      }
      if (specifier.startsWith("@/")) {
        specifier = srcRoot + specifier.slice(2);
      }
      if (
        (specifier.startsWith("./") ||
          specifier.startsWith("../") ||
          specifier.startsWith("file:")) &&
        !/\\.(?:[cm]?[jt]s|json|mjs|cjs|tsx|jsx)$/.test(specifier)
      ) {
        try {
          return await nextResolve(specifier + ".ts", context);
        } catch {
          // fall through
        }
      }
      return nextResolve(specifier, context);
    }
  `)}`,
  pathToFileURL("./"),
);

const { fetchRequestWorkSurface } = await import("./reads.ts");

const REQUEST_ID = "11111111-1111-4111-8111-111111111111";
const REOPEN_AT = "2026-08-28T13:00:00.000Z";
const CORRECTION_AT = "2026-08-24T13:00:00.000Z";
const LATER_AT = "2026-08-31T13:00:00.000Z";

function namesCallAgainAt(columns) {
  return /(^|,)call_again_at(,|$)/.test(String(columns).replaceAll(" ", ""));
}

function withoutCallAgainAt(row) {
  const copy = { ...row };
  delete copy.call_again_at;
  return copy;
}

function workSurfaceClient(request, transitions, events = []) {
  const selects = { requests: "", transitions: "", events: "" };
  return {
    selects,
    from(table) {
      const query = {
        columns: "",
        select(columns) {
          query.columns = columns;
          if (table === "requests") selects.requests = columns;
          if (table === "request_transitions") selects.transitions = columns;
          if (table === "request_events") selects.events = columns;
          return query;
        },
        eq() {
          return query;
        },
        order() {
          return query;
        },
        maybeSingle() {
          return Promise.resolve(payload());
        },
        then(resolve, reject) {
          return Promise.resolve(payload()).then(resolve, reject);
        },
      };
      function payload() {
        if (table === "requests") return { data: request, error: null };
        if (table === "request_events") return { data: events, error: null };
        if (table === "request_transitions") {
          return {
            data: namesCallAgainAt(query.columns)
              ? transitions
              : transitions.map(withoutCallAgainAt),
            error: null,
          };
        }
        return { data: null, error: { message: `unknown table ${table}` } };
      }
      return query;
    },
  };
}

function bookedRequest() {
  return {
    id: REQUEST_ID,
    status: "booked",
    version: 5,
    follow_up_at: null,
    record_handoff_at: "2026-08-22T21:10:00.000Z",
    closed_at: null,
    closure_reason: null,
    legacy_review_required: false,
    created_at: "2026-08-22T20:44:00.000Z",
  };
}

function reopenTransition() {
  return {
    id: "22222222-2222-4222-8222-222222222222",
    from_state: "booked",
    to_state: "contacted",
    command: "reopen_request",
    actor_email: "staff@example.invalid",
    occurred_at: "2026-08-22T21:01:00.000Z",
    reason_code: null,
    call_again_at: REOPEN_AT,
    compensates_transition_id: null,
    provenance: "staff",
  };
}

test("Request history reads the immutable reopen call-again time from the transition", async () => {
  const client = workSurfaceClient(bookedRequest(), [
    {
      id: "33333333-3333-4333-8333-333333333333",
      from_state: "contacted",
      to_state: "booked",
      command: "confirm_booking_handoff",
      actor_email: "staff@example.invalid",
      occurred_at: "2026-08-22T21:10:00.000Z",
      reason_code: null,
      call_again_at: null,
      compensates_transition_id: null,
      provenance: "staff",
    },
    reopenTransition(),
  ]);

  const surface = await fetchRequestWorkSurface(client, REQUEST_ID);
  assert.ok(surface);
  assert.equal(surface.state, "booked");
  assert.equal(surface.callAgainAt, null);
  assert.match(client.selects.transitions, /(^|,)call_again_at(,|$)/);
  assert.notEqual(client.selects.transitions.trim(), "*");

  const reopen = surface.history.find(
    (entry) => entry.kind === "transition" && entry.command === "reopen_request",
  );
  assert.equal(reopen?.kind, "transition");
  assert.equal(reopen?.callAgainAt, REOPEN_AT);
  assert.notEqual(reopen?.callAgainAt, surface.callAgainAt);
});

test("Request history keeps the reopen timestamp after a later current call-again change", async () => {
  const client = workSurfaceClient(
    {
      id: REQUEST_ID,
      status: "contacted",
      version: 6,
      follow_up_at: LATER_AT,
      record_handoff_at: null,
      closed_at: null,
      closure_reason: null,
      legacy_review_required: false,
      created_at: "2026-08-22T20:44:00.000Z",
    },
    [
      {
        id: "44444444-4444-4444-8444-444444444444",
        from_state: "contacted",
        to_state: "contacted",
        command: "record_contact_attempt",
        actor_email: "staff@example.invalid",
        occurred_at: "2026-08-22T21:20:00.000Z",
        reason_code: "reached_follow_up",
        call_again_at: null,
        compensates_transition_id: null,
        provenance: "staff",
      },
      reopenTransition(),
    ],
    [
      {
        id: "55555555-5555-4555-8555-555555555555",
        type: "contact_attempt",
        recipient: null,
        status: "recorded",
        meta: {
          outcome: "reached_follow_up",
          author_email: "staff@example.invalid",
          follow_up_at: LATER_AT,
        },
        created_at: "2026-08-22T21:20:00.000Z",
      },
    ],
  );

  const surface = await fetchRequestWorkSurface(client, REQUEST_ID);
  assert.ok(surface);
  assert.equal(surface.callAgainAt, LATER_AT);
  const reopen = surface.history.find(
    (entry) => entry.kind === "transition" && entry.command === "reopen_request",
  );
  assert.equal(reopen?.callAgainAt, REOPEN_AT);
  const contact = surface.history.find((entry) => entry.kind === "contact_attempt");
  assert.equal(contact?.callAgainAt, LATER_AT);
});

test("Request history reads a legacy call-again correction from the transition", async () => {
  const client = workSurfaceClient(
    {
      id: REQUEST_ID,
      status: "contacted",
      version: 2,
      follow_up_at: CORRECTION_AT,
      record_handoff_at: null,
      closed_at: null,
      closure_reason: null,
      legacy_review_required: false,
      created_at: "2026-08-22T20:44:00.000Z",
    },
    [
      {
        id: "66666666-6666-4666-8666-666666666666",
        from_state: "contacted",
        to_state: "contacted",
        command: "set_call_again",
        actor_email: "staff@example.invalid",
        occurred_at: "2026-08-22T21:05:00.000Z",
        reason_code: null,
        call_again_at: CORRECTION_AT,
        compensates_transition_id: null,
        provenance: "staff",
      },
    ],
  );

  const surface = await fetchRequestWorkSurface(client, REQUEST_ID);
  assert.ok(surface);
  const correction = surface.history.find(
    (entry) => entry.kind === "transition" && entry.command === "set_call_again",
  );
  assert.equal(correction?.callAgainAt, CORRECTION_AT);
});
