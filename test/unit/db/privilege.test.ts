import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";

import { z } from "zod";

import { openDatabase } from "@/lib/db/client";
import type { Database } from "@/lib/db/client";

/* What a statement may do through the app's own connection path, against a migrated database,
   read-only: the refused UPDATE and DELETE match no row and roll back. Without POSTGRES_URL it
   is skipped. PostgREST ran every request as `service_role`; `Database.transaction` must put
   each transaction in the same place. */
const postgresUrl = process.env.POSTGRES_URL?.trim() ?? "";

const sessionSchema = z.tuple([
  z.object({
    currentUser: z.string(),
    sessionUser: z.string(),
    superuser: z.boolean(),
    bypassRls: z.boolean(),
    loginMayBecomeServiceRole: z.boolean(),
    statementTimeout: z.string(),
    lockTimeout: z.string(),
  }),
]);

const grantsSchema = z.tuple([
  z.object({
    publicPolicies: z.number(),
    tablesOwned: z.number(),
    receiptsOwner: z.string(),
    auditLogOwner: z.string(),
    receiptsSelect: z.boolean(),
    receiptsInsert: z.boolean(),
    receiptsUpdate: z.boolean(),
    receiptsDelete: z.boolean(),
    auditLogUpdate: z.boolean(),
    auditLogDelete: z.boolean(),
  }),
]);

const countSchema = z.tuple([z.object({ count: z.number() })]);

void describe("the app's database session", { skip: postgresUrl === "" }, () => {
  let db: Database;

  before(() => {
    db = openDatabase(postgresUrl, undefined);
  });

  after(async () => {
    await db.close();
  });

  void it("runs as service_role, not a superuser, under PostgREST's 8-second limits", async (t) => {
    const [session] = sessionSchema.parse(
      await db.transaction((sql) =>
        sql.unsafe(`
          select current_user::text as "currentUser",
                 session_user::text as "sessionUser",
                 r.rolsuper as superuser,
                 r.rolbypassrls as "bypassRls",
                 pg_has_role(session_user, 'service_role', 'member') as "loginMayBecomeServiceRole",
                 current_setting('statement_timeout') as "statementTimeout",
                 current_setting('lock_timeout') as "lockTimeout"
          from pg_roles r
          where r.rolname = current_user`),
      ),
    );
    t.diagnostic(JSON.stringify(session));
    assert.equal(session.currentUser, "service_role");
    assert.equal(session.superuser, false);
    assert.equal(session.loginMayBecomeServiceRole, true);
    assert.equal(session.statementTimeout, "8s");
    assert.equal(session.lockTimeout, "8s");
  });

  void it("meets no row-level policy and owns no table, so its grants are all it has", async (t) => {
    const [grants] = grantsSchema.parse(
      await db.transaction((sql) =>
        sql.unsafe(`
          select (select count(*)::int from pg_policies where schemaname = 'public') as "publicPolicies",
                 (select count(*)::int from pg_tables where tableowner = current_user) as "tablesOwned",
                 (select tableowner::text from pg_tables
                   where schemaname = 'public' and tablename = 'staff_request_receipts') as "receiptsOwner",
                 (select tableowner::text from pg_tables
                   where schemaname = 'public' and tablename = 'audit_log') as "auditLogOwner",
                 has_table_privilege('public.staff_request_receipts', 'SELECT') as "receiptsSelect",
                 has_table_privilege('public.staff_request_receipts', 'INSERT') as "receiptsInsert",
                 has_table_privilege('public.staff_request_receipts', 'UPDATE') as "receiptsUpdate",
                 has_table_privilege('public.staff_request_receipts', 'DELETE') as "receiptsDelete",
                 has_table_privilege('public.audit_log', 'UPDATE') as "auditLogUpdate",
                 has_table_privilege('public.audit_log', 'DELETE') as "auditLogDelete"`),
      ),
    );
    t.diagnostic(JSON.stringify(grants));
    assert.equal(grants.publicPolicies, 0);
    assert.equal(grants.tablesOwned, 0);
    assert.notEqual(grants.receiptsOwner, "service_role");
    assert.notEqual(grants.auditLogOwner, "service_role");
    // Migration 20260817164844: receipts are read and written, never changed or removed.
    assert.equal(grants.receiptsSelect, true);
    assert.equal(grants.receiptsInsert, true);
    assert.equal(grants.receiptsUpdate, false);
    assert.equal(grants.receiptsDelete, false);
  });

  void it("is refused an UPDATE or a DELETE of a receipt with 42501", async (t) => {
    await assert.rejects(
      db.transaction((sql) =>
        sql.unsafe("update public.staff_request_receipts set request_id = request_id where false"),
      ),
      { name: "DatabaseFailure", code: "42501" },
    );
    await assert.rejects(
      db.transaction((sql) => sql.unsafe("delete from public.staff_request_receipts where false")),
      { name: "DatabaseFailure", code: "42501" },
    );
    t.diagnostic("update and delete of staff_request_receipts: 42501, rolled back");
  });

  void it("needs no request.jwt claims: nothing in public reads them", async (t) => {
    const [readers] = countSchema.parse(
      await db.transaction((sql) =>
        sql.unsafe(`
          select (
            (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
              where n.nspname = 'public'
                and p.prosrc ~* 'request\\.jwt|auth\\.(uid|jwt|role|email)\\s*\\(|current_setting\\s*\\(\\s*''request')
            + (select count(*) from pg_attrdef d join pg_class c on c.oid = d.adrelid
                join pg_namespace n on n.oid = c.relnamespace
              where n.nspname = 'public'
                and pg_get_expr(d.adbin, d.adrelid) ~* 'request\\.jwt|auth\\.(uid|jwt|role|email)\\s*\\(')
          )::int as count`),
      ),
    );
    t.diagnostic(`public functions and column defaults reading JWT claims: ${readers.count}`);
    assert.equal(readers.count, 0);
  });
});
