import type { PostgrestError } from "@supabase/supabase-js";

/** One table's share of a fixture cleanup. */
export interface RemovedRows {
  readonly table: string;
  readonly count: number;
}

/** Throws a cleanup delete's error under its table name; otherwise counts what it removed. */
export function removedRows(
  table: string,
  result: Readonly<{ error: PostgrestError | null; count: number | null }>,
): RemovedRows {
  if (result.error !== null) {
    throw new Error(`${table} cleanup failed: ${result.error.code} ${result.error.message}`);
  }
  return { table, count: result.count ?? 0 };
}
