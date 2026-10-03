import type { DeliveryOutcome, PortalEmailOutcome, SendPortalEmail } from "@/lib/portal/email";

export type NotificationRecipient = Readonly<{
  id: string;
  email: string;
}>;

export interface NotificationEvent {
  readonly request_id: string;
  readonly type: "notification";
  readonly recipient: string;
  readonly provider_message_id: string | null;
  readonly status: DeliveryOutcome;
  readonly meta:
    | { readonly provider: string }
    | {
        readonly provider: string;
        readonly reason: Extract<PortalEmailOutcome, { status: "failed" }>["reason"];
        readonly provider_status_code: number | null;
      };
}

/** The new-request email. Settings › Notifications previews these and its test send uses them,
    so what staff see there is what a real request sends. */
export const NOTIFICATION_SUBJECT = "New appointment request — Westchase GI portal";

/** A test send says so in its subject, so nobody mistakes it for a patient's request. */
export const TEST_NOTIFICATION_SUBJECT = `[Test] ${NOTIFICATION_SUBJECT}`;

export const NOTIFICATION_INTRO =
  "A new appointment request is waiting in the Westchase GI portal.";

export function notificationText(portalUrl: string): string {
  return `${NOTIFICATION_INTRO}\n\nOpen the portal: ${portalUrl}`;
}

function eventFromOutcome(
  requestId: string,
  recipient: NotificationRecipient,
  outcome: Readonly<PortalEmailOutcome>,
): NotificationEvent {
  return {
    request_id: requestId,
    type: "notification",
    recipient: recipient.email,
    provider_message_id: outcome.status === "accepted" ? outcome.providerMessageId : null,
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
  if (portalUrl === null || portalUrl === "") {
    return recipients.map((recipient) =>
      eventFromOutcome(requestId, recipient, {
        status: "failed",
        provider: "application",
        reason: "unconfigured",
        providerStatusCode: null,
      }),
    );
  }

  const text = notificationText(portalUrl);

  return Promise.all(
    recipients.map(async (recipient) =>
      eventFromOutcome(
        requestId,
        recipient,
        await sendEmail({
          purpose: "appointment_notification",
          to: recipient.email,
          subject: NOTIFICATION_SUBJECT,
          text,
          idempotencyKey: `appointment-notification/${requestId}/${recipient.id}`,
        }),
      ),
    ),
  );
}

/** The same message to every address that is on, marked as a test. It carries no request. */
export async function sendTestNotifications(
  sendEmail: SendPortalEmail,
  sendId: string,
  recipients: readonly NotificationRecipient[],
  portalUrl: string,
): Promise<PortalEmailOutcome[]> {
  const text = notificationText(portalUrl);
  return Promise.all(
    recipients.map(async (recipient) =>
      sendEmail({
        purpose: "appointment_notification_test",
        to: recipient.email,
        subject: TEST_NOTIFICATION_SUBJECT,
        text,
        idempotencyKey: `appointment-notification-test/${sendId}/${recipient.id}`,
      }),
    ),
  );
}
