"use client";

import { useState } from "react";
import type { ReactNode } from "react";

import {
  Menu,
  MenuCheckboxItem,
  MenuContent,
  MenuGroup,
  MenuItem,
  MenuLabel,
  MenuRadioGroup,
  MenuRadioItem,
  MenuSeparator,
  MenuTrigger,
} from "@/components/ui/menu";

import type { ScheduleWeek, WeekProviderChoice } from "./schedule-week-model";

/* The week's title is a pull-down menu (issue #345, W1b): every active
   provider, the one shown checked, then "Compare providers…". That last
   row turns the same menu into the compare picker in place (HIG Pull-down
   buttons; a menu's content may change, but it never stacks a second
   menu): up to three providers, with a live count, and Compare once two are
   picked; lanes keep the order they were picked in. Escape in
   the picker goes back to the list rather than closing the menu, the way a
   submenu backs out. In compare mode the menu opens on the picker with the
   compared providers checked. */

const COMPARE_MAX = 3;

type Mode = "list" | "compare";

function Avatar({ initials }: Readonly<{ initials: string }>) {
  return (
    <span
      aria-hidden="true"
      className="flex size-6 items-center justify-center rounded-full bg-slate-100 text-[0.625rem] font-bold text-muted-ink"
    >
      {initials}
    </span>
  );
}

export function WeekProviderMenu({
  view,
  catalog,
  onShowOne,
  onCompare,
  children,
}: Readonly<{
  view: ScheduleWeek;
  catalog: readonly WeekProviderChoice[];
  onShowOne: (providerId: string) => void;
  onCompare: (providerIds: readonly string[]) => void;
  children: ReactNode;
}>) {
  const shown = view.providers.map((provider) => provider.id);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("list");
  const [picked, setPicked] = useState<readonly string[]>(shown);

  const pickedIds = new Set(picked);

  function pick(providerId: string, checked: boolean) {
    setPicked((current) =>
      checked
        ? current.includes(providerId) || current.length >= COMPARE_MAX
          ? current
          : [...current, providerId]
        : current.filter((id) => id !== providerId),
    );
  }

  return (
    <Menu
      open={open}
      onOpenChange={(next, details) => {
        if (!next && mode === "compare" && !view.compare && details.reason === "escape-key") {
          details.cancel();
          setMode("list");
          return;
        }
        if (next) {
          setMode(view.compare ? "compare" : "list");
          setPicked(shown);
        }
        setOpen(next);
      }}
    >
      <MenuTrigger className="wgi-week-trigger" aria-label={view.triggerLabel}>
        {children}
      </MenuTrigger>
      <MenuContent className="w-72">
        {mode === "list" ? (
          <>
            <MenuRadioGroup
              value={view.compare ? "" : (shown.at(0) ?? "")}
              onValueChange={(value: string) => {
                setOpen(false);
                onShowOne(value);
              }}
            >
              {catalog.map((provider) => (
                <MenuRadioItem key={provider.id} value={provider.id} closeOnClick>
                  <Avatar initials={provider.initials} />
                  <span className="truncate">{provider.name}</span>
                </MenuRadioItem>
              ))}
            </MenuRadioGroup>
            <MenuSeparator />
            <MenuItem
              closeOnClick={false}
              onClick={() => {
                setMode("compare");
              }}
            >
              Compare providers…
            </MenuItem>
          </>
        ) : (
          <>
            <MenuGroup>
              <MenuLabel className="flex justify-between gap-3">
                <span>Compare up to {COMPARE_MAX}</span>
                <span aria-live="polite">
                  {picked.length} of {COMPARE_MAX} selected
                </span>
              </MenuLabel>
              {catalog.map((provider) => {
                const checked = pickedIds.has(provider.id);
                return (
                  <MenuCheckboxItem
                    key={provider.id}
                    checked={checked}
                    disabled={!checked && picked.length >= COMPARE_MAX}
                    onCheckedChange={(next) => {
                      pick(provider.id, next);
                    }}
                  >
                    <Avatar initials={provider.initials} />
                    <span className="truncate">{provider.name}</span>
                  </MenuCheckboxItem>
                );
              })}
            </MenuGroup>
            <MenuSeparator />
            <MenuItem
              disabled={picked.length < 2}
              tone="primary"
              onClick={() => {
                onCompare(picked);
              }}
            >
              Compare
            </MenuItem>
            {view.compare ? (
              <MenuItem
                closeOnClick={false}
                onClick={() => {
                  setMode("list");
                }}
              >
                Show one provider
              </MenuItem>
            ) : null}
          </>
        )}
      </MenuContent>
    </Menu>
  );
}
