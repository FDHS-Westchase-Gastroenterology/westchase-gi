"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  startTransition,
  use,
  useCallback,
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
} from "react";

import { ArrowRight, ChevronDown, X } from "@/components/icons";
import { PORTAL_RELEASE_BRIEFING } from "@/lib/portal/release-briefing-content";
import type { PortalReleaseViewState } from "@/lib/portal/release-briefing-content";

import {
  acknowledgePortalReleaseAction,
  hidePortalReleaseAction,
  openPortalReleaseAction,
  recordPortalReleaseDismissAction,
  recordPortalReleaseGuideOpenAction,
} from "./release-briefing-actions";

type ReleaseActionResult = { ok: true } | { ok: false; code: "invalid" | "unavailable" };

interface PortalNavigator {
  push: (href: string) => void;
}

interface PortalReleaseContextValue {
  available: boolean;
  announcementVisible: boolean;
  homeOpen: boolean;
  quickOpen: boolean;
  quickMotion: boolean;
  firstOpenMotion: boolean;
  actionPending: boolean;
  guidePending: boolean;
  actionError: string | null;
  quickButtonRef: React.RefObject<HTMLButtonElement | null>;
  openHome: (animate: boolean) => void;
  dismissHome: () => void;
  acknowledge: () => void;
  hide: () => void;
  toggleQuick: (animate: boolean) => void;
  dismissQuick: () => void;
  openGuide: (navigator: Readonly<PortalNavigator>) => void;
}

const PortalReleaseContext = createContext<PortalReleaseContextValue | null>(null);

function usePortalRelease(): PortalReleaseContextValue {
  const context = use(PortalReleaseContext);
  if (!context) {
    throw new Error("Portal release briefing must be rendered inside its provider.");
  }
  return context;
}

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React props carry framework member types that cannot be made readonly
export function PortalReleaseProvider({
  children,
  eligible,
  initialState,
}: Readonly<{
  children: React.ReactNode;
  eligible: boolean;
  initialState: PortalReleaseViewState;
}>) {
  const pathname = usePathname();
  const initiallyAvailable = initialState.status === "available";
  const [available, setAvailable] = useState(initiallyAvailable);
  const [homeOpen, setHomeOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [quickMotion, setQuickMotion] = useState(true);
  const [firstOpenMotion, setFirstOpenMotion] = useState(true);
  const [hidden, setHidden] = useState(
    initialState.status === "hidden" ||
      initialState.status === "expired" ||
      initialState.status === "unavailable" ||
      !eligible,
  );
  const [actionPending, setActionPending] = useState(false);
  const [guidePending, setGuidePending] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const quickButtonRef = useRef<HTMLButtonElement>(null);
  const previousPathname = useRef(pathname);

  useEffect(() => {
    if (previousPathname.current === pathname) return undefined;

    previousPathname.current = pathname;
    const frame = requestAnimationFrame(() => {
      setQuickOpen(false);
      if (pathname !== "/admin") setHomeOpen(false);
    });

    return () => {
      cancelAnimationFrame(frame);
    };
  }, [pathname]);

  const runAction = useCallback(
    (
      action: () => Promise<ReleaseActionResult>,
      failureMessage = "The update is open, but the portal could not save that preference. It may appear as new again later.",
    ) => {
      setActionError(null);
      startTransition(async () => {
        try {
          const result = await action();
          setActionError(result.ok ? null : failureMessage);
        } catch {
          setActionError(failureMessage);
        }
      });
    },
    [],
  );

  const openHome = useCallback(
    (animate: boolean) => {
      setFirstOpenMotion(animate);
      setAvailable(true);
      setHomeOpen(true);
      runAction(async () => openPortalReleaseAction(PORTAL_RELEASE_BRIEFING.id));
    },
    [runAction],
  );

  const recordDismiss = useCallback(() => {
    runAction(
      async () => recordPortalReleaseDismissAction(PORTAL_RELEASE_BRIEFING.id),
      "The summary closed, but the portal could not record that dismissal.",
    );
  }, [runAction]);

  const dismissHome = useCallback(() => {
    setHomeOpen(false);
    recordDismiss();
    requestAnimationFrame(() => quickButtonRef.current?.focus());
  }, [recordDismiss]);

  const acknowledge = useCallback(() => {
    setActionPending(true);
    setActionError(null);
    startTransition(async () => {
      try {
        const result = await acknowledgePortalReleaseAction(PORTAL_RELEASE_BRIEFING.id);
        const message = result.ok
          ? null
          : "The portal could not save that preference. The update will stay available so nothing is lost.";
        setActionError(message);
        if (!message) {
          setHomeOpen(false);
          setQuickOpen(false);
          requestAnimationFrame(() => quickButtonRef.current?.focus());
        }
      } catch {
        setActionError(
          "The portal could not save that preference. The update will stay available so nothing is lost.",
        );
      } finally {
        setActionPending(false);
      }
    });
  }, []);

  const hide = useCallback(() => {
    setActionPending(true);
    setActionError(null);
    startTransition(async () => {
      try {
        const result = await hidePortalReleaseAction(PORTAL_RELEASE_BRIEFING.id);
        const message = result.ok
          ? null
          : "The portal could not hide the update. It will remain available so the preference is not misrepresented.";
        setActionError(message);
        if (!message) {
          setHidden(true);
          setHomeOpen(false);
          setQuickOpen(false);
        }
      } catch {
        setActionError(
          "The portal could not hide the update. It will remain available so the preference is not misrepresented.",
        );
      } finally {
        setActionPending(false);
      }
    });
  }, []);

  const toggleQuick = useCallback(
    (animate: boolean) => {
      setQuickMotion(animate);
      if (quickOpen) {
        setQuickOpen(false);
        recordDismiss();
        return;
      }
      setQuickOpen(true);
      runAction(async () => openPortalReleaseAction(PORTAL_RELEASE_BRIEFING.id));
    },
    [quickOpen, recordDismiss, runAction],
  );

  const dismissQuick = useCallback(() => {
    setQuickOpen(false);
    recordDismiss();
    requestAnimationFrame(() => quickButtonRef.current?.focus());
  }, [recordDismiss]);

  const openGuide = useCallback((navigator: Readonly<PortalNavigator>) => {
    setGuidePending(true);
    setActionError(null);
    startTransition(async () => {
      try {
        const result = await recordPortalReleaseGuideOpenAction(PORTAL_RELEASE_BRIEFING.id);
        setActionError(
          result.ok
            ? null
            : "The guide is opening, but the portal could not record that selection.",
        );
      } catch {
        setActionError("The guide is opening, but the portal could not record that selection.");
      } finally {
        setGuidePending(false);
        navigator.push(PORTAL_RELEASE_BRIEFING.guideHref);
      }
    });
  }, []);

  const handleEscape = useEffectEvent(() => {
    setQuickOpen(false);
    setHomeOpen(false);
    recordDismiss();
    requestAnimationFrame(() => quickButtonRef.current?.focus());
  });

  useEffect(() => {
    if (!quickOpen && !homeOpen) return undefined;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      handleEscape();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [homeOpen, quickOpen]);

  const value = useMemo<PortalReleaseContextValue>(
    () => ({
      available: available && !hidden,
      announcementVisible: eligible && initialState.status === "unseen" && !available && !hidden,
      homeOpen,
      quickOpen,
      quickMotion,
      firstOpenMotion,
      actionPending,
      guidePending,
      actionError,
      quickButtonRef,
      openHome,
      dismissHome,
      acknowledge,
      hide,
      toggleQuick,
      dismissQuick,
      openGuide,
    }),
    [
      acknowledge,
      actionError,
      actionPending,
      available,
      dismissHome,
      dismissQuick,
      eligible,
      firstOpenMotion,
      guidePending,
      hidden,
      hide,
      homeOpen,
      initialState.status,
      openGuide,
      openHome,
      quickMotion,
      quickOpen,
      toggleQuick,
    ],
  );

  return (
    <PortalReleaseContext value={value}>
      {children}
      <span className="sr-only" aria-live="polite">
        {actionError}
      </span>
    </PortalReleaseContext>
  );
}

function ReleaseSignal({
  animate,
  resolved,
  compact = false,
}: Readonly<{
  animate: boolean;
  resolved: boolean;
  compact?: boolean;
}>) {
  return (
    <span
      aria-hidden="true"
      className="release-signal"
      data-animate={animate}
      data-resolved={resolved}
      data-compact={compact}
    >
      <span className="release-signal__list">
        <span className="release-signal__row">
          <span className="release-signal__dot" />
          <span className="release-signal__line release-signal__line--long" />
        </span>
        <span className="release-signal__row">
          <span className="release-signal__dot" />
          <span className="release-signal__line release-signal__line--medium" />
        </span>
        <span className="release-signal__row">
          <span className="release-signal__dot" />
          <span className="release-signal__line release-signal__line--short" />
        </span>
      </span>
      <svg className="release-signal__check" viewBox="0 0 24 24">
        <path d="m6.5 12.5 3.3 3.3 7.7-8" />
      </svg>
    </span>
  );
}

function ReleaseSummary({
  animate,
  id,
  open,
  onClose,
}: Readonly<{
  animate: boolean;
  id: string;
  open: boolean;
  onClose: () => void;
}>) {
  const router = useRouter();
  const { acknowledge, actionError, actionPending, guidePending, hide, openGuide } =
    usePortalRelease();

  return (
    <section
      id={id}
      aria-hidden={!open}
      aria-labelledby={`${id}-heading`}
      className="release-summary"
      data-animate={animate}
      data-open={open}
      inert={!open}
    >
      <div className="flex items-start justify-between gap-5">
        <div>
          <p className="text-[0.8rem] font-bold text-[var(--portal-attention-ink)]">
            Updated August 6
          </p>
          <h2
            id={`${id}-heading`}
            className="mt-1 text-[1.25rem] leading-snug font-black text-[var(--color-ink)]"
          >
            Record what happened — the portal does the rest
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close what’s new"
          className="release-icon-button"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <dl className="mt-5 divide-y divide-[var(--color-line)] border-y border-[var(--color-line)]">
        {[
          [
            "Say what happened.",
            "Pick the call's real outcome — the portal sets the status itself.",
          ],
          [
            "Save once, undo for 15 minutes.",
            "Outcome, call-again timing, and note save together. Undo restores everything.",
          ],
          [
            "Work from the top.",
            "New requests and due call-agains rise. Scheduled requests stay visible.",
          ],
        ].map(([term, detail], index) => {
          const releaseRowStyle: React.CSSProperties = {};
          Object.assign(releaseRowStyle, { "--release-row": String(index) });
          return (
            <div
              key={term}
              className="release-summary__row grid gap-1 py-3 sm:grid-cols-[10rem_1fr] sm:gap-4"
              style={releaseRowStyle}
            >
              <dt className="font-black text-[var(--color-ink)]">{term}</dt>
              <dd className="text-[0.92rem] leading-relaxed text-[var(--color-body)]">{detail}</dd>
            </div>
          );
        })}
      </dl>

      <p className="mt-4 text-[0.86rem] leading-relaxed text-[var(--color-muted-ink)]">
        Also improved: language help on the patient site now appears only when useful, and the
        review invitation is simpler.
      </p>

      {actionError !== null && actionError !== "" ? (
        <p
          role="status"
          className="mt-4 rounded-[var(--radius-sm)] bg-[var(--color-amber-soft)] px-3 py-2 text-[0.86rem] leading-relaxed text-[var(--color-ink)]"
        >
          {actionError}
        </p>
      ) : null}

      <div className="mt-5 flex flex-wrap items-center gap-2.5">
        <Link href="/admin/requests" className="btn btn-amber btn-sm min-h-11">
          Open requests
          <ArrowRight className="h-4 w-4" />
        </Link>
        <button
          type="button"
          onClick={() => {
            openGuide(router);
          }}
          disabled={guidePending}
          className="btn btn-outline btn-sm min-h-11"
        >
          {guidePending ? "Opening guide…" : "See the 2-minute guide"}
        </button>
        <button
          type="button"
          onClick={acknowledge}
          disabled={actionPending}
          className="min-h-11 rounded-[var(--radius-sm)] px-3 text-[0.9rem] font-bold text-[var(--color-teal-ink)] underline-offset-2 hover:underline disabled:cursor-wait disabled:opacity-65"
        >
          {actionPending ? "Saving…" : "Got it"}
        </button>
      </div>

      <button
        type="button"
        onClick={hide}
        disabled={actionPending}
        className="mt-3 min-h-11 text-[0.82rem] font-bold text-[var(--color-muted-ink)] underline underline-offset-2 disabled:cursor-wait disabled:opacity-65"
      >
        Hide this update now
      </button>
    </section>
  );
}

export function PortalReleaseHomeAnnouncement() {
  const { dismissHome, firstOpenMotion, homeOpen, openHome, announcementVisible } =
    usePortalRelease();
  const pointerActivation = useRef(false);

  if (!announcementVisible && !homeOpen) return null;

  return (
    <aside
      aria-labelledby="portal-release-title"
      data-testid="portal-release-announcement"
      className="portal-release-home relative mt-6"
    >
      <div className="relative z-10 flex flex-col gap-4 rounded-[var(--radius-lg)] border border-[var(--color-line-2)] bg-[var(--color-mint)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <p className="text-[0.8rem] font-bold text-[var(--portal-attention-ink)]">
            Updated August 6
          </p>
          <h2
            id="portal-release-title"
            className="mt-1 text-[1.08rem] font-black text-[var(--color-ink)]"
          >
            Recording calls now starts with one question: what happened?
          </h2>
        </div>
        <button
          type="button"
          aria-controls="portal-release-home-summary"
          aria-expanded={homeOpen}
          onPointerDown={() => {
            pointerActivation.current = true;
          }}
          onKeyDown={() => {
            pointerActivation.current = false;
          }}
          onClick={() => {
            openHome(pointerActivation.current);
          }}
          className="release-open-button min-h-12"
        >
          <ReleaseSignal animate={firstOpenMotion} resolved={homeOpen} />
          <span>See what changed</span>
        </button>
      </div>
      <ReleaseSummary
        animate={firstOpenMotion}
        id="portal-release-home-summary"
        open={homeOpen}
        onClose={dismissHome}
      />
    </aside>
  );
}

export function PortalReleaseUtility() {
  const { available, dismissQuick, homeOpen, quickMotion, quickButtonRef, quickOpen, toggleQuick } =
    usePortalRelease();
  const pointerActivation = useRef(false);
  const pathname = usePathname();

  if (!available || (pathname === "/admin" && homeOpen)) return null;

  return (
    <aside
      aria-label="What’s new quick reference"
      data-testid="portal-release-utility"
      className="portal-release-utility"
    >
      <div className="container-x relative flex min-h-12 items-center justify-end">
        <button
          ref={quickButtonRef}
          type="button"
          aria-controls="portal-release-quick-summary"
          aria-expanded={quickOpen}
          data-animate={quickMotion}
          data-open={quickOpen}
          onPointerDown={() => {
            pointerActivation.current = true;
          }}
          onKeyDown={() => {
            pointerActivation.current = false;
          }}
          onClick={() => {
            toggleQuick(pointerActivation.current);
          }}
          className="release-quick-button"
        >
          <ReleaseSignal animate={false} resolved compact />
          <span>
            <strong className="font-black">What’s new</strong>
            <span className="ml-2 hidden text-[0.8rem] text-[var(--color-muted-ink)] sm:inline">
              Opened recently
            </span>
          </span>
          <ChevronDown className="release-quick-chevron h-4 w-4 text-[var(--color-teal-ink)]" />
        </button>
        <ReleaseSummary
          animate={quickMotion}
          id="portal-release-quick-summary"
          open={quickOpen}
          onClose={dismissQuick}
        />
      </div>
    </aside>
  );
}
