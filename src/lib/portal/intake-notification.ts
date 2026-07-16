import type {
  PortalEmailOutcome,
  SendPortalEmail,
} from "@/lib/portal/email";

export type NotificationRecipient = Readonly<{
  id: string;
  email: string;
}>;

export type NotificationEvent = {
  request_id: string;
  type: "notification";
  recipient: string;
  provider_message_id: string | null;
  status: "accepted" | "failed";
  meta:
    | { provider: string }
    | {
        provider: string;
        reason: Extract<PortalEmailOutcome, { status: "failed" }>["reason"];
        provider_status_code: number | null;
      };
};

const SUBJECT = "New appointment request — Westchase GI portal";

function eventFromOutcome(
  requestId: string,
  recipient: NotificationRecipient,
  outcome: PortalEmailOutcome,
): NotificationEvent {
  return {
    request_id: requestId,
    type: "notification",
    recipient: recipient.email,
    provider_message_id:
      outcome.status === "accepted" ? outcome.providerMessageId : null,
    status: outcome.status,
    meta:
      outcome.status === "accepted"
        ? { provider: outcome.provider }
        : {
            provider: outcome.provider,
            reason: outcome.reason,
            provider_status_code: outcome.providerStatusCode,
          },
  };
}

export async function createAppointmentNotificationEvents(
  sendEmail: SendPortalEmail,
  requestId: string,
  recipients: readonly NotificationRecipient[],
  portalUrl: string | null,
): Promise<NotificationEvent[]> {
  if (!portalUrl) {
    return recipients.map((recipient) =>
      eventFromOutcome(requestId, recipient, {
        status: "failed",
        provider: "application",
        reason: "unconfigured",
        providerStatusCode: null,
      }),
    );
  }

  const text = `A new appointment request is waiting in the Westchase GI portal.\n\nOpen the portal: ${portalUrl}`;

  return Promise.all(
    recipients.map(async (recipient) =>
      eventFromOutcome(
        requestId,
        recipient,
        await sendEmail({
          purpose: "appointment_notification",
          to: recipient.email,
          subject: SUBJECT,
          text,
          idempotencyKey: `appointment-notification/${requestId}/${recipient.id}`,
        }),
      ),
    ),
  );
}
