import "server-only";

import { createHash, randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import {
  HONEYPOT_FIELD,
  INTAKE_RATE_LIMIT,
  requestInputSchema,
  type IntakeResponse,
  zodFieldErrors,
} from "@/lib/portal/contracts";
import { serviceClient } from "@/lib/portal/server";

type IntakeResult = {
  response: IntakeResponse;
  status: 200 | 201 | 400 | 429 | 503;
};

type RateBucket = {
  count: number;
  windowStartedAt: number;
};

type NotificationEvent = {
  request_id: string;
  type: "notification";
  recipient: string;
  provider_message_id: string | null;
  status: "sent" | "rejected" | "failed";
  meta: {
    provider: "resend";
    provider_status_code?: number;
    reason?: string;
  };
};

type Recipient = {
  id: string;
  email: string;
};

// Accepted serverless limitation: this map enforces the cap per warm runtime
// instance, not globally across every Vercel instance.
const rateBuckets = new Map<string, RateBucket>();

const NOTIFICATION_SUBJECT =
  "New appointment request — Westchase GI portal";

function logOperationalFailure(
  event: string,
  context: Record<string, number | string | null> = {},
) {
  // Never pass request payloads or provider error messages here: they can
  // contain patient fields. IDs, counts, status codes, and stable codes only.
  console.error(`[intake] ${event}`, context);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function honeypotIsFilled(value: unknown): boolean {
  if (!isRecord(value)) return false;
  const honeypot = value[HONEYPOT_FIELD];
  return honeypot !== undefined && String(honeypot).trim().length > 0;
}

function clientHash(headers: Headers): string {
  const forwardedFor = headers.get("x-forwarded-for");
  const firstHop = forwardedFor?.split(",", 1)[0]?.trim() || "missing";

  // Vercel supplies X-Forwarded-For in production. Local callers without it
  // share the "missing" bucket; never fall back to the socket/proxy address.
  return createHash("sha256").update(firstHop.toLowerCase()).digest("hex");
}

function rateLimitExceeded(headers: Headers): boolean {
  const now = Date.now();

  for (const [key, bucket] of rateBuckets) {
    if (now - bucket.windowStartedAt >= INTAKE_RATE_LIMIT.windowMs) {
      rateBuckets.delete(key);
    }
  }

  const key = clientHash(headers);
  const current = rateBuckets.get(key);

  if (!current) {
    rateBuckets.set(key, { count: 1, windowStartedAt: now });
    return false;
  }

  if (current.count >= INTAKE_RATE_LIMIT.limit) return true;

  current.count += 1;
  return false;
}

function notificationFailureEvents(
  requestId: string,
  recipients: Recipient[],
  reason: string,
): NotificationEvent[] {
  return recipients.map((recipient) => ({
    request_id: requestId,
    type: "notification",
    recipient: recipient.email,
    provider_message_id: null,
    status: "failed",
    meta: { provider: "resend", reason },
  }));
}

async function recordNotificationEvents(
  client: SupabaseClient,
  requestId: string,
  events: NotificationEvent[],
) {
  if (events.length === 0) return;

  const { error } = await client.from("request_events").insert(events);
  if (error) {
    logOperationalFailure("notification event write failed", {
      requestId,
      eventCount: events.length,
      code: error.code,
    });
  }
}

function portalAdminUrl(): string | null {
  const base = process.env.PORTAL_BASE_URL?.trim();
  if (!base) return null;

  try {
    return new URL("/admin", base).toString();
  } catch {
    return null;
  }
}

async function notifyActiveRecipients(
  client: SupabaseClient,
  requestId: string,
) {
  const recipientsPromise = client
    .from("notification_recipients")
    .select("id, email")
    .eq("active", true);
  const countPromise = client
    .from("requests")
    .select("id", { count: "exact", head: true })
    .eq("status", "new");

  const [recipientsResult, countResult] = await Promise.all([
    recipientsPromise,
    countPromise,
  ]);

  if (recipientsResult.error) {
    logOperationalFailure("recipient lookup failed", {
      requestId,
      code: recipientsResult.error.code,
    });
    return;
  }

  const recipients = (recipientsResult.data ?? []) as Recipient[];
  if (recipients.length === 0) return;

  if (countResult.error) {
    logOperationalFailure("open request count failed", {
      requestId,
      code: countResult.error.code,
    });
    await recordNotificationEvents(
      client,
      requestId,
      notificationFailureEvents(requestId, recipients, "count_unavailable"),
    );
    return;
  }

  const adminUrl = portalAdminUrl();
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!adminUrl || !apiKey) {
    const reason = adminUrl ? "provider_unconfigured" : "portal_url_unconfigured";
    await recordNotificationEvents(
      client,
      requestId,
      notificationFailureEvents(requestId, recipients, reason),
    );
    return;
  }

  const openCount = countResult.count ?? 0;
  const requestLabel =
    openCount === 1 ? "appointment request" : "appointment requests";
  const text = `${openCount} open ${requestLabel} waiting in the Westchase GI portal.\n\nOpen the portal: ${adminUrl}`;
  const resend = new Resend(apiKey);
  const from = process.env.RESEND_FROM?.trim() || "onboarding@resend.dev";
  const events: NotificationEvent[] = [];

  // Resend's default cap is five calls per second. Keep this fan-out
  // sequential so a larger recipient list does not manufacture 429 failures.
  for (const recipient of recipients) {
    try {
      const { data, error } = await resend.emails.send({
        from,
        to: recipient.email,
        subject: NOTIFICATION_SUBJECT,
        text,
      });

      if (error) {
        // onboarding@resend.dev rejects non-owner recipients with 403 until
        // the clinic domain is verified. That expected provider outcome is
        // distinct from transport/configuration failure.
        events.push({
          request_id: requestId,
          type: "notification",
          recipient: recipient.email,
          provider_message_id: null,
          status: error.statusCode === 403 ? "rejected" : "failed",
          meta: {
            provider: "resend",
            provider_status_code: error.statusCode ?? undefined,
          },
        });
        continue;
      }

      events.push({
        request_id: requestId,
        type: "notification",
        recipient: recipient.email,
        provider_message_id: data.id,
        status: "sent",
        meta: { provider: "resend" },
      });
    } catch {
      events.push({
        request_id: requestId,
        type: "notification",
        recipient: recipient.email,
        provider_message_id: null,
        status: "failed",
        meta: { provider: "resend", reason: "network_failure" },
      });
    }
  }

  await recordNotificationEvents(client, requestId, events);
}

export async function processIntake(
  rawInput: unknown,
  headers: Headers,
): Promise<IntakeResult> {
  if (honeypotIsFilled(rawInput)) {
    return {
      response: { ok: true, id: randomUUID() },
      status: 200,
    };
  }

  const parsed = requestInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      response: {
        ok: false,
        code: "validation",
        fieldErrors: zodFieldErrors(parsed.error),
      },
      status: 400,
    };
  }

  if (rateLimitExceeded(headers)) {
    return {
      response: { ok: false, code: "rate_limited" },
      status: 429,
    };
  }

  let client: SupabaseClient;
  try {
    client = serviceClient();
  } catch {
    logOperationalFailure("service client unavailable");
    return {
      response: { ok: false, code: "unavailable" },
      status: 503,
    };
  }

  const input = parsed.data;
  const { data, error } = await client
    .from("requests")
    .insert({
      name: input.name,
      phone: input.phone,
      email: input.email,
      location: input.location,
      preferred_time: input.time,
      message: input.message || null,
      locale: input.locale,
      source_path: input.sourcePath,
    })
    .select("id")
    .single();

  if (error || !data) {
    logOperationalFailure("request insert failed", {
      code: error?.code ?? "missing_row",
    });
    return {
      response: { ok: false, code: "unavailable" },
      status: 503,
    };
  }

  try {
    await notifyActiveRecipients(client, data.id);
  } catch {
    // The durable request is authoritative; notification failures never
    // downgrade the accepted response.
    logOperationalFailure("notification fan-out failed", {
      requestId: data.id,
    });
  }

  return {
    response: { ok: true, id: data.id },
    status: 201,
  };
}
