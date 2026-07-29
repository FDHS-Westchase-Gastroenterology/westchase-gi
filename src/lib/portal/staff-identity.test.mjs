import assert from "node:assert/strict";
import { register } from "node:module";
import test from "node:test";
import { pathToFileURL } from "node:url";

// staff-identity is server-only. Node's test runner needs a resolve hook;
// Next's bundler supplies the real guard at build time.
register(
  `data:text/javascript,${encodeURIComponent(`
    export async function resolve(specifier, context, nextResolve) {
      if (specifier === "server-only") {
        return {
          shortCircuit: true,
          url: "data:text/javascript,export {}",
          format: "module",
        };
      }
      return nextResolve(specifier, context);
    }
  `)}`,
  pathToFileURL("./"),
);

const { displayNameOrEmail } = await import("./staff-identity.ts");

test("displayNameOrEmail returns the known display name", () => {
  const nameMap = new Map([["juliet@example.com", "Juliet Oliva"]]);
  assert.equal(
    displayNameOrEmail(nameMap, "juliet@example.com"),
    "Juliet Oliva",
  );
});

test("displayNameOrEmail falls back to the raw email when unknown", () => {
  const nameMap = new Map([["juliet@example.com", "Juliet Oliva"]]);
  assert.equal(
    displayNameOrEmail(nameMap, "external@example.com"),
    "external@example.com",
  );
});

test("displayNameOrEmail normalizes case and surrounding whitespace", () => {
  const nameMap = new Map([["juliet@example.com", "Juliet Oliva"]]);
  assert.equal(
    displayNameOrEmail(nameMap, "  Juliet@Example.com  "),
    "Juliet Oliva",
  );
});

test("displayNameOrEmail ignores empty mapped names", () => {
  const nameMap = new Map([["blank@example.com", ""]]);
  assert.equal(
    displayNameOrEmail(nameMap, "blank@example.com"),
    "blank@example.com",
  );
});
