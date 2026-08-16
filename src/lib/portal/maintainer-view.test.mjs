import assert from "node:assert/strict";
import test from "node:test";

const { getMaintainerViewState } = await import("./maintainer-view.ts");

const HIDDEN_VIEW = {
  canManage: false,
  showSetup: false,
  showInvitationDisclosure: false,
  showEmptyState: false,
};

test("disconnected states hide every maintainer control and disclosure", () => {
  for (const state of ["not_configured", "unavailable"]) {
    for (const isAdmin of [false, true]) {
      for (const hasActions of [false, true]) {
        assert.deepEqual(
          getMaintainerViewState({ state }, isAdmin, hasActions),
          HIDDEN_VIEW,
          `${state}; admin=${isAdmin}; actions=${hasActions}`,
        );
      }
    }
  }
});

test("connected management controls follow the role, actions, and setup matrix", () => {
  for (const management of ["restrict_installation", "permission_upgrade_required", "ready"]) {
    for (const isAdmin of [false, true]) {
      for (const hasActions of [false, true]) {
        assert.deepEqual(
          getMaintainerViewState(
            {
              state: "connected",
              management,
              maintainers: [{ userId: 1 }],
              invitations: [{ userId: 2 }],
            },
            isAdmin,
            hasActions,
          ),
          {
            canManage: isAdmin && hasActions && management === "ready",
            showSetup: isAdmin && management !== "ready",
            showInvitationDisclosure: false,
            showEmptyState: false,
          },
          `${management}; admin=${isAdmin}; actions=${hasActions}`,
        );
      }
    }
  }
});

test("invitation disclosure appears only when maintainers loaded but invitations did not", () => {
  const cases = [
    {
      name: "neither list loaded",
      maintainers: null,
      invitations: null,
      expected: false,
    },
    {
      name: "only invitations loaded",
      maintainers: null,
      invitations: [],
      expected: false,
    },
    {
      name: "empty maintainers loaded",
      maintainers: [],
      invitations: null,
      expected: true,
    },
    {
      name: "populated maintainers loaded",
      maintainers: [{ userId: 1 }],
      invitations: null,
      expected: true,
    },
    {
      name: "both lists loaded",
      maintainers: [{ userId: 1 }],
      invitations: [],
      expected: false,
    },
  ];

  for (const { name, maintainers, invitations, expected } of cases) {
    const view = getMaintainerViewState(
      {
        state: "connected",
        management: "ready",
        maintainers,
        invitations,
      },
      false,
      false,
    );
    assert.equal(view.showInvitationDisclosure, expected, name);
  }
});

test("the empty state requires both loaded lists to be empty", () => {
  const cases = [
    { maintainers: [], invitations: [], expected: true },
    { maintainers: [{ userId: 1 }], invitations: [], expected: false },
    { maintainers: [], invitations: [{ userId: 2 }], expected: false },
    { maintainers: null, invitations: [], expected: false },
    { maintainers: [], invitations: null, expected: false },
    { maintainers: null, invitations: null, expected: false },
  ];

  for (const { maintainers, invitations, expected } of cases) {
    const view = getMaintainerViewState(
      {
        state: "connected",
        management: "ready",
        maintainers,
        invitations,
      },
      true,
      true,
    );
    assert.equal(
      view.showEmptyState,
      expected,
      `maintainers=${JSON.stringify(maintainers)}; invitations=${JSON.stringify(invitations)}`,
    );
  }
});
