"use client";

import type { RefObject } from "react";

import { Activity, Calendar, ChevronDown, Search } from "@/components/icons";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import {
  Menu,
  MenuContent,
  MenuRadioGroup,
  MenuRadioItem,
  MenuSeparator,
  MenuTrigger,
} from "@/components/ui/menu";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  ACTIVITY_CATEGORY_LABELS,
  ACTIVITY_QUERY_MAX,
  activityHref,
  APPOINTMENT_ACTION_LABELS,
  APPOINTMENT_ACTIONS,
} from "@/lib/portal/activity-contracts";
import type {
  ActivityCategory,
  ActivityCursor,
  ActivityFailureCode,
  ActivityRow,
  ActivityUrlFilters,
  AppointmentAction,
} from "@/lib/portal/activity-contracts";

import { ActivityDateRange } from "./activity-date-range";
import { ActivityLogRow } from "./activity-log-row";
import { activityDay, activityDayBand } from "./activity-model";

/* The Activity log's parts (issue #357): the header's search, the filter
   bar, the failure and empty states, and the day-grouped list. They hold no
   state; activity-log.tsx owns the filters, the search and the reads. */

export interface ActivityProvider {
  readonly id: string;
  readonly name: string;
  readonly initials: string;
}

const EVERYTHING = "everything";
const ANY_PROVIDER = "";

/** Rows grouped under their practice-local day, in the order they came. */
function byDay(rows: readonly ActivityRow[]): { day: string; rows: ActivityRow[] }[] {
  const days: { day: string; rows: ActivityRow[] }[] = [];
  for (const row of rows) {
    const day = activityDay(row.occurredAt);
    const last = days.at(-1);
    if (last?.day === day) last.rows.push(row);
    else days.push({ day, rows: [row] });
  }
  return days;
}

export function ActivityHeader({
  query,
  onSearch,
}: Readonly<{ query: string; onSearch: (text: string) => void }>) {
  return (
    <header className="wgi-activity-head">
      <h1 id="audit-heading" className="wgi-activity-title">
        Activity log
      </h1>
      <label className="wgi-activity-search">
        <Search width={18} height={18} aria-hidden="true" />
        <Input
          type="search"
          motion="none"
          value={query}
          placeholder="Search people, patients, changes"
          aria-label="Search the activity log"
          maxLength={ACTIVITY_QUERY_MAX}
          autoComplete="off"
          spellCheck={false}
          data-testid="activity-search"
          onChange={(event) => {
            onSearch(event.target.value);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape" && query !== "") {
              event.preventDefault();
              onSearch("");
            }
          }}
        />
      </label>
    </header>
  );
}

function ProviderMenu({
  providers,
  providerId,
  onPick,
}: Readonly<{
  providers: readonly ActivityProvider[];
  providerId: string | undefined;
  onPick: (providerId: string | undefined) => void;
}>) {
  const provider = providers.find((candidate) => candidate.id === providerId);
  return (
    <Menu>
      <MenuTrigger className="wgi-activity-pick" data-testid="activity-provider-trigger">
        {provider === undefined ? null : (
          <Avatar size="sm" aria-hidden="true">
            <AvatarFallback>{provider.initials}</AvatarFallback>
          </Avatar>
        )}
        <span>
          {providerId === undefined ? "Any provider" : (provider?.name ?? "Selected provider")}
        </span>
        <ChevronDown width={14} height={14} aria-hidden="true" />
      </MenuTrigger>
      <MenuContent align="end" className="wgi-activity-popover wgi-activity-menu">
        <MenuRadioGroup
          value={providerId ?? ANY_PROVIDER}
          onValueChange={(value: string) => {
            onPick(value === ANY_PROVIDER ? undefined : value);
          }}
        >
          <MenuRadioItem value={ANY_PROVIDER} closeOnClick>
            Any provider
          </MenuRadioItem>
          {providers.length > 0 ? <MenuSeparator /> : null}
          {providers.map((candidate) => (
            <MenuRadioItem key={candidate.id} value={candidate.id} closeOnClick>
              <Avatar size="sm" aria-hidden="true">
                <AvatarFallback>{candidate.initials}</AvatarFallback>
              </Avatar>
              <span className="truncate">{candidate.name}</span>
            </MenuRadioItem>
          ))}
        </MenuRadioGroup>
      </MenuContent>
    </Menu>
  );
}

export function ActivityFilterBar({
  filters,
  categories,
  providers,
  today,
  onApply,
}: Readonly<{
  filters: ActivityUrlFilters;
  categories: readonly ActivityCategory[];
  providers: readonly ActivityProvider[];
  today: string;
  onApply: (next: ActivityUrlFilters) => void;
}>) {
  const category = filters.categories?.length === 1 ? filters.categories[0] : undefined;
  return (
    <>
      <div className="wgi-activity-bar">
        <ToggleGroup
          className="wgi-activity-chips"
          aria-label="What changed"
          data-testid="activity-categories"
          value={filters.categories === undefined ? [EVERYTHING] : [...filters.categories]}
          onValueChange={(value: readonly string[]) => {
            const picked = categories.find((candidate) => candidate === value.at(-1));
            onApply({
              ...filters,
              categories: picked === undefined ? undefined : [picked],
              appointmentActions:
                picked === "appointments" ? filters.appointmentActions : undefined,
            });
          }}
        >
          <ToggleGroupItem value={EVERYTHING} className="wgi-activity-chip">
            Everything
          </ToggleGroupItem>
          {categories.map((candidate) => (
            <ToggleGroupItem key={candidate} value={candidate} className="wgi-activity-chip">
              {ACTIVITY_CATEGORY_LABELS[candidate]}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <div className="wgi-activity-picks">
          <ProviderMenu
            providers={providers}
            providerId={filters.providerId}
            onPick={(providerId) => {
              onApply({ ...filters, providerId });
            }}
          />
          <ActivityDateRange
            from={filters.from}
            to={filters.to}
            today={today}
            onChange={(range) => {
              onApply({ ...filters, from: range.from, to: range.to });
            }}
          />
        </div>
      </div>

      {category === "appointments" ? (
        <ToggleGroup
          multiple
          className="wgi-activity-chips wgi-activity-actions"
          aria-label="Appointment changes"
          data-testid="activity-actions"
          value={[...(filters.appointmentActions ?? [])]}
          onValueChange={(value: readonly string[]) => {
            const actions = APPOINTMENT_ACTIONS.filter((action) => value.includes(action));
            onApply({
              ...filters,
              appointmentActions: actions.length > 0 ? actions : undefined,
            });
          }}
        >
          {APPOINTMENT_ACTIONS.map((action: AppointmentAction) => (
            <ToggleGroupItem key={action} value={action} className="wgi-activity-chip">
              {APPOINTMENT_ACTION_LABELS[action]}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      ) : null}
    </>
  );
}

function ActivityUnavailable({ onRetry }: Readonly<{ onRetry: () => void }>) {
  return (
    <Empty className="wgi-activity-empty" data-testid="activity-error">
      <EmptyHeader>
        <EmptyMedia variant="icon" className="wgi-activity-empty-disc" aria-hidden="true">
          <Activity width={22} height={22} />
        </EmptyMedia>
        <EmptyTitle className="wgi-activity-empty-title">The log could not be loaded</EmptyTitle>
        <EmptyDescription className="wgi-activity-empty-text">
          Nothing was changed. Check the connection, then try again.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button variant="outline" size="sm" className="wgi-activity-pill" onClick={onRetry}>
          Try again
        </Button>
      </EmptyContent>
    </Empty>
  );
}

function ActivityInvalid({ onClear }: Readonly<{ onClear: () => void }>) {
  return (
    <Empty className="wgi-activity-empty" data-testid="activity-invalid">
      <EmptyHeader>
        <EmptyMedia variant="icon" className="wgi-activity-empty-disc" aria-hidden="true">
          <Search width={22} height={22} />
        </EmptyMedia>
        <EmptyTitle className="wgi-activity-empty-title">
          That search or filter could not be applied
        </EmptyTitle>
        <EmptyDescription className="wgi-activity-empty-text">
          A search can hold up to eight words. Shorten it, or clear the filters to see everything.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button variant="outline" size="sm" className="wgi-activity-pill" onClick={onClear}>
          Clear all
        </Button>
      </EmptyContent>
    </Empty>
  );
}

function ActivityDays({
  rows,
  at,
  cursor,
  loadingMore,
  moreFailed,
  sentinel,
  onMore,
}: Readonly<{
  rows: readonly ActivityRow[];
  at: Date;
  cursor: ActivityCursor;
  loadingMore: boolean;
  moreFailed: boolean;
  sentinel: RefObject<HTMLDivElement | null>;
  onMore: () => void;
}>) {
  return (
    <>
      {byDay(rows).map((group) => (
        <section
          key={group.day}
          className="wgi-activity-day"
          aria-labelledby={`activity-day-${group.day}`}
        >
          <h2 id={`activity-day-${group.day}`} className="wgi-activity-band">
            {activityDayBand(group.rows[0]?.occurredAt ?? `${group.day}T12:00:00Z`, at)}
          </h2>
          <ol className="wgi-activity-rows">
            {group.rows.map((row) => (
              <ActivityLogRow key={`${row.source}:${row.id}`} row={row} now={at} />
            ))}
          </ol>
        </section>
      ))}
      {cursor === null ? (
        <p className="wgi-activity-end">That is everything the log holds for this view.</p>
      ) : (
        <div ref={sentinel} className="wgi-activity-more">
          {moreFailed ? (
            <p className="wgi-activity-more-error" data-testid="activity-more-error">
              The next changes could not be loaded.{" "}
              <button type="button" className="wgi-activity-clear" onClick={onMore}>
                Try again
              </button>
            </p>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="wgi-activity-pill"
              disabled={loadingMore}
              data-testid="activity-load-more"
              onClick={onMore}
            >
              {loadingMore ? "Loading…" : "Load more"}
            </Button>
          )}
        </div>
      )}
    </>
  );
}

function ActivityEmpty({
  firstDay,
  appointments,
  hidden,
  filtered,
  onClear,
}: Readonly<{
  firstDay: boolean;
  appointments: boolean;
  hidden: number;
  filtered: boolean;
  onClear: () => void;
}>) {
  if (firstDay) {
    return (
      <Empty className="wgi-activity-empty" data-testid="activity-empty-first">
        <EmptyHeader>
          <EmptyMedia variant="icon" className="wgi-activity-empty-disc" aria-hidden="true">
            <Activity width={22} height={22} />
          </EmptyMedia>
          <EmptyTitle className="wgi-activity-empty-title">
            The log fills in as your team works
          </EmptyTitle>
          <EmptyDescription className="wgi-activity-empty-text">
            Bookings, calls, check-ins, hours and settings changes appear here as they happen,
            newest first, with the person who made each one.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }
  if (appointments) {
    return (
      <Empty className="wgi-activity-empty" data-testid="activity-empty-appointments">
        <EmptyHeader>
          <EmptyMedia variant="icon" className="wgi-activity-empty-disc" aria-hidden="true">
            <Calendar width={22} height={22} />
          </EmptyMedia>
          <EmptyTitle className="wgi-activity-empty-title">No appointment changes yet</EmptyTitle>
          <EmptyDescription className="wgi-activity-empty-text">
            Bookings, check-ins, moves and cancellations appear here as soon as someone makes one.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button variant="outline" size="sm" className="wgi-activity-pill" onClick={onClear}>
            Show everything
          </Button>
        </EmptyContent>
      </Empty>
    );
  }
  return (
    <Empty className="wgi-activity-empty" data-testid="activity-empty-filtered">
      <EmptyHeader>
        <EmptyMedia variant="icon" className="wgi-activity-empty-disc" aria-hidden="true">
          <Search width={22} height={22} />
        </EmptyMedia>
        <EmptyTitle className="wgi-activity-empty-title">
          {filtered ? "Nothing matches" : "Nothing to show"}
        </EmptyTitle>
        <EmptyDescription className="wgi-activity-empty-text">
          {hidden > 0
            ? `${hidden.toLocaleString("en-US")} ${hidden === 1 ? "change is" : "changes are"} hidden by these filters.`
            : "No change fits this search and these filters."}
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button
          variant="outline"
          size="sm"
          className="wgi-activity-pill"
          data-testid="activity-clear-all"
          onClick={onClear}
        >
          Clear all
        </Button>
      </EmptyContent>
    </Empty>
  );
}

function hasFilters(filters: ActivityUrlFilters): boolean {
  return activityHref(filters) !== "/admin/audit";
}

export function ActivityHiddenLine({
  hidden,
  onClear,
}: Readonly<{ hidden: number; onClear: () => void }>) {
  return (
    <p className="wgi-activity-hidden" data-testid="activity-hidden">
      {hidden.toLocaleString("en-US")} hidden by these filters ·{" "}
      <button
        type="button"
        className="wgi-activity-clear"
        data-testid="activity-clear-all"
        onClick={onClear}
      >
        Clear all
      </button>
    </p>
  );
}

/** What the feed holds: a failure, an empty state, or the days. */
export function ActivityFeed({
  failed,
  loading,
  rows,
  at,
  cursor,
  loadingMore,
  moreFailed,
  hidden,
  shown,
  filtered,
  sentinel,
  onRetry,
  onClear,
  onMore,
}: Readonly<{
  failed: ActivityFailureCode | null;
  loading: boolean;
  rows: readonly ActivityRow[];
  at: Date;
  cursor: ActivityCursor;
  loadingMore: boolean;
  moreFailed: boolean;
  hidden: number;
  /** What the list on screen was read with: the empty states speak to it. */
  shown: Readonly<{ filters: ActivityUrlFilters; query: string }>;
  filtered: boolean;
  sentinel: RefObject<HTMLDivElement | null>;
  onRetry: () => void;
  onClear: () => void;
  onMore: () => void;
}>) {
  let body;
  if (failed === "unavailable" || failed === "unauthorized") {
    body = <ActivityUnavailable onRetry={onRetry} />;
  } else if (failed === "invalid_command") {
    body = <ActivityInvalid onClear={onClear} />;
  } else if (rows.length === 0) {
    body = (
      <ActivityEmpty
        firstDay={!hasFilters(shown.filters) && shown.query === "" && hidden === 0}
        appointments={
          activityHref(shown.filters) === "/admin/audit?category=appointments" && shown.query === ""
        }
        hidden={hidden}
        filtered={filtered}
        onClear={onClear}
      />
    );
  } else {
    body = (
      <ActivityDays
        rows={rows}
        at={at}
        cursor={cursor}
        loadingMore={loadingMore}
        moreFailed={moreFailed}
        sentinel={sentinel}
        onMore={onMore}
      />
    );
  }
  return (
    <section
      className="wgi-activity-feed"
      aria-labelledby="audit-heading"
      aria-busy={loading}
      data-loading={loading ? "" : undefined}
      data-testid="activity-feed"
    >
      {body}
    </section>
  );
}
