import { createHash } from "node:crypto";
import type { SendPortalEmail } from "@/lib/portal/email";

export type ManagementEmailDelivery =
  | { ok: true; delivery: "accepted" }
  | { ok: true; delivery: "failed"; fallbackSetupUrl: string };

export type StaffSetupType = "invite" | "recovery";

function staffSetupUrl(
  confirmationUrl: string,
  tokenHash: string,
  type: StaffSetupType,
): string {
  const setupUrl = new URL(confirmationUrl);
  setupUrl.hash = new URLSearchParams({
    token_hash: tokenHash,
    type,
  }).toString();
  return setupUrl.toString();
}

export async function sendRecipientConfirmation(
  sendEmail: SendPortalEmail,
  recipient: { id: string; email: string },
): Promise<"accepted" | "failed"> {
  const outcome = await sendEmail({
    purpose: "recipient_confirmation",
    to: recipient.email,
    subject: "Appointment notification access — Westchase GI portal",
    text: [
      "A Westchase GI portal administrator added this address to appointment request notifications.",
      "Future notification emails only say that an appointment request is waiting and link to the secure portal. They do not contain patient details.",
      "If you did not expect this, contact the Westchase GI office directly.",
    ].join("\n\n"),
    idempotencyKey: `recipient-confirmation/${recipient.id}`,
  });

  return outcome.status;
}

export async function sendStaffSetupLink(
  sendEmail: SendPortalEmail,
  {
    email,
    confirmationUrl,
    tokenHash,
    type,
    userId,
  }: {
    email: string;
    confirmationUrl: string;
    tokenHash: string;
    type: StaffSetupType;
    userId: string;
  },
): Promise<ManagementEmailDelivery> {
  const setupUrl = staffSetupUrl(confirmationUrl, tokenHash, type);
  const tokenDigest = createHash("sha256")
    .update(tokenHash)
    .digest("hex")
    .slice(0, 32);
  const outcome = await sendEmail({
    purpose: "staff_invite",
    to: email,
    subject: "Set up your Westchase GI portal access",
    text: [
      "You have been invited to the Westchase GI staff portal.",
      "Use this one-time link to choose your password:",
      setupUrl,
      "If the link has expired, ask a portal administrator for a new invitation. If you did not expect this invitation, contact the Westchase GI office directly.",
    ].join("\n\n"),
    idempotencyKey: `staff-setup/${type}/${userId}/${tokenDigest}`,
  });

  return outcome.status === "accepted"
    ? { ok: true, delivery: "accepted" }
    : { ok: true, delivery: "failed", fallbackSetupUrl: setupUrl };
}
