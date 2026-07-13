import type { RequestStatus } from "@/lib/portal/contracts";
import { STATUS_LABELS } from "./format";

// One visual vocabulary for request state across queue and detail:
// new demands attention (amber), contacted is in-motion (mint/teal),
// scheduled is settled (navy), closed recedes (neutral).

const BADGE_STYLES: Record<RequestStatus, string> = {
  new: "bg-[var(--color-amber-soft)] text-[var(--color-ink)]",
  contacted: "bg-[var(--color-mint-2)] text-[var(--color-teal-ink)]",
  scheduled: "bg-[var(--color-navy)] text-[var(--color-on-dark)]",
  closed: "bg-[var(--color-line)] text-[var(--color-muted)]",
};

export function StatusBadge({ status }: { status: RequestStatus }) {
  return (
    <span
      data-status={status}
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[0.75rem] font-bold uppercase tracking-[0.05em] ${BADGE_STYLES[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
