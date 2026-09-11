import "server-only";

import { jsonSchema } from "@/lib/json";
import type { Json } from "@/lib/json";

export const PRIVATE_API_HEADERS = {
  "Cache-Control": "private, no-store",
  "X-Content-Type-Options": "nosniff",
  "Cross-Origin-Resource-Policy": "same-origin",
} as const;

export function isPrivateRequestOrigin(request: Request): boolean {
  return request.headers.get("origin") === new URL(request.url).origin;
}

export async function readPrivateJson(request: Request, maxBytes = 8192): Promise<Json> {
  if (
    request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json"
  )
    return null;
  if (request.body === null) return null;
  const reader = request.body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let bytes = 0;
  let body = "";
  try {
    for (;;) {
      const chunk = await reader.read();
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > maxBytes) {
        await reader.cancel();
        return null;
      }
      body += decoder.decode(chunk.value, { stream: true });
    }
    body += decoder.decode();
    const parsed = jsonSchema.safeParse(JSON.parse(body));
    return parsed.success ? parsed.data : null;
  } catch (error) {
    if (error instanceof SyntaxError || error instanceof TypeError) return null;
    throw error;
  } finally {
    reader.releaseLock();
  }
}
