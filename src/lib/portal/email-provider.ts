import "server-only";

import { Resend } from "resend";

import { createEmailSender } from "@/lib/portal/email";
import type { PortalEmailTransport } from "@/lib/portal/email";

const FALLBACK_SENDER = "onboarding@resend.dev";

const resendTransport: PortalEmailTransport = {
  provider: "resend",
  async send(message) {
    const apiKey = process.env.RESEND_API_KEY?.trim();
    if (apiKey === undefined || apiKey === "") {
      return {
        reason: "unconfigured",
        providerStatusCode: null,
      };
    }

    const from = process.env.RESEND_FROM?.trim();
    const result = await new Resend(apiKey).emails.send(
      {
        from: from !== undefined && from !== "" ? from : FALLBACK_SENDER,
        to: message.to,
        subject: message.subject,
        text: message.text,
      },
      { idempotencyKey: message.idempotencyKey },
    );

    if (result.error !== null) {
      const providerStatusCode = result.error.statusCode ?? null;
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

    return result.data.id !== ""
      ? { providerMessageId: result.data.id }
      : { reason: "transport_failure", providerStatusCode: null };
  },
};

export const sendPortalEmail = createEmailSender(resendTransport);
