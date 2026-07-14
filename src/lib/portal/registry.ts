import "server-only";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/portal/auth";
import { serviceClient } from "@/lib/portal/server";
import type {
  ManagementFailure,
  ManagementFailureCode,
  MutationResult,
} from "@/lib/portal/management";

// Registry mutations: the sovereignty ledger's write path. Admin-only,
// audited, service-role writes (the tables have no authenticated write
// policies at all — RLS denies direct REST writes for every session).

const assetFieldsSchema = z.strictObject({
  name: z.string().trim().min(1).max(120),
  kind: z.string().trim().min(1).max(60),
  repo: z.string().trim().max(160).optional(),
  liveUrl: z.url().max(300).optional(),
  hosting: z.string().trim().max(160).optional(),
  maintainer: z.string().trim().min(1).max(120),
  status: z.string().trim().min(1).max(40),
  notes: z.string().trim().max(1000).optional(),
});

const assetUpdateSchema = assetFieldsSchema.extend({
  id: z.uuid(),
});

const assetIdSchema = z.strictObject({ id: z.uuid() });

const grantAddSchema = z.strictObject({
  assetId: z.uuid(),
  person: z.string().trim().min(1).max(120),
  role: z.string().trim().min(1).max(80),
  grantedVia: z.string().trim().min(1).max(120),
});

const grantIdSchema = z.strictObject({ id: z.uuid() });

function failure(
  code: ManagementFailureCode,
  error: string,
): ManagementFailure {
  return { ok: false, code, error };
}

function revalidateRegistry() {
  revalidatePath("/admin/settings/software");
  revalidatePath("/admin/audit");
}

function assetRpcArgs(data: z.infer<typeof assetFieldsSchema>) {
  return {
    p_name: data.name,
    p_kind: data.kind,
    p_repo: data.repo || null,
    p_live_url: data.liveUrl || null,
    p_hosting: data.hosting || null,
    p_maintainer: data.maintainer,
    p_status: data.status,
    p_notes: data.notes || null,
  };
}

export async function createRegistryAssetMutation(
  input: unknown,
): Promise<MutationResult> {
  const session = await requireRole("admin");
  const parsed = assetFieldsSchema.safeParse(input);
  if (!parsed.success) {
    return failure("invalid", "Check the asset fields — something is missing or too long.");
  }

  const db = serviceClient();
  const { data: assetId, error } = await db.rpc(
    "portal_create_registry_asset",
    {
      p_actor_email: session.email,
      ...assetRpcArgs(parsed.data),
    },
  );
  if (error || !assetId) {
    if (error?.code === "23505") {
      return failure("conflict", "An asset with that name already exists.");
    }
    return failure("unavailable", "The asset could not be created.");
  }

  revalidateRegistry();
  return { ok: true };
}

export async function updateRegistryAssetMutation(
  input: unknown,
): Promise<MutationResult> {
  const session = await requireRole("admin");
  const parsed = assetUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return failure("invalid", "Check the asset fields — something is missing or too long.");
  }

  const db = serviceClient();
  const { error } = await db.rpc("portal_update_registry_asset", {
    p_actor_email: session.email,
    p_asset_id: parsed.data.id,
    ...assetRpcArgs(parsed.data),
  });
  if (error) {
    if (error.code === "P0002") {
      return failure("not_found", "Asset not found.");
    }
    if (error.code === "23505") {
      return failure("conflict", "An asset with that name already exists.");
    }
    return failure("unavailable", "The asset could not be updated.");
  }

  revalidateRegistry();
  return { ok: true };
}

export async function archiveRegistryAssetMutation(
  input: unknown,
): Promise<MutationResult> {
  const session = await requireRole("admin");
  const parsed = assetIdSchema.safeParse(input);
  if (!parsed.success) {
    return failure("invalid", "Choose a valid asset.");
  }

  const db = serviceClient();
  const { data: changed, error } = await db.rpc(
    "portal_archive_registry_asset",
    {
      p_actor_email: session.email,
      p_asset_id: parsed.data.id,
    },
  );
  if (error) {
    if (error.code === "P0002") {
      return failure("not_found", "Asset not found.");
    }
    return failure("unavailable", "The asset could not be archived.");
  }
  if (!changed) return { ok: true };

  revalidateRegistry();
  return { ok: true };
}

export async function addRegistryGrantMutation(
  input: unknown,
): Promise<MutationResult> {
  const session = await requireRole("admin");
  const parsed = grantAddSchema.safeParse(input);
  if (!parsed.success) {
    return failure("invalid", "Check the grant fields — something is missing.");
  }

  const db = serviceClient();
  const { data: grantId, error } = await db.rpc(
    "portal_add_registry_grant",
    {
      p_actor_email: session.email,
      p_asset_id: parsed.data.assetId,
      p_person: parsed.data.person,
      p_role: parsed.data.role,
      p_granted_via: parsed.data.grantedVia,
    },
  );
  if (error || !grantId) {
    if (error?.code === "P0002") {
      return failure("not_found", "Asset not found.");
    }
    if (error?.code === "23505") {
      return failure("conflict", "That exact grant is already recorded.");
    }
    return failure("unavailable", "The grant could not be recorded.");
  }

  revalidateRegistry();
  return { ok: true };
}

export async function deactivateRegistryGrantMutation(
  input: unknown,
): Promise<MutationResult> {
  const session = await requireRole("admin");
  const parsed = grantIdSchema.safeParse(input);
  if (!parsed.success) {
    return failure("invalid", "Choose a valid grant.");
  }

  const db = serviceClient();
  const { data: changed, error } = await db.rpc(
    "portal_deactivate_registry_grant",
    {
      p_actor_email: session.email,
      p_grant_id: parsed.data.id,
    },
  );
  if (error) {
    if (error.code === "P0002") {
      return failure("not_found", "Grant not found.");
    }
    return failure("unavailable", "The grant could not be deactivated.");
  }
  if (!changed) return { ok: true };

  revalidateRegistry();
  return { ok: true };
}
