import "server-only";

import { Resend } from "resend";
import {
  createEmailSender,
  type PortalEmailTransport,
} from "@/lib/portal/email";

const FALLBACK_SENDER = "onboarding@resend.dev";

const resendTransport: PortalEmailTransport = {
  provider: "resend",
  async send(message) {
    const apiKey = process.env.RESEND_API_KEY?.trim();
    if (!apiKey) {
      return {
        reason: "unconfigured",
        providerStatusCode: null,
      };
    }

    const { data, error } = await new Resend(apiKey).emails.send(
      {
        from: process.env.RESEND_FROM?.trim() || FALLBACK_SENDER,
        to: message.to,
        subject: message.subject,
        text: message.text,
      },
      { idempotencyKey: message.idempotencyKey },
    );

    if (error) {
      const providerStatusCode = error.statusCode ?? null;
      return {
        reason:
          providerStatusCode === 429
            ? "rate_limited"
            : providerStatusCode === 403 || providerStatusCode === 422
              ? "rejected"
              : "transport_failure",
        providerStatusCode,
      };
    }

    return data?.id
      ? { providerMessageId: data.id }
      : { reason: "transport_failure", providerStatusCode: null };
  },
};

export const sendPortalEmail = createEmailSender(resendTransport);
