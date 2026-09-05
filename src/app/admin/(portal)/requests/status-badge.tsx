import { Badge } from "@/components/ui/badge";
import type { RequestStatus } from "@/lib/portal/workflow/contracts";

import { STATUS_LABELS } from "./format";

/* One visual vocabulary for request status across queue and detail, riding
   the Badge color-law variants: new demands attention (amber), contacted is
   in motion (mint/teal), scheduled is settled (navy), closed recedes. */
const STATUS_VARIANTS = {
  new: "attention",
  contacted: "current",
  scheduled: "settled",
  closed: "quiet",
} as const satisfies Record<RequestStatus, "attention" | "current" | "settled" | "quiet">;

export function StatusBadge({ status }: Readonly<{ status: RequestStatus }>) {
  return (
    <Badge data-status={status} variant={STATUS_VARIANTS[status]}>
      {STATUS_LABELS[status]}
    </Badge>
  );
}
