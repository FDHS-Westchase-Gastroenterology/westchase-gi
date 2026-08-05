"use client";

// All appointments — the whole book. One ledger, newest first, with a
// find-a-patient search and a state filter. This is the "phone rings,
// find them now" surface: type three letters, land on the row.

import { useState } from "react";
import {
  attentionGroup,
  dayLabel,
  dayOf,
  practiceToday,
} from "../prototype/format";
import {
  lastAttemptLine,
  newRequestLine,
  resolutionLine,
} from "../prototype/lines";
import type { PrototypeRequest } from "../prototype/types";
import { useQueue } from "../prototype/store";
import { MiniStamp, QueueRow, QueueSection } from "../components/rows";

type Filter = "all" | "open" | "scheduled" | "closed";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "open", label: "Open" },
  { id: "scheduled", label: "Scheduled" },
  { id: "closed", label: "Closed" },
];

function matchesFilter(request: PrototypeRequest, filter: Filter): boolean {
  if (filter === "all") return true;
  if (filter === "open") {
    return request.snapshot.state === "NEW" || request.snapshot.state === "CONTACTED";
  }
  if (filter === "scheduled") return request.snapshot.state === "BOOKED";
  return request.snapshot.state === "CLOSED";
}

function matchesSearch(request: PrototypeRequest, query: string): boolean {
  const trimmed = query.trim().toLowerCase();
  if (trimmed.length === 0) return true;
  if (request.name.toLowerCase().includes(trimmed)) return true;
  const digits = trimmed.replace(/\D/g, "");
  return digits.length > 0 && request.phone.replace(/\D/g, "").includes(digits);
}

export default function AllRequestsPage() {
  const { requests } = useQueue();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const today = practiceToday(new Date());

  const visible = requests
    .filter(
      (request) => matchesFilter(request, filter) && matchesSearch(request, query),
    )
    .sort((a, b) => b.receivedAt.localeCompare(a.receivedAt));

  return (
    <>
      <header>
        <h1 className="text-[1.6rem] font-bold tracking-tight text-[var(--ds-ink)]">
          All appointments
        </h1>
        <p className="mt-1 text-[0.95rem] text-[var(--ds-faint)]">
          Every request the practice has received, newest first.
        </p>
      </header>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Find by name or phone"
          aria-label="Find a request by patient name or phone number"
          className="ds-input h-11 w-full max-w-xs"
        />
        <div role="group" aria-label="Filter by status" className="flex gap-1">
          {FILTERS.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={filter === item.id}
              onClick={() => setFilter(item.id)}
              className={`ds-press min-h-11 rounded px-3 text-[0.9rem] font-bold ${
                filter === item.id
                  ? "bg-[var(--ds-pen-deep)] text-white"
                  : "text-[var(--ds-body)] hover:bg-[var(--ds-mint)]"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="ds-sheet mt-5 px-4 py-5 sm:px-7 sm:py-7">
        {visible.length === 0 ? (
          <p className="border-y border-[var(--ds-rule)] py-10 text-center text-[0.95rem] text-[var(--ds-faint)]">
            No requests match{query.trim() ? ` “${query.trim()}”` : " this filter"}.
          </p>
        ) : (
          <QueueSection
            id="book"
            title={FILTERS.find((item) => item.id === filter)?.label ?? "All"}
            count={visible.length}
          >
            {visible.map((request) => {
              const state = request.snapshot.state;
              const needsAttention = ["due", "new", "silent", "review"].includes(
                attentionGroup(request.snapshot, today),
              );
              const note =
                state === "BOOKED" || state === "CLOSED"
                  ? resolutionLine(request, today)
                  : (lastAttemptLine(request, today) ??
                    newRequestLine(request, today).text);
              return (
                <QueueRow
                  key={request.id}
                  href={`/admin/v2/requests/${request.id}?from=all`}
                  gutter={
                    state === "BOOKED" ? (
                      <MiniStamp kind="booked">Booked</MiniStamp>
                    ) : state === "CLOSED" ? (
                      <MiniStamp kind="closed">Closed</MiniStamp>
                    ) : (
                      <span
                        className={needsAttention ? "ds-flag-mark" : "ds-quiet-mark"}
                      >
                        Open
                      </span>
                    )
                  }
                  name={request.name}
                  phone={request.phone}
                  note={note}
                  right={dayLabel(dayOf(request.receivedAt), today)}
                />
              );
            })}
          </QueueSection>
        )}
      </div>
    </>
  );
}
