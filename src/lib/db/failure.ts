import "server-only";

import { DrizzleQueryError } from "drizzle-orm";
import postgres from "postgres";

import { requestError } from "./postgrest";
import type { DatabaseError } from "./postgrest";

/**
 * A statement the database refused, with nothing that can carry a row value. PostgreSQL puts
 * values in a message (`invalid input syntax for type uuid: "…"`), a detail
 * (`Key (email)=(…) already exists`) and the context; postgres.js keeps the statement's
 * parameters; Drizzle prints them in its message. None of that is on this error: its message is
 * fixed, it has no `cause`, and its fields are the SQLSTATE and the names of the constraint,
 * table and server routine. Log it, compare its `code`, never show any of it to a user.
 */
export class DatabaseFailure extends Error {
  override readonly name = "DatabaseFailure";
  readonly code: string;
  readonly constraint: string | null;
  readonly table: string | null;
  readonly routine: string | null;

  constructor(
    code: string,
    constraint: string | null,
    table: string | null,
    routine: string | null,
  ) {
    super(code === "" ? "Database request failed" : `Database request failed (SQLSTATE ${code})`);
    this.code = code;
    this.constraint = constraint;
    this.table = table;
    this.routine = routine;
  }
}

/* The PostgREST-shaped error each failure stands for, kept off the failure itself so neither
   logging nor serializing it can reach the message, detail or hint. Only `databaseError` reads
   it, for `rpc()`'s in-memory `{ code, message, details, hint }`. */
const postgrestErrors = new WeakMap<DatabaseFailure, DatabaseError>();

function fromPostgres(error: postgres.PostgresError): DatabaseFailure {
  const failure = new DatabaseFailure(
    error.code,
    error.constraint_name ?? null,
    error.table_name ?? null,
    error.routine,
  );
  postgrestErrors.set(failure, {
    code: error.code,
    message: error.message,
    details: error.detail ?? null,
    hint: error.hint ?? null,
  });
  return failure;
}

/**
 * What `Database.transaction` throws in place of an error from the database: a PostgreSQL
 * error, or a Drizzle query error wrapping one, becomes a `DatabaseFailure` and is logged as
 * `{ code, constraint, table, routine }` and nothing else. Any other error (a refused
 * connection, a failed TLS check, a bug in the caller's own code) carries no row values and is
 * returned as it is.
 */
export function scrubbed(error: Readonly<Error>): Error {
  if (error instanceof DrizzleQueryError) {
    const { cause } = error;
    if (cause instanceof Error) return scrubbed(cause);
    return new DatabaseFailure("", null, null, null);
  }
  if (!(error instanceof postgres.PostgresError)) return error;
  const failure = fromPostgres(error);
  console.error("[db] query failed", {
    code: failure.code,
    constraint: failure.constraint,
    table: failure.table,
    routine: failure.routine,
  });
  return failure;
}

/**
 * The `{ code, message, details, hint }` PostgREST would have answered with, for `rpc()`'s
 * supabase-js-shaped result. It holds the server's own message and detail, row values included,
 * so it stays in memory: callers branch on `code` and neither log it nor return it.
 */
export function databaseError(error: Readonly<Error>): DatabaseError {
  const known = error instanceof DatabaseFailure ? postgrestErrors.get(error) : undefined;
  return known ?? requestError(error);
}
