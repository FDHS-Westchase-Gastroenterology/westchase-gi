"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { PortalSessionUser } from "@/lib/portal/auth";
import { requireRole } from "@/lib/portal/auth";
import { serviceClient } from "@/lib/portal/server";

async function setTourDismissed(
  session: PortalSessionUser,
  dismissed: boolean,
): Promise<never> {
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

  revalidatePath("/admin");
  redirect("/admin");
}

export async function dismissPortalTourAction(): Promise<never> {
  const session = await requireRole("staff", { unauthenticated: "throw" });
  return setTourDismissed(session, true);
}

export async function restartPortalTourAction(): Promise<never> {
  const session = await requireRole("staff", { unauthenticated: "throw" });
  return setTourDismissed(session, false);
}
