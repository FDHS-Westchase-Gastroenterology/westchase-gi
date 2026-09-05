import "server-only";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { jsonObjectSchema } from "@/lib/json";
import type { Json } from "@/lib/json";
import { recordAudit } from "@/lib/portal/audit";
import { requireRole } from "@/lib/portal/auth";
import { AUDIT_ACTIONS, STAFF_ROLES } from "@/lib/portal/contracts";
import type { DeliveryOutcome } from "@/lib/portal/email";
import { sendPortalEmail } from "@/lib/portal/email-provider";
import { sendRecipientConfirmation, sendStaffSetupLink } from "@/lib/portal/management-email";
import type { StaffSetupType } from "@/lib/portal/management-email";
import {
  addRecipientWithCompatibility,
  removeRecipientWithCompatibility,
  toggleRecipientWithCompatibility,
} from "@/lib/portal/recipient-compatibility";
import { recipientRpcFailureCode, runRecipientMutationTransport } from "@/lib/portal/recipient-rpc";
import type { StaffProfileRow } from "@/lib/portal/rows";
import { portalUrl, serviceClient } from "@/lib/portal/server";
import type { ServiceClient } from "@/lib/portal/server";

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

const updateRecipientLabelSchema = z.strictObject({
  recipientId: z.uuid(),
  label: z.string().nullable(),
});

const entityIdSchema = z.strictObject({
  id: z.uuid(),
});

const inviteStaffSchema = z.strictObject({
  email: z.string().trim().min(1).max(254).regex(EMAIL_RE),
  displayName: z.string().trim().min(1).max(120),
  // Admin-chosen staff role, written only after requireRole("admin") through
  // The server-only service client. Browser clients have no write grant.
  // react-doctor-disable-next-line react-doctor/supabase-client-owned-authz-field
  role: z.enum(STAFF_ROLES),
});

const staffRoleSchema = z.strictObject({
  userId: z.uuid(),
  // Same admin-owned role assignment as inviteStaffSchema; not a client write.
  // react-doctor-disable-next-line react-doctor/supabase-client-owned-authz-field
  role: z.enum(STAFF_ROLES),
});

export type UpdateRecipientLabelResult =
  | { ok: true }
  | { ok: false; code: "invalid" | "not_found" | "unavailable" };

export type ManagementFailureCode = "invalid" | "not_found" | "conflict" | "unavailable";

export interface ManagementFailure {
  ok: false;
  code: ManagementFailureCode;
  error: string;
}

export type MutationResult = { ok: true } | ManagementFailure;

export type AddRecipientResult = { ok: true; delivery: DeliveryOutcome } | ManagementFailure;

export type InviteStaffResult =
  | { ok: true; delivery: "accepted" }
  | { ok: true; delivery: "failed"; fallbackSetupUrl: string }
  | ManagementFailure;

function failure(code: ManagementFailureCode, error: string): ManagementFailure {
  return { ok: false, code, error };
}

function normalizeEmail(email: string): string {
  return email.toLowerCase();
}

function revalidateManagementViews(): void {
  revalidatePath("/admin/settings");
  revalidatePath("/admin/audit");
}

async function deliverStaffSetupLink({
  email,
  confirmationUrl,
  tokenHash,
  type,
  userId,
}: Readonly<{
  email: string;
  confirmationUrl: string;
  tokenHash: string;
  type: StaffSetupType;
  userId: string;
}>): Promise<Exclude<InviteStaffResult, ManagementFailure>> {
  return sendStaffSetupLink(sendPortalEmail, {
    email,
    confirmationUrl,
    tokenHash,
    type,
    userId,
  });
}

function authCreateFailure(code: string): ManagementFailure {
  if (code === "email_exists" || code === "user_already_exists") {
    return failure("conflict", "A staff account already uses that email.");
  }
  return failure("unavailable", "The staff account could not be created.");
}

async function operationFailed(operation: () => PromiseLike<{ error: unknown }>): Promise<boolean> {
  try {
    const result = await operation();
    return result.error !== null && result.error !== undefined;
  } catch {
    return true;
  }
}

async function deleteProvisionedUser(db: ServiceClient, userId: string): Promise<boolean> {
  // Ban first so a generated invite cannot be consumed if Auth deletion is
  // Temporarily unavailable. Supabase APIs resolve with `{ error }`, so each
  // Result must be inspected rather than relying on Promise rejection.
  // react-doctor-disable-next-line react-doctor/async-parallel
  const banFailed = await operationFailed(async () =>
    db.auth.admin.updateUserById(userId, {
      ban_duration: STAFF_BAN_DURATION,
    }),
  );
  // react-doctor-disable-next-line react-doctor/server-sequential-independent-await
  const initialProfileDeleteFailed = await operationFailed(() =>
    db.from("staff_profiles").delete().eq("user_id", userId),
  );
  const authDeleteFailed = await operationFailed(async () => db.auth.admin.deleteUser(userId));
  // react-doctor-disable-next-line react-doctor/server-sequential-independent-await
  const finalProfileDeleteFailed = await operationFailed(() =>
    db.from("staff_profiles").delete().eq("user_id", userId),
  );

  const safe = !authDeleteFailed && !finalProfileDeleteFailed;
  if (!safe) {
    // User IDs and boolean outcomes are operational metadata. Never include
    // The invited email, token, setup URL, or raw Supabase error messages.
    console.error("[portal-management] invite rollback incomplete", {
      userId,
      banFailed,
      initialProfileDeleteFailed,
      authDeleteFailed,
      finalProfileDeleteFailed,
    });
  }
  return safe;
}

/** Invite failure path: invalidate the token and finish cleanup before the
 * failure response. Any incomplete cleanup is recorded as a stable event. */
async function rollbackInvite(
  db: ServiceClient,
  userId: string,
  code: ManagementFailureCode,
  message: string,
): Promise<ManagementFailure> {
  await deleteProvisionedUser(db, userId);
  return failure(code, message);
}

export async function addNotificationRecipientMutation(input: Json): Promise<AddRecipientResult> {
  const session = await requireRole("admin");
  const parsed = addRecipientSchema.safeParse(input);
  if (!parsed.success) {
    return failure("invalid", "Enter a valid recipient email and label.");
  }

  const db = serviceClient();
  const email = normalizeEmail(parsed.data.email);
  const active = parsed.data.active ?? true;
  const label =
    parsed.data.label === undefined || parsed.data.label === "" ? null : parsed.data.label;
  const mutation = await runRecipientMutationTransport(
    () =>
      db
        .rpc("portal_add_notification_recipient", {
          p_actor_email: session.email,
          p_email: email,
          p_label: label,
          p_active: active,
        })
        .overrideTypes<string, { merge: false }>(),
    async () =>
      addRecipientWithCompatibility(db, {
        actorEmail: session.email,
        email,
        label,
        active,
      }),
  );
  let recipientId: string;
  if (mutation.transport === "compatibility") {
    if (!mutation.response.ok) {
      if (mutation.response.code === "conflict") {
        return failure("conflict", "That notification recipient already exists.");
      }
      return failure("unavailable", "The notification recipient could not be added.");
    }
    recipientId = mutation.response.recipientId;
  } else {
    const rpc = mutation.response;
    const parsedId = z.string().safeParse(rpc.data);
    if (rpc.error !== null || !parsedId.success) {
      if (
        recipientRpcFailureCode("add", rpc.error !== null ? rpc.error.code : undefined) ===
        "conflict"
      ) {
        return failure("conflict", "That notification recipient already exists.");
      }
      return failure("unavailable", "The notification recipient could not be added.");
    }
    recipientId = parsedId.data;
  }

  revalidateManagementViews();
  const delivery = await sendRecipientConfirmation(sendPortalEmail, {
    id: recipientId,
    email,
  });

  return { ok: true, delivery };
}

/**
 * Front-desk staff may correct a recipient label without remove-and-re-add
 * (which would re-send the confirmation email). The RPC owns the durable
 * write and its own `recipients.label_update` audit row.
 */
export async function updateRecipientLabelMutation(
  input: Json,
  actorEmail: string,
): Promise<UpdateRecipientLabelResult> {
  const parsed = updateRecipientLabelSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, code: "invalid" };
  }

  const trimmed = parsed.data.label === null ? null : parsed.data.label.trim();
  const label = trimmed === null || trimmed === "" ? null : trimmed;
  if (label !== null && (label.length < 1 || label.length > 120)) {
    return { ok: false, code: "invalid" };
  }

  const { data, error } = await serviceClient()
    .rpc("portal_update_recipient_label", {
      p_actor_email: actorEmail,
      p_recipient_id: parsed.data.recipientId,
      p_label: label,
    })
    .overrideTypes<boolean, { merge: false }>();

  if (error) {
    if (error.code === "P0002" || error.code === "22P02") {
      return { ok: false, code: "not_found" };
    }
    if (error.code === "22023") {
      return { ok: false, code: "invalid" };
    }
    return { ok: false, code: "unavailable" };
  }

  // No-op (same label) returns false from the RPC; treat as success.
  void data;
  revalidateManagementViews();
  return { ok: true };
}

/**
 * Recipient policy: active staff may pause or resume notification delivery
 * because that is an operational queue task. Adding and removing destinations
 * remains admin-only; staff otherwise have read-only recipient access.
 */
export async function toggleNotificationRecipientMutation(input: Json): Promise<MutationResult> {
  const session = await requireRole("staff");
  const parsed = recipientStateSchema.safeParse(input);
  if (!parsed.success) {
    return failure("invalid", "Choose a valid notification recipient.");
  }

  const db = serviceClient();
  const mutation = await runRecipientMutationTransport(
    () =>
      db
        .rpc("portal_toggle_notification_recipient", {
          p_actor_email: session.email,
          p_recipient_id: parsed.data.recipientId,
          p_active: parsed.data.active,
        })
        .overrideTypes<boolean, { merge: false }>(),
    async () =>
      toggleRecipientWithCompatibility(db, {
        actorEmail: session.email,
        recipientId: parsed.data.recipientId,
        active: parsed.data.active,
      }),
  );

  if (mutation.transport === "compatibility") {
    if (!mutation.response.ok) {
      if (mutation.response.code === "not_found") {
        return failure("not_found", "Notification recipient not found.");
      }
      return failure("unavailable", "The notification recipient could not be updated.");
    }
  } else if (mutation.response.error !== null) {
    if (recipientRpcFailureCode("toggle", mutation.response.error.code) === "not_found") {
      return failure("not_found", "Notification recipient not found.");
    }
    return failure("unavailable", "The notification recipient could not be updated.");
  }

  revalidateManagementViews();
  return { ok: true };
}

export async function removeNotificationRecipientMutation(input: Json): Promise<MutationResult> {
  const session = await requireRole("admin");
  const parsed = entityIdSchema.safeParse(input);
  if (!parsed.success) {
    return failure("invalid", "Choose a valid notification recipient.");
  }

  const db = serviceClient();
  const mutation = await runRecipientMutationTransport(
    () =>
      db
        .rpc("portal_remove_notification_recipient", {
          p_actor_email: session.email,
          p_recipient_id: parsed.data.id,
        })
        .overrideTypes<boolean, { merge: false }>(),
    async () =>
      removeRecipientWithCompatibility(db, {
        actorEmail: session.email,
        recipientId: parsed.data.id,
      }),
  );

  if (mutation.transport === "compatibility") {
    if (!mutation.response.ok) {
      if (mutation.response.code === "not_found") {
        return failure("not_found", "Notification recipient not found.");
      }
      return failure("unavailable", "The notification recipient could not be removed.");
    }
  } else if (mutation.response.error !== null) {
    if (recipientRpcFailureCode("remove", mutation.response.error.code) === "not_found") {
      return failure("not_found", "Notification recipient not found.");
    }
    return failure("unavailable", "The notification recipient could not be removed.");
  }

  revalidateManagementViews();
  return { ok: true };
}

export async function inviteStaffMutation(input: Json): Promise<InviteStaffResult> {
  const session = await requireRole("admin");
  const parsed = inviteStaffSchema.safeParse(input);
  if (!parsed.success) {
    return failure("invalid", "Enter a valid name, email, and staff role.");
  }

  const db = serviceClient();
  const email = normalizeEmail(parsed.data.email);
  const confirmationUrl = portalUrl("/admin/auth/confirm");
  if (confirmationUrl === null) {
    return failure("unavailable", "The staff invitation could not be created.");
  }

  const { data: created, error: createError } = await db.auth.admin.createUser({
    email,
    email_confirm: false,
    app_metadata: { role: parsed.data.role },
  });
  const user = created.user;
  if (createError || !user) {
    const parsedCreateError = z.object({ code: z.string() }).safeParse(createError);
    return authCreateFailure(parsedCreateError.success ? parsedCreateError.data.code : "");
  }

  const { data: generated, error: linkError } = await db.auth.admin.generateLink({
    type: "invite",
    email,
    options: { redirectTo: confirmationUrl },
  });
  const tokenHash = generated.properties?.hashed_token ?? null;
  if (linkError !== null || tokenHash === null || generated.user.id !== user.id) {
    return rollbackInvite(db, user.id, "unavailable", "The staff invitation could not be created.");
  }
  const { data: profile, error: profileError } = await db
    .from("staff_profiles")
    .insert({
      user_id: user.id,
      email,
      display_name: parsed.data.displayName,
      role: parsed.data.role,
      active: true,
      onboarded_at: null,
      portal_tour_dismissed_at: null,
    })
    .select("id")
    .single()
    .overrideTypes<Pick<StaffProfileRow, "id">, { merge: false }>();
  if (profileError) {
    return profileError.code === "23505"
      ? rollbackInvite(db, user.id, "conflict", "A staff account already uses that email.")
      : rollbackInvite(db, user.id, "unavailable", "The staff account could not be created.");
  }

  try {
    await recordAudit(db, {
      actorEmail: session.email,
      action: AUDIT_ACTIONS.STAFF_INVITE,
      entity: "staff_profiles",
      entityId: profile.id,
      detail: { role: parsed.data.role, active: true, onboarded: false },
    });
  } catch {
    return rollbackInvite(db, user.id, "unavailable", "The staff account could not be created.");
  }

  revalidateManagementViews();
  return deliverStaffSetupLink({
    email,
    confirmationUrl,
    tokenHash,
    type: "invite",
    userId: user.id,
  });
}

export async function resendStaffInviteMutation(input: Json): Promise<InviteStaffResult> {
  const session = await requireRole("admin");
  const parsed = entityIdSchema.safeParse(input);
  if (!parsed.success) {
    return failure("invalid", "Choose a valid pending staff invitation.");
  }

  const db = serviceClient();
  const { data: profile, error: profileError } = await db
    .from("staff_profiles")
    .select("id, user_id, email, role, active, onboarded_at")
    .eq("user_id", parsed.data.id)
    .maybeSingle()
    .overrideTypes<
      Pick<StaffProfileRow, "id" | "user_id" | "email" | "role" | "active" | "onboarded_at">,
      { merge: false }
    >();
  if (profileError) {
    return failure("unavailable", "The staff invitation could not be read.");
  }
  if (profile === null || !profile.active) {
    return failure("not_found", "Pending staff invitation not found.");
  }
  if (profile.onboarded_at !== null) {
    return failure("invalid", "That staff member has already completed setup.");
  }

  const { data: authData, error: authError } = await db.auth.admin.getUserById(profile.user_id);
  const authUser = authData.user;
  if (authUser === null) {
    return failure("unavailable", "The staff invitation could not be renewed.");
  }
  const authEmail = authUser.email ?? "";
  if (
    authError !== null ||
    authEmail === "" ||
    normalizeEmail(authEmail) !== normalizeEmail(profile.email)
  ) {
    return failure("unavailable", "The staff invitation could not be renewed.");
  }
  const bannedUntil = authUser.banned_until ?? null;
  if (bannedUntil !== null && Date.parse(bannedUntil) > Date.now()) {
    return failure("unavailable", "The staff invitation could not be renewed.");
  }

  // Once an invite OTP has been verified, Supabase considers the email
  // Confirmed. A recovery token is then the supported way to restore the
  // Interrupted password-setup session; the app still treats the active,
  // Not-onboarded profile as an invite and never accepts a role from input.
  const type: StaffSetupType =
    (authUser.email_confirmed_at ?? null) !== null ? "recovery" : "invite";
  const confirmationUrl = portalUrl("/admin/auth/confirm");
  if (confirmationUrl === null) {
    return failure("unavailable", "The staff invitation could not be renewed.");
  }

  const { data: generated, error: linkError } = await db.auth.admin.generateLink({
    type,
    email: profile.email,
    options: { redirectTo: confirmationUrl },
  });
  const tokenHash = generated.properties?.hashed_token ?? null;
  if (linkError !== null || tokenHash === null || generated.user.id !== profile.user_id) {
    return failure("unavailable", "The staff invitation could not be renewed.");
  }
  try {
    await recordAudit(db, {
      actorEmail: session.email,
      action: AUDIT_ACTIONS.STAFF_INVITE,
      entity: "staff_profiles",
      entityId: profile.id,
      detail: {
        role: profile.role,
        active: true,
        onboarded: false,
        resend: true,
        link_type: type,
      },
    });
  } catch {
    return failure("unavailable", "The staff invitation could not be renewed.");
  }

  revalidateManagementViews();
  return deliverStaffSetupLink({
    email: profile.email,
    confirmationUrl,
    tokenHash,
    type,
    userId: profile.user_id,
  });
}

export async function deactivateStaffMutation(input: Json): Promise<MutationResult> {
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
    .maybeSingle()
    .overrideTypes<
      Pick<StaffProfileRow, "id" | "user_id" | "active">,
      {
        merge: false;
      }
    >();
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
  // Target user's JWT rather than a user id. We do not hold target JWTs.
  // The profile flag is the immediate app-layer lockout; a long-lived Auth
  // Ban is the available admin-API backstop for future sign-ins/refreshes.
  const { error: banError } = await db.auth.admin.updateUserById(current.user_id, {
    ban_duration: STAFF_BAN_DURATION,
  });
  if (banError) {
    await db.from("staff_profiles").update({ active: true }).eq("user_id", current.user_id);
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
      db.from("staff_profiles").update({ active: true }).eq("user_id", current.user_id),
    ]);
    return failure("unavailable", "The staff account could not be deactivated.");
  }

  revalidateManagementViews();
  return { ok: true };
}

export async function changeStaffRoleMutation(input: Json): Promise<MutationResult> {
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
    .maybeSingle()
    .overrideTypes<
      Pick<StaffProfileRow, "id" | "user_id" | "role">,
      {
        merge: false;
      }
    >();
  if (readError) {
    return failure("unavailable", "The staff account could not be read.");
  }
  if (!current) {
    return failure("not_found", "Staff account not found.");
  }
  if (current.role === parsed.data.role) {
    return { ok: true };
  }

  const previousRole = current.role;
  const { data: authData, error: authReadError } = await db.auth.admin.getUserById(current.user_id);
  const authUser = authData.user;
  if (authReadError || !authUser) {
    return failure("unavailable", "The staff role could not be changed.");
  }

  const parsedMetadata = jsonObjectSchema.safeParse(authUser.app_metadata);
  const previousMetadata = parsedMetadata.success ? parsedMetadata.data : {};
  const { error: metadataError } = await db.auth.admin.updateUserById(current.user_id, {
    app_metadata: {
      ...previousMetadata,
      role: parsed.data.role,
    },
  });
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
      db.from("staff_profiles").update({ role: previousRole }).eq("user_id", current.user_id),
      db.auth.admin.updateUserById(current.user_id, {
        app_metadata: previousMetadata,
      }),
    ]);
    return failure("unavailable", "The staff role could not be changed.");
  }

  revalidateManagementViews();
  return { ok: true };
}
