"use server";

import { requireRole } from "@/lib/portal/auth";
import {
  addNotificationRecipientMutation,
  changeStaffRoleMutation,
  deactivateStaffMutation,
  inviteStaffMutation,
  removeNotificationRecipientMutation,
  toggleNotificationRecipientMutation,
} from "@/lib/portal/management";

// Server actions are public POST endpoints: each one authenticates as its
// FIRST statement. The management mutations re-check the same role
// internally (defense in depth for any other caller).

export async function addNotificationRecipient(input: unknown) {
  await requireRole("admin", { unauthenticated: "throw" });
  return addNotificationRecipientMutation(input);
}

export async function toggleNotificationRecipient(input: unknown) {
  await requireRole("staff", { unauthenticated: "throw" });
  return toggleNotificationRecipientMutation(input);
}

export async function removeNotificationRecipient(input: unknown) {
  await requireRole("admin", { unauthenticated: "throw" });
  return removeNotificationRecipientMutation(input);
}

export async function inviteStaff(input: unknown) {
  await requireRole("admin", { unauthenticated: "throw" });
  return inviteStaffMutation(input);
}

export async function deactivateStaff(input: unknown) {
  await requireRole("admin", { unauthenticated: "throw" });
  return deactivateStaffMutation(input);
}

export async function changeStaffRole(input: unknown) {
  await requireRole("admin", { unauthenticated: "throw" });
  return changeStaffRoleMutation(input);
}
