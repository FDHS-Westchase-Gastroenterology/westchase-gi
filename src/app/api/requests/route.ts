import { jsonSchema } from "@/lib/json";
import type { Json } from "@/lib/json";
import { processIntake } from "@/lib/portal/intake";
import { measureBackend } from "@/lib/portal/performance";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return measureBackend("intake.json", async () => {
    let input: Json | null = null;

    try {
      const parsed = jsonSchema.safeParse(await request.json());
      input = parsed.success ? parsed.data : null;
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
  });
}
