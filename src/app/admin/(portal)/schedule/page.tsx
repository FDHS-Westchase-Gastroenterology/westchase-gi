import type { Metadata } from "next";

import { requireRole } from "@/lib/portal/auth";
import { executeSchedulingOperation } from "@/lib/portal/scheduling/service";
import { serviceClient } from "@/lib/portal/server";

import { parseMonth, practiceMonth, scheduleMonthFor } from "./schedule-model";
import { ScheduleMonthView } from "./schedule-month";

import "./schedule.css";

export const metadata: Metadata = {
  title: "Schedule | Staff portal",
};

/* The Schedule opens on its month view (issue #343): how many visits each
   practice day still has open, for every provider and location. `?month=`
   picks the month; anything the schedule cannot read falls back to the
   practice's current month. A failed read throws to the portal's error
   surface, never an empty month. */
export default async function SchedulePage({
  searchParams,
}: Readonly<{ searchParams: Promise<Record<string, string | string[] | undefined>> }>) {
  const session = await requireRole("staff");
  const { month: requested } = await searchParams;
  const month = parseMonth(requested) ?? practiceMonth(new Date());
  const summary = await executeSchedulingOperation(serviceClient(), session.id, {
    action: "month_summary",
    month,
  });
  if (!summary.ok || !("referenceType" in summary)) throw new Error("The schedule could not be read.");
  return <ScheduleMonthView view={scheduleMonthFor(summary)} />;
}
