"use server";

import { requireRole } from "@/lib/portal/auth";
import {
  addRegistryGrantMutation,
  archiveRegistryAssetMutation,
  createRegistryAssetMutation,
  deactivateRegistryGrantMutation,
  updateRegistryAssetMutation,
} from "@/lib/portal/registry";

// Server actions are public POST endpoints: each authenticates as its
// FIRST statement; the mutations re-check the admin role internally.

export async function createRegistryAsset(input: unknown) {
  await requireRole("admin", { unauthenticated: "throw" });
  return createRegistryAssetMutation(input);
}

export async function updateRegistryAsset(input: unknown) {
  await requireRole("admin", { unauthenticated: "throw" });
  return updateRegistryAssetMutation(input);
}

export async function archiveRegistryAsset(input: unknown) {
  await requireRole("admin", { unauthenticated: "throw" });
  return archiveRegistryAssetMutation(input);
}

export async function addRegistryGrant(input: unknown) {
  await requireRole("admin", { unauthenticated: "throw" });
  return addRegistryGrantMutation(input);
}

export async function deactivateRegistryGrant(input: unknown) {
  await requireRole("admin", { unauthenticated: "throw" });
  return deactivateRegistryGrantMutation(input);
}
