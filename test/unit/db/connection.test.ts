import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { describe, it } from "node:test";
import { inspect } from "node:util";

import { connectionSettings, parsePostgresUrl, supabaseProjectRef } from "@/lib/db/connection";
import { SUPABASE_ROOT_CA } from "@/lib/db/supabase-root-ca";

const REF = "abcdefghijklmnopqrst";
const OTHER_REF = "tsrqponmlkjihgfedcba";
const POOLER_URL =
  `postgres://postgres.${REF}:p%40ss%2Fword@aws-0-us-east-2.pooler.supabase.com:6543/postgres` +
  "?sslmode=require&supa=base-pooler.x&pgbouncer=true";
const DIRECT_URL = `postgresql://postgres:secret@db.${REF}.supabase.co:5432/postgres`;
const VERIFIED_TLS = { rejectUnauthorized: true, ca: SUPABASE_ROOT_CA };

void describe("supabaseProjectRef", () => {
  void it("reads the pooler user, the direct host and the API host", () => {
    assert.equal(supabaseProjectRef(new URL(POOLER_URL)), REF);
    assert.equal(supabaseProjectRef(new URL(DIRECT_URL)), REF);
    assert.equal(supabaseProjectRef(new URL(`https://${REF}.supabase.co`)), REF);
  });

  void it("names no project for a local or unrelated host", () => {
    assert.equal(supabaseProjectRef(new URL("http://127.0.0.1:54321")), null);
    assert.equal(supabaseProjectRef(new URL("postgresql://postgres@db.example.com/app")), null);
  });
});

void describe("connectionSettings", () => {
  void it("runs a Supavisor transaction pooler without prepared statements", () => {
    assert.deepEqual(connectionSettings(POOLER_URL, `https://${REF}.supabase.co`), {
      host: "aws-0-us-east-2.pooler.supabase.com",
      port: 6543,
      database: "postgres",
      username: `postgres.${REF}`,
      password: "p@ss/word",
      ssl: VERIFIED_TLS,
      prepare: false,
      max: 5,
      idle_timeout: 20,
      connect_timeout: 10,
    });
  });

  void it("prepares statements on a direct connection and verifies its certificate", () => {
    const settings = connectionSettings(DIRECT_URL, undefined);
    assert.equal(settings.host, `db.${REF}.supabase.co`);
    assert.equal(settings.port, 5432);
    assert.deepEqual(settings.ssl, VERIFIED_TLS);
    assert.equal(settings.prepare, true);
    assert.equal(settings.max, 10);
  });

  void it("treats port 6543 as a transaction pooler on any host", () => {
    const settings = connectionSettings(
      "postgresql://u:p@pooler.internal:6543/postgres",
      undefined,
    );
    assert.equal(settings.prepare, false);
    assert.equal(settings.max, 5);
  });

  void it("leaves TLS off only for a loopback database", () => {
    const local = connectionSettings("postgresql://postgres@127.0.0.1:54411/wgi_fresh", undefined);
    assert.equal(local.ssl, false);
    assert.equal(local.database, "wgi_fresh");
    assert.equal(local.password, "");
    assert.equal(
      connectionSettings("postgresql://postgres@localhost/x?sslmode=disable", undefined).ssl,
      false,
    );
    assert.throws(
      () => connectionSettings("postgresql://postgres@localhost/x?sslmode=require", undefined),
      /may not ask for TLS to a database on this machine/u,
    );
  });

  void it("verifies TLS for any other host, whatever sslmode says, and refuses to turn it off", () => {
    for (const mode of ["", "?sslmode=require", "?sslmode=prefer", "?sslmode=verify-full"]) {
      assert.deepEqual(
        connectionSettings(`postgresql://postgres@db.example.com/x${mode}`, undefined).ssl,
        VERIFIED_TLS,
      );
    }
    assert.throws(
      () => connectionSettings("postgresql://postgres@db.example.com/x?sslmode=disable", undefined),
      /may not turn TLS off for a database on another machine/u,
    );
  });

  void it("defaults the port, the database and the connect timeout", () => {
    const settings = connectionSettings("postgres://postgres@db.example.com", undefined);
    assert.equal(settings.port, 5432);
    assert.equal(settings.database, "postgres");
    assert.equal(settings.connect_timeout, 10);
    assert.equal(
      connectionSettings("postgres://h/x?connect_timeout=5", undefined).connect_timeout,
      5,
    );
    for (const value of ["0", "-1", "1.5", "soon"]) {
      assert.equal(
        connectionSettings(`postgres://h/x?connect_timeout=${value}`, undefined).connect_timeout,
        10,
      );
    }
  });

  void it("refuses a URL that is not PostgreSQL", () => {
    assert.throws(
      () => connectionSettings("https://db.example.com/x", undefined),
      /must be a postgres:\/\/ or postgresql:\/\/ URL/u,
    );
  });

  void it("refuses a database and an API that name different Supabase projects", () => {
    assert.throws(
      () => connectionSettings(POOLER_URL, `https://${OTHER_REF}.supabase.co`),
      /name different Supabase projects/u,
    );
    assert.throws(
      () => connectionSettings(DIRECT_URL, `https://${OTHER_REF}.supabase.co`),
      /name different Supabase projects/u,
    );
  });

  void it("accepts an API URL that names no project", () => {
    assert.equal(connectionSettings(POOLER_URL, "http://127.0.0.1:54321").host.length > 0, true);
    assert.equal(connectionSettings(POOLER_URL, "").username, `postgres.${REF}`);
  });
});

/* Every way a caller, a logger or an uncaught-error report could print an error: its message,
   its stack, its own enumerable properties, its JSON, and `util.inspect` with hidden properties
   and the whole cause chain. */
function printedForms(error: Readonly<Error>): string[] {
  return [
    error.message,
    error.stack ?? "",
    ...Object.entries(error).map(([key, value]) => `${key}=${inspect(value)}`),
    JSON.stringify(error),
    inspect(error, { depth: Infinity, showHidden: true }),
  ];
}

function thrownBy(run: () => object): Error {
  try {
    run();
  } catch (error) {
    assert.ok(error instanceof Error);
    return error;
  }
  throw new assert.AssertionError({ message: "expected a throw" });
}

void describe("a malformed POSTGRES_URL", () => {
  const sentinel = `ZZSENTINEL${randomUUID().replaceAll("-", "")}`;
  // Each is refused by the WHATWG URL parser: a port out of range, and a broken IPv6 host.
  const malformed = [
    `postgres://postgres.${REF}:${sentinel}@aws-0-us-east-2.pooler.supabase.com:99999/postgres`,
    `postgresql://postgres:${sentinel}@[db.${REF}.supabase.co:5432/postgres`,
  ];

  void it("would leak its password through Node's own parse error", () => {
    // Shows the check below can see a leak: ERR_INVALID_URL keeps the whole input.
    for (const url of malformed) {
      const raw = thrownBy(() => new URL(url));
      assert.ok(printedForms(raw).some((form) => form.includes(sentinel)));
    }
  });

  void it("throws a fixed message with no cause and no trace of the password", () => {
    for (const url of malformed) {
      for (const run of [
        () => parsePostgresUrl(url),
        () => connectionSettings(url, `https://${REF}.supabase.co`),
      ]) {
        const error = thrownBy(run);
        assert.equal(error.message, "POSTGRES_URL is not a valid URL");
        assert.equal(Object.hasOwn(error, "cause"), false);
        assert.deepEqual(Object.keys(error), []);
        for (const form of printedForms(error)) assert.equal(form.includes(sentinel), false);
      }
    }
  });

  void it("keeps the password out of a percent-encoding error too", () => {
    const url = `postgres://postgres:${sentinel}%zz@db.${REF}.supabase.co:5432/postgres`;
    const error = thrownBy(() => connectionSettings(url, undefined));
    for (const form of printedForms(error)) assert.equal(form.includes(sentinel), false);
  });
});
