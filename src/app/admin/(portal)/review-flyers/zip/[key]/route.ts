import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { z } from "zod";

import { PortalAuthorizationError, requireRole } from "@/lib/portal/auth";
import { storeZip } from "@/lib/portal/store-zip";
import { reviewFlyerArchiveName, reviewFlyers } from "@/lib/review-flyers";

/* One flyer's PDF, SVG and PNG as one .zip (issue #357), built on request
   from the files in private/review-flyers, so no archive is ever kept. The
   same staff boundary and headers as the single-file assets route. */

const keyParamsSchema = z.object({
  key: z.string().min(1),
});

const ARCHIVE_ORDER = ["pdf", "svg", "png"] as const;

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: Readonly<{ params: Promise<{ key: string }> }>,
): Promise<Response> {
  try {
    await requireRole("staff", { unauthenticated: "throw" });
  } catch (error) {
    const status = error instanceof PortalAuthorizationError ? error.status : 401;
    return new Response(status === 401 ? "Unauthenticated" : "Forbidden", {
      status,
    });
  }

  const parsedParams = keyParamsSchema.safeParse(await context.params);
  if (!parsedParams.success) return new Response("Not found", { status: 404 });
  const flyer = reviewFlyers.find((candidate) => candidate.key === parsedParams.data.key);
  if (flyer === undefined) return new Response("Not found", { status: 404 });

  let files: { name: string; bytes: Uint8Array }[];
  try {
    files = await Promise.all(
      ARCHIVE_ORDER.map(async (kind) => {
        const { filename } = flyer.assets[kind];
        const bytes = await readFile(join(process.cwd(), "private", "review-flyers", filename));
        return { name: filename, bytes: new Uint8Array(bytes) };
      }),
    );
  } catch {
    return new Response("Asset unavailable", { status: 503 });
  }

  const archive = storeZip(files);
  return new Response(archive, {
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
      "Content-Disposition": `attachment; filename="${reviewFlyerArchiveName(flyer)}"`,
      "Content-Length": String(archive.byteLength),
      "Content-Type": "application/zip",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
