export type PortalEmailPurpose =
  | "appointment_notification"
  | "recipient_confirmation"
  | "staff_invite";

export type PortalEmailMessage = Readonly<{
  purpose: PortalEmailPurpose;
  to: string;
  subject: string;
  text: string;
  idempotencyKey: string;
}>;

export type PortalEmailOutcome =
  | {
      status: "accepted";
      provider: string;
      providerMessageId: string;
    }
  | {
      status: "failed";
      provider: string;
      reason:
        | "unconfigured"
        | "rejected"
        | "rate_limited"
        | "timed_out"
        | "transport_failure";
      providerStatusCode: number | null;
    };

export type SendPortalEmail = (
  message: PortalEmailMessage,
) => Promise<PortalEmailOutcome>;

export type PortalEmailTransport = Readonly<{
  provider: string;
  send: (
    message: PortalEmailMessage,
  ) => Promise<
    | { providerMessageId: string }
    | {
        reason:
          | "unconfigured"
          | "rejected"
          | "rate_limited"
          | "transport_failure";
        providerStatusCode: number | null;
      }
  >;
}>;

function logFailure(
  event: string,
  message: PortalEmailMessage,
  provider: string,
  providerStatusCode: number | null = null,
): void {
  // Messages can contain patient-adjacent destinations or bearer links. Log
  // only stable policy fields, never content, recipients, keys, or errors.
  console.error(`[portal-email] ${event}`, {
    purpose: message.purpose,
    provider,
    providerStatusCode,
  });
}

export function createEmailSender(
  transport: PortalEmailTransport,
  deadlineMs = 8_000,
): SendPortalEmail {
  return async (message) => {
    let timer: ReturnType<typeof setTimeout> | undefined;

    try {
      const result = await Promise.race([
        transport.send(message),
        new Promise<"timed_out">((resolve) => {
          timer = setTimeout(() => resolve("timed_out"), deadlineMs);
        }),
      ]);

      if (result === "timed_out") {
        logFailure("deadline exceeded", message, transport.provider);
        return {
          status: "failed",
          provider: transport.provider,
          reason: "timed_out",
          providerStatusCode: null,
        };
      }

      if ("providerMessageId" in result) {
        return {
          status: "accepted",
          provider: transport.provider,
          providerMessageId: result.providerMessageId,
        };
      }

      logFailure(
        "send failed",
        message,
        transport.provider,
        result.providerStatusCode,
      );
      return { status: "failed", provider: transport.provider, ...result };
    } catch {
      logFailure("transport threw", message, transport.provider);
      return {
        status: "failed",
        provider: transport.provider,
        reason: "transport_failure",
        providerStatusCode: null,
      };
    } finally {
      if (timer) clearTimeout(timer);
    }
  };
}
