import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import test from "node:test";

/* A product file an agent cannot load whole is a tax on every future session.
   Files over the threshold must be listed in file-size-allowlist.json with
   their current line count; a listed file may shrink but never grow, and a
   file that drops under the threshold must leave the list. The list can
   only get shorter. */

const THRESHOLD = 400;
const ROOT = "src";
const EXCLUDED = ["src/components/stock/", "src/lib/content/", "src/lib/dictionaries/"];
const ALLOWLIST_PATH = new URL("./file-size-allowlist.json", import.meta.url);

function productFiles(dir) {
  const files = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      files.push(...productFiles(path));
      continue;
    }
    if (!/\.tsx?$/.test(entry) || /\.test\./.test(entry)) continue;
    const relativePath = relative(".", path);
    if (EXCLUDED.some((prefix) => relativePath.startsWith(prefix))) continue;
    files.push(relativePath);
  }
  return files;
}

function lineCount(path) {
  return readFileSync(path, "utf8").split("\n").length - 1;
}

const allowlist = JSON.parse(readFileSync(ALLOWLIST_PATH, "utf8"));
const oversized = new Map(
  productFiles(ROOT)
    .map((path) => [path, lineCount(path)])
    .filter(([, lines]) => lines > THRESHOLD),
);

test(`every product file over ${THRESHOLD} lines is on the allowlist at or under its recorded size`, () => {
  const problems = [];
  for (const [path, lines] of oversized) {
    const recorded = allowlist[path];
    if (recorded === undefined) {
      problems.push(
        `${path} is ${lines} lines and not on the allowlist; split it along a real seam`,
      );
    } else if (lines > recorded) {
      problems.push(`${path} grew from ${recorded} to ${lines} lines; the allowlist only shrinks`);
    }
  }
  assert.deepEqual(problems, []);
});

test("the allowlist names only files that still exceed the threshold", () => {
  const stale = Object.keys(allowlist).filter((path) => !oversized.has(path));
  assert.deepEqual(
    stale,
    [],
    "remove these from test/file-size-allowlist.json; they are under the threshold or gone",
  );
});
