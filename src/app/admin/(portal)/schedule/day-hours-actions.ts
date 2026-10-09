"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/portal/auth";
import { dateSchema } from "@/lib/portal/scheduling/contracts";
import type {
  DayHoursCommandInput,
  DayHoursCommandOutcome,
  DayHoursOutcome,
  DayHoursUndoInput,
  DayHoursUndoOutcome,
} from "@/lib/portal/scheduling/day-hours-contracts";
import {
  executeDayHoursCommand,
  readDayHours,
  undoDayHoursChange,
} from "@/lib/portal/scheduling/service";
import { serviceClient } from "@/lib/portal/server";

/* The Day view's Hours sheet (issue #353) sets a provider's hours for one day, or for that
   weekday from the day on, and undoes the change from the toast. The scheduling service
   validates and signs each command, and the sheet reads the day fresh each time it opens; the database applies the admin gate, the version check,
   the office-hours bound and the stranded-booking scan. A staff member who reaches these
   endpoints is refused here and again by the database. */

function changed() {
  revalidatePath("/admin/schedule");
  revalidatePath("/admin/settings", "layout");
  revalidatePath("/admin");
}

export async function readDayHoursFor(date: string): Promise<DayHoursOutcome> {
  const session = await requireRole("staff", { unauthenticated: "throw" });
  if (session.role !== "admin") return { ok: false, code: "forbidden" };
  const day = dateSchema.safeParse(date);
  if (!day.success) return { ok: false, code: "invalid_command" };
  return readDayHours(serviceClient(), session.id, day.data);
}

export async function setDayHours(
  input: Readonly<DayHoursCommandInput>,
): Promise<DayHoursCommandOutcome> {
  const session = await requireRole("staff", { unauthenticated: "throw" });
  if (session.role !== "admin") return { ok: false, code: "forbidden" };
  const outcome = await executeDayHoursCommand(serviceClient(), session.id, input);
  // A dry run only answers what the change would do.
  if (outcome.ok && !outcome.dryRun) changed();
  return outcome;
}

export async function undoDayHours(
  input: Readonly<DayHoursUndoInput>,
): Promise<DayHoursUndoOutcome> {
  const session = await requireRole("staff", { unauthenticated: "throw" });
  if (session.role !== "admin") return { ok: false, code: "forbidden" };
  const outcome = await undoDayHoursChange(serviceClient(), session.id, input);
  if (outcome.ok) changed();
  return outcome;
}
