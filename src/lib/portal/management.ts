import "server-only";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { recordAudit } from "@/lib/portal/audit";
import { requireRole } from "@/lib/portal/auth";
import {
  AUDIT_ACTIONS,
  type StaffRole,
} from "@/lib/portal/contracts";
import { serviceClient } from "@/lib/portal/server";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const STAFF_BAN_DURATION = "876000h";

const addRecipientSchema = z.strictObject({
  email: z.string().trim().min(1).max(254).regex(EMAIL_RE),
  label: z.string().trim().max(120).optional(),
  active: z.boolean().optional(),
});

const recipientStateSchema = z.strictObject({
  recipientId: z.uuid(),
  active: z.boolean(),
});

const entityIdSchema = z.strictObject({
  id: z.uuid(),
});

const inviteStaffSchema = z.strictObject({
  email: z.string().trim().min(1).max(254).regex(EMAIL_RE),
  displayName: z.string().trim().min(1).max(120),
  role: z.enum(["admin", "staff"]),
});

const staffRoleSchema = z.strictObject({
  userId: z.uuid(),
  role: z.enum(["admin", "staff"]),
});

export type ManagementFailureCode =
  | "invalid"
  | "not_found"
  | "conflict"
  | "unavailable";

export type ManagementFailure = {
  ok: false;
  code: ManagementFailureCode;
  error: string;
};

export type MutationResult = { ok: true } | ManagementFailure;

export type InviteStaffResult =
  | { ok: true; tempPassword: string }
  | ManagementFailure;

type ServiceClient = ReturnType<typeof serviceClient>;

function failure(
  code: ManagementFailureCode,
  error: string,
): ManagementFailure {
  return { ok: false, code, error };
}

function normalizeEmail(email: string): string {
  return email.toLowerCase();
}

function revalidateManagementViews(): void {
  revalidatePath("/admin/settings");
  revalidatePath("/admin/audit");
}

function temporaryPassword(): string {
  // 36 characters with guaranteed mixed character classes. It exists only in
  // this call frame and the one-time action response; it is never stored.
  return `Wg!7${randomBytes(24).toString("base64url")}`;
}

function metadataRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return {};
  }
  return { ...(value as Record<string, unknown>) };
}

function authCreateFailure(error: unknown): ManagementFailure {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String(error.code)
      : "";
  if (code === "email_exists" || code === "user_already_exists") {
    return failure("conflict", "A staff account already uses that email.");
  }
  return failure("unavailable", "The staff account could not be created.");
}

async function deleteProvisionedUser(
  db: ServiceClient,
  userId: string,
): Promise<void> {
  await Promise.allSettled([
    db.from("staff_profiles").delete().eq("user_id", userId),
    db.auth.admin.deleteUser(userId),
  ]);
}

/** Invite failure path: the half-provisioned user must be removed BEFORE
 * the failure is reported — callers return this promise directly. */
async function rollbackInvite(
  db: ServiceClient,
  userId: string,
  code: ManagementFailureCode,
  message: string,
): Promise<ManagementFailure> {
  await deleteProvisionedUser(db, userId);
  return failure(code, message);
}

export async function addNotificationRecipientMutation(
  input: unknown,
): Promise<MutationResult> {
  const session = await requireRole("admin");
  const parsed = addRecipientSchema.safeParse(input);
  if (!parsed.success) {
    return failure("invalid", "Enter a valid recipient email and label.");
  }

  const db = serviceClient();
  const { data: recipient, error: insertError } = await db
    .from("notification_recipients")
    .insert({
      email: normalizeEmail(parsed.data.email),
      label: parsed.data.label || null,
      active: parsed.data.active ?? true,
    })
    .select("id, active")
    .single();

  if (insertError || !recipient) {
    if (insertError?.code === "23505") {
      return failure("conflict", "That notification recipient already exists.");
    }
    return failure("unavailable", "The notification recipient could not be added.");
  }

  try {
    await recordAudit(db, {
      actorEmail: session.email,
      action: AUDIT_ACTIONS.RECIPIENTS_ADD,
      entity: "notification_recipients",
      entityId: recipient.id,
      detail: {
        active: recipient.active,
        has_label: Boolean(parsed.data.label),
      },
    });
  } catch {
    await db
      .from("notification_recipients")
      .delete()
      .eq("id", recipient.id);
    return failure("unavailable", "The notification recipient could not be added.");
  }

  revalidateManagementViews();
  return { ok: true };
}

/**
 * Recipient policy: active staff may pause or resume notification delivery
 * because that is an operational queue task. Adding and removing destinations
 * remains admin-only; staff otherwise have read-only recipient access.
 */
export async function toggleNotificationRecipientMutation(
  input: unknown,
): Promise<MutationResult> {
  const session = await requireRole("staff");
  const parsed = recipientStateSchema.safeParse(input);
  if (!parsed.success) {
    return failure("invalid", "Choose a valid notification recipient.");
  }

  const db = serviceClient();
  const { data: current, error: readError } = await db
    .from("notification_recipients")
    .select("id, active")
    .eq("id", parsed.data.recipientId)
    .maybeSingle();
  if (readError) {
    return failure("unavailable", "The notification recipient could not be read.");
  }
  if (!current) {
    return failure("not_found", "Notification recipient not found.");
  }
  if (current.active === parsed.data.active) {
    return { ok: true };
  }

  const { error: updateError } = await db
    .from("notification_recipients")
    .update({ active: parsed.data.active })
    .eq("id", current.id);
  if (updateError) {
    return failure("unavailable", "The notification recipient could not be updated.");
  }

  try {
    await recordAudit(db, {
      actorEmail: session.email,
      action: AUDIT_ACTIONS.RECIPIENTS_TOGGLE,
      entity: "notification_recipients",
      entityId: current.id,
      detail: { from: current.active, to: parsed.data.active },
    });
  } catch {
    await db
      .from("notification_recipients")
      .update({ active: current.active })
      .eq("id", current.id);
    return failure("unavailable", "The notification recipient could not be updated.");
  }

  revalidateManagementViews();
  return { ok: true };
}

export async function removeNotificationRecipientMutation(
  input: unknown,
): Promise<MutationResult> {
  const session = await requireRole("admin");
  const parsed = entityIdSchema.safeParse(input);
  if (!parsed.success) {
    return failure("invalid", "Choose a valid notification recipient.");
  }

  const db = serviceClient();
  const { data: current, error: readError } = await db
    .from("notification_recipients")
    .select("id, email, label, active, created_at, updated_at")
    .eq("id", parsed.data.id)
    .maybeSingle();
  if (readError) {
    return failure("unavailable", "The notification recipient could not be read.");
  }
  if (!current) {
    return failure("not_found", "Notification recipient not found.");
  }

  const { error: deleteError } = await db
    .from("notification_recipients")
    .delete()
    .eq("id", current.id);
  if (deleteError) {
    return failure("unavailable", "The notification recipient could not be removed.");
  }

  try {
    await recordAudit(db, {
      actorEmail: session.email,
      action: AUDIT_ACTIONS.RECIPIENTS_REMOVE,
      entity: "notification_recipients",
      entityId: current.id,
      detail: { active: current.active },
    });
  } catch {
    await db.from("notification_recipients").insert(current);
    return failure("unavailable", "The notification recipient could not be removed.");
  }

  revalidateManagementViews();
  return { ok: true };
}

export async function inviteStaffMutation(
  input: unknown,
): Promise<InviteStaffResult> {
  const session = await requireRole("admin");
  const parsed = inviteStaffSchema.safeParse(input);
  if (!parsed.success) {
    return failure("invalid", "Enter a valid name, email, and staff role.");
  }

  const db = serviceClient();
  const password = temporaryPassword();
  const email = normalizeEmail(parsed.data.email);
  const { data: created, error: createError } =
    await db.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
  const user = created.user;
  if (createError || !user) {
    return authCreateFailure(createError);
  }

  const appMetadata = {
    ...metadataRecord(user.app_metadata),
    role: parsed.data.role,
  };
  const { error: metadataError } = await db.auth.admin.updateUserById(
    user.id,
    { app_metadata: appMetadata },
  );
  if (metadataError) {
    return rollbackInvite(
      db,
      user.id,
      "unavailable",
      "The staff account could not be created.",
    );
  }

  const { data: profile, error: profileError } = await db
    .from("staff_profiles")
    .insert({
      user_id: user.id,
      email,
      display_name: parsed.data.displayName,
      role: parsed.data.role,
      active: true,
    })
    .select("id")
    .single();
  if (profileError || !profile) {
    return profileError?.code === "23505"
      ? rollbackInvite(
          db,
          user.id,
          "conflict",
          "A staff account already uses that email.",
        )
      : rollbackInvite(
          db,
          user.id,
          "unavailable",
          "The staff account could not be created.",
        );
  }

  try {
    await recordAudit(db, {
      actorEmail: session.email,
      action: AUDIT_ACTIONS.STAFF_INVITE,
      entity: "staff_profiles",
      entityId: profile.id,
      detail: { role: parsed.data.role, active: true },
    });
  } catch {
    return rollbackInvite(
      db,
      user.id,
      "unavailable",
      "The staff account could not be created.",
    );
  }

  revalidateManagementViews();
  return { ok: true, tempPassword: password };
}

export async function deactivateStaffMutation(
  input: unknown,
): Promise<MutationResult> {
  const session = await requireRole("admin");
  const parsed = entityIdSchema.safeParse(input);
  if (!parsed.success) {
    return failure("invalid", "Choose a valid staff account.");
  }
  if (parsed.data.id === session.id) {
    return failure("invalid", "You cannot deactivate your own account.");
  }

  const db = serviceClient();
  const { data: current, error: readError } = await db
    .from("staff_profiles")
    .select("id, user_id, active")
    .eq("user_id", parsed.data.id)
    .maybeSingle();
  if (readError) {
    return failure("unavailable", "The staff account could not be read.");
  }
  if (!current) {
    return failure("not_found", "Staff account not found.");
  }
  if (!current.active) {
    return { ok: true };
  }

  const { error: profileError } = await db
    .from("staff_profiles")
    .update({ active: false })
    .eq("user_id", current.user_id);
  if (profileError) {
    return failure("unavailable", "The staff account could not be deactivated.");
  }

  // In @supabase/supabase-js 2.110.2, auth.admin.signOut requires the
  // target user's JWT rather than a user id. We do not hold target JWTs.
  // The profile flag is the immediate app-layer lockout; a long-lived Auth
  // ban is the available admin-API backstop for future sign-ins/refreshes.
  const { error: banError } = await db.auth.admin.updateUserById(
    current.user_id,
    { ban_duration: STAFF_BAN_DURATION },
  );
  if (banError) {
    await db
      .from("staff_profiles")
      .update({ active: true })
      .eq("user_id", current.user_id);
    return failure("unavailable", "The staff account could not be deactivated.");
  }

  try {
    await recordAudit(db, {
      actorEmail: session.email,
      action: AUDIT_ACTIONS.STAFF_DEACTIVATE,
      entity: "staff_profiles",
      entityId: current.id,
      detail: { from: true, to: false, auth_backstop: "banned" },
    });
  } catch {
    await Promise.allSettled([
      db.auth.admin.updateUserById(current.user_id, {
        ban_duration: "none",
      }),
      db
        .from("staff_profiles")
        .update({ active: true })
        .eq("user_id", current.user_id),
    ]);
    return failure("unavailable", "The staff account could not be deactivated.");
  }

  revalidateManagementViews();
  return { ok: true };
}

export async function changeStaffRoleMutation(
  input: unknown,
): Promise<MutationResult> {
  const session = await requireRole("admin");
  const parsed = staffRoleSchema.safeParse(input);
  if (!parsed.success) {
    return failure("invalid", "Choose a valid staff account and role.");
  }
  if (parsed.data.userId === session.id && parsed.data.role !== "admin") {
    return failure("invalid", "You cannot remove your own admin role.");
  }

  const db = serviceClient();
  const { data: current, error: readError } = await db
    .from("staff_profiles")
    .select("id, user_id, role")
    .eq("user_id", parsed.data.userId)
    .maybeSingle();
  if (readError) {
    return failure("unavailable", "The staff account could not be read.");
  }
  if (!current) {
    return failure("not_found", "Staff account not found.");
  }
  if (current.role === parsed.data.role) {
    return { ok: true };
  }

  const previousRole = current.role as StaffRole;
  const { data: authData, error: authReadError } =
    await db.auth.admin.getUserById(current.user_id);
  const authUser = authData.user;
  if (authReadError || !authUser) {
    return failure("unavailable", "The staff role could not be changed.");
  }

  const previousMetadata = metadataRecord(authUser.app_metadata);
  const { error: metadataError } = await db.auth.admin.updateUserById(
    current.user_id,
    {
      app_metadata: {
        ...previousMetadata,
        role: parsed.data.role,
      },
    },
  );
  if (metadataError) {
    return failure("unavailable", "The staff role could not be changed.");
  }

  const { error: profileError } = await db
    .from("staff_profiles")
    .update({ role: parsed.data.role })
    .eq("user_id", current.user_id);
  if (profileError) {
    await db.auth.admin.updateUserById(current.user_id, {
      app_metadata: previousMetadata,
    });
    return failure("unavailable", "The staff role could not be changed.");
  }

  try {
    await recordAudit(db, {
      actorEmail: session.email,
      action: AUDIT_ACTIONS.STAFF_ROLE,
      entity: "staff_profiles",
      entityId: current.id,
      detail: { from: previousRole, to: parsed.data.role },
    });
  } catch {
    await Promise.allSettled([
      db
        .from("staff_profiles")
        .update({ role: previousRole })
        .eq("user_id", current.user_id),
      db.auth.admin.updateUserById(current.user_id, {
        app_metadata: previousMetadata,
      }),
    ]);
    return failure("unavailable", "The staff role could not be changed.");
  }

  revalidateManagementViews();
  return { ok: true };
}
