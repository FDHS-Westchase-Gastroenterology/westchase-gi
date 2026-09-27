import assert from "node:assert/strict";
import test from "node:test";

import { displayNameOrEmail } from "./staff-identity.ts";

test("displayNameOrEmail returns the known display name", () => {
  const nameMap = new Map([["juliet@example.com", "Juliet Oliva"]]);
  assert.equal(displayNameOrEmail(nameMap, "juliet@example.com"), "Juliet Oliva");
});

test("displayNameOrEmail falls back to the raw email when unknown", () => {
  const nameMap = new Map([["juliet@example.com", "Juliet Oliva"]]);
  assert.equal(displayNameOrEmail(nameMap, "external@example.com"), "external@example.com");
});

test("displayNameOrEmail normalizes case and surrounding whitespace", () => {
  const nameMap = new Map([["juliet@example.com", "Juliet Oliva"]]);
  assert.equal(displayNameOrEmail(nameMap, "  Juliet@Example.com  "), "Juliet Oliva");
});

test("displayNameOrEmail ignores empty mapped names", () => {
  const nameMap = new Map([["blank@example.com", ""]]);
  assert.equal(displayNameOrEmail(nameMap, "blank@example.com"), "blank@example.com");
});
