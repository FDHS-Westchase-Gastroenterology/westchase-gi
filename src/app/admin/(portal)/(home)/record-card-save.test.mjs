import assert from "node:assert/strict";
import test from "node:test";

import {
  cardReducer,
  cardRowsFor,
  commandFor,
  INITIAL_DRAFT,
  needsDay,
} from "./record-card-model.ts";
import { saveCardCommand } from "./record-card-save.ts";

const TODAY = "2026-09-09";
const COMMON = {
  requestId: "14b51429-c703-4af7-a85e-d6989a0bf7ee",
  expectedVersion: 7,
  idempotencyKey: "c534e44e-b6dd-4b8d-a3a8-ce71cef9eb92",
};

function recorder(result) {
  const calls = [];
  const actions = Object.fromEntries(
    ["recordContactAttempt", "recordContactAndClose", "closeRequest", "confirmBookingHandoff"].map(
      (action) => [
        action,
        async (input) => {
          calls.push({ action, input });
          return result;
        },
      ],
    ),
  );
  return { calls, actions };
}

function decision(answer, followUp) {
  let draft = cardReducer(INITIAL_DRAFT, { type: "answer", answer, today: TODAY });
  draft = cardReducer(draft, { type: "day", day: "2026-09-11" });
  draft = cardReducer(draft, { type: "followUp", followUp });
  return draft;
}

for (const status of ["new", "contacted"]) {
  for (const [answer, outcome] of [
    ["no_answer", "no_answer"],
    ["contacted", "reached"],
  ]) {
    test(`${status}: ${answer} + No call uses only contact completion and preserves the save identity`, async () => {
      assert.ok(cardRowsFor(status).includes(answer));
      const draft = decision(answer, "none");
      assert.equal(needsDay(draft.answer, draft.followUp), false);
      const command = commandFor(draft, TODAY);
      const result = {
        ok: true,
        state: "closed",
        callAgainAt: null,
        undo: { transitionId: "completion" },
      };
      const { calls, actions } = recorder(result);
      assert.equal(
        await saveCardCommand(command, COMMON, actions),
        result,
        "the Undo descriptor is retained",
      );
      assert.deepEqual(calls, [{ action: "recordContactAndClose", input: { ...COMMON, outcome } }]);
    });
  }
}

for (const [answer, outcome] of [
  ["no_answer", "no_answer"],
  ["contacted", "reached_follow_up"],
]) {
  test(`${answer} + Call again preserves the selected callback`, async () => {
    const { calls, actions } = recorder({ ok: true });
    await saveCardCommand(commandFor(decision(answer, "call"), TODAY), COMMON, actions);
    assert.deepEqual(calls, [
      {
        action: "recordContactAttempt",
        input: { ...COMMON, outcome, callAgain: { kind: "day", date: "2026-09-11" } },
      },
    ]);
  });
}

test("ordinary Close request remains its own save action", async () => {
  const { calls, actions } = recorder({ ok: true });
  await saveCardCommand(commandFor(decision("not_actionable", null), TODAY), COMMON, actions);
  assert.deepEqual(calls, [
    { action: "closeRequest", input: { ...COMMON, reason: "not_actionable" } },
  ]);
});

test("an uncertain completion can retry the exact same input and stale rejection is returned unchanged", async () => {
  const command = commandFor(decision("contacted", "none"), TODAY);
  const unavailable = { ok: false, code: "unavailable" };
  const { calls, actions } = recorder(unavailable);
  assert.equal(await saveCardCommand(command, COMMON, actions), unavailable);
  await saveCardCommand(command, COMMON, actions);
  assert.deepEqual(calls[1], calls[0]);
  const stale = { ok: false, code: "stale_version" };
  assert.equal(await saveCardCommand(command, COMMON, recorder(stale).actions), stale);
});
