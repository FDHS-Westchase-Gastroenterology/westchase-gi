"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/portal/auth";
import { serviceClient } from "@/lib/portal/server";

function revalidateRequestViews(requestId: string) {
  revalidatePath("/admin"); // Home overview counts
  revalidatePath("/admin/requests");
  revalidatePath(`/admin/requests/${requestId}`);
}

export type AddRequestNoteState =
  | { status: "idle" }
  | { status: "success"; message: string }
  | { status: "error"; message: string };

const NOTE_WRITE_ERROR =
  "We couldn’t confirm this note was saved. Your note is still here. Check the notes before trying again.";

export async function addRequestNote(
  _state: Readonly<AddRequestNoteState>,
  formData: FormData,
): Promise<AddRequestNoteState> {
  const session = await requireRole("staff");

  const requestId = formData.get("requestId");
  const rawNote = formData.get("note");
  if (rawNote instanceof File || rawNote === null) {
    return { status: "error", message: NOTE_WRITE_ERROR };
  }

  const note = rawNote.trim();
  if (note.length === 0 || note.length > 2000) {
    return { status: "error", message: NOTE_WRITE_ERROR };
  }

  if (requestId instanceof File || requestId === null || requestId.trim().length === 0) {
    return { status: "error", message: NOTE_WRITE_ERROR };
  }

  const { error } = await serviceClient().rpc("portal_add_request_note", {
    p_actor_email: session.email,
    p_request_id: requestId,
    p_note: note,
    p_note_length: note.length,
  });
  if (error) {
    return { status: "error", message: NOTE_WRITE_ERROR };
  }

  revalidateRequestViews(requestId);
  return { status: "success", message: "Note added." };
}
