"use server";
import { requireRole } from "@/lib/portal/auth";
import { measureBackend } from "@/lib/portal/performance";
import { requestIdSchema } from "@/lib/portal/request-record/contracts";
import type { FullRecord } from "@/lib/portal/request-record/contracts";
import { fetchFullRecord } from "@/lib/portal/request-record/reads";
import { serviceClient } from "@/lib/portal/server";

export async function readFullRecord(requestId: string): Promise<FullRecord | null> {
  return measureBackend<FullRecord | null>("requests.readFullRecord", async () => {
    const id = requestIdSchema.parse(requestId);
    await requireRole("staff", { unauthenticated: "throw" });
    return fetchFullRecord(serviceClient(), id);
  });
}
