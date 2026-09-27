import "server-only";

import { z } from "zod";

import { recordAudit } from "@/lib/portal/audit";
import { AUDIT_ACTIONS } from "@/lib/portal/contracts";
import type { ServiceClient } from "@/lib/portal/server";

export type AddRecipientCompatibilityResult =
  | { ok: true; recipientId: string }
  | { ok: false; code: "conflict" | "unavailable" };

export type ChangeRecipientCompatibilityResult =
  | { ok: true }
  | { ok: false; code: "not_found" | "unavailable" };

const recipientIdSchema = z.object({ id: z.string() });
const recipientIdActiveSchema = z.object({
  id: z.string(),
  active: z.boolean(),
});
const recipientRowSchema = z.object({
  id: z.string(),
  email: z.string(),
  label: z.string().nullable(),
  active: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
});

async function operationFailed(operation: () => PromiseLike<{ error: unknown }>): Promise<boolean> {
  try {
    const result = await operation();
    return result.error !== null && result.error !== undefined;
  } catch {
    return true;
  }
}

/**
 * Temporary deployment bridge for environments that have not received the
 * atomic recipient RPC migration. Callers must first authorize the staff
 * operation and receive PGRST202 from the matching RPC. Remove this module
 * after Development and Production both expose all three functions.
 */
export async function addRecipientWithCompatibility(
  db: ServiceClient,
  input: Readonly<{
    actorEmail: string;
    email: string;
    label: string | null;
    active: boolean;
  }>,
): Promise<AddRecipientCompatibilityResult> {
  const inserted = await db
    .from("notification_recipients")
    .insert({
      email: input.email,
      label: input.label,
      active: input.active,
    })
    .select("id, active")
    .single();
  const recipient = recipientIdActiveSchema.safeParse(inserted.data);

  if (inserted.error !== null || !recipient.success) {
    return {
      ok: false,
      code: inserted.error?.code === "23505" ? "conflict" : "unavailable",
    };
  }

  try {
    await recordAudit(db, {
      actorEmail: input.actorEmail,
      action: AUDIT_ACTIONS.RECIPIENTS_ADD,
      entity: "notification_recipients",
      entityId: recipient.data.id,
      detail: {
        active: recipient.data.active,
        has_label: input.label !== null && input.label !== "",
      },
    });
  } catch {
    const initialDeleteFailed = await operationFailed(() =>
      db.from("notification_recipients").delete().eq("id", recipient.data.id),
    );
    if (initialDeleteFailed) {
      // Disable first so intake cannot use an unaudited destination while a
      // Second compensating delete is attempted.
      const disableFailed = await operationFailed(() =>
        db.from("notification_recipients").update({ active: false }).eq("id", recipient.data.id),
      );
      const finalDeleteFailed = await operationFailed(() =>
        db.from("notification_recipients").delete().eq("id", recipient.data.id),
      );
      if (finalDeleteFailed) {
        console.error("[recipient-compatibility] add rollback incomplete", {
          recipientId: recipient.data.id,
          disableFailed,
          finalDeleteFailed,
        });
      }
    }
    return { ok: false, code: "unavailable" };
  }

  return { ok: true, recipientId: recipient.data.id };
}

export async function toggleRecipientWithCompatibility(
  db: ServiceClient,
  input: Readonly<{
    actorEmail: string;
    recipientId: string;
    active: boolean;
  }>,
): Promise<ChangeRecipientCompatibilityResult> {
  const read = await db
    .from("notification_recipients")
    .select("id, active")
    .eq("id", input.recipientId)
    .maybeSingle();
  if (read.error !== null) return { ok: false, code: "unavailable" };
  const current = recipientIdActiveSchema.safeParse(read.data);
  if (!current.success) return { ok: false, code: "not_found" };
  if (current.data.active === input.active) return { ok: true };

  const updated = await db
    .from("notification_recipients")
    .update({ active: input.active })
    .eq("id", current.data.id)
    .select("id")
    .maybeSingle();
  if (updated.error !== null) return { ok: false, code: "unavailable" };
  const updatedRow = recipientIdSchema.safeParse(updated.data);
  if (!updatedRow.success) return { ok: false, code: "not_found" };

  try {
    await recordAudit(db, {
      actorEmail: input.actorEmail,
      action: AUDIT_ACTIONS.RECIPIENTS_TOGGLE,
      entity: "notification_recipients",
      entityId: current.data.id,
      detail: { from: current.data.active, to: input.active },
    });
  } catch {
    const rollbackFailed = await operationFailed(() =>
      db
        .from("notification_recipients")
        .update({ active: current.data.active })
        .eq("id", current.data.id),
    );
    if (rollbackFailed) {
      console.error("[recipient-compatibility] toggle rollback incomplete", {
        recipientId: current.data.id,
        rollbackFailed,
      });
    }
    return { ok: false, code: "unavailable" };
  }

  return { ok: true };
}

export async function removeRecipientWithCompatibility(
  db: ServiceClient,
  input: Readonly<{ actorEmail: string; recipientId: string }>,
): Promise<ChangeRecipientCompatibilityResult> {
  const read = await db
    .from("notification_recipients")
    .select("id, email, label, active, created_at, updated_at")
    .eq("id", input.recipientId)
    .maybeSingle();
  if (read.error !== null) return { ok: false, code: "unavailable" };
  const current = recipientRowSchema.safeParse(read.data);
  if (!current.success) return { ok: false, code: "not_found" };

  const removed = await db
    .from("notification_recipients")
    .delete()
    .eq("id", current.data.id)
    .select("id")
    .maybeSingle();
  if (removed.error !== null) return { ok: false, code: "unavailable" };
  const removedRow = recipientIdSchema.safeParse(removed.data);
  if (!removedRow.success) return { ok: false, code: "not_found" };

  try {
    await recordAudit(db, {
      actorEmail: input.actorEmail,
      action: AUDIT_ACTIONS.RECIPIENTS_REMOVE,
      entity: "notification_recipients",
      entityId: current.data.id,
      detail: { active: current.data.active },
    });
  } catch {
    const rollbackFailed = await operationFailed(() =>
      db.from("notification_recipients").insert(current.data),
    );
    if (rollbackFailed) {
      console.error("[recipient-compatibility] remove rollback incomplete", {
        recipientId: current.data.id,
        rollbackFailed,
      });
    }
    return { ok: false, code: "unavailable" };
  }

  return { ok: true };
}
