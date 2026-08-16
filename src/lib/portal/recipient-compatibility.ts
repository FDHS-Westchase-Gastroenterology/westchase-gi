import "server-only";

import { recordAudit } from "@/lib/portal/audit";
import { AUDIT_ACTIONS } from "@/lib/portal/contracts";
import type { serviceClient } from "@/lib/portal/server";

type ServiceClient = ReturnType<typeof serviceClient>;

export type AddRecipientCompatibilityResult =
  | { ok: true; recipientId: string }
  | { ok: false; code: "conflict" | "unavailable" };

export type ChangeRecipientCompatibilityResult =
  | { ok: true }
  | { ok: false; code: "not_found" | "unavailable" };

async function operationFailed(
  operation: () => PromiseLike<{ error: unknown }>,
): Promise<boolean> {
  try {
    return Boolean((await operation()).error);
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
  input: {
    actorEmail: string;
    email: string;
    label: string | null;
    active: boolean;
  },
): Promise<AddRecipientCompatibilityResult> {
  const { data: recipient, error: insertError } = await db
    .from("notification_recipients")
    .insert({
      email: input.email,
      label: input.label,
      active: input.active,
    })
    .select("id, active")
    .single();

  if (insertError || !recipient) {
    return {
      ok: false,
      code: insertError?.code === "23505" ? "conflict" : "unavailable",
    };
  }

  try {
    await recordAudit(db, {
      actorEmail: input.actorEmail,
      action: AUDIT_ACTIONS.RECIPIENTS_ADD,
      entity: "notification_recipients",
      entityId: recipient.id,
      detail: {
        active: recipient.active,
        has_label: Boolean(input.label),
      },
    });
  } catch {
    const initialDeleteFailed = await operationFailed(() =>
      db.from("notification_recipients").delete().eq("id", recipient.id),
    );
    if (initialDeleteFailed) {
      // Disable first so intake cannot use an unaudited destination while a
      // Second compensating delete is attempted.
      const disableFailed = await operationFailed(() =>
        db
          .from("notification_recipients")
          .update({ active: false })
          .eq("id", recipient.id),
      );
      const finalDeleteFailed = await operationFailed(() =>
        db.from("notification_recipients").delete().eq("id", recipient.id),
      );
      if (finalDeleteFailed) {
        console.error(
          "[recipient-compatibility] add rollback incomplete",
          {
            recipientId: recipient.id,
            disableFailed,
            finalDeleteFailed,
          },
        );
      }
    }
    return { ok: false, code: "unavailable" };
  }

  return { ok: true, recipientId: recipient.id };
}

export async function toggleRecipientWithCompatibility(
  db: ServiceClient,
  input: {
    actorEmail: string;
    recipientId: string;
    active: boolean;
  },
): Promise<ChangeRecipientCompatibilityResult> {
  const { data: current, error: readError } = await db
    .from("notification_recipients")
    .select("id, active")
    .eq("id", input.recipientId)
    .maybeSingle();
  if (readError) return { ok: false, code: "unavailable" };
  if (!current) return { ok: false, code: "not_found" };
  if (current.active === input.active) return { ok: true };

  const { data: updated, error: updateError } = await db
    .from("notification_recipients")
    .update({ active: input.active })
    .eq("id", current.id)
    .select("id")
    .maybeSingle();
  if (updateError) return { ok: false, code: "unavailable" };
  if (!updated) return { ok: false, code: "not_found" };

  try {
    await recordAudit(db, {
      actorEmail: input.actorEmail,
      action: AUDIT_ACTIONS.RECIPIENTS_TOGGLE,
      entity: "notification_recipients",
      entityId: current.id,
      detail: { from: current.active, to: input.active },
    });
  } catch {
    const rollbackFailed = await operationFailed(() =>
      db
        .from("notification_recipients")
        .update({ active: current.active })
        .eq("id", current.id),
    );
    if (rollbackFailed) {
      console.error(
        "[recipient-compatibility] toggle rollback incomplete",
        { recipientId: current.id, rollbackFailed },
      );
    }
    return { ok: false, code: "unavailable" };
  }

  return { ok: true };
}

export async function removeRecipientWithCompatibility(
  db: ServiceClient,
  input: { actorEmail: string; recipientId: string },
): Promise<ChangeRecipientCompatibilityResult> {
  const { data: current, error: readError } = await db
    .from("notification_recipients")
    .select("id, email, label, active, created_at, updated_at")
    .eq("id", input.recipientId)
    .maybeSingle();
  if (readError) return { ok: false, code: "unavailable" };
  if (!current) return { ok: false, code: "not_found" };

  const { data: removed, error: deleteError } = await db
    .from("notification_recipients")
    .delete()
    .eq("id", current.id)
    .select("id")
    .maybeSingle();
  if (deleteError) return { ok: false, code: "unavailable" };
  if (!removed) return { ok: false, code: "not_found" };

  try {
    await recordAudit(db, {
      actorEmail: input.actorEmail,
      action: AUDIT_ACTIONS.RECIPIENTS_REMOVE,
      entity: "notification_recipients",
      entityId: current.id,
      detail: { active: current.active },
    });
  } catch {
    const rollbackFailed = await operationFailed(() =>
      db.from("notification_recipients").insert(current),
    );
    if (rollbackFailed) {
      console.error(
        "[recipient-compatibility] remove rollback incomplete",
        { recipientId: current.id, rollbackFailed },
      );
    }
    return { ok: false, code: "unavailable" };
  }

  return { ok: true };
}
