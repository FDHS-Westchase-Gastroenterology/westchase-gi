import { createHash } from "node:crypto";

import type { PasswordAuthFlow } from "@/lib/portal/contracts";
import type { DeliveryOutcome, SendPortalEmail } from "@/lib/portal/email";
import { RECIPIENT_CONFIRMATION_BODY } from "@/lib/portal/staff-language";

export type ManagementEmailDelivery =
  | { ok: true; delivery: "accepted" }
  | { ok: true; delivery: "failed"; fallbackSetupUrl: string };

function staffSetupUrl(confirmationUrl: string, tokenHash: string, type: PasswordAuthFlow): string {
  const setupUrl = new URL(confirmationUrl);
  setupUrl.hash = new URLSearchParams({
    token_hash: tokenHash,
    type,
  }).toString();
  return setupUrl.toString();
}

export async function sendRecipientConfirmation(
  sendEmail: SendPortalEmail,
  recipient: Readonly<{ id: string; email: string }>,
): Promise<DeliveryOutcome> {
  const outcome = await sendEmail({
    purpose: "recipient_confirmation",
    to: recipient.email,
    subject: "Appointment notification access — Westchase GI portal",
    text: RECIPIENT_CONFIRMATION_BODY,
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
  }: Readonly<{
    email: string;
    confirmationUrl: string;
    tokenHash: string;
    type: PasswordAuthFlow;
    userId: string;
  }>,
): Promise<ManagementEmailDelivery> {
  const setupUrl = staffSetupUrl(confirmationUrl, tokenHash, type);
  const tokenDigest = createHash("sha256").update(tokenHash).digest("hex").slice(0, 32);
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
