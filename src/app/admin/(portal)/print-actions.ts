"use server";

import { requireRole } from "@/lib/portal/auth";
import {
  prepareNewRequestPrintPacket,
  type NewRequestPrintPacketResult,
} from "@/lib/portal/request-print";
import { serviceClient } from "@/lib/portal/server";

export async function prepareHomePrintPacket(): Promise<NewRequestPrintPacketResult> {
  const session = await requireRole("staff", { unauthenticated: "throw" });

  return prepareNewRequestPrintPacket({
    db: serviceClient(),
    actorEmail: session.email,
  });
}
