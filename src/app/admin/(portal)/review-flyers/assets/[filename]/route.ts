import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { authorizationStatus, requireRole } from "@/lib/portal/auth";
import { reviewFlyerAssetByFilename } from "@/lib/review-flyers";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  context: { params: Promise<{ filename: string }> },
): Promise<Response> {
  try {
    await requireRole("admin", { unauthenticated: "throw" });
  } catch (error) {
    const status = authorizationStatus(error) ?? 401;
    return new Response(status === 401 ? "Unauthenticated" : "Forbidden", {
      status,
    });
  }

  const { filename } = await context.params;
  const asset = reviewFlyerAssetByFilename.get(filename);
  if (!asset) return new Response("Not found", { status: 404 });

  let bytes: Buffer;
  try {
    bytes = await readFile(
      join(process.cwd(), "private", "review-flyers", asset.filename),
    );
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
