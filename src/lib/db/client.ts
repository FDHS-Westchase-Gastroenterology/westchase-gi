import "server-only";

import postgres from "postgres";

import { connectionSettings } from "./connection";
import { scrubbed } from "./failure";
import { toPostgrestTimestamp } from "./postgrest";

const TIMESTAMPTZ_OID = 1184;

/**
 * What every transaction does before its work. supabase-js signed each request with the
 * service-role key, so PostgREST ran it as `service_role`, under the `authenticator` role's
 * 8-second statement and lock timeouts; this puts a transaction in the same place, the way
 * PostgREST did, with `set_config(..., true)`, so it meets the same grants (no UPDATE or DELETE
 * on `staff_request_receipts`, for one) and the same limits. A local setting ends with the
 * transaction, so nothing leaks to the next one the pooler runs on this connection. No public
 * function reads `request.jwt.claims` or `auth.role()`; `test/unit/db/privilege.test.ts` fails if
 * one starts to, since this would then need to set them too.
 */
async function assumeServiceRole(sql: postgres.TransactionSql): Promise<void> {
  await sql`
    select set_config('role', 'service_role', true),
           set_config('statement_timeout', '8s', true),
           set_config('lock_timeout', '8s', true)`;
}

/**
 * The app's database. The only way to run a statement is `transaction()`; the pool itself is
 * private, so no query can skip the role and limits it sets.
 */
class Database {
  readonly #client: postgres.Sql;

  constructor(client: postgres.Sql) {
    this.#client = client;
  }

  /**
   * Runs `work` in one transaction as `service_role`, committing when it resolves and rolling
   * back when it throws. A database error comes out as a `DatabaseFailure` that carries no row
   * values (see `scrubbed`).
   */
  async transaction<T>(work: (sql: postgres.TransactionSql) => Promise<T>): Promise<T> {
    try {
      const { value } = await this.#client.begin(async (sql) => {
        await assumeServiceRole(sql);
        return { value: await work(sql) };
      });
      return value;
    } catch (error) {
      throw scrubbed(error instanceof Error ? error : new Error("Database request failed"));
    }
  }

  /** Waits for running statements and closes every connection. */
  async close(): Promise<void> {
    await this.#client.end();
  }
}

export type { Database };

/**
 * Opens a pool for one connection URL. Nothing connects until the first transaction.
 * Timestamps come back in the JSON form PostgREST returned, so rows read the same as they did
 * through supabase-js.
 */
export function openDatabase(postgresUrl: string, supabaseUrl: string | undefined): Database {
  const client = postgres(connectionSettings(postgresUrl, supabaseUrl));
  client.options.parsers[TIMESTAMPTZ_OID] = toPostgrestTimestamp;
  return new Database(client);
}
