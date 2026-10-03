"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import type { ReactNode } from "react";

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
  APPOINTMENT_ACTION_LABELS,
  APPOINTMENT_ACTIONS,
  activityHref,
} from "@/lib/portal/activity-contracts";
import type {
  ActivityCategory,
  ActivityCursor,
  ActivityFailureCode,
  ActivityPage,
  ActivityRow,
  ActivityUrlFilters,
  AppointmentAction,
} from "@/lib/portal/activity-contracts";
import type { StaffRole } from "@/lib/portal/contracts";

import { readActivityPage } from "./activity-actions";
import { ActivityDateRange } from "./activity-date-range";
import { ActivityLogRow } from "./activity-log-row";
import { activityDay, activityDayBand } from "./activity-model";

import "./activity-log.css";

/* The Activity log (issue #357; Figma section 14, U1): every change the
   team made, newest first, one sentence a row, under the Schedule's kind of
   header. The chips, the provider and the dates live in the address, so a
   filtered log can be shared and survives a reload; the search lives only
   here, in this component's state, and goes to the server in a POST body,
   never in an address, a log line or storage. Each change of filter or
   search starts the list over from the newest row; scrolling to the end
   reads the next page (HIG Loading: the rows already shown stay, dimmed,
   until the new ones arrive). The server decides what a viewer may see;
   these chips only mirror it. */

export interface ActivityProvider {
  readonly id: string;
  readonly name: string;
  readonly initials: string;
}

/** The chips' order, as the frame draws it. */
const CHIP_ORDER = [
  "appointments",
  "requests",
  "schedule",
  "settings",
  "sign_ins",
] as const satisfies readonly ActivityCategory[];

const EVERYTHING = "everything";
const ANY_PROVIDER = "";
const SEARCH_SETTLE_MS = 250;

type Status =
  | { readonly kind: "idle" }
  | { readonly kind: "loading" }
  | { readonly kind: "more" }
  | { readonly kind: "failed"; readonly code: ActivityFailureCode; readonly more: boolean };

const UNAVAILABLE = { ok: false, code: "unavailable" } as const satisfies ActivityPage;

function hasFilters(filters: ActivityUrlFilters): boolean {
  return activityHref(filters) !== "/admin/audit";
}

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

/** The address bar follows the filters without a navigation; the Technical record's page stays. */
function writeAddress(filters: ActivityUrlFilters) {
  const current = new URL(window.location.href);
  const next = new URL(activityHref(filters), current.origin);
  const page = current.searchParams.get("page");
  if (page !== null) next.searchParams.set("page", page);
  const search = next.searchParams.toString().replaceAll("%2C", ",");
  window.history.replaceState(
    window.history.state,
    "",
    `${next.pathname}${search === "" ? "" : `?${search}`}${current.hash}`,
  );
}

export function ActivityLog({
  initialFilters,
  initialPage,
  role,
  now,
  today,
  providers,
  children,
}: Readonly<{
  initialFilters: ActivityUrlFilters;
  initialPage: ActivityPage;
  role: StaffRole;
  now: string;
  today: string;
  providers: readonly ActivityProvider[];
  /** What follows the list on the page: an administrator's Technical record. */
  children?: ReactNode;
}>) {
  const [filters, setFilters] = useState<ActivityUrlFilters>(initialFilters);
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<readonly ActivityRow[]>(initialPage.ok ? initialPage.rows : []);
  const [cursor, setCursor] = useState<ActivityCursor>(
    initialPage.ok ? initialPage.nextCursor : null,
  );
  const [hidden, setHidden] = useState(initialPage.ok ? (initialPage.counts?.hidden ?? 0) : 0);
  const [status, setStatus] = useState<Status>(
    initialPage.ok ? { kind: "idle" } : { kind: "failed", code: initialPage.code, more: false },
  );
  // What the list on screen was read with: the empty states speak to it.
  const [shown, setShown] = useState({ filters: initialFilters, query: "" });

  const sequence = useRef(0);
  const settle = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sentinel = useRef<HTMLDivElement>(null);
  const at = new Date(now);
  const categories = role === "admin" ? CHIP_ORDER : CHIP_ORDER.filter((c) => c !== "settings");

  /** Read the first page for these filters and search; a later read wins over an earlier one. */
  async function reload(nextFilters: ActivityUrlFilters, nextQuery: string) {
    sequence.current += 1;
    const mine = sequence.current;
    setStatus({ kind: "loading" });
    const words = nextQuery.trim();
    const page = await readActivityPage(
      { ...nextFilters, query: words === "" ? undefined : words },
      null,
    ).catch(() => UNAVAILABLE);
    if (mine !== sequence.current) return;
    setShown({ filters: nextFilters, query: words });
    if (!page.ok) {
      setRows([]);
      setCursor(null);
      setHidden(0);
      setStatus({ kind: "failed", code: page.code, more: false });
      return;
    }
    setRows(page.rows);
    setCursor(page.nextCursor);
    setHidden(page.counts?.hidden ?? 0);
    setStatus({ kind: "idle" });
  }

  async function readMore() {
    if (cursor === null) return;
    sequence.current += 1;
    const mine = sequence.current;
    setStatus({ kind: "more" });
    const words = query.trim();
    const page = await readActivityPage(
      { ...filters, query: words === "" ? undefined : words },
      cursor,
    ).catch(() => UNAVAILABLE);
    if (mine !== sequence.current) return;
    if (!page.ok) {
      setStatus({ kind: "failed", code: page.code, more: true });
      return;
    }
    setRows((current) => [...current, ...page.rows]);
    setCursor(page.nextCursor);
    setStatus({ kind: "idle" });
  }

  function applyFilters(next: ActivityUrlFilters) {
    setFilters(next);
    writeAddress(next);
    void reload(next, query);
  }

  function clearAll() {
    if (settle.current !== null) clearTimeout(settle.current);
    setQuery("");
    setFilters({});
    writeAddress({});
    void reload({}, "");
  }

  function search(text: string) {
    setQuery(text);
    if (settle.current !== null) clearTimeout(settle.current);
    settle.current = setTimeout(() => {
      void reload(filters, text);
    }, SEARCH_SETTLE_MS);
  }

  useEffect(
    () => () => {
      if (settle.current !== null) clearTimeout(settle.current);
    },
    [],
  );

  /* The end of the list in view reads the next page, once per cursor. When
     something follows the list (an administrator's Technical record), the
     list grows only on Load more, so scrolling down can still reach it. */
  const autoLoad = children === undefined || children === null;
  const onSentinel = useEffectEvent(() => {
    if (status.kind === "idle") void readMore();
  });
  useEffect(() => {
    const node = sentinel.current;
    if (!autoLoad || node === null || cursor === null) return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) onSentinel();
      },
      { rootMargin: "320px 0px" },
    );
    observer.observe(node);
    return () => {
      observer.disconnect();
    };
  }, [autoLoad, cursor]);

  const category = filters.categories?.length === 1 ? filters.categories[0] : undefined;
  const appointmentsOnly = category === "appointments";
  const provider = providers.find((candidate) => candidate.id === filters.providerId);
  const filtered = hasFilters(filters) || query.trim() !== "";
  const loading = status.kind === "loading";
  const failed = status.kind === "failed" && !status.more ? status.code : null;

  return (
    <div className="wgi-activity" data-testid="activity-log">
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
              search(event.target.value);
            }}
            onKeyDown={(event) => {
              if (event.key === "Escape" && query !== "") {
                event.preventDefault();
                search("");
              }
            }}
          />
        </label>
      </header>

      <div className="wgi-activity-bar">
        <ToggleGroup
          className="wgi-activity-chips"
          aria-label="What changed"
          data-testid="activity-categories"
          value={filters.categories === undefined ? [EVERYTHING] : [...filters.categories]}
          onValueChange={(value: readonly string[]) => {
            const picked = categories.find((candidate) => candidate === value.at(-1));
            applyFilters({
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
          <Menu>
            <MenuTrigger className="wgi-activity-pick" data-testid="activity-provider-trigger">
              {provider === undefined ? null : (
                <Avatar size="sm" aria-hidden="true">
                  <AvatarFallback>{provider.initials}</AvatarFallback>
                </Avatar>
              )}
              <span>
                {filters.providerId === undefined
                  ? "Any provider"
                  : (provider?.name ?? "Selected provider")}
              </span>
              <ChevronDown width={14} height={14} aria-hidden="true" />
            </MenuTrigger>
            <MenuContent align="end" className="wgi-activity-popover wgi-activity-menu">
              <MenuRadioGroup
                value={filters.providerId ?? ANY_PROVIDER}
                onValueChange={(value: string) => {
                  applyFilters({
                    ...filters,
                    providerId: value === ANY_PROVIDER ? undefined : value,
                  });
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
          <ActivityDateRange
            from={filters.from}
            to={filters.to}
            today={today}
            onChange={(range) => {
              applyFilters({ ...filters, from: range.from, to: range.to });
            }}
          />
        </div>
      </div>

      {appointmentsOnly ? (
        <ToggleGroup
          multiple
          className="wgi-activity-chips wgi-activity-actions"
          aria-label="Appointment changes"
          data-testid="activity-actions"
          value={[...(filters.appointmentActions ?? [])]}
          onValueChange={(value: readonly string[]) => {
            const actions = APPOINTMENT_ACTIONS.filter((action) => value.includes(action));
            applyFilters({
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

      {hidden > 0 && failed === null && rows.length > 0 ? (
        <p className="wgi-activity-hidden" data-testid="activity-hidden">
          {hidden.toLocaleString("en-US")} hidden by these filters ·{" "}
          <button
            type="button"
            className="wgi-activity-clear"
            data-testid="activity-clear-all"
            onClick={clearAll}
          >
            Clear all
          </button>
        </p>
      ) : null}

      <p role="status" className="sr-only">
        {loading
          ? "Loading changes"
          : failed === null
            ? `${String(rows.length)} ${rows.length === 1 ? "change" : "changes"} shown`
            : ""}
      </p>

      <section
        className="wgi-activity-feed"
        aria-labelledby="audit-heading"
        aria-busy={loading}
        data-loading={loading ? "" : undefined}
        data-testid="activity-feed"
      >
        {failed === "unavailable" || failed === "unauthorized" ? (
          <Empty className="wgi-activity-empty" data-testid="activity-error">
            <EmptyHeader>
              <EmptyMedia variant="icon" className="wgi-activity-empty-disc" aria-hidden="true">
                <Activity width={22} height={22} />
              </EmptyMedia>
              <EmptyTitle className="wgi-activity-empty-title">
                The log could not be loaded
              </EmptyTitle>
              <EmptyDescription className="wgi-activity-empty-text">
                Nothing was changed. Check the connection, then try again.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button
                variant="outline"
                size="sm"
                className="wgi-activity-pill"
                onClick={() => {
                  void reload(filters, query);
                }}
              >
                Try again
              </Button>
            </EmptyContent>
          </Empty>
        ) : failed === "invalid_command" ? (
          <Empty className="wgi-activity-empty" data-testid="activity-invalid">
            <EmptyHeader>
              <EmptyMedia variant="icon" className="wgi-activity-empty-disc" aria-hidden="true">
                <Search width={22} height={22} />
              </EmptyMedia>
              <EmptyTitle className="wgi-activity-empty-title">
                That search or filter could not be applied
              </EmptyTitle>
              <EmptyDescription className="wgi-activity-empty-text">
                A search can hold up to eight words. Shorten it, or clear the filters to see
                everything.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button variant="outline" size="sm" className="wgi-activity-pill" onClick={clearAll}>
                Clear all
              </Button>
            </EmptyContent>
          </Empty>
        ) : rows.length === 0 ? (
          <ActivityEmpty
            firstDay={!hasFilters(shown.filters) && shown.query === "" && hidden === 0}
            appointments={
              activityHref(shown.filters) === "/admin/audit?category=appointments" &&
              shown.query === ""
            }
            hidden={hidden}
            filtered={filtered}
            onClear={clearAll}
          />
        ) : (
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
                {status.kind === "failed" && status.more ? (
                  <p className="wgi-activity-more-error" data-testid="activity-more-error">
                    The next changes could not be loaded.{" "}
                    <button
                      type="button"
                      className="wgi-activity-clear"
                      onClick={() => {
                        void readMore();
                      }}
                    >
                      Try again
                    </button>
                  </p>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="wgi-activity-pill"
                    disabled={status.kind === "more"}
                    data-testid="activity-load-more"
                    onClick={() => {
                      void readMore();
                    }}
                  >
                    {status.kind === "more" ? "Loading…" : "Load more"}
                  </Button>
                )}
              </div>
            )}
          </>
        )}
      </section>
      {children}
    </div>
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
