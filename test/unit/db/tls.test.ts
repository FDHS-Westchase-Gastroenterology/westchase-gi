import assert from "node:assert/strict";
import { X509Certificate } from "node:crypto";
import { resolve4, resolveCname } from "node:dns/promises";
import { after, before, describe, it } from "node:test";

import postgres from "postgres";

import { openDatabase } from "@/lib/db/client";
import type { Database } from "@/lib/db/client";
import { connectionSettings } from "@/lib/db/connection";
import { SUPABASE_ROOT_CA } from "@/lib/db/supabase-root-ca";

const DAY_MS = 24 * 60 * 60 * 1000;

void describe("the pinned Supabase root", () => {
  const root = new X509Certificate(SUPABASE_ROOT_CA);

  void it("is the certificate authority its comment names", () => {
    assert.equal(
      root.fingerprint256,
      "80:70:25:AD:50:D4:ED:21:9D:2C:9C:7D:29:9C:00:4F:82:4E:B0:0C:F7:F6:5A:FE:F6:07:D0:7B:72:E6:CA:FA",
    );
    assert.equal(root.subject.split("\n").at(-1), "CN=Supabase Root 2021 CA");
    assert.equal(root.ca, true);
    assert.equal(root.checkIssued(root), true);
    assert.equal(root.verify(root.publicKey), true);
  });

  void it("stays valid for at least 90 more days", () => {
    assert.ok(
      new Date(root.validTo).getTime() - Date.now() > 90 * DAY_MS,
      `Supabase Root 2021 CA expires ${root.validTo}; take its replacement from the project's ` +
        "Database settings and update src/lib/db/supabase-root-ca.ts",
    );
  });
});

/* The rest connects to the Supavisor pooler in POSTGRES_URL, read-only (`select 1`), and is
   skipped for any other database. */
const postgresUrl = process.env.POSTGRES_URL?.trim() ?? "";
const pooler = postgresUrl !== "" && new URL(postgresUrl).hostname.endsWith(".pooler.supabase.com");

/** The same pooler under a name its certificate does not carry: its load balancer's own. */
async function unnamedHost(hostname: string): Promise<string> {
  try {
    const alias = (await resolveCname(hostname)).at(0);
    if (alias !== undefined) return alias;
  } catch {
    // No CNAME here; fall back to the address.
  }
  const address = (await resolve4(hostname)).at(0);
  if (address === undefined) throw new Error(`${hostname} has no address`);
  return address;
}

void describe("TLS to the pooler", { skip: !pooler }, () => {
  let db: Database;

  before(() => {
    db = openDatabase(postgresUrl, undefined);
  });

  after(async () => {
    await db.close();
  });

  void it("verifies the pooler's certificate against the pinned root", async (t) => {
    const settings = connectionSettings(postgresUrl, undefined);
    assert.deepEqual(settings.ssl, { rejectUnauthorized: true, ca: SUPABASE_ROOT_CA });
    const rows = await db.transaction((sql) => sql.unsafe("select 1 as one"));
    assert.deepEqual([...rows], [{ one: 1 }]);
    t.diagnostic(`${settings.host}:${settings.port} verified against Supabase Root 2021 CA`);
  });

  void it("cannot verify it against the operating system's roots alone", async (t) => {
    const settings = connectionSettings(postgresUrl, undefined);
    const systemRoots = postgres({ ...settings, ssl: { rejectUnauthorized: true } });
    try {
      await assert.rejects(systemRoots.unsafe("select 1"), { code: "SELF_SIGNED_CERT_IN_CHAIN" });
      t.diagnostic("system roots only: SELF_SIGNED_CERT_IN_CHAIN");
    } finally {
      await systemRoots.end();
    }
  });

  void it("refuses the same server under a name its certificate does not carry", async (t) => {
    const url = new URL(postgresUrl);
    url.hostname = await unnamedHost(url.hostname);
    const mismatched = openDatabase(url.toString(), undefined);
    try {
      await assert.rejects(
        mismatched.transaction((sql) => sql.unsafe("select 1")),
        { code: "ERR_TLS_CERT_ALTNAME_INVALID" },
      );
      t.diagnostic(`${url.hostname}:${url.port}: ERR_TLS_CERT_ALTNAME_INVALID`);
    } finally {
      await mismatched.close();
    }
  });
});
