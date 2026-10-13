import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { connectionSettings, supabaseProjectRef } from "@/lib/db/connection";

const REF = "abcdefghijklmnopqrst";
const OTHER_REF = "tsrqponmlkjihgfedcba";
const POOLER_URL =
  `postgres://postgres.${REF}:p%40ss%2Fword@aws-0-us-east-2.pooler.supabase.com:6543/postgres` +
  "?sslmode=require&supa=base-pooler.x&pgbouncer=true";
const DIRECT_URL = `postgresql://postgres:secret@db.${REF}.supabase.co:5432/postgres`;

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
      ssl: "require",
      prepare: false,
      max: 5,
      idle_timeout: 20,
      connect_timeout: 10,
    });
  });

  void it("prepares statements on a direct connection and requires TLS", () => {
    const settings = connectionSettings(DIRECT_URL, undefined);
    assert.equal(settings.host, `db.${REF}.supabase.co`);
    assert.equal(settings.port, 5432);
    assert.equal(settings.ssl, "require");
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

  void it("leaves TLS off for a loopback database unless sslmode asks for it", () => {
    const local = connectionSettings("postgresql://postgres@127.0.0.1:54411/wgi_fresh", undefined);
    assert.equal(local.ssl, false);
    assert.equal(local.database, "wgi_fresh");
    assert.equal(local.password, "");
    assert.equal(
      connectionSettings("postgresql://postgres@localhost/x?sslmode=require", undefined).ssl,
      "require",
    );
    assert.equal(
      connectionSettings("postgresql://postgres@db.example.com/x?sslmode=disable", undefined).ssl,
      false,
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
