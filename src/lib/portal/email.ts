import "server-only";

import { Resend } from "resend";

export type PortalEmailPurpose =
  | "recipient_confirmation"
  | "staff_invite";

export type PortalEmailResult =
  | { ok: true; messageId: string }
  | {
      ok: false;
      reason: "unconfigured" | "rejected" | "rate_limited" | "failed";
      statusCode: number | null;
    };

const FALLBACK_SENDER = "onboarding@resend.dev";
const SEND_DEADLINE_MS = 8_000;

function logEmailFailure(
  event: string,
  purpose: PortalEmailPurpose,
  statusCode: number | null = null,
): void {
  // Transactional messages may contain bearer links. Never log the recipient,
  // body, URL, idempotency key, or provider error text.
  console.error(`[portal-email] ${event}`, { purpose, statusCode });
}

export function portalEmailSender(): string {
  return process.env.RESEND_FROM?.trim() || FALLBACK_SENDER;
}

async function withDeadline<T>(operation: Promise<T>): Promise<T | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<null>((resolve) => {
    timer = setTimeout(() => resolve(null), SEND_DEADLINE_MS);
  });

  try {
    return await Promise.race([operation, deadline]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/** Build an application-owned URL without accepting an absolute/open-redirect
 * target. HTTP remains valid for local Playwright; production supplies HTTPS. */
export function portalUrl(path: string): string | null {
  const base = process.env.PORTAL_BASE_URL?.trim();
  if (!base || !path.startsWith("/") || path.startsWith("//")) return null;

  try {
    const baseUrl = new URL(base);
    if (
      (baseUrl.protocol !== "http:" && baseUrl.protocol !== "https:") ||
      baseUrl.username ||
      baseUrl.password
    ) {
      return null;
    }

    const target = new URL(path, baseUrl);
    return target.origin === baseUrl.origin ? target.toString() : null;
  } catch {
    return null;
  }
}

export async function sendPortalEmail({
  to,
  subject,
  text,
  idempotencyKey,
  purpose,
}: {
  to: string;
  subject: string;
  text: string;
  idempotencyKey: string;
  purpose: PortalEmailPurpose;
}): Promise<PortalEmailResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    logEmailFailure("provider unconfigured", purpose);
    return { ok: false, reason: "unconfigured", statusCode: null };
  }

  try {
    const result = await withDeadline(
      new Resend(apiKey).emails.send(
        {
          from: portalEmailSender(),
          to,
          subject,
          text,
        },
        { idempotencyKey },
      ),
    );
    if (!result) {
      // The provider may still accept the in-flight request. Reusing the same
      // key makes any deliberate retry safe while the caller receives its
      // durable-state success and, for invites, the fallback setup link.
      logEmailFailure("provider deadline exceeded", purpose);
      return { ok: false, reason: "failed", statusCode: null };
    }
    const { data, error } = result;

    if (error) {
      const statusCode = error.statusCode ?? null;
      const reason =
        statusCode === 429
          ? "rate_limited"
          : statusCode === 403 || statusCode === 422
            ? "rejected"
            : "failed";
      logEmailFailure("provider rejected send", purpose, statusCode);
      return { ok: false, reason, statusCode };
    }

    if (!data?.id) {
      logEmailFailure("provider returned no message id", purpose);
      return { ok: false, reason: "failed", statusCode: null };
    }

    return { ok: true, messageId: data.id };
  } catch {
    logEmailFailure("provider request failed", purpose);
    return { ok: false, reason: "failed", statusCode: null };
  }
}
