import "server-only";

import { AsyncLocalStorage } from "node:async_hooks";

import { z } from "zod";

// Never derive labels from URLs, request values, records, or exception messages.
const operations = new Set([
  "patients.command",
  "patients.read",
  "patients.search",
  "scheduling.operation",
  "billing.operation",
  "clinical.operation",
  "requests.worklist",
  "intake.json",
  "intake.form",
  "telemetry",
  "requests.recordContactAttempt",
  "requests.recordContactAndClose",
  "requests.confirmBookingHandoff",
  "requests.closeRequest",
  "requests.reopenRequest",
  "requests.setCallAgain",
  "requests.undoLatestTransition",
  "requests.classifyLegacyClosure",
  "requests.readFullRecord",
  "requests.addRequestNote",
  "requests.createStaffRequest",
]);
const details = new Set([
  "create",
  "update",
  "set_archived",
  "link_request",
  "unlink_request",
  "availability",
  "catalog",
  "read_config",
  "appointments",
  "read_appointment",
  "save_location",
  "save_provider",
  "save_appointment_type",
  "book",
  "reschedule",
  "cancel",
  "check_in",
  "complete",
  "no_show",
  "undo",
  "charge",
  "payment",
  "adjustment",
  "refund",
  "reverse",
  "read",
  "list",
  "signers",
  "update_draft",
  "sign",
  "amend",
  "enter_in_error",
  "set_signer",
]);

interface Timing {
  detail: string | null;
  calls: number;
  failedCalls: number;
  upstreamMs: number;
}
const scope = new AsyncLocalStorage<Timing>();

/** Only a validated command discriminator may refine an operation's fixed label. */
export function setPerformanceDetail(detail: string): void {
  const timing = scope.getStore();
  if (timing && details.has(detail)) timing.detail = detail;
}

const resultSchema = z.object({ ok: z.boolean().optional(), status: z.string().optional() });

/** Measures the authenticated handler/action, including validation and awaited work.
 * RSC rendering, proxy work and browser updates are outside this boundary. */
export async function measureBackend<T>(operation: string, run: () => Promise<T>): Promise<T> {
  if (process.env.PORTAL_PERFORMANCE_LOGS === "0" || !operations.has(operation)) return run();
  const timing: Timing = { detail: null, calls: 0, failedCalls: 0, upstreamMs: 0 };
  return scope.run(timing, async () => {
    const start = performance.now();
    // Thrown framework control flow is deliberately not mislabeled as an application failure.
    let result: "success" | "rejected" | "redirect" | "thrown" = "thrown";
    try {
      const value = await run();
      const parsed = resultSchema.safeParse(value);
      if (value instanceof Response) {
        result =
          value.status >= 300 && value.status < 400
            ? "redirect"
            : value.ok
              ? "success"
              : "rejected";
      } else {
        result =
          parsed.success && (parsed.data.ok === false || parsed.data.status === "error")
            ? "rejected"
            : "success";
      }
      return value;
    } finally {
      const durationMs = performance.now() - start;
      try {
        console.info(
          JSON.stringify({
            event: "portal.performance",
            schema: 1,
            operation,
            detail: timing.detail,
            outcome: result,
            duration_ms: Math.round(durationMs * 100) / 100,
            upstream_calls: timing.calls,
            upstream_failed_calls: timing.failedCalls,
            upstream_headers_ms: Math.round(timing.upstreamMs * 100) / 100,
          }),
        );
      } catch {
        // Logging must never change a successful write or mask the original exception.
      }
    }
  });
}

/** Supabase transport time through response headers; sums can overlap under concurrency.
 * The caller still consumes the original body. No URL, headers or body enter the log. */
export const timedSupabaseFetch: typeof fetch = async (input, init) => {
  const timing = scope.getStore();
  if (!timing) return fetch(input, init);
  const start = performance.now();
  timing.calls += 1;
  let succeeded = false;
  try {
    const response = await fetch(input, init);
    succeeded = response.ok;
    return response;
  } finally {
    timing.upstreamMs += performance.now() - start;
    if (!succeeded) timing.failedCalls += 1;
  }
};
