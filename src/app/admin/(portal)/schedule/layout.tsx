import { randomUUID } from "node:crypto";

import type { ReactNode } from "react";

import { ScheduleNavigation } from "./schedule-navigation";
import { SchedulePeople } from "./schedule-people";

import "@/app/admin/(portal)/(home)/home.css";

/* The Schedule's three views share one record sheet and one Add request
   dialog (schedule-people.tsx), and the move between them
   (schedule-navigation.tsx), held here so they outlive a change of view.
   The key is per render, like Home's, so a double submit adds one request. */
export default function ScheduleLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <ScheduleNavigation>
      <SchedulePeople addRequestKey={randomUUID()}>{children}</SchedulePeople>
    </ScheduleNavigation>
  );
}
