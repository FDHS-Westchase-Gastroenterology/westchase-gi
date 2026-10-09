"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/portal/auth";
import { executeSchedulingSettingsCommand } from "@/lib/portal/scheduling/service";
import type {
  SchedulingSettingsCommandInput,
  SettingsCommandOutcome,
} from "@/lib/portal/scheduling/settings-contracts";
import { serviceClient } from "@/lib/portal/server";

/* The Settings window's Schedule group (issue #352) applies each change as it is made. One
   action carries every granular command: the scheduling service validates and signs it, and the
   database applies the admin gate, the version check and the conflict scan. A staff member who
   reaches this endpoint is refused here and again by the database. */

function changed() {
  revalidatePath("/admin/settings", "layout");
  revalidatePath("/admin/schedule");
  revalidatePath("/admin");
}

export async function applySettingsCommand(
  input: Readonly<SchedulingSettingsCommandInput>,
): Promise<SettingsCommandOutcome> {
  const session = await requireRole("staff", { unauthenticated: "throw" });
  if (session.role !== "admin") return { ok: false, code: "forbidden" };
  const outcome = await executeSchedulingSettingsCommand(serviceClient(), session.id, input);
  // A dry run only reads the bookings a change would cover.
  if (outcome.ok && outcome.dryRun !== true) changed();
  return outcome;
}
