"use server";

import type { Json } from "@/lib/json";
import { requireRole } from "@/lib/portal/auth";
import {
  addNotificationRecipientMutation,
  changeStaffRoleMutation,
  deactivateStaffMutation,
  inviteStaffMutation,
  removeNotificationRecipientMutation,
  resendStaffInviteMutation,
  toggleNotificationRecipientMutation,
  updateRecipientLabelMutation,
} from "@/lib/portal/management";
import {
  cancelMaintainerInviteMutation,
  inviteMaintainerMutation,
  revokeMaintainerMutation,
} from "@/lib/portal/maintainers";

// Server actions are public POST endpoints: each one authenticates as its
// FIRST statement. The management mutations re-check the same role
// Internally (defense in depth for any other caller).

export async function addNotificationRecipient(input: Json) {
  await requireRole("admin", { unauthenticated: "throw" });
  return addNotificationRecipientMutation(input);
}

export async function toggleNotificationRecipient(input: Json) {
  await requireRole("staff", { unauthenticated: "throw" });
  return toggleNotificationRecipientMutation(input);
}

export async function updateRecipientLabel(input: Json) {
  const session = await requireRole("staff", { unauthenticated: "throw" });
  return updateRecipientLabelMutation(input, session.email);
}

export async function removeNotificationRecipient(input: Json) {
  await requireRole("admin", { unauthenticated: "throw" });
  return removeNotificationRecipientMutation(input);
}

export async function inviteStaff(input: Json) {
  await requireRole("admin", { unauthenticated: "throw" });
  return inviteStaffMutation(input);
}

export async function resendStaffInvite(input: Json) {
  await requireRole("admin", { unauthenticated: "throw" });
  return resendStaffInviteMutation(input);
}

export async function deactivateStaff(input: Json) {
  await requireRole("admin", { unauthenticated: "throw" });
  return deactivateStaffMutation(input);
}

export async function changeStaffRole(input: Json) {
  await requireRole("admin", { unauthenticated: "throw" });
  return changeStaffRoleMutation(input);
}

export async function inviteMaintainer(input: Json) {
  await requireRole("admin", { unauthenticated: "throw" });
  return inviteMaintainerMutation(input);
}

export async function cancelMaintainerInvite(input: Json) {
  await requireRole("admin", { unauthenticated: "throw" });
  return cancelMaintainerInviteMutation(input);
}

export async function revokeMaintainer(input: Json) {
  await requireRole("admin", { unauthenticated: "throw" });
  return revokeMaintainerMutation(input);
}
