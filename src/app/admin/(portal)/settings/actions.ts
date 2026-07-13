"use server";

import {
  addNotificationRecipientMutation,
  changeStaffRoleMutation,
  deactivateStaffMutation,
  inviteStaffMutation,
  removeNotificationRecipientMutation,
  toggleNotificationRecipientMutation,
} from "@/lib/portal/management";

export async function addNotificationRecipient(input: unknown) {
  return addNotificationRecipientMutation(input);
}

export async function toggleNotificationRecipient(input: unknown) {
  return toggleNotificationRecipientMutation(input);
}

export async function removeNotificationRecipient(input: unknown) {
  return removeNotificationRecipientMutation(input);
}

export async function inviteStaff(input: unknown) {
  return inviteStaffMutation(input);
}

export async function deactivateStaff(input: unknown) {
  return deactivateStaffMutation(input);
}

export async function changeStaffRole(input: unknown) {
  return changeStaffRoleMutation(input);
}
