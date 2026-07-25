import "server-only";

import { createHash, randomBytes, randomUUID } from "node:crypto";
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
import type { Locale } from "@/lib/site";

type IntakeResult = {
  response: IntakeResponse;
  status: 200 | 201 | 400 | 429 | 503;
  receiptToken?: string;
};

const RECEIPT_TTL_MS = 15 * 60 * 1000;
const RECEIPT_TOKEN_RE =
  /^([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\.([A-Za-z0-9_-]{43})$/;

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

function randomReceiptSecret(): string {
  return randomBytes(32).toString("base64url");
}

function receiptTokenHash(secret: string): string {
  return createHash("sha256").update(secret).digest("hex");
}

function decoyReceiptToken(): string {
  return `${randomUUID()}.${randomReceiptSecret()}`;
}

async function issueRequestReceipt(
  client: SupabaseClient,
  requestId: string,
  locale: Locale,
): Promise<string | undefined> {
  const secret = randomReceiptSecret();

  try {
    const { data, error } = await client
      .from("request_events")
      .insert({
        request_id: requestId,
        type: "receipt",
        status: "issued",
        meta: {
          locale,
          token_hash: receiptTokenHash(secret),
        },
      })
      .select("id")
      .single();

    if (error || !data) {
      logOperationalFailure("receipt issue failed", {
        requestId,
        code: error?.code ?? "missing_row",
      });
      return undefined;
    }

    return `${data.id}.${secret}`;
  } catch {
    logOperationalFailure("receipt issue failed", {
      requestId,
      code: "request_failed",
    });
    return undefined;
  }
}

export async function consumeRequestReceipt(
  token: string,
  locale: Locale,
): Promise<boolean> {
  const match = RECEIPT_TOKEN_RE.exec(token);
  if (!match) return false;

  const [, eventId, secret] = match;
  let client: SupabaseClient;
  try {
    client = serviceClient();
  } catch {
    logOperationalFailure("receipt consume unavailable");
    return false;
  }

  try {
    const { data, error } = await client
      .from("request_events")
      .update({ status: "consumed" })
      .eq("id", eventId)
      .eq("type", "receipt")
      .eq("status", "issued")
      .gt("created_at", new Date(Date.now() - RECEIPT_TTL_MS).toISOString())
      .contains("meta", {
        locale,
        token_hash: receiptTokenHash(secret),
      })
      .select("id")
      .maybeSingle();

    if (error) {
      logOperationalFailure("receipt consume failed", {
        code: error.code,
      });
      return false;
    }

    return data !== null;
  } catch {
    logOperationalFailure("receipt consume failed", {
      code: "request_failed",
    });
    return false;
  }
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
  issueReceipt = false,
): Promise<IntakeResult> {
  if (honeypotIsFilled(rawInput)) {
    return {
      response: { ok: true, id: randomUUID() },
      status: 200,
      receiptToken: issueReceipt ? decoyReceiptToken() : undefined,
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

  const receiptToken = issueReceipt
    ? await issueRequestReceipt(client, data.id, input.locale)
    : undefined;

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
    receiptToken,
  };
}
