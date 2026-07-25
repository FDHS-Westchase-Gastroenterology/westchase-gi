import "server-only";

import { createHash, createHmac, randomBytes, randomUUID } from "node:crypto";
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
import { portalUrl, serviceClient, serviceRoleKey } from "@/lib/portal/server";
import type { Locale } from "@/lib/site";

type IntakeResult = {
  response: IntakeResponse;
  status: 200 | 201 | 400 | 429 | 503;
  receiptToken?: string;
};

const RECEIPT_TTL_MS = 15 * 60 * 1000;
const RECEIPT_TOKEN_RE =
  /^([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\.([A-Za-z0-9_-]{43})$/;

const INTAKE_CLIENT_HASH_DOMAIN = "wgi:intake-rate-limit:client:v1\0";

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
  const forwardedFor =
    headers.get("x-vercel-forwarded-for") ?? headers.get("x-forwarded-for");
  const firstHop = forwardedFor?.split(",", 1)[0]?.trim() || "missing";

  // Vercel overwrites X-Vercel-Forwarded-For at its edge. Local callers fall
  // back to X-Forwarded-For; callers without either header share the
  // "missing" bucket. HMAC prevents offline address guessing.
  return createHmac("sha256", serviceRoleKey())
    .update(INTAKE_CLIENT_HASH_DOMAIN)
    .update(firstHop.toLowerCase())
    .digest("hex");
}

async function rateLimitAllows(
  client: SupabaseClient,
  headers: Headers,
): Promise<boolean | null> {
  const { data, error } = await client.rpc("portal_check_intake_rate_limit", {
    p_client_hash: clientHash(headers),
    p_limit: INTAKE_RATE_LIMIT.limit,
    p_window_seconds: INTAKE_RATE_LIMIT.windowSeconds,
  });

  if (error || typeof data !== "boolean") {
    logOperationalFailure("rate-limit claim failed", {
      code: error?.code ?? "invalid_result",
    });
    return null;
  }

  return data;
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

  const rateAllowed = await rateLimitAllows(client, headers);
  if (rateAllowed === null) {
    return {
      response: { ok: false, code: "unavailable" },
      status: 503,
    };
  }
  if (!rateAllowed) {
    return {
      response: { ok: false, code: "rate_limited" },
      status: 429,
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
