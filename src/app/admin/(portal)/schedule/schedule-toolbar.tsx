"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import type { ReactNode, Ref } from "react";

import { Search } from "@/components/icons";
import { Input } from "@/components/ui/input";
import { SegmentedControl } from "@/components/ui/segmented-control";
import type { SegmentedControlOption } from "@/components/ui/segmented-control";

import { ShortcutsList, useScheduleShortcuts } from "./schedule-shortcuts";
import type { ShortcutTargets } from "./schedule-shortcuts";

/* What the Schedule's three views share in their headers: the arrows a
   view steps with, and the tools on the right, search (until #356) and
   the Day · Week · Month switch, which goes where D, W and M go. */

export type ScheduleView = "day" | "week" | "month";

const VIEW_OPTIONS: readonly SegmentedControlOption<ScheduleView>[] = [
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
];

/** A previous or next arrow; a step the schedule cannot take is a disabled button. */
export function ScheduleArrow({
  href,
  label,
  children,
}: Readonly<{ href: string | null; label: string; children: ReactNode }>) {
  if (href === null)
    return (
      <button type="button" className="wgi-schedule-arrow" disabled aria-label={label}>
        {children}
      </button>
    );
  return (
    <Link href={href} className="wgi-schedule-arrow" aria-label={label}>
      {children}
    </Link>
  );
}

export function ScheduleTools({
  value,
  targets,
  toolsRef,
}: Readonly<{ value: ScheduleView; targets: ShortcutTargets; toolsRef?: Ref<HTMLDivElement> }>) {
  const router = useRouter();
  return (
    <div ref={toolsRef} className="wgi-schedule-tools">
      <label className="wgi-schedule-search">
        <Search width={18} height={18} />
        <Input
          type="search"
          motion="none"
          placeholder="Search patients"
          aria-label="Search patients"
          disabled
        />
      </label>
      <SegmentedControl<ScheduleView>
        aria-label="View"
        paper="glass"
        options={VIEW_OPTIONS}
        value={value}
        className="w-auto"
        onValueChange={(next) => {
          const href = targets[next];
          if (href !== null) router.push(href);
        }}
      />
    </div>
  );
}

/** Week's and Month's tools: the same, answering the shortcuts, and ?
   lists them under the view switch. */
export function ScheduleToolsWithShortcuts({
  value,
  targets,
}: Readonly<{ value: ScheduleView; targets: ShortcutTargets }>) {
  const tools = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  useScheduleShortcuts(targets, () => {
    setOpen(true);
  });
  return (
    <>
      <ScheduleTools value={value} targets={targets} toolsRef={tools} />
      <ShortcutsList open={open} onOpenChange={setOpen} anchor={tools} side="bottom" keyed />
    </>
  );
}
