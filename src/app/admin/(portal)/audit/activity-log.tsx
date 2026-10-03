"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import type { ReactNode } from "react";

import { activityHref } from "@/lib/portal/activity-contracts";
import type {
  ActivityCategory,
  ActivityCursor,
  ActivityFailureCode,
  ActivityPage,
  ActivityRow,
  ActivityUrlFilters,
} from "@/lib/portal/activity-contracts";
import type { StaffRole } from "@/lib/portal/contracts";

import { readActivityPage } from "./activity-actions";
import {
  ActivityFeed,
  ActivityFilterBar,
  ActivityHeader,
  ActivityHiddenLine,
} from "./activity-log-parts";
import type { ActivityProvider } from "./activity-log-parts";

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

export type { ActivityProvider } from "./activity-log-parts";

/** The chips' order, as the frame draws it. */
const CHIP_ORDER = [
  "appointments",
  "requests",
  "schedule",
  "settings",
  "sign_ins",
] as const satisfies readonly ActivityCategory[];

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

/** The list's reads: the filters and search it was asked for, the rows it holds, and how to read on. */
function useActivityReader(initialFilters: ActivityUrlFilters, initialPage: ActivityPage) {
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

  function retry() {
    void reload(filters, query);
  }

  useEffect(
    () => () => {
      if (settle.current !== null) clearTimeout(settle.current);
    },
    [],
  );

  return {
    filters,
    query,
    rows,
    cursor,
    hidden,
    status,
    shown,
    readMore,
    applyFilters,
    clearAll,
    search,
    retry,
  };
}

/** The screen reader's line: what the list holds now. */
function statusLine(loading: boolean, failed: ActivityFailureCode | null, count: number): string {
  if (loading) return "Loading changes";
  if (failed !== null) return "";
  return `${String(count)} ${count === 1 ? "change" : "changes"} shown`;
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
  const log = useActivityReader(initialFilters, initialPage);
  const { filters, query, rows, cursor, hidden, status } = log;
  const sentinel = useRef<HTMLDivElement>(null);
  const at = new Date(now);
  const categories = role === "admin" ? CHIP_ORDER : CHIP_ORDER.filter((c) => c !== "settings");

  /* The end of the list in view reads the next page, once per cursor. When
     something follows the list (an administrator's Technical record), the
     list grows only on Load more, so scrolling down can still reach it. */
  const autoLoad = children === undefined || children === null;
  const onSentinel = useEffectEvent(() => {
    if (status.kind === "idle") void log.readMore();
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

  const loading = status.kind === "loading";
  const failed = status.kind === "failed" && !status.more ? status.code : null;

  return (
    <div className="wgi-activity" data-testid="activity-log">
      <ActivityHeader query={query} onSearch={log.search} />
      <ActivityFilterBar
        filters={filters}
        categories={categories}
        providers={providers}
        today={today}
        onApply={log.applyFilters}
      />
      {hidden > 0 && failed === null && rows.length > 0 ? (
        <ActivityHiddenLine hidden={hidden} onClear={log.clearAll} />
      ) : null}
      <p role="status" className="sr-only">
        {statusLine(loading, failed, rows.length)}
      </p>
      <ActivityFeed
        failed={failed}
        loading={loading}
        rows={rows}
        at={at}
        cursor={cursor}
        loadingMore={status.kind === "more"}
        moreFailed={status.kind === "failed" && status.more}
        hidden={hidden}
        shown={log.shown}
        filtered={hasFilters(filters) || query.trim() !== ""}
        sentinel={sentinel}
        onRetry={log.retry}
        onClear={log.clearAll}
        onMore={() => {
          void log.readMore();
        }}
      />
      {children}
    </div>
  );
}
