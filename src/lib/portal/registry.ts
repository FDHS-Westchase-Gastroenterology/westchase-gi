import "server-only";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { recordAudit } from "@/lib/portal/audit";
import { requireRole } from "@/lib/portal/auth";
import { AUDIT_ACTIONS } from "@/lib/portal/contracts";
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

function assetRow(data: z.infer<typeof assetFieldsSchema>) {
  return {
    name: data.name,
    kind: data.kind,
    repo: data.repo || null,
    live_url: data.liveUrl || null,
    hosting: data.hosting || null,
    maintainer: data.maintainer,
    status: data.status,
    notes: data.notes || null,
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
  const { data: asset, error } = await db
    .from("registry_assets")
    .insert(assetRow(parsed.data))
    .select("id")
    .single();
  if (error || !asset) {
    if (error?.code === "23505") {
      return failure("conflict", "An asset with that name already exists.");
    }
    return failure("unavailable", "The asset could not be created.");
  }

  await recordAudit(db, {
    actorEmail: session.email,
    action: AUDIT_ACTIONS.REGISTRY_CREATE,
    entity: "registry_assets",
    entityId: asset.id,
    detail: { name: parsed.data.name },
  });

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
  const { data: existing, error: readError } = await db
    .from("registry_assets")
    .select("id")
    .eq("id", parsed.data.id)
    .maybeSingle();
  if (readError) {
    return failure("unavailable", "The asset could not be read.");
  }
  if (!existing) {
    return failure("not_found", "Asset not found.");
  }

  const { error: updateError } = await db
    .from("registry_assets")
    .update(assetRow(parsed.data))
    .eq("id", parsed.data.id);
  if (updateError) {
    if (updateError.code === "23505") {
      return failure("conflict", "An asset with that name already exists.");
    }
    return failure("unavailable", "The asset could not be updated.");
  }

  await recordAudit(db, {
    actorEmail: session.email,
    action: AUDIT_ACTIONS.REGISTRY_UPDATE,
    entity: "registry_assets",
    entityId: parsed.data.id,
    detail: { name: parsed.data.name },
  });

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
  const { data: existing, error: readError } = await db
    .from("registry_assets")
    .select("id, status")
    .eq("id", parsed.data.id)
    .maybeSingle();
  if (readError) {
    return failure("unavailable", "The asset could not be read.");
  }
  if (!existing) {
    return failure("not_found", "Asset not found.");
  }
  if (existing.status === "archived") {
    return { ok: true };
  }

  const { error: updateError } = await db
    .from("registry_assets")
    .update({ status: "archived" })
    .eq("id", parsed.data.id);
  if (updateError) {
    return failure("unavailable", "The asset could not be archived.");
  }

  await recordAudit(db, {
    actorEmail: session.email,
    action: AUDIT_ACTIONS.REGISTRY_ARCHIVE,
    entity: "registry_assets",
    entityId: parsed.data.id,
    detail: { from: existing.status },
  });

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
  const { data: asset, error: assetError } = await db
    .from("registry_assets")
    .select("id")
    .eq("id", parsed.data.assetId)
    .maybeSingle();
  if (assetError) {
    return failure("unavailable", "The asset could not be read.");
  }
  if (!asset) {
    return failure("not_found", "Asset not found.");
  }

  const { data: grant, error: insertError } = await db
    .from("registry_grants")
    .insert({
      asset_id: parsed.data.assetId,
      person: parsed.data.person,
      role: parsed.data.role,
      granted_via: parsed.data.grantedVia,
      active: true,
    })
    .select("id")
    .single();
  if (insertError || !grant) {
    if (insertError?.code === "23505") {
      return failure("conflict", "That exact grant is already recorded.");
    }
    return failure("unavailable", "The grant could not be recorded.");
  }

  await recordAudit(db, {
    actorEmail: session.email,
    action: AUDIT_ACTIONS.REGISTRY_UPDATE,
    entity: "registry_grants",
    entityId: grant.id,
    detail: { change: "grant_added", person: parsed.data.person },
  });

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
  const { data: existing, error: readError } = await db
    .from("registry_grants")
    .select("id, active, person")
    .eq("id", parsed.data.id)
    .maybeSingle();
  if (readError) {
    return failure("unavailable", "The grant could not be read.");
  }
  if (!existing) {
    return failure("not_found", "Grant not found.");
  }
  if (!existing.active) {
    return { ok: true };
  }

  const { error: updateError } = await db
    .from("registry_grants")
    .update({ active: false })
    .eq("id", parsed.data.id);
  if (updateError) {
    return failure("unavailable", "The grant could not be deactivated.");
  }

  await recordAudit(db, {
    actorEmail: session.email,
    action: AUDIT_ACTIONS.REGISTRY_UPDATE,
    entity: "registry_grants",
    entityId: parsed.data.id,
    detail: { change: "grant_deactivated", person: existing.person },
  });

  revalidateRegistry();
  return { ok: true };
}
