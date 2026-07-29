import { processTelemetry } from "@/lib/portal/telemetry";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let input: unknown = null;

  try {
    input = await request.json();
  } catch {
    // Malformed or missing JSON is handled by the zod contract.
  }

  const result = await processTelemetry(input, request.headers);

  if (result.status === 204) {
    return new Response(null, {
      status: 204,
      headers: {
        "Cache-Control": "no-store",
      },
    });
  }

  const code =
    result.status === 400
      ? "validation"
      : result.status === 429
        ? "rate_limited"
        : "unavailable";

  return Response.json(
    { ok: false, code },
    {
      status: result.status,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
