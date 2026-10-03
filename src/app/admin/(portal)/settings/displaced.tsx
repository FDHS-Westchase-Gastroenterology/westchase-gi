import Link from "next/link";

import { dayHref, endMinute, practiceMinute } from "@/app/admin/(portal)/schedule/week-calendar";
import { clockOf, shortDate, shortName } from "@/app/admin/(portal)/settings/settings-model";
import { X } from "@/components/icons";
import type { SettingsConflict } from "@/lib/portal/scheduling/settings-contracts";

/* The booked appointments a change left standing (issue #352): time off
   or a closed day never cancels them, so once it is added they are listed
   here, each a link to its day on the schedule, so staff can choose new
   times. A closed day covers every provider, so its rows name who each
   appointment is with. */
export function Displaced({
  message,
  conflicts,
  onDismiss,
}: Readonly<{
  message: string;
  conflicts: readonly SettingsConflict[];
  onDismiss: () => void;
}>) {
  return (
    <div role="status" className="settings-notice flex flex-col gap-2">
      <div className="flex items-start gap-2">
        <p className="grow font-semibold">{message}</p>
        <button
          type="button"
          aria-label="Dismiss"
          className="settings-notice-close"
          onClick={onDismiss}
        >
          <X aria-hidden="true" className="size-3.5" />
        </button>
      </div>
      <ul className="flex flex-col gap-1">
        {conflicts.map((conflict) => (
          <li key={conflict.id}>
            <Link href={dayHref(conflict.date)} className="settings-notice-link">
              <span>
                {shortDate(conflict.date)} · {clockOf(practiceMinute(conflict.startsAt))}–
                {clockOf(endMinute(conflict.endsAt))}
              </span>
              <span data-ui-redact className="font-semibold">
                {conflict.patientListName}
              </span>
              <span>{conflict.appointmentType}</span>
              {conflict.providerName === undefined ? null : (
                <span>with {shortName(conflict.providerName)}</span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
