/* Run by failure.test.ts in a process of its own, so the test reads every byte this writes to
   stdout and stderr. It makes the database refuse statements that carry the sentinel in
   `SCRUB_SENTINEL`, through the app's own connection path, then prints each error every way a
   careless caller could: logged as is, inspected with hidden fields, stringified, serialized
   and with its stack. It writes only to a temporary table that is dropped when the
   transaction rolls back. */
import { inspect } from "node:util";

import { DrizzleQueryError } from "drizzle-orm";
import postgres from "postgres";

import { openDatabase } from "@/lib/db/client";
import { DatabaseFailure, databaseError } from "@/lib/db/failure";
import { rpc } from "@/lib/db/rpc";
import { readActivity } from "@/lib/portal/activity";

const sentinel = process.env.SCRUB_SENTINEL ?? "";
const postgresUrl = process.env.POSTGRES_URL?.trim() ?? "";
if (!sentinel.startsWith("ZZSENTINEL-") || postgresUrl === "") {
  throw new Error("Run by test/unit/db/failure.test.ts with SCRUB_SENTINEL and POSTGRES_URL");
}

const PROBE_TABLE = `create temp table scrub_probe (
  v text constraint scrub_probe_v_key unique,
  n integer constraint scrub_probe_n_check check (n > 0)
) on commit drop`;

/** Whether an error, before the wrapper sees it, really carried the value. */
function carries(error: Readonly<Error>): boolean {
  return inspect(error, { depth: null, showHidden: true }).includes(sentinel);
}

function report(label: string, error: Readonly<Error>, rawCarried: boolean): void {
  console.log(`${label} thrown:`, error);
  console.error(`${label} thrown:`, error);
  console.log(inspect(error, { depth: null, showHidden: true }));
  console.log(`${error.name}: ${error.message}`);
  console.log(JSON.stringify(error));
  console.log(error.stack ?? "");
  if (!(error instanceof DatabaseFailure)) {
    console.log(`${label} NOT SCRUBBED: ${error.name}`);
    return;
  }
  console.log(
    `${label} code=${error.code} constraint=${error.constraint ?? "-"} table=${error.table ?? "-"}`,
  );
  console.log(`${label} raw error carried the value: ${String(rawCarried)}`);
  const inMemory = databaseError(error);
  console.log(
    `${label} rpc-shaped error holds it in memory: ${String(JSON.stringify(inMemory).includes(sentinel))}`,
  );
}

const db = openDatabase(postgresUrl, undefined);

async function forced(
  label: string,
  work: (sql: postgres.TransactionSql, seen: (error: Readonly<Error>) => void) => Promise<void>,
): Promise<void> {
  let rawCarried = false;
  try {
    await db.transaction(async (sql) => {
      await sql.unsafe(PROBE_TABLE);
      await work(sql, (error) => {
        rawCarried = carries(error);
      });
    });
    console.log(`${label} NOT REFUSED`);
  } catch (error) {
    report(label, error instanceof Error ? error : new Error("not an Error"), rawCarried);
  }
}

try {
  // A unique violation: 23505, detail `Key (v)=(<sentinel>) already exists.`
  await forced("23505", async (sql, seen) => {
    await sql.unsafe("insert into scrub_probe (v, n) values ($1, 1)", [sentinel]);
    try {
      await sql.unsafe("insert into scrub_probe (v, n) values ($1, 1)", [sentinel]);
    } catch (error) {
      if (error instanceof Error) seen(error);
      throw error;
    }
  });

  /* A check violation, detail `Failing row contains (<sentinel>, -1).`, thrown the way Drizzle
     throws it: wrapped in a DrizzleQueryError whose message lists the parameters. */
  await forced("23514", async (sql, seen) => {
    const statement = "insert into scrub_probe (v, n) values ($1, $2)";
    try {
      await sql.unsafe(statement, [sentinel, -1]);
    } catch (error) {
      if (!(error instanceof postgres.PostgresError)) throw error;
      const wrapped = new DrizzleQueryError(statement, [sentinel, -1], error);
      seen(wrapped);
      throw wrapped;
    }
  });

  // A bad argument to a database function: 22P02, `invalid input syntax for type uuid: "<sentinel>"`.
  const call = await rpc(db, "portal_read_activity", { p_actor_id: sentinel });
  console.log(`22P02 rpc code=${call.error?.code ?? "-"}`);
  console.log(
    `22P02 rpc-shaped error holds it in memory: ${String(call.error?.message.includes(sentinel) ?? false)}`,
  );

  // What the Activity log's server action and page get back for the same refusal.
  const page = await readActivity(db, sentinel, {}, null);
  console.log(`readActivity returned ${JSON.stringify(page)}`);
} finally {
  await db.close();
}
