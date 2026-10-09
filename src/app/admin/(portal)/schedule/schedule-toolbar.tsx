"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import type { ReactNode, Ref } from "react";

import { SegmentedControl } from "@/components/ui/segmented-control";
import type { SegmentedControlOption } from "@/components/ui/segmented-control";

import { useScheduleNavigation } from "./schedule-navigation";
import { ScheduleSearch } from "./schedule-search";
import { ShortcutsList, useScheduleShortcuts } from "./schedule-shortcuts";
import type { ShortcutTargets } from "./schedule-shortcuts";

/* What the Schedule's three views share in their headers: the arrows a
   view steps with, and the tools on the right, the patient search (schedule-search.tsx) and
   the Day · Week · Month switch, which goes where D, W and M go. A view's own
   tool stands before the search, so the switch keeps one place in every view
   and the view it opens never moves it out from under the pointer.

   The switch answers the press: its thumb slides to the chosen view while the
   server renders it (schedule-navigation.tsx). Arrow keys move the choice too,
   and a choice made from the keyboard jumps rather than slides. */

export type ScheduleView = "day" | "week" | "month";

const VIEW_OPTIONS: readonly SegmentedControlOption<ScheduleView>[] = [
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
];

/** Marks a view's section while a move away from it waits on the server. */
export function usePendingSection() {
  const { pending } = useScheduleNavigation();
  return pending === null ? {} : { "aria-busy": true, "data-pending": "" };
}

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
  children,
}: Readonly<{
  value: ScheduleView;
  targets: ShortcutTargets;
  toolsRef?: Ref<HTMLDivElement>;
  /** A view's own tool before the search, such as the Day view's Hours. */
  children?: ReactNode;
}>) {
  const { pending, navigate } = useScheduleNavigation();
  const keyed = useRef(false);
  return (
    <div ref={toolsRef} className="wgi-schedule-tools">
      {children}
      <ScheduleSearch />
      <SegmentedControl<ScheduleView>
        aria-label="View"
        paper="glass"
        motion={pending?.instant === true ? "none" : "wgi"}
        options={VIEW_OPTIONS}
        value={pending?.view ?? value}
        className="w-auto"
        onPointerDown={() => {
          keyed.current = false;
        }}
        onKeyDownCapture={() => {
          keyed.current = true;
        }}
        onValueChange={(next) => {
          const href = targets[next];
          if (href !== null) navigate(href, { view: next, instant: keyed.current });
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
