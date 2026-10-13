import "server-only";

/**
 * The error a database call reports, field for field what supabase-js returned from PostgREST,
 * so callers keep branching on `code` (a SQLSTATE such as `23505`, or `""` when the request
 * itself failed).
 */
export interface DatabaseError {
  readonly code: string;
  readonly message: string;
  readonly details: string | null;
  readonly hint: string | null;
}

/**
 * A failure that never produced a SQLSTATE: the connection, the network, or the caller's
 * abort signal. Same fields postgrest-js builds when `fetch` rejects.
 */
export function requestError(error: Readonly<Error>): DatabaseError {
  return {
    code: "",
    message: `${error.name}: ${error.message}`,
    details: error.stack ?? "",
    hint: error.name === "AbortError" ? "Request was aborted (timeout or manual cancellation)" : "",
  };
}

const POSTGRES_TIMESTAMPTZ =
  /^(\d{4,}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2}(?:\.\d+)?)([+-]\d{2})(?::(\d{2}))?(?::(\d{2}))?$/u;

/**
 * Rewrites PostgreSQL's text form of a `timestamptz` (`2026-10-13 16:31:09.049815+00`) as the
 * JSON form PostgREST returned (`2026-10-13T16:31:09.049815+00:00`). Values with no such form,
 * such as `infinity`, are returned unchanged, as PostgREST did.
 */
export function toPostgrestTimestamp(text: string): string {
  return text.replace(
    POSTGRES_TIMESTAMPTZ,
    (
      _whole: string,
      date: string,
      time: string,
      hours: string,
      minutes: string | undefined,
      seconds: string | undefined,
    ) => `${date}T${time}${hours}:${minutes ?? "00"}${seconds === undefined ? "" : `:${seconds}`}`,
  );
}
