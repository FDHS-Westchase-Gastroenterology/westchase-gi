"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import type { Json } from "@/lib/json";
import { requireRole } from "@/lib/portal/auth";
import { STAFF_TOURS } from "@/lib/portal/contracts";
import type { StaffTour, StaffTourStatus } from "@/lib/portal/contracts";
import { serviceClient } from "@/lib/portal/server";
import { tourStartHref } from "@/lib/portal/tours";

const tourSchema = z.enum(STAFF_TOURS);
const endTourSchema = z.object({
  tour: tourSchema,
  outcome: z.enum(["finished", "skipped"]),
});

/** What the tour runner sends when a tour ends: Done finishes it, Skip tour or Esc skips it. */
export interface EndTourInput {
  tour: Json;
  outcome: Json;
}

export type EndTourResult = { ok: true } | { ok: false };

/* The command refuses a tour the account's role cannot take (42501) and an account that is not
   active and onboarded (P0002). Either refusal reaches the caller as an error. */
async function setStaffTour(userId: string, tour: StaffTour, status: StaffTourStatus) {
  const { error } = await serviceClient().rpc("portal_set_staff_tour", {
    p_user_id: userId,
    p_tour: tour,
    p_status: status,
  });
  return error;
}

/** Help's "Start the tour": records the tour as running and opens its first screen. */
export async function startTourAction(rawTour: Json): Promise<never> {
  const session = await requireRole("staff", { unauthenticated: "throw" });
  const tour = tourSchema.parse(rawTour);
  const error = await setStaffTour(session.id, tour, "pending");
  if (error) throw new Error(`Tour start failed: ${error.code}`);
  revalidatePath("/admin", "layout");
  redirect(tourStartHref(tour));
}

/** Records a finished or skipped tour so it does not start again by itself. */
export async function endTourAction(input: Readonly<EndTourInput>): Promise<EndTourResult> {
  const session = await requireRole("staff", { unauthenticated: "throw" });
  const parsed = endTourSchema.safeParse(input);
  if (!parsed.success) return { ok: false };
  const error = await setStaffTour(session.id, parsed.data.tour, parsed.data.outcome);
  if (error) return { ok: false };
  revalidatePath("/admin", "layout");
  return { ok: true };
}
