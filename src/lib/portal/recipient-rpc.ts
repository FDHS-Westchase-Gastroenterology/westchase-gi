export type RecipientRpcOperation = "add" | "toggle" | "remove";

export type RecipientRpcFailureCode =
  | "conflict"
  | "not_found"
  | "unavailable";

/** Keep Postgres/PostgREST details behind the shared mutation boundary so the
 * Server Action and HTTP transports report the same stable failure codes. */
export function recipientRpcFailureCode(
  operation: RecipientRpcOperation,
  postgresCode: string | undefined,
): RecipientRpcFailureCode {
  if (operation === "add" && postgresCode === "23505") {
    return "conflict";
  }
  if (
    operation !== "add" &&
    (postgresCode === "P0002" || postgresCode === "22P02")
  ) {
    return "not_found";
  }
  return "unavailable";
}
