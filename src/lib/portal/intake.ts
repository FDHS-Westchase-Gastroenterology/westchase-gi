import "server-only";

import { createHash, randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  HONEYPOT_FIELD,
  INTAKE_RATE_LIMIT,
  requestInputSchema,
  type IntakeResponse,
  zodFieldErrors,
} from "@/lib/portal/contracts";
import { sendPortalEmail } from "@/lib/portal/email-provider";
import {
  createAppointmentNotificationEvents,
  type NotificationEvent,
  type NotificationRecipient,
} from "@/lib/portal/intake-notification";
import { portalUrl, serviceClient } from "@/lib/portal/server";

type IntakeResult = {
  response: IntakeResponse;
  status: 200 | 201 | 400 | 429 | 503;
};

type RateBucket = {
  count: number;
  windowStartedAt: number;
};

// Accepted serverless limitation: this map enforces the cap per warm runtime
// instance, not globally across every Vercel instance.
const rateBuckets = new Map<string, RateBucket>();

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

async function notifyActiveRecipients(
  client: SupabaseClient,
  requestId: string,
) {
  const { data, error } = await client
    .from("notification_recipients")
    .select("id, email")
    .eq("active", true);

  if (error) {
    logOperationalFailure("recipient lookup failed", {
      requestId,
      code: error.code,
    });
    return;
  }

  const recipients = (data ?? []) as NotificationRecipient[];
  if (recipients.length === 0) return;

  const adminUrl = portalUrl("/admin");
  if (!adminUrl) {
    logOperationalFailure("portal URL unavailable", { requestId });
  }

  const events = await createAppointmentNotificationEvents(
    sendPortalEmail,
    requestId,
    recipients,
    adminUrl,
  );

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
      email: input.email || null,
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
