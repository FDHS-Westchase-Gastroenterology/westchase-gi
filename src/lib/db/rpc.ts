import "server-only";

import { z } from "zod";

import { jsonObjectSchema, jsonSchema } from "@/lib/json";
import type { Json } from "@/lib/json";

import type { Database } from "./client";
import { databaseFunctions } from "./functions";
import type { DatabaseFunctionArgs, DatabaseFunctionName } from "./functions";
import { databaseError, requestError, STATEMENT_TIMEOUT_ERROR } from "./postgrest";
import type { DatabaseError } from "./postgrest";

/** What `supabase.rpc()` resolved to, without the HTTP status fields no caller reads. */
export type RpcResult = { data: Json; error: null } | { data: null; error: DatabaseError };

/** Why a call stopped waiting for its statement, once the timeout or the caller's signal fired. */
interface Cancellation {
  reason: DatabaseError | null;
}

interface FunctionDefinition {
  readonly args: readonly (readonly [name: string, type: string])[];
}

/** PostgREST ran every request as `authenticator`, whose statements stop after 8 seconds. */
const STATEMENT_TIMEOUT_MS = 8000;

const statements = new Map<string, string>();
const resultRowsSchema = z.tuple([z.object({ data: z.string().nullable() })]);

function quoted(identifier: string): string {
  return `"${identifier.replaceAll('"', '""')}"`;
}

/**
 * The SQL PostgREST ran for `POST /rpc/<name>`: the JSON body becomes a record with one typed
 * column per argument sent, each passed by name so omitted arguments take their defaults, and
 * the single result is rendered with `to_json`.
 */
export function rpcStatement(name: DatabaseFunctionName, keys: readonly string[]): string {
  const sorted = [...keys].sort((left, right) => left.localeCompare(right));
  const cacheKey = `${name}(${sorted.join(",")})`;
  const cached = statements.get(cacheKey);
  if (cached !== undefined) return cached;

  const definition: FunctionDefinition = databaseFunctions[name];
  const columns = sorted.map((key) => {
    const argument = definition.args.find(([argumentName]) => argumentName === key);
    if (argument === undefined) throw new Error(`${name} has no argument ${key}`);
    return `${quoted(key)} ${argument[1]}`;
  });
  const call = `public.${quoted(name)}(${sorted.map((key) => `${quoted(key)} := _.${quoted(key)}`).join(", ")})`;
  const statement =
    columns.length === 0
      ? `select to_json(${call})::text as data`
      : `select to_json(${call})::text as data from json_to_record($1::text::json) as _(${columns.join(", ")})`;
  statements.set(cacheKey, statement);
  return statement;
}

function abortError(signal: Readonly<AbortSignal>): DatabaseError {
  const reason: unknown = signal.reason;
  return requestError(
    reason instanceof Error ? reason : new DOMException("This operation was aborted", "AbortError"),
  );
}

function decodeResult(rows: Readonly<unknown>): RpcResult {
  const parsed = resultRowsSchema.safeParse(rows);
  if (!parsed.success) {
    return { data: null, error: requestError(new Error("Unexpected result from the database")) };
  }
  const text = parsed.data[0].data;
  return { data: text === null ? null : jsonSchema.parse(JSON.parse(text)), error: null };
}

/**
 * Calls a public SQL function the way `supabase.rpc(name, args)` did through PostgREST and
 * resolves to the same `{ data, error }`: arguments by name, `undefined` ones left out so the
 * function's default applies, the result as JSON, and SQL errors as their SQLSTATE `code`,
 * `message`, `details` and `hint`. Never rejects for a database failure.
 *
 * A statement still running after 8 seconds is cancelled and reported as PostgREST's
 * statement timeout (`57014`). An aborted `signal` cancels the statement and reports what
 * postgrest-js reported for an aborted fetch.
 */
export async function rpc<Name extends DatabaseFunctionName>(
  db: Database,
  name: Name,
  args: DatabaseFunctionArgs[Name],
  signal?: Readonly<AbortSignal>,
): Promise<RpcResult> {
  const body = JSON.stringify(args);
  const statement = rpcStatement(name, Object.keys(jsonObjectSchema.parse(JSON.parse(body))));
  if (signal?.aborted === true) return { data: null, error: abortError(signal) };

  const query = db.$client.unsafe(statement, statement.includes("$1") ? [body] : []);
  const cancellation: Cancellation = { reason: null };
  const stop = (reason: DatabaseError) => {
    cancellation.reason ??= reason;
    query.cancel();
  };
  const timer = setTimeout(stop, STATEMENT_TIMEOUT_MS, STATEMENT_TIMEOUT_ERROR);
  const onAbort = () => {
    if (signal !== undefined) stop(abortError(signal));
  };
  signal?.addEventListener("abort", onAbort, { once: true });
  try {
    const rows = await query;
    return cancellation.reason === null
      ? decodeResult(rows)
      : { data: null, error: cancellation.reason };
  } catch (error) {
    if (cancellation.reason !== null) return { data: null, error: cancellation.reason };
    return {
      data: null,
      error: error instanceof Error ? databaseError(error) : requestError(new Error(String(error))),
    };
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", onAbort);
  }
}
