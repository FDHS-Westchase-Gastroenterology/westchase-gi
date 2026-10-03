"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

import { ChevronDown, Search } from "@/components/icons";
import { buttonVariants } from "@/components/ui/button-variants";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { HelpAnswer } from "@/components/ui/help-button";
import { Input } from "@/components/ui/input";
import type { StaffRole } from "@/lib/portal/contracts";
import {
  HELP_GROUPS,
  HELP_TOPICS,
  HELP_TOPIC_ALIASES,
  helpTopicText,
  helpTopicVisible,
} from "@/lib/portal/help-topics";
import type { HelpGroup, HelpTopic } from "@/lib/portal/help-topics";

import { HelpSample } from "./help-samples";

import "./help.css";

/* The Help page's topics (issue #358, Figma U4). Search narrows them across
   titles and answers; each topic opens in place (HIG Disclosure controls)
   to its answer, a live sample that cannot be pressed, and the way to the
   screen it is about. A topic's id is its URL fragment, so a help button's
   "Open in Help ›" or a link from another page lands with it open. */

const QUERY_MAX = 80;

function topicMatches(topic: Readonly<HelpTopic>, words: readonly string[]): boolean {
  const text = helpTopicText(topic);
  return words.every((word) => text.includes(word));
}

function resolveTopicId(hash: string): string {
  const id = decodeURIComponent(hash.replace(/^#/, ""));
  return HELP_TOPIC_ALIASES.get(id) ?? id;
}

function HelpTopicRow({
  topic,
  open,
  onOpenChange,
}: Readonly<{ topic: HelpTopic; open: boolean; onOpenChange: (open: boolean) => void }>) {
  return (
    <li id={topic.id} className="wgi-help-topic" data-testid="help-topic">
      <Collapsible open={open} onOpenChange={onOpenChange}>
        <h3 className="wgi-help-topic-heading">
          <CollapsibleTrigger className="wgi-help-summary" data-help-trigger={topic.id}>
            <span>{topic.title}</span>
            <ChevronDown className="wgi-help-chevron" aria-hidden="true" />
          </CollapsibleTrigger>
        </h3>
        <CollapsibleContent>
          <div className="wgi-help-detail" data-testid="help-topic-detail">
            <HelpAnswer topic={topic} className="wgi-help-answer" />
            <HelpSample sample={topic.sample} />
            <Link href={topic.show.href} className="wgi-help-link">
              {topic.show.label} ›
            </Link>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </li>
  );
}

export function HelpContent({
  role,
  children,
}: Readonly<{ role: StaffRole; children: ReactNode }>) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<ReadonlySet<string>>(() => new Set());
  const rootRef = useRef<HTMLDivElement>(null);

  const visible = HELP_TOPICS.filter((topic) => helpTopicVisible(topic, role));
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const matching = visible.filter((topic) => topicMatches(topic, words));
  const groups: { group: HelpGroup; topics: HelpTopic[] }[] = [];
  for (const group of HELP_GROUPS) {
    const topics = matching.filter((topic) => topic.group === group.id);
    if (topics.length > 0) groups.push({ group, topics });
  }

  // A fragment names a topic to open: on arrival, and when a link on this page changes it.
  useEffect(() => {
    function openFromHash() {
      const id = resolveTopicId(window.location.hash);
      const topic = HELP_TOPICS.find((candidate) => candidate.id === id);
      if (topic === undefined || !helpTopicVisible(topic, role)) return;
      setQuery("");
      setOpen((current) => new Set(current).add(id));
      requestAnimationFrame(() => {
        const row = document.getElementById(id);
        row?.scrollIntoView({ block: "start" });
        rootRef.current
          ?.querySelector<HTMLElement>(`[data-help-trigger="${CSS.escape(id)}"]`)
          ?.focus({ preventScroll: true });
      });
    }
    openFromHash();
    window.addEventListener("hashchange", openFromHash);
    return () => {
      window.removeEventListener("hashchange", openFromHash);
    };
  }, [role]);

  function setTopicOpen(id: string, next: boolean) {
    setOpen((current) => {
      const updated = new Set(current);
      if (next) updated.add(id);
      else updated.delete(id);
      return updated;
    });
    const url = new URL(window.location.href);
    if (next) url.hash = id;
    else if (resolveTopicId(url.hash) === id) url.hash = "";
    window.history.replaceState(window.history.state, "", url);
  }

  const announcement =
    words.length === 0
      ? ""
      : matching.length === 0
        ? "No topics match"
        : `${String(matching.length)} ${matching.length === 1 ? "topic" : "topics"}`;

  return (
    <div ref={rootRef} className="wgi-help">
      <header className="wgi-help-head">
        <h1 id="help-heading" className="wgi-help-title">
          Help
        </h1>
        <search>
          <label className="wgi-help-search">
            <Search width={18} height={18} aria-hidden="true" />
            <Input
              type="search"
              motion="none"
              value={query}
              placeholder="Search help"
              aria-label="Search help"
              maxLength={QUERY_MAX}
              autoComplete="off"
              spellCheck={false}
              data-testid="help-search"
              onChange={(event) => {
                setQuery(event.target.value);
              }}
              onKeyDown={(event) => {
                if (event.key === "Escape" && query !== "") {
                  event.preventDefault();
                  setQuery("");
                }
              }}
            />
          </label>
        </search>
      </header>
      <p className="sr-only" role="status" aria-live="polite">
        {announcement}
      </p>
      <div className="wgi-help-layout">
        <div className="wgi-help-topics">
          {groups.length === 0 ? (
            <Empty className="wgi-help-empty" data-testid="help-empty">
              <EmptyHeader>
                <EmptyTitle>No topics match</EmptyTitle>
                <EmptyDescription>
                  Try a shorter word, such as “book”, “hours” or “call”.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <button
                  type="button"
                  data-slot="button"
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                  onClick={() => {
                    setQuery("");
                  }}
                >
                  Clear search
                </button>
              </EmptyContent>
            </Empty>
          ) : (
            groups.map(({ group, topics }) => (
              <section
                key={group.id}
                className="wgi-help-group"
                aria-labelledby={`help-group-${group.id}`}
                data-help-group={group.id}
              >
                <h2 id={`help-group-${group.id}`} className="wgi-help-band">
                  {group.label}
                </h2>
                <ul className="wgi-help-list">
                  {topics.map((topic) => (
                    <HelpTopicRow
                      key={topic.id}
                      topic={topic}
                      open={open.has(topic.id)}
                      onOpenChange={(next) => {
                        setTopicOpen(topic.id, next);
                      }}
                    />
                  ))}
                </ul>
              </section>
            ))
          )}
        </div>
        <aside className="wgi-help-aside" aria-label="More help">
          {children}
        </aside>
      </div>
    </div>
  );
}
