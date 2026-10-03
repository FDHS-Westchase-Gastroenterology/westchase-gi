"use client";

import { useState } from "react";

import { ChevronDown, Printer } from "@/components/icons";
import { Button } from "@/components/ui/button";
import {
  Menu,
  MenuCheckboxItem,
  MenuContent,
  MenuGroup,
  MenuItem,
  MenuLabel,
  MenuSeparator,
  MenuTrigger,
} from "@/components/ui/menu";
import type { ReviewFlyer, ReviewTargetKey } from "@/lib/review-flyers";

import { useFlyerPrint } from "./flyer-output";
import type { PrintTarget } from "./print-marks";

/* Print several (issue #357; Figma 516:9469): the header's one command
   prints the flyers checked in its menu together, one to a page. Every
   flyer starts checked, so the common case (the full set) is one click
   away; unchecking keeps the menu open so several can be dropped in a row
   (HIG Pull-down buttons; Menus: a toggled item keeps its menu). Only
   flyers that can print are listed. */

const NUMBER_WORDS = ["", "one", "two", "three", "four", "five", "six"] as const;

function countWord(count: number): string {
  return NUMBER_WORDS[count] ?? String(count);
}

function plan(
  flyers: readonly ReviewFlyer[],
  chosen: ReadonlySet<ReviewTargetKey>,
): { label: string; message: string; target: PrintTarget } | null {
  const picked = flyers.filter((flyer) => chosen.has(flyer.key));
  const only = picked.length === 1 ? picked[0] : undefined;
  if (picked.length === 0) return null;
  if (only !== undefined) {
    return {
      label: "Print 1 flyer",
      message: `Print dialog is opening for ${only.title}.`,
      target: { mark: only.key },
    };
  }
  if (picked.length === 6 && flyers.length === 6) {
    return {
      label: "Print all six",
      message: "Print dialog is opening for all six flyers.",
      target: { mark: "all" },
    };
  }
  return {
    label: `Print ${String(picked.length)} flyers`,
    message: `Print dialog is opening for ${countWord(picked.length)} flyers.`,
    target: { mark: "several", chosen: picked.map((flyer) => flyer.key) },
  };
}

export function PrintSeveralMenu({ flyers }: Readonly<{ flyers: readonly ReviewFlyer[] }>) {
  const [chosen, setChosen] = useState<ReadonlySet<ReviewTargetKey>>(
    () => new Set(flyers.map((flyer) => flyer.key)),
  );
  const { print, locked } = useFlyerPrint();
  if (flyers.length === 0) return null;
  const next = plan(flyers, chosen);

  return (
    <Menu>
      <MenuTrigger
        render={<Button type="button" variant="outline" className="wgi-flyers-several" />}
        data-testid="review-flyer-print-several"
      >
        <Printer data-icon="inline-start" aria-hidden="true" />
        Print several
        <ChevronDown data-icon="inline-end" aria-hidden="true" />
      </MenuTrigger>
      <MenuContent align="end" className="wgi-flyers-popover wgi-flyer-menu">
        <MenuGroup>
          <MenuLabel>Flyers to print</MenuLabel>
          {flyers.map((flyer) => (
            <MenuCheckboxItem
              key={flyer.key}
              checked={chosen.has(flyer.key)}
              data-review-choice={flyer.key}
              onCheckedChange={(checked: boolean) => {
                setChosen((current) => {
                  const updated = new Set(current);
                  if (checked) updated.add(flyer.key);
                  else updated.delete(flyer.key);
                  return updated;
                });
              }}
            >
              <span className="truncate">{flyer.title}</span>
            </MenuCheckboxItem>
          ))}
        </MenuGroup>
        <MenuSeparator />
        <MenuItem
          tone="primary"
          disabled={next === null || locked}
          data-testid="review-flyer-print-chosen"
          onClick={() => {
            if (next !== null) print(next.target, next.message);
          }}
        >
          <Printer width={16} height={16} aria-hidden="true" />
          {next?.label ?? "Choose a flyer to print"}
        </MenuItem>
      </MenuContent>
    </Menu>
  );
}
