"use server";

import { revalidatePath } from "next/cache";
import {
  REQUEST_STATUSES,
  type RequestStatus,
} from "@/lib/portal/contracts";
import { requireRole } from "@/lib/portal/auth";
import { serviceClient } from "@/lib/portal/server";

function isRequestStatus(value: unknown): value is RequestStatus {
  return (
    typeof value === "string" &&
    (REQUEST_STATUSES as readonly string[]).includes(value)
  );
}

function revalidateRequestViews(requestId: string) {
  revalidatePath("/admin");
  revalidatePath(`/admin/requests/${requestId}`);
}

export async function updateRequestStatus(
  requestId: string,
  nextStatus: RequestStatus,
): Promise<void> {
  const session = await requireRole("staff");
  if (!isRequestStatus(nextStatus)) {
    throw new Error("Unknown request status");
  }

  const db = serviceClient();
  const { data: changed, error } = await db.rpc(
    "portal_update_request_status",
    {
      p_actor_email: session.email,
      p_request_id: requestId,
      p_next_status: nextStatus,
    },
  );
  if (error) {
    if (error.code === "P0002" || error.code === "22P02") {
      throw new Error("Request not found");
    }
    throw new Error(`Status update failed: ${error.code}`);
  }
  if (!changed) return;

  revalidateRequestViews(requestId);
}

export async function addRequestNote(
  requestId: string,
  formData: FormData,
): Promise<void> {
  const session = await requireRole("staff");

  const raw = formData.get("note");
  const note = typeof raw === "string" ? raw.trim() : "";
  if (!note || note.length > 2000) {
    throw new Error("Notes must be 1-2000 characters");
  }

  const db = serviceClient();
  const { error } = await db.rpc("portal_add_request_note", {
    p_actor_email: session.email,
    p_request_id: requestId,
    p_note: note,
    p_note_length: note.length,
  });
  if (error) {
    if (error.code === "P0002" || error.code === "22P02") {
      throw new Error("Request not found");
    }
    throw new Error(`Note write failed: ${error.code}`);
  }

  revalidateRequestViews(requestId);
}
