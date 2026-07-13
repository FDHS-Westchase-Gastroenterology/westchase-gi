"use server";

import { revalidatePath } from "next/cache";
import {
  AUDIT_ACTIONS,
  REQUEST_STATUSES,
  type RequestStatus,
} from "@/lib/portal/contracts";
import { recordAudit } from "@/lib/portal/audit";
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
  if (!isRequestStatus(nextStatus)) {
    throw new Error("Unknown request status");
  }
  const session = await requireRole("staff");

  const db = serviceClient();
  const { data: current, error: readError } = await db
    .from("requests")
    .select("id, status")
    .eq("id", requestId)
    .single();
  if (readError || !current) {
    throw new Error("Request not found");
  }
  if (current.status === nextStatus) return;

  const { error: updateError } = await db
    .from("requests")
    .update({ status: nextStatus })
    .eq("id", requestId);
  if (updateError) {
    throw new Error(`Status update failed: ${updateError.code}`);
  }

  await recordAudit(db, {
    actorEmail: session.email,
    action: AUDIT_ACTIONS.REQUEST_STATUS_CHANGE,
    entity: "requests",
    entityId: requestId,
    detail: { from: current.status, to: nextStatus },
  });

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
  const { data: request, error: readError } = await db
    .from("requests")
    .select("id")
    .eq("id", requestId)
    .single();
  if (readError || !request) {
    throw new Error("Request not found");
  }

  const { error: insertError } = await db.from("request_events").insert({
    request_id: requestId,
    type: "note",
    status: "recorded",
    meta: { text: note, author_email: session.email },
  });
  if (insertError) {
    throw new Error(`Note write failed: ${insertError.code}`);
  }

  await recordAudit(db, {
    actorEmail: session.email,
    action: AUDIT_ACTIONS.REQUEST_NOTE,
    entity: "requests",
    entityId: requestId,
    detail: { length: note.length },
  });

  revalidateRequestViews(requestId);
}
