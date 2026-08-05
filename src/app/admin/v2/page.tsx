"use client";

// Today — the day sheet. The page is the attention system: sections in
// working order (call back, new, needs a decision, needs review), then
// what waits, then what resolved. Nothing here is a dashboard; the first
// row is the first job.

import Link from "next/link";
import {
  attentionGroup,
  dayGutterLabel,
  dayHeadLabel,
  dayLabel,
  practiceToday,
  type AttentionGroup,
} from "./prototype/format";
import {
  attemptCount,
  duePhrase,
  lastAction,
  lastAttemptLine,
  newRequestLine,
  resolutionLine,
} from "./prototype/lines";
import { LOCATION_LABELS, TIME_LABELS, type PrototypeRequest } from "./prototype/types";
import { useQueue } from "./prototype/store";
import { ClearSheet, MiniStamp, QueueRow, QueueSection } from "./components/rows";

function resolvedAt(request: PrototypeRequest): string {
  return (
    request.snapshot.bookingHandoffAt ??
    request.snapshot.closedAt ??
    request.receivedAt
  );
}

function detailHref(id: string): string {
  return `/admin/v2/requests/${id}?from=today`;
}

function prefsLabel(request: PrototypeRequest): string {
  return `${LOCATION_LABELS[request.location]} · ${TIME_LABELS[request.preferredTime]}`;
}

function callsLabel(request: PrototypeRequest): string | null {
  const count = attemptCount(request);
  return count > 1 ? `${count} calls` : null;
}

export default function TodayPage() {
  const { requests } = useQueue();
  const now = new Date();
  const today = practiceToday(now);

  const groups: Record<AttentionGroup, PrototypeRequest[]> = {
    due: [],
    new: [],
    silent: [],
    review: [],
    waiting: [],
    resolved: [],
  };
  for (const request of requests) {
    groups[attentionGroup(request.snapshot, today)].push(request);
  }

  groups.due.sort((a, b) =>
    (a.snapshot.callAgainDay ?? "").localeCompare(b.snapshot.callAgainDay ?? ""),
  );
  groups.new.sort((a, b) => a.receivedAt.localeCompare(b.receivedAt));
  groups.silent.sort((a, b) =>
    (lastAction(a)?.at ?? a.receivedAt).localeCompare(lastAction(b)?.at ?? b.receivedAt),
  );
  groups.review.sort((a, b) => a.receivedAt.localeCompare(b.receivedAt));
  groups.waiting.sort((a, b) =>
    (a.snapshot.callAgainDay ?? "").localeCompare(b.snapshot.callAgainDay ?? ""),
  );
  groups.resolved.sort((a, b) => resolvedAt(b).localeCompare(resolvedAt(a)));

  const summaryParts = [
    groups.due.length > 0 &&
      `${groups.due.length} ${groups.due.length === 1 ? "call" : "calls"} due`,
    groups.new.length > 0 &&
      `${groups.new.length} new ${groups.new.length === 1 ? "request" : "requests"}`,
    groups.silent.length > 0 &&
      `${groups.silent.length} ${groups.silent.length === 1 ? "needs" : "need"} a decision`,
    groups.review.length > 0 &&
      `${groups.review.length} ${groups.review.length === 1 ? "needs" : "need"} review`,
  ].filter((part): part is string => Boolean(part));

  const recentResolved = groups.resolved.slice(0, 4);

  return (
    <>
      <header>
        <h1 className="text-[1.6rem] font-bold tracking-tight text-[var(--ds-ink)]">
          {dayHeadLabel(now)}
        </h1>
        <p className="mt-1 text-[0.95rem] text-[var(--ds-faint)]">
          {summaryParts.length > 0
            ? summaryParts.join(" · ")
            : "Nothing needs attention right now."}
        </p>
      </header>

      <div className="ds-sheet mt-5 px-4 py-5 sm:px-7 sm:py-7">
        {summaryParts.length === 0 && groups.waiting.length === 0 ? (
          <ClearSheet
            title="The sheet is clear."
            body="New requests appear the moment a patient sends the form; call-agains come back on their day."
          />
        ) : null}

        {groups.due.length > 0 ? (
          <QueueSection id="due" title="Call back" count={groups.due.length}>
            {groups.due.map((request) => {
              const overdue =
                (request.snapshot.callAgainDay ?? today) < today;
              const attempt = lastAttemptLine(request, today);
              return (
                <QueueRow
                  key={request.id}
                  href={detailHref(request.id)}
                  gutter={
                    <span className={overdue ? "ds-flag-mark" : "ds-quiet-mark"}>
                      {dayGutterLabel(request.snapshot.callAgainDay ?? today, today)}
                    </span>
                  }
                  name={request.name}
                  phone={request.phone}
                  note={
                    <>
                      {attempt ? `${attempt} — ` : ""}
                      <span
                        className={
                          overdue ? "font-bold text-[var(--ds-flag)]" : undefined
                        }
                      >
                        {duePhrase(request.snapshot.callAgainDay ?? today, today)}
                      </span>
                    </>
                  }
                  right={callsLabel(request)}
                />
              );
            })}
          </QueueSection>
        ) : null}

        {groups.new.length > 0 ? (
          <QueueSection id="new" title="New requests" count={groups.new.length}>
            {groups.new.map((request) => {
              const line = newRequestLine(request, today);
              return (
                <QueueRow
                  key={request.id}
                  href={detailHref(request.id)}
                  gutter={<span className="ds-flag-mark">New</span>}
                  name={request.name}
                  phone={request.phone}
                  note={
                    <span
                      className={
                        line.overdue ? "font-bold text-[var(--ds-flag)]" : undefined
                      }
                    >
                      {line.text}
                    </span>
                  }
                  right={prefsLabel(request)}
                />
              );
            })}
          </QueueSection>
        ) : null}

        {groups.silent.length > 0 ? (
          <QueueSection
            id="silent"
            title="Needs a decision"
            count={groups.silent.length}
          >
            {groups.silent.map((request) => (
              <QueueRow
                key={request.id}
                href={detailHref(request.id)}
                gutter={<span className="ds-flag-mark">Silent</span>}
                name={request.name}
                phone={request.phone}
                note={`${lastAttemptLine(request, today) ?? "Worked"} — no call-again day set`}
                right={callsLabel(request)}
              />
            ))}
          </QueueSection>
        ) : null}

        {groups.review.length > 0 ? (
          <QueueSection
            id="review"
            title="Needs review"
            count={groups.review.length}
          >
            {groups.review.map((request) => (
              <QueueRow
                key={request.id}
                href={detailHref(request.id)}
                gutter={<span className="ds-flag-mark">Review</span>}
                name={request.name}
                phone={request.phone}
                note="Closed before outcomes were recorded — record how it ended"
              />
            ))}
          </QueueSection>
        ) : null}

        {groups.waiting.length > 0 ? (
          <QueueSection id="waiting" title="Waiting" count={groups.waiting.length}>
            {groups.waiting.map((request) => (
              <QueueRow
                key={request.id}
                href={detailHref(request.id)}
                gutter={
                  <span className="ds-quiet-mark">
                    {dayGutterLabel(request.snapshot.callAgainDay ?? today, today)}
                  </span>
                }
                name={request.name}
                phone={request.phone}
                note={`${lastAttemptLine(request, today) ?? "Waiting"} — call again ${dayLabel(
                  request.snapshot.callAgainDay ?? today,
                  today,
                )}`}
                right={callsLabel(request)}
              />
            ))}
          </QueueSection>
        ) : null}

        {recentResolved.length > 0 ? (
          <QueueSection
            id="resolved"
            title="Recently resolved"
            count={groups.resolved.length}
          >
            {recentResolved.map((request) => (
              <QueueRow
                key={request.id}
                href={detailHref(request.id)}
                gutter={
                  <MiniStamp
                    kind={request.snapshot.state === "BOOKED" ? "booked" : "closed"}
                  >
                    {request.snapshot.state === "BOOKED" ? "Booked" : "Closed"}
                  </MiniStamp>
                }
                name={request.name}
                phone={request.phone}
                note={resolutionLine(request, today)}
              />
            ))}
            <li className="pt-3">
              <Link
                href="/admin/v2/requests"
                className="inline-flex min-h-11 items-center text-[0.9rem] font-bold text-[var(--ds-pen)] underline underline-offset-2"
              >
                All appointments
              </Link>
            </li>
          </QueueSection>
        ) : null}
      </div>

      <section aria-labelledby="desk-head" className="mt-8">
        <h2 id="desk-head" className="ds-head max-w-xs">
          Also on the desk
        </h2>
        <ul className="mt-3 space-y-1 text-[0.92rem]">
          {[
            { href: "/admin/review-flyers", label: "Print review flyers" },
            { href: "/admin/settings", label: "Notification emails and staff access" },
            { href: "/admin/settings/software", label: "Website" },
            { href: "/admin/audit", label: "Activity log" },
          ].map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="inline-flex min-h-10 items-center gap-2 font-semibold text-[var(--ds-pen)] underline underline-offset-2"
              >
                {item.label}
              </Link>
              <span className="ml-2 text-[0.8rem] text-[var(--ds-faint)]">
                opens the current portal
              </span>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
