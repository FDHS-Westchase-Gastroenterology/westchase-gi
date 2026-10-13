import "server-only";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { connectionSettings } from "./connection";
import { toPostgrestTimestamp } from "./postgrest";

const TIMESTAMPTZ_OID = 1184;

/**
 * Opens a pool for one connection URL. Nothing connects until the first query. Drizzle hands
 * timestamps through as PostgreSQL text; they come back in the JSON form PostgREST returned,
 * so rows read the same as they did through supabase-js.
 */
export function openDatabase(postgresUrl: string, supabaseUrl: string | undefined) {
  const client = postgres(connectionSettings(postgresUrl, supabaseUrl));
  const db = drizzle({ client });
  client.options.parsers[TIMESTAMPTZ_OID] = toPostgrestTimestamp;
  return db;
}

export type Database = ReturnType<typeof openDatabase>;
