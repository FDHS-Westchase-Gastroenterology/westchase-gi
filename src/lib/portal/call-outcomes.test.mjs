import assert from "node:assert/strict";
import { register } from "node:module";
import test from "node:test";
import { pathToFileURL } from "node:url";

// Call-outcomes uses extensionless relative imports (type-only, but Node's
// Test runner still needs a resolve hook for consistency with siblings).
register(
  `data:text/javascript,${encodeURIComponent(`
    export async function resolve(specifier, context, nextResolve) {
      if (
        (specifier.startsWith("./") || specifier.startsWith("../")) &&
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

const {
  CALL_OUTCOME_IDS,
  CALL_OUTCOME_POLICY,
  allowsCallAgainDay,
  isCallOutcomeId,
  outcomesImplying,
  requiresCallAgainDay,
} = await import("./call-outcomes.ts");

// The full policy, restated. An outcome added to the module without a
// Deliberate policy decision fails here first; drift in either direction
// (a new id, a removed id, or a changed rule) is a test failure.
const EXPECTED_POLICY = {
  reached_follow_up: { callAgainDay: "allowed", impliedStatus: "contacted" },
  voicemail: { callAgainDay: "required", impliedStatus: "contacted" },
  no_answer: { callAgainDay: "required", impliedStatus: "contacted" },
  booked: { callAgainDay: "forbidden", impliedStatus: "scheduled" },
  scheduled_transferred: {
    callAgainDay: "forbidden",
    impliedStatus: "closed",
  },
  wont_schedule: { callAgainDay: "forbidden", impliedStatus: "closed" },
  not_actionable: { callAgainDay: "forbidden", impliedStatus: "closed" },
};

test("the policy table maps every outcome id, exactly", () => {
  assert.deepEqual(CALL_OUTCOME_POLICY, EXPECTED_POLICY);
});

test("CALL_OUTCOME_IDS covers the policy table in declaration order", () => {
  assert.deepEqual(CALL_OUTCOME_IDS, Object.keys(EXPECTED_POLICY));
});

test("isCallOutcomeId accepts every outcome id", () => {
  for (const id of CALL_OUTCOME_IDS) {
    assert.equal(isCallOutcomeId(id), true, id);
  }
});

test("isCallOutcomeId rejects non-outcomes", () => {
  for (const value of [
    "closed",
    "contacted",
    "BOOKED",
    "",
    "toString",
    "__proto__",
    null,
    undefined,
    7,
    ["booked"],
  ]) {
    assert.equal(isCallOutcomeId(value), false, String(value));
  }
});

test("the call-again-day helpers agree with the policy for every id", () => {
  for (const id of CALL_OUTCOME_IDS) {
    const rule = CALL_OUTCOME_POLICY[id].callAgainDay;
    assert.equal(requiresCallAgainDay(id), rule === "required", id);
    assert.equal(allowsCallAgainDay(id), rule !== "forbidden", id);
  }
});

test("outcomesImplying partitions every id by implied status, in order", () => {
  assert.deepEqual(outcomesImplying("contacted"), [
    "reached_follow_up",
    "voicemail",
    "no_answer",
  ]);
  assert.deepEqual(outcomesImplying("scheduled"), ["booked"]);
  assert.deepEqual(outcomesImplying("closed"), [
    "scheduled_transferred",
    "wont_schedule",
    "not_actionable",
  ]);
  const partitioned = ["contacted", "scheduled", "closed"].flatMap((status) =>
    outcomesImplying(status),
  );
  assert.deepEqual([...partitioned].sort(), [...CALL_OUTCOME_IDS].sort());
});
