import type { RequestStatus } from "@/lib/portal/contracts";
import { STATUS_WORDS } from "@/lib/portal/filters";
import { cn } from "@/lib/utils";

/* Fresh conversion of the stock registry Badge for the home dashboard
   (portal-home-redesign-brief §4.5): the shadcn `outline` shell repainted
   through the portal bridge, one paint per status. The word always rides
   with the color — a stamp never speaks in color alone. Paints live in
   home.css under `.wgi-badge*`. */

const STATUS_CLASS = {
  new: "wgi-badge-new",
  contacted: "wgi-badge-contacted",
  scheduled: "wgi-badge-scheduled",
  closed: "wgi-badge-closed",
} as const satisfies Record<RequestStatus, string>;

function LineStatusBadge({
  status,
  className,
}: Readonly<{ status: RequestStatus; className?: string }>) {
  return (
    <span data-slot="badge" className={cn("wgi-badge", STATUS_CLASS[status], className)}>
      {STATUS_WORDS[status]}
    </span>
  );
}

export { LineStatusBadge };
