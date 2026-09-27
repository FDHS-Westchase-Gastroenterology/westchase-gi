import assert from "node:assert/strict";
import test from "node:test";

import { EMPTY_STAFF_REQUEST_DRAFT, isStaffRequestDraftDirty } from "./staff-request-draft.ts";

test("an untouched staff-authored draft is clean", () => {
  assert.equal(isStaffRequestDraftDirty(EMPTY_STAFF_REQUEST_DRAFT), false);
});

test("returning every field to the empty worksheet is clean again", () => {
  assert.equal(
    isStaffRequestDraftDirty({
      name: "Ava Patel",
      phone: "8135550100",
      email: "ava@example.test",
      location: "tampa",
      time: "afternoon",
      message: "Call mobile first.",
    }),
    true,
  );
  assert.equal(
    isStaffRequestDraftDirty({
      name: "",
      phone: "",
      email: "",
      location: "any",
      time: "any",
      message: "",
    }),
    false,
  );
});

test("any meaningful field change makes the draft dirty", () => {
  const cases = [
    { name: "Ava Patel" },
    { phone: "8135550100" },
    { email: "ava@example.test" },
    { location: "lutz" },
    { time: "morning" },
    { message: "Afternoons work best." },
    { name: " " },
  ];

  for (const change of cases) {
    assert.equal(
      isStaffRequestDraftDirty({ ...EMPTY_STAFF_REQUEST_DRAFT, ...change }),
      true,
      `expected dirty after ${JSON.stringify(change)}`,
    );
  }
});
