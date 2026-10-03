"use client";

import { cn } from "cn";
import Link from "next/link";
import { useState } from "react";
import type { ReactNode } from "react";

import {
  fillHelpText,
  helpGroup,
  helpSegments,
  helpTopic,
  helpTopicHref,
} from "@/lib/portal/help-topics";
import type { HelpText, HelpTopic } from "@/lib/portal/help-topics";

import { buttonVariants } from "./button-variants";
import { Popover, PopoverContent, PopoverTitle, PopoverTrigger } from "./popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "./tooltip";

/*
 * A help button (issue #358, Figma U4 "Help button on Hours"): a round "?"
 * beside the control it explains, for a step that is hard to guess. It
 * takes a topic id from src/lib/portal/help-topics.ts, the list the Help
 * page reads, so the answer is the same in both places.
 *
 * Composed from ui/ recipes: the trigger is the Button recipe's outline
 * paint, a 28px circle with a 44px target; a ui/tooltip names the topic
 * while the pointer rests on it; pressing it opens a ui/popover that grows
 * from the button (the recipe's `wgi` motion) with the topic's group, title
 * and answer, and "Open in Help ›" to the topic open on the Help page. Esc
 * closes the popover and Base UI returns focus to the button. Inside a
 * modal dialog, the dialog provides PopoverContainer so the popover and
 * tooltip portal into the top layer, and the dialog leaves Esc to them.
 *
 * HelpAnswer and HelpRichText render a topic's answer for the Help page as
 * well, so a step reads the same wherever it is shown.
 */

type HelpValues = Readonly<Record<string, string>>;

/** One run of help text, with its bold parts and `{name}` values filled. */
function HelpRichText({
  text,
  topic,
  values,
}: Readonly<{ text: HelpText; topic: HelpTopic; values?: HelpValues }>) {
  let offset = 0;
  return helpSegments(text).map((segment) => {
    const key = `at-${String(offset)}`;
    offset += segment.text.length;
    const filled = fillHelpText(segment.text, topic, values);
    return segment.strong ? (
      <strong key={key} className="font-bold text-(--wgi-name-ink,var(--color-ink))">
        {filled}
      </strong>
    ) : (
      filled
    );
  });
}

/** A topic's answer: its paragraphs, or its numbered steps. */
function HelpAnswer({
  topic,
  values,
  className,
}: Readonly<{ topic: HelpTopic; values?: HelpValues; className?: string }>) {
  if (topic.steps === true) {
    return (
      <ol className={cn("m-0 flex list-none flex-col gap-2.5 p-0", className)}>
        {topic.body.map((text, place) => (
          <li key={text} className="grid grid-cols-[1.25rem_minmax(0,1fr)] gap-2.5">
            <span
              aria-hidden="true"
              className="mt-px grid size-5 place-items-center rounded-full bg-slate-100 text-[0.6875rem] font-bold text-navy-800"
            >
              {place + 1}
            </span>
            <span>
              <HelpRichText text={text} topic={topic} values={values} />
            </span>
          </li>
        ))}
      </ol>
    );
  }
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {topic.body.map((text) => (
        <p key={text} className="m-0">
          <HelpRichText text={text} topic={topic} values={values} />
        </p>
      ))}
    </div>
  );
}

/** The round "?" that opens one topic beside the control it explains. */
function HelpButton({
  topic: topicId,
  values,
  className,
}: Readonly<{
  /** A topic id from HELP_TOPICS. */
  topic: string;
  /** What the topic's `{name}` placeholders read on this screen. */
  values?: HelpValues;
  className?: string;
}>): ReactNode {
  const [open, setOpen] = useState(false);
  const [hinting, setHinting] = useState(false);
  const topic = helpTopic(topicId);
  if (topic === null) return null;
  const label = `Open help on ${topic.title.charAt(0).toLowerCase()}${topic.title.slice(1)}`;

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setHinting(false);
      }}
    >
      <Tooltip open={hinting && !open} onOpenChange={setHinting}>
        <TooltipTrigger
          render={<PopoverTrigger />}
          aria-label={label}
          data-testid="help-button"
          data-help-topic={topic.id}
          className={cn(
            buttonVariants({ variant: "outline", size: "icon" }),
            "relative size-7 min-h-0 rounded-full p-0 text-[0.8125rem] text-navy-900",
            "after:absolute after:-inset-2",
            className,
          )}
        >
          <span aria-hidden="true">?</span>
        </TooltipTrigger>
        <TooltipContent side="bottom">{label}</TooltipContent>
      </Tooltip>
      <PopoverContent
        side="bottom"
        align="start"
        sideOffset={10}
        className="wgi-help-popover w-[26.25rem] max-w-[calc(100vw-2rem)] p-5 text-[0.875rem] leading-5 text-(--wgi-name-ink,var(--color-ink))"
        data-testid="help-popover"
      >
        <p className="m-0 text-[0.6875rem] font-bold tracking-[0.66px] text-(--wgi-label-ink,var(--color-muted-ink)) uppercase">
          Help · {helpGroup(topic.group).label}
        </p>
        <PopoverTitle className="mt-1 text-[1.0625rem] leading-6 text-(--wgi-name-ink,var(--color-ink))">
          {topic.title}
        </PopoverTitle>
        <HelpAnswer topic={topic} values={values} className="mt-3" />
        <div className="mt-4 flex items-center justify-between gap-4 border-t border-(--wgi-rule,var(--color-line)) pt-3">
          <Link
            href={helpTopicHref(topic.id)}
            className="rounded-sm font-medium text-(--wgi-link-ink,var(--color-teal-ink)) underline-offset-2 hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            data-testid="help-open-in-help"
          >
            Open in Help ›
          </Link>
          <span
            aria-hidden="true"
            className="text-[0.8125rem] text-(--wgi-muted-ink,var(--color-muted-ink))"
          >
            Esc closes
          </span>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export { HelpAnswer, HelpButton, HelpRichText };
