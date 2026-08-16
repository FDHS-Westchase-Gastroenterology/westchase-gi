import "server-only";

import { createHmac } from "node:crypto";

import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import type { Json } from "@/lib/json";
import { serviceClient, serviceRoleKey } from "@/lib/portal/server";
import {
  TELEMETRY_CLIENT_HASH_DOMAIN,
  TELEMETRY_RATE_LIMIT,
  telemetryEventSchema,
} from "@/lib/telemetry";

export type TelemetryStatus = 204 | 400 | 429 | 503;

function logOperationalFailure(
  event: string,
  context: Readonly<Record<string, number | string | null>> = {},
) {
  // Never pass telemetry payloads here: IDs, counts, status codes, and
  // Stable codes only — mirror intake logOperationalFailure discipline.
  console.error(`[telemetry] ${event}`, context);
}

function clientHash(headers: Headers): string {
  const forwardedFor = headers.get("x-vercel-forwarded-for") ?? headers.get("x-forwarded-for");
  const hop = forwardedFor?.split(",", 1)[0]?.trim();
  const firstHop = hop !== undefined && hop !== "" ? hop : "missing";

  // Counts are directional, not forensic. Vercel overwrites
  // X-Vercel-Forwarded-For at its edge; local callers fall back to
  // X-Forwarded-For; callers without either header share the "missing"
  // Bucket. HMAC prevents offline address guessing. Distinct domain from
  // Intake so throttle buckets never mix.
  return createHmac("sha256", serviceRoleKey())
    .update(TELEMETRY_CLIENT_HASH_DOMAIN)
    .update(firstHop.toLowerCase())
    .digest("hex");
}

async function rateLimitAllows(client: SupabaseClient, headers: Headers): Promise<boolean | null> {
  const result = await client.rpc("portal_check_intake_rate_limit", {
    p_client_hash: clientHash(headers),
    p_limit: TELEMETRY_RATE_LIMIT.limit,
    p_window_seconds: TELEMETRY_RATE_LIMIT.windowSeconds,
  });
  const parsed = z.boolean().safeParse(result.data);

  if (result.error !== null || !parsed.success) {
    logOperationalFailure("rate-limit claim failed", {
      code: result.error !== null ? result.error.code : "invalid_result",
    });
    return null;
  }

  return parsed.data;
}

export async function processTelemetry(
  rawInput: Json | null,
  headers: Headers,
): Promise<{ status: TelemetryStatus }> {
  const parsed = telemetryEventSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { status: 400 };
  }

  let client: SupabaseClient;
  try {
    client = serviceClient();
  } catch {
    logOperationalFailure("service client unavailable");
    return { status: 503 };
  }

  const rateAllowed = await rateLimitAllows(client, headers);
  if (rateAllowed === null) {
    return { status: 503 };
  }
  if (!rateAllowed) {
    return { status: 429 };
  }

  const input = parsed.data;
  const result = await client.rpc("portal_record_analytics_event", {
    p_event: input.event,
    p_route_template: input.routeTemplate,
    p_locale: input.locale,
    p_device_class: input.deviceClass,
  });
  const recorded = z.boolean().safeParse(result.data);

  if (result.error !== null || !recorded.success || !recorded.data) {
    logOperationalFailure("analytics event record failed", {
      code: result.error !== null ? result.error.code : "invalid_result",
    });
    return { status: 503 };
  }

  return { status: 204 };
}
