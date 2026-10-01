import type { Metadata } from "next";

import { requireRole } from "@/lib/portal/auth";
import { executeSchedulingOperation } from "@/lib/portal/scheduling/service";
import { serviceClient } from "@/lib/portal/server";

import { parseMonth, practiceMonth, scheduleMonthFor } from "./schedule-model";
import { ScheduleMonthView } from "./schedule-month";
import { ScheduleWeekView } from "./schedule-week";
import { providerChoice, scheduleWeekFor } from "./schedule-week-model";
import { parseWeekStart, practiceWeekStart, weekProviderIds } from "./week-calendar";

import "./schedule.css";

export const metadata: Metadata = {
  title: "Schedule | Staff portal",
};

type SearchParams = Record<string, string | string[] | undefined>;

/* The Schedule opens on its month view (issue #343): how many visits each
   practice day still has open, for every provider and location. `?month=`
   picks the month; anything the schedule cannot read falls back to the
   practice's current month. `?view=week` is one provider's week, or up to
   three side by side (issue #345). A failed read throws to the portal's
   error surface, never an empty grid. */
export default async function SchedulePage({
  searchParams,
}: Readonly<{ searchParams: Promise<SearchParams> }>) {
  const session = await requireRole("staff");
  const params = await searchParams;
  if (params.view === "week") return <WeekPage actor={session.id} params={params} />;
  const month = parseMonth(params.month) ?? practiceMonth(new Date());
  const summary = await executeSchedulingOperation(serviceClient(), session.id, {
    action: "month_summary",
    month,
  });
  if (!summary.ok || !("referenceType" in summary) || !("month" in summary))
    throw new Error("The schedule could not be read.");
  return <ScheduleMonthView view={scheduleMonthFor(summary)} />;
}

/* The week of one provider, or up to three compared; weekProviderIds
   says which. Anything inactive or unknown in the URL falls back. */
async function WeekPage({
  actor,
  params,
}: Readonly<{
  actor: string;
  params: Readonly<Record<string, string | readonly string[] | undefined>>;
}>) {
  const db = serviceClient();
  const [catalog, remembered] = await Promise.all([
    executeSchedulingOperation(db, actor, {
      action: "catalog",
      entity: "provider",
      query: "",
      active: true,
      limit: 100,
      after: null,
    }),
    executeSchedulingOperation(db, actor, { action: "week_provider" }),
  ]);
  if (
    !catalog.ok ||
    !("entity" in catalog) ||
    catalog.entity !== "provider" ||
    !("items" in catalog)
  )
    throw new Error("The schedule could not be read.");
  const active = catalog.items.map((provider) => providerChoice(provider));
  if (active.length === 0)
    return (
      <section className="wgi-schedule">
        <h1 className="wgi-schedule-title">Schedule</h1>
        <p className="wgi-schedule-message">No providers yet.</p>
      </section>
    );

  const providerIds = weekProviderIds({
    activeIds: active.map((provider) => provider.id),
    providers: params.providers,
    provider: params.provider,
    remembered: remembered.ok && "remembered" in remembered ? remembered.providerId : null,
  });

  const weekStart = parseWeekStart(params.week) ?? practiceWeekStart(new Date());
  const week = await executeSchedulingOperation(db, actor, {
    action: "week_schedule",
    weekStart,
    providerIds,
    locationId: null,
    appointmentTypeId: null,
  });
  if (!week.ok || !("activeProviderCount" in week))
    throw new Error("The schedule could not be read.");
  return <ScheduleWeekView view={scheduleWeekFor(week)} catalog={active} />;
}
