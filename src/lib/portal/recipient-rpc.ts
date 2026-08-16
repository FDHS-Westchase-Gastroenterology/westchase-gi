export type RecipientRpcOperation = "add" | "toggle" | "remove";

export type RecipientRpcFailureCode = "conflict" | "not_found" | "unavailable";

type RecipientRpcError = { code?: string } | null;

interface RecipientRpcResponse<Data> {
  data: Data | null;
  error: RecipientRpcError;
}

export type RecipientMutationTransportResult<Data, CompatibilityResult> =
  | {
      transport: "atomic";
      response: RecipientRpcResponse<Data>;
    }
  | {
      transport: "compatibility";
      response: CompatibilityResult;
    };

/**
 * PGRST202 is PostgREST's stable schema-cache signal for a function signature
 * it cannot find. No other failure may reopen the non-atomic compatibility
 * path: permissions, validation, and infrastructure errors must fail closed.
 */
export function isRecipientRpcMissing(error: Readonly<RecipientRpcError | undefined>): boolean {
  return error?.code === "PGRST202";
}

/**
 * Prefer the atomic RPC on every call so a newly promoted migration takes
 * effect without an application restart. The compatibility operation runs
 * only while PostgREST explicitly lacks that RPC signature.
 */
export async function runRecipientMutationTransport<Data, CompatibilityResult>(
  atomicOperation: () => PromiseLike<RecipientRpcResponse<Data>>,
  compatibilityOperation: () => PromiseLike<CompatibilityResult>,
): Promise<RecipientMutationTransportResult<Data, CompatibilityResult>> {
  const response = await atomicOperation();
  if (!isRecipientRpcMissing(response.error)) {
    return { transport: "atomic", response };
  }

  return {
    transport: "compatibility",
    response: await compatibilityOperation(),
  };
}

/** Keep Postgres/PostgREST details behind the shared mutation boundary so the
 * Server Action and HTTP transports report the same stable failure codes. */
export function recipientRpcFailureCode(
  operation: RecipientRpcOperation,
  postgresCode: string | undefined,
): RecipientRpcFailureCode {
  if (operation === "add" && postgresCode === "23505") {
    return "conflict";
  }
  if (operation !== "add" && (postgresCode === "P0002" || postgresCode === "22P02")) {
    return "not_found";
  }
  return "unavailable";
}
