"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import type { Json } from "@/lib/json";
import { recordAudit } from "@/lib/portal/audit";
import type { PortalSessionUser } from "@/lib/portal/auth";
import { requireRole } from "@/lib/portal/auth";
import { AUDIT_ACTIONS } from "@/lib/portal/contracts";
import { serviceClient } from "@/lib/portal/server";

async function setTourDismissedRpc(
  session: Readonly<PortalSessionUser>,
  dismissed: boolean,
): Promise<void> {
  const { error } = await serviceClient().rpc("portal_set_staff_tour_dismissed", {
    p_user_id: session.id,
    p_dismissed: dismissed,
  });

  if (error) {
    throw new Error(`Portal tour update failed: ${error.code}`);
  }
}

async function setTourDismissed(
  session: Readonly<PortalSessionUser>,
  dismissed: boolean,
  returnState: "not-now" | "restarted",
): Promise<never> {
  await setTourDismissedRpc(session, dismissed);
  revalidatePath("/admin");
  redirect(`/admin?tour=${returnState}`);
}

interface TourProgress {
  stepReached: number;
  totalSteps: number;
}

interface TourProgressInput {
  stepReached: Json;
  totalSteps: Json;
}

const tourProgressSchema = z
  .object({
    stepReached: z.number().int().min(1).max(20),
    totalSteps: z.number().int().min(1).max(20),
  })
  .refine((value) => value.stepReached <= value.totalSteps);

function parseTourProgress(input: Readonly<TourProgressInput>): TourProgress {
  const parsed = tourProgressSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error("Invalid tour progress");
  }
  return parsed.data;
}

export async function dismissPortalTourAction(): Promise<never> {
  const session = await requireRole("staff", { unauthenticated: "throw" });
  return setTourDismissed(session, true, "not-now");
}

export async function restartPortalTourAction(): Promise<never> {
  const session = await requireRole("staff", { unauthenticated: "throw" });
  return setTourDismissed(session, false, "restarted");
}

export async function finishPortalTourAction(input: Readonly<TourProgressInput>): Promise<never> {
  const session = await requireRole("staff", { unauthenticated: "throw" });
  const progress = parseTourProgress(input);

  await setTourDismissedRpc(session, true);

  await recordAudit(serviceClient(), {
    actorEmail: session.email,
    action: AUDIT_ACTIONS.STAFF_TOUR_COMPLETE,
    entity: "staff_profiles",
    entityId: null,
    detail: {
      completed: true,
      step_reached: progress.stepReached,
      total_steps: progress.totalSteps,
    },
  });

  revalidatePath("/admin");
  redirect("/admin?tour=finished");
}
