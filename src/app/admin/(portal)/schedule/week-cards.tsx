"use client";

import { Popover } from "@base-ui/react/popover";

import type { WeekAppointmentCell, WeekOpenCell } from "./schedule-week-model";
import { AppointmentCard } from "./week-appointment-card";
import type { CardHandlers, ReferenceType } from "./week-card-parts";
import { OpenTimeCard } from "./week-open-card";

/* The week view's click cards (issue #345; Figma section 08, H3 and H4).
   One popover serves every cell, pointing at it from beside it with an
   arrow (HIG Popovers): Escape or a click outside closes it and focus
   returns to the cell.

   - An appointment opens its card: the patient, a status badge, when,
     who, where and a phone link, then the commands its status allows —
     Check in on today's scheduled visits, Reschedule, and More for the
     rest. A finished or past visit opens read-only. "Open full record ›"
     opens Home's full-record sheet on the request the visit was booked
     from, and shows only when there is one.
   - Reschedule and Cancel turn the card over in place: a day and its open
     starts for the same provider and office, or a reason (and, while the
     request workflow manages the visit, when to call again).
   - An open time opens a booking card for that provider, office and start
     with the practice's reference visit type: find the patient, then
     Book.

   A command that lands closes the card, the portal toast confirms it and
   the week re-reads; one that fails keeps the card open and says why. */

export type WeekCardPayload =
  | { readonly kind: "appointment"; readonly cell: WeekAppointmentCell }
  | { readonly kind: "open"; readonly cell: WeekOpenCell };

export function WeekCardPopup({
  payload,
  keyed,
  referenceType,
  onDone,
  onOpenRecord,
}: Readonly<
  CardHandlers & { payload: WeekCardPayload; keyed: boolean; referenceType: ReferenceType }
>) {
  return (
    <Popover.Portal>
      <Popover.Positioner
        className="wgi-week-card-positioner"
        side="right"
        align="center"
        sideOffset={10}
        collisionPadding={12}
        arrowPadding={14}
        collisionAvoidance={{ side: "flip", align: "shift", fallbackAxisSide: "end" }}
      >
        <Popover.Popup className="wgi-week-card" data-keyed={keyed || undefined}>
          <Popover.Arrow className="wgi-week-card-arrow" />
          {payload.kind === "appointment" ? (
            <AppointmentCard cell={payload.cell} onDone={onDone} onOpenRecord={onOpenRecord} />
          ) : (
            <OpenTimeCard cell={payload.cell} referenceType={referenceType} onDone={onDone} />
          )}
        </Popover.Popup>
      </Popover.Positioner>
    </Popover.Portal>
  );
}
