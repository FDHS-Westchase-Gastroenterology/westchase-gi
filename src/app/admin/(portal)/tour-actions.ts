"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { PortalSessionUser } from "@/lib/portal/auth";
import { requireRole } from "@/lib/portal/auth";
import { recordAudit } from "@/lib/portal/audit";
import { AUDIT_ACTIONS } from "@/lib/portal/contracts";
import { serviceClient } from "@/lib/portal/server";

async function setTourDismissedRpc(
  session: PortalSessionUser,
  dismissed: boolean,
): Promise<void> {
  const { error } = await serviceClient().rpc(
    "portal_set_staff_tour_dismissed",
    {
      p_user_id: session.id,
      p_dismissed: dismissed,
    },
  );

  if (error) {
    throw new Error(`Portal tour update failed: ${error.code}`);
  }
}

async function setTourDismissed(
  session: PortalSessionUser,
  dismissed: boolean,
): Promise<never> {
  await setTourDismissedRpc(session, dismissed);
  revalidatePath("/admin");
  redirect("/admin");
}

function parseTourProgress(
  stepReached: unknown,
  totalSteps: unknown,
): { stepReached: number; totalSteps: number } {
  if (
    typeof stepReached !== "number" ||
    typeof totalSteps !== "number" ||
    !Number.isInteger(stepReached) ||
    !Number.isInteger(totalSteps) ||
    stepReached < 1 ||
    stepReached > 20 ||
    totalSteps < 1 ||
    totalSteps > 20 ||
    stepReached > totalSteps
  ) {
    throw new Error("Invalid tour progress");
  }
  return { stepReached, totalSteps };
}

export async function dismissPortalTourAction(): Promise<never> {
  const session = await requireRole("staff", { unauthenticated: "throw" });
  return setTourDismissed(session, true);
}

export async function restartPortalTourAction(): Promise<never> {
  const session = await requireRole("staff", { unauthenticated: "throw" });
  return setTourDismissed(session, false);
}

export async function finishPortalTourAction(input: {
  stepReached: unknown;
  totalSteps: unknown;
}): Promise<never> {
  const session = await requireRole("staff", { unauthenticated: "throw" });
  const progress = parseTourProgress(input.stepReached, input.totalSteps);

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
  redirect("/admin");
}
