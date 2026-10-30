import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { describe, it } from "node:test";

import { DrizzleQueryError } from "drizzle-orm";

import { DatabaseFailure, databaseError, scrubbed } from "@/lib/db/failure";
import { requestError } from "@/lib/db/postgrest";

void describe("scrubbed", () => {
  void it("passes an error that did not come from the database through unchanged", () => {
    const refused = new Error("connect ECONNREFUSED 127.0.0.1:1");
    assert.equal(scrubbed(refused), refused);
  });

  void it("drops a Drizzle query error's statement and parameters", () => {
    const failure = scrubbed(
      new DrizzleQueryError("insert into t (v) values ($1)", ["ZZSENTINEL-drizzle"]),
    );
    assert.ok(failure instanceof DatabaseFailure);
    assert.equal(failure.message, "Database request failed");
    assert.equal(failure.cause, undefined);
    assert.doesNotMatch(JSON.stringify(failure), /ZZSENTINEL/u);
  });
});

void describe("databaseError", () => {
  void it("treats an error without a SQLSTATE as a failed request", () => {
    const failure = new Error("connect ECONNREFUSED 127.0.0.1:1");
    assert.deepEqual(databaseError(failure), requestError(failure));
  });
});

/* Runs test/unit/db/sentinel-probe.ts against the database in POSTGRES_URL and reads every byte
   it writes. The database refuses three statements carrying the sentinel (a unique violation,
   a check violation thrown as Drizzle throws it, and a bad uuid argument), and the probe prints
   each resulting error every way a caller could. Without POSTGRES_URL it is skipped. */
const postgresUrl = process.env.POSTGRES_URL?.trim() ?? "";
const repositoryRoot = new URL("../../../", import.meta.url).pathname;

function occurrences(text: string, needle: string): number {
  return text.split(needle).length - 1;
}

void describe("a refused statement carrying a patient value", { skip: postgresUrl === "" }, () => {
  void it("never prints the value, to stdout or stderr, or returns it", (t) => {
    const sentinel = `ZZSENTINEL-${randomUUID()}`;
    const probe = spawnSync(
      process.execPath,
      [
        "--disable-warning=MODULE_TYPELESS_PACKAGE_JSON",
        "--import",
        "./test/register.mjs",
        "test/unit/db/sentinel-probe.ts",
      ],
      {
        cwd: repositoryRoot,
        encoding: "utf8",
        env: { ...process.env, SCRUB_SENTINEL: sentinel },
        timeout: 120_000,
      },
    );
    assert.equal(probe.status, 0, `the probe exited with ${String(probe.status ?? probe.signal)}`);
    const { stdout, stderr } = probe;
    t.diagnostic(`stdout: ${stdout.length} bytes, stderr: ${stderr.length} bytes`);
    for (const line of stdout
      .split("\n")
      .filter((text) => /^(?:2[0-9A-Z]{4}|readActivity) /u.test(text))) {
      t.diagnostic(line);
    }
    for (const line of stderr.split("\n").filter((text) => text.startsWith("[db] "))) {
      t.diagnostic(`stderr ${line}`);
    }

    // The database really did put the value in each error, and the wrapper held it back.
    assert.match(stdout, /^23505 code=23505 constraint=scrub_probe_v_key table=scrub_probe$/mu);
    assert.match(stdout, /^23505 raw error carried the value: true$/mu);
    assert.match(stdout, /^23514 code=23514 constraint=scrub_probe_n_check table=scrub_probe$/mu);
    assert.match(stdout, /^23514 raw error carried the value: true$/mu);
    assert.match(stdout, /^22P02 rpc code=22P02$/mu);
    assert.match(stdout, /^22P02 rpc-shaped error holds it in memory: true$/mu);
    assert.match(stdout, /^readActivity returned \{"ok":false,"code":"unavailable"\}$/mu);
    assert.doesNotMatch(stdout, /NOT SCRUBBED|NOT REFUSED/u);
    assert.match(stderr, /\[db\] query failed \{[^}]*code: '23505'/u);

    assert.equal(occurrences(stdout, sentinel), 0, "the sentinel reached stdout");
    assert.equal(occurrences(stderr, sentinel), 0, "the sentinel reached stderr");
    assert.equal(occurrences(stdout + stderr, "ZZSENTINEL"), 0, "a sentinel prefix leaked");
  });
});
