import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { z } from "zod";

import { PortalAuthorizationError, requireRole } from "@/lib/portal/auth";
import { reviewFlyerAssetByFilename } from "@/lib/review-flyers";

const filenameParamsSchema = z.object({
  filename: z.string().min(1),
});

export const runtime = "nodejs";

export async function GET(
  request: Request,
  context: Readonly<{ params: Promise<{ filename: string }> }>,
): Promise<Response> {
  try {
    await requireRole("staff", { unauthenticated: "throw" });
  } catch (error) {
    const status = error instanceof PortalAuthorizationError ? error.status : 401;
    return new Response(status === 401 ? "Unauthenticated" : "Forbidden", {
      status,
    });
  }

  const parsedParams = filenameParamsSchema.safeParse(await context.params);
  if (!parsedParams.success) return new Response("Not found", { status: 404 });
  const filename = parsedParams.data.filename;
  const asset = reviewFlyerAssetByFilename.get(filename);
  if (asset === undefined) return new Response("Not found", { status: 404 });

  let bytes: Buffer;
  try {
    bytes = await readFile(join(process.cwd(), "private", "review-flyers", asset.filename));
  } catch {
    return new Response("Asset unavailable", { status: 503 });
  }

  const download = new URL(request.url).searchParams.get("download") === "1";
  return new Response(new Uint8Array(bytes), {
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${asset.filename}"`,
      "Content-Type": asset.contentType,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
