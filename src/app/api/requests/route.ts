import { processIntake } from "@/lib/portal/intake";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let input: unknown = null;

  try {
    input = await request.json();
  } catch {
    // Malformed or missing JSON is handled by the pinned Zod contract.
  }

  const result = await processIntake(input, request.headers);

  return Response.json(result.response, {
    status: result.status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
