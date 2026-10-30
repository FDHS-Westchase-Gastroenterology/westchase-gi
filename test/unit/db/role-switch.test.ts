import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, it } from "node:test";

/* The app connects as `postgres` and drops to `service_role` for each transaction, in one place.
   Any other role switch (`reset role` above all) would run with the login role's privileges, so
   the only file allowed to name one is the client that does the drop. */
const repositoryRoot = new URL("../../../", import.meta.url).pathname;
const sourceRoot = join(repositoryRoot, "src");
const ALLOWED = "src/lib/db/client.ts";
const ROLE_SWITCH =
  /\breset\s+role\b|\bset\s+(?:local\s+|session\s+)?role\b|\bset_config\s*\(\s*['"`]role['"`]/giu;

function sourceFiles(): string[] {
  return readdirSync(sourceRoot, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => relative(repositoryRoot, join(entry.parentPath, entry.name)));
}

function roleSwitches(path: string): string[] {
  const text = readFileSync(join(repositoryRoot, path), "utf8");
  return [...text.matchAll(ROLE_SWITCH)].map((match) => {
    const line = text.slice(0, match.index).split("\n").length;
    return `${path}:${String(line)}: ${match[0]}`;
  });
}

void describe("role switches under src/", () => {
  void it(`happen only in ${ALLOWED}`, () => {
    const files = sourceFiles();
    assert.ok(files.includes(ALLOWED), `${ALLOWED} moved; update this test`);
    const found = files.filter((path) => path !== ALLOWED).flatMap(roleSwitches);
    assert.deepEqual(found, []);
  });

  void it(`still finds the one in ${ALLOWED}`, () => {
    // Keeps the pattern honest: it must match the switch the client really makes.
    assert.deepEqual(
      roleSwitches(ALLOWED).map((hit) => hit.replace(/^[^ ]+ /u, "")),
      ["set_config('role'"],
    );
  });
});
