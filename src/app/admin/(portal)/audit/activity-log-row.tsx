"use client";

import Link from "next/link";
import type { ComponentType, ReactNode, SVGProps } from "react";

import {
  Activity,
  Calendar,
  CalendarCheck,
  Check,
  ChevronRight,
  CircleAlert,
  ClipboardCheck,
  Clock,
  Mail,
  Phone,
  Settings,
  User,
  Users,
  X,
} from "@/components/icons";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { buttonVariants } from "@/components/ui/button-variants";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { ActivityRow } from "@/lib/portal/activity-contracts";

import {
  activityActor,
  activityChange,
  activityDay,
  activityInitials,
  activityMeta,
  activityTimeLabel,
  phraseActivityRow,
} from "./activity-model";

/* One row of the Activity log (issue #357; Figma section 14): an icon for
   what happened, the sentence with its people in bold, and the time. The
   whole row is a disclosure (HIG Disclosure controls): it opens in place
   to how things stood before and after, who made the change and when, and
   the way to the record or the day on the Schedule. Closed rows stay
   closed when the list grows; each row keeps its own state. */

type Icon = ComponentType<SVGProps<SVGSVGElement>>;

interface RowIcon {
  readonly icon: Icon;
  readonly tone: "plain" | "coral";
}

function iconFor(row: Readonly<ActivityRow>): RowIcon {
  switch (row.appointmentAction) {
    case "booked":
      return { icon: CalendarCheck, tone: "plain" };
    case "moved":
      return { icon: Clock, tone: "plain" };
    case "cancelled":
      return { icon: X, tone: "coral" };
    case "checked_in":
      return { icon: Check, tone: "plain" };
    case "no_show":
      return { icon: CircleAlert, tone: "plain" };
    case "completed":
      return { icon: ClipboardCheck, tone: "plain" };
    case null:
      break;
  }
  if (row.category === "schedule") return { icon: Calendar, tone: "plain" };
  if (row.category === "settings") return { icon: Settings, tone: "plain" };
  if (row.source === "patient" || row.action === "auth.sign_in") {
    return { icon: User, tone: "plain" };
  }
  if (row.action === "request.create") return { icon: Mail, tone: "plain" };
  if (row.action === "request.call_outcome") return { icon: Phone, tone: "plain" };
  if (row.category === "requests") return { icon: ClipboardCheck, tone: "plain" };
  if (row.entity.startsWith("staff")) return { icon: Users, tone: "plain" };
  return { icon: Activity, tone: "plain" };
}

/** The sentence with the patient and provider set in bold where it names them. */
function emphasize(sentence: string, names: readonly (string | null)[]): ReactNode[] {
  const present = [...new Set(names)]
    .filter((name): name is string => name !== null && name !== "" && sentence.includes(name))
    .toSorted((a, b) => b.length - a.length);
  if (present.length === 0) return [sentence];
  const escaped = present.map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  // The capture group puts every name at an odd place in the split, so no lookup is needed;
  // Each bold part is keyed by where it starts in the sentence.
  const parts = sentence.split(new RegExp(`(${escaped.join("|")})`));
  let offset = 0;
  return parts.map((part, place) => {
    const start = offset;
    offset += part.length;
    return place % 2 === 1 ? <strong key={`at-${String(start)}`}>{part}</strong> : part;
  });
}

function recordHref(row: Readonly<ActivityRow>): string | null {
  if (row.patientId !== null) return `/admin/schedule?patient=${row.patientId}`;
  if (row.requestId !== null) return `/admin/schedule?request=${row.requestId}`;
  return null;
}

function scheduleHref(row: Readonly<ActivityRow>): string | null {
  if (row.appointmentStart === null) return null;
  return `/admin/schedule?view=day&date=${activityDay(row.appointmentStart)}`;
}

export function ActivityLogRow({ row, now }: Readonly<{ row: ActivityRow; now: Date }>) {
  const actor = activityActor(row);
  const { sentence } = phraseActivityRow(row, now);
  const { icon: Glyph, tone } = iconFor(row);
  const change = activityChange(row);
  const record = recordHref(row);
  const schedule = scheduleHref(row);

  return (
    <li className="wgi-activity-row" data-activity-row={row.id} data-category={row.category}>
      <Collapsible>
        <CollapsibleTrigger className="wgi-activity-summary" data-testid="activity-row-summary">
          <span className="wgi-activity-icon" data-tone={tone} aria-hidden="true">
            <Glyph width={16} height={16} />
          </span>
          <span className="wgi-activity-sentence">
            <strong>{actor}</strong> {emphasize(sentence, [row.patientName, row.providerName])}
          </span>
          <time className="wgi-activity-time" dateTime={row.occurredAt}>
            {activityTimeLabel(row.occurredAt)}
          </time>
          <ChevronRight className="wgi-activity-chevron" aria-hidden="true" />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="wgi-activity-detail" data-testid="activity-row-detail">
            {change === null ? null : (
              <dl className="wgi-activity-change">
                <div>
                  <dt>Before</dt>
                  <dd data-side="before">{change.before}</dd>
                </div>
                <div>
                  <dt>After</dt>
                  <dd data-side="after">{change.after}</dd>
                </div>
              </dl>
            )}
            <p className="wgi-activity-meta">
              <Avatar size="sm" aria-hidden="true">
                <AvatarFallback>{activityInitials(actor)}</AvatarFallback>
              </Avatar>
              {activityMeta(row)}
            </p>
            {record === null && schedule === null ? null : (
              <div className="wgi-activity-links">
                {record === null ? null : (
                  <Link
                    href={record}
                    className={buttonVariants({ variant: "outline", size: "sm" })}
                  >
                    Open record
                  </Link>
                )}
                {schedule === null ? null : (
                  <Link href={schedule} className={buttonVariants({ size: "sm" })}>
                    Show on schedule
                  </Link>
                )}
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </li>
  );
}
