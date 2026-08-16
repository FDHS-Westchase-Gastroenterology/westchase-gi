import assert from "node:assert/strict";
import test from "node:test";

const {
  getMaintainerManagementState,
  invitationIsActive,
  invitationIsCancelled,
  maintainerIsRevoked,
  runMaintainerOperation,
} = await import("./maintainer-operation.ts");

function operationHarness({
  beginError,
  performError,
  performStatus = 204,
  refreshError,
  snapshot = { matches: true, failureCode: "conflict" },
  finishError,
} = {}) {
  const audit = { id: "audit-1" };
  const calls = [];
  const finishes = [];
  const failureChecks = [];
  const providerErrors = [];
  let afterAttemptCount = 0;

  return {
    audit,
    calls,
    finishes,
    failureChecks,
    providerErrors,
    get afterAttemptCount() {
      return afterAttemptCount;
    },
    run() {
      return runMaintainerOperation({
        begin: async () => {
          calls.push("begin");
          if (beginError) throw beginError;
          return audit;
        },
        perform: async () => {
          calls.push("perform");
          if (performError) throw performError;
          return performStatus;
        },
        refresh: async () => {
          calls.push("refresh");
          if (refreshError) throw refreshError;
          return snapshot;
        },
        desired: (refreshed) => {
          calls.push("desired");
          return refreshed.matches;
        },
        finish: async (finishedAudit, outcome, detail) => {
          calls.push("finish");
          finishes.push({ audit: finishedAudit, outcome, detail });
          if (finishError) throw finishError;
        },
        failureCode: (error, refreshed) => {
          calls.push("failureCode");
          failureChecks.push({ error, snapshot: refreshed });
          return refreshed.failureCode;
        },
        providerStatus: (error) => {
          calls.push("providerStatus");
          providerErrors.push(error);
          return error.status ?? null;
        },
        afterAttempt: () => {
          calls.push("afterAttempt");
          afterAttemptCount += 1;
        },
      });
    },
  };
}

test("Administration write is the only permission level ready to manage", () => {
  assert.equal(getMaintainerManagementState("write"), "ready");
  assert.equal(getMaintainerManagementState("read"), "permission_upgrade_required");
  assert.equal(getMaintainerManagementState("none"), "permission_upgrade_required");
});

test("desired-state helpers reconcile invitations and maintainers by user", () => {
  const pending = {
    maintainers: [{ userId: 10 }],
    invitations: [
      { userId: 20, invitationId: 200 },
      { userId: 30, invitationId: 300 },
    ],
  };

  assert.equal(invitationIsActive(pending, 10), true, "already a maintainer");
  assert.equal(invitationIsActive(pending, 20), true, "pending invitation");
  assert.equal(invitationIsActive(pending, 40), false, "absent user");

  assert.equal(invitationIsCancelled(pending, 20, 200), false, "target invitation remains");
  assert.equal(
    invitationIsCancelled({ maintainers: [{ userId: 20 }], invitations: [] }, 20, 200),
    false,
    "the invite was accepted concurrently",
  );
  assert.equal(
    invitationIsCancelled(
      {
        maintainers: [],
        invitations: [{ userId: 30, invitationId: 300 }],
      },
      20,
      200,
    ),
    true,
    "only another user's invitation remains",
  );

  assert.equal(maintainerIsRevoked(pending, 10), false, "maintainer remains");
  assert.equal(
    maintainerIsRevoked(pending, 20),
    false,
    "a pending invitation still grants an active path",
  );
  assert.equal(maintainerIsRevoked(pending, 40), true, "user is fully absent");
});

test("an unavailable audit prevents the provider attempt", async () => {
  const beginError = new Error("audit unavailable");
  const harness = operationHarness({ beginError });

  assert.deepEqual(await harness.run(), { ok: false, code: "unavailable" });
  assert.deepEqual(harness.calls, ["begin"]);
  assert.equal(harness.afterAttemptCount, 0);
});

test("a matching refreshed snapshot confirms success", async () => {
  const harness = operationHarness({ performStatus: 202 });

  assert.deepEqual(await harness.run(), { ok: true });
  assert.deepEqual(harness.finishes, [
    {
      audit: harness.audit,
      outcome: "succeeded",
      detail: { provider_status: 202 },
    },
  ]);
  assert.deepEqual(harness.failureChecks, []);
  assert.deepEqual(harness.calls, [
    "begin",
    "perform",
    "refresh",
    "desired",
    "finish",
    "afterAttempt",
  ]);
  assert.equal(harness.afterAttemptCount, 1);
});

test("a matching snapshot confirms success even when the provider threw", async () => {
  const performError = Object.assign(new Error("provider rejected"), {
    status: 422,
  });
  const harness = operationHarness({ performError });

  assert.deepEqual(await harness.run(), { ok: true });
  assert.deepEqual(harness.providerErrors, [performError]);
  assert.deepEqual(harness.finishes, [
    {
      audit: harness.audit,
      outcome: "succeeded",
      detail: { provider_status: 422 },
    },
  ]);
  assert.deepEqual(harness.failureChecks, []);
  assert.deepEqual(harness.calls, [
    "begin",
    "perform",
    "providerStatus",
    "refresh",
    "desired",
    "finish",
    "afterAttempt",
  ]);
  assert.equal(harness.afterAttemptCount, 1);
});

test("an accepted provider status is downgraded when the snapshot does not match", async () => {
  const snapshot = { matches: false, failureCode: "not_found" };
  const harness = operationHarness({ performStatus: 202, snapshot });

  assert.deepEqual(await harness.run(), { ok: false, code: "not_found" });
  assert.deepEqual(harness.finishes, [
    {
      audit: harness.audit,
      outcome: "failed",
      detail: { provider_status: 202 },
    },
  ]);
  assert.equal(harness.failureChecks.length, 1);
  assert.equal(harness.failureChecks[0].error, undefined);
  assert.equal(harness.failureChecks[0].snapshot, snapshot);
  assert.deepEqual(harness.calls, [
    "begin",
    "perform",
    "refresh",
    "desired",
    "finish",
    "afterAttempt",
    "failureCode",
  ]);
  assert.equal(harness.afterAttemptCount, 1);
});

test("provider failure evidence reaches the snapshot-derived failure code", async () => {
  const performError = Object.assign(new Error("provider rejected"), {
    status: 403,
  });
  const snapshot = { matches: false, failureCode: "forbidden" };
  const harness = operationHarness({ performError, snapshot });

  assert.deepEqual(await harness.run(), { ok: false, code: "forbidden" });
  assert.deepEqual(harness.providerErrors, [performError]);
  assert.deepEqual(harness.failureChecks, [{ error: performError, snapshot }]);
  assert.deepEqual(harness.finishes, [
    {
      audit: harness.audit,
      outcome: "failed",
      detail: { provider_status: 403 },
    },
  ]);
  assert.equal(harness.afterAttemptCount, 1);
});

test("a failed refresh records and returns an unconfirmed outcome", async () => {
  const harness = operationHarness({
    performStatus: 204,
    refreshError: new Error("refresh unavailable"),
  });

  assert.deepEqual(await harness.run(), { ok: false, code: "unconfirmed" });
  assert.deepEqual(harness.finishes, [
    {
      audit: harness.audit,
      outcome: "unconfirmed",
      detail: { provider_status: 204 },
    },
  ]);
  assert.deepEqual(harness.failureChecks, []);
  assert.deepEqual(harness.calls, ["begin", "perform", "refresh", "finish", "afterAttempt"]);
  assert.equal(harness.afterAttemptCount, 1);
});

test("a failed audit finish makes confirmed success unconfirmed", async () => {
  const harness = operationHarness({
    performStatus: 204,
    finishError: new Error("audit finish unavailable"),
  });

  assert.deepEqual(await harness.run(), { ok: false, code: "unconfirmed" });
  assert.deepEqual(harness.finishes, [
    {
      audit: harness.audit,
      outcome: "succeeded",
      detail: { provider_status: 204 },
    },
  ]);
  assert.deepEqual(harness.failureChecks, []);
  assert.deepEqual(harness.calls, [
    "begin",
    "perform",
    "refresh",
    "desired",
    "finish",
    "afterAttempt",
  ]);
  assert.equal(harness.afterAttemptCount, 1);
});
