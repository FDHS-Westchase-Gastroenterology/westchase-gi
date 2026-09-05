import assert from "node:assert/strict";
import test from "node:test";

import {
  intakeResponseSchema,
  parsePasswordAuthFlow,
  parseStaffRole,
  REQUEST_FIELD_LIMITS,
  requestInputSchema,
  staffRequestInputSchema,
  zodFieldErrors,
} from "./contracts.ts";

/* The intake contract the patient form, the API route and the staff form all
   validate against. The database enforces the same caps with CHECK
   constraints (see e2e/boundaries); this is the application-layer half. */

const valid = {
  name: "Fictional Patient",
  phone: "(813) 555-0100",
  email: "patient@example.test",
  location: "tampa",
  time: "morning",
  message: "TEST note",
  locale: "en",
  sourcePath: "/en/appointment",
};

function firstError(input) {
  const parsed = requestInputSchema.safeParse(input);
  assert.equal(parsed.success, false, "expected the input to be rejected");
  return zodFieldErrors(parsed.error);
}

test("a complete request is accepted with its text trimmed", () => {
  const parsed = requestInputSchema.safeParse({ ...valid, name: "  Fictional Patient  " });
  assert.equal(parsed.success, true);
  assert.equal(parsed.data.name, "Fictional Patient");
});

test("a name is required and capped", () => {
  assert.deepEqual(firstError({ ...valid, name: "   " }), { name: "name_required" });
  assert.deepEqual(firstError({ ...valid, name: "x".repeat(REQUEST_FIELD_LIMITS.name + 1) }), {
    name: "name_too_long",
  });
});

test("a phone needs ten digits once formatting is stripped, and is capped", () => {
  assert.equal(requestInputSchema.safeParse({ ...valid, phone: "813-555-0100" }).success, true);
  assert.deepEqual(firstError({ ...valid, phone: "813-555" }), { phone: "phone_invalid" });
  assert.deepEqual(firstError({ ...valid, phone: "1".repeat(REQUEST_FIELD_LIMITS.phone + 1) }), {
    phone: "phone_too_long",
  });
});

test("email is optional, but one practical mailbox when present", () => {
  const withoutEmail = requestInputSchema.safeParse({ ...valid, email: undefined });
  assert.equal(withoutEmail.success, true);
  assert.equal(withoutEmail.data.email, "");
  assert.deepEqual(firstError({ ...valid, email: "not a mailbox" }), { email: "email_invalid" });
  assert.deepEqual(firstError({ ...valid, email: "a@b.test, c@d.test" }), {
    email: "email_invalid",
  });
});

test("a message is capped and the source path must be an on-site path", () => {
  assert.deepEqual(
    firstError({ ...valid, message: "x".repeat(REQUEST_FIELD_LIMITS.message + 1) }),
    { message: "message_too_long" },
  );
  assert.equal(requestInputSchema.safeParse({ ...valid, sourcePath: "https://x" }).success, false);
});

test("the staff form uses the patient contract minus locale and source path", () => {
  const staffInput = {
    name: valid.name,
    phone: valid.phone,
    email: valid.email,
    location: valid.location,
    time: valid.time,
    message: valid.message,
  };
  assert.equal(staffRequestInputSchema.safeParse(staffInput).success, true);
  assert.equal(staffRequestInputSchema.safeParse({ ...staffInput, phone: "813" }).success, false);
});

test("the intake response is one of two shapes with a known failure code", () => {
  assert.equal(intakeResponseSchema.safeParse({ ok: true, id: "abc" }).success, true);
  assert.equal(intakeResponseSchema.safeParse({ ok: false, code: "rate_limited" }).success, true);
  assert.equal(intakeResponseSchema.safeParse({ ok: false, code: "exploded" }).success, false);
});

test("staff roles and password flows parse only their two values", () => {
  assert.equal(parseStaffRole("admin"), "admin");
  assert.equal(parseStaffRole("owner"), null);
  assert.equal(parsePasswordAuthFlow("recovery"), "recovery");
  assert.equal(parsePasswordAuthFlow("magiclink"), null);
});
