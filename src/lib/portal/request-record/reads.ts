import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { REQUEST_LOCATIONS, REQUEST_TIMES } from "@/lib/portal/contracts";
import { fetchStaffNameMap } from "@/lib/portal/staff-identity";
import { fetchRequestWorkSurface } from "@/lib/portal/workflow/reads";

import type { FullRecord } from "./contracts";

const recordRowSchema = z.object({
  id: z.string(),
  name: z.string(),
  phone: z.string(),
  email: z.string().nullable(),
  location: z.enum(REQUEST_LOCATIONS),
  preferred_time: z.enum(REQUEST_TIMES),
  message: z.string().nullable(),
  created_at: z.string(),
  locale: z.string(),
  source_path: z.string(),
});

export async function fetchFullRecord(
  db: SupabaseClient,
  requestId: string,
): Promise<FullRecord | null> {
  const [request, surface, staffNames] = await Promise.all([
    db
      .from("requests")
      .select("id,name,phone,email,location,preferred_time,message,created_at,locale,source_path")
      .eq("id", requestId)
      .maybeSingle(),
    fetchRequestWorkSurface(db, requestId),
    fetchStaffNameMap(db),
  ]);
  if (request.error) throw new Error("Full record read failed");
  if (request.data === null) return null;
  const parsed = recordRowSchema.safeParse(request.data);
  if (!parsed.success) throw new Error("Invalid full record");
  if (surface === null) return null;
  const row = parsed.data;
  const actorNames: Record<string, string> = {};
  for (const entry of surface.history) {
    if (!("actor" in entry)) continue;
    const email = entry.actor.trim().toLowerCase();
    const name = staffNames.get(email);
    if (name !== undefined) actorNames[email] = name;
  }
  return {
    id: row.id,
    version: surface.version,
    state: surface.state,
    name: row.name,
    phone: row.phone,
    email: row.email,
    location: row.location,
    preferredTime: row.preferred_time,
    message: row.message,
    createdAt: row.created_at,
    locale: row.locale,
    sourcePath: row.source_path,
    callAgainAt: surface.callAgainAt,
    bookingConfirmedAt: surface.bookingConfirmedAt,
    appointmentAt: surface.appointmentAt,
    closedAt: surface.closedAt,
    closureReason: surface.closureReason,
    legacyReviewRequired: surface.legacyReviewRequired,
    history: surface.history,
    actorNames,
  };
}
