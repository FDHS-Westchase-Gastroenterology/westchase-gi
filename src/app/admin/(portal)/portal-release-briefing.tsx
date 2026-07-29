"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  createContext,
  startTransition,
  use,
  useEffect,
  useRef,
  useState,
} from "react";
import { ArrowRight, Check, X } from "@/components/icons";
import {
  PORTAL_RELEASE_BRIEFING,
  type PortalReleaseViewState,
} from "@/lib/portal/release-briefing-content";
import {
  acknowledgePortalReleaseAction,
  hidePortalReleaseAction,
  openPortalReleaseAction,
} from "./release-briefing-actions";

type ReleaseActionResult =
  | { ok: true }
  | { ok: false; code: "invalid" | "unavailable" };

type PortalReleaseContextValue = {
  available: boolean;
  sealedVisible: boolean;
  homeOpen: boolean;
  quickOpen: boolean;
  quickMotion: boolean;
  firstOpenMotion: boolean;
  actionPending: boolean;
  actionError: string | null;
  quickButtonRef: React.RefObject<HTMLButtonElement | null>;
  openHome: (animate: boolean) => void;
  closeHome: () => void;
  acknowledge: () => void;
  hide: () => void;
  toggleQuick: (animate: boolean) => void;
  closeQuick: () => void;
};

const PortalReleaseContext = createContext<PortalReleaseContextValue | null>(
  null,
);

function usePortalRelease(): PortalReleaseContextValue {
  const context = use(PortalReleaseContext);
  if (!context) {
    throw new Error(
      "Portal release briefing must be rendered inside its provider.",
    );
  }
  return context;
}

export function PortalReleaseProvider({
  children,
  eligible,
  initialState,
}: {
  children: React.ReactNode;
  eligible: boolean;
  initialState: PortalReleaseViewState;
}) {
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
  const [actionError, setActionError] = useState<string | null>(null);
  const quickButtonRef = useRef<HTMLButtonElement>(null);
  const previousPathname = useRef(pathname);

  useEffect(() => {
    if (previousPathname.current === pathname) return;

    previousPathname.current = pathname;
    const frame = requestAnimationFrame(() => {
      setQuickOpen(false);
      if (pathname !== "/admin") setHomeOpen(false);
    });

    return () => cancelAnimationFrame(frame);
  }, [pathname]);

  useEffect(() => {
    if (!quickOpen && !homeOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setQuickOpen(false);
      setHomeOpen(false);
      requestAnimationFrame(() => quickButtonRef.current?.focus());
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [homeOpen, quickOpen]);

  function runAction(action: () => Promise<ReleaseActionResult>) {
    setActionPending(true);
    setActionError(null);
    startTransition(async () => {
      try {
        const result = await action();
        setActionError(
          result.ok
            ? null
            : "The update is open, but the portal could not save that preference. It may appear as new again later.",
        );
      } catch {
        setActionError(
          "The update is open, but the portal could not save that preference. It may appear as new again later.",
        );
      } finally {
        setActionPending(false);
      }
    });
  }

  function openHome(animate: boolean) {
    setFirstOpenMotion(animate);
    setAvailable(true);
    setHomeOpen(true);
    runAction(() => openPortalReleaseAction(PORTAL_RELEASE_BRIEFING.id));
  }

  function closeHome() {
    setHomeOpen(false);
    requestAnimationFrame(() => quickButtonRef.current?.focus());
  }

  function acknowledge() {
    setActionPending(true);
    setActionError(null);
    startTransition(async () => {
      try {
        const result = await acknowledgePortalReleaseAction(
          PORTAL_RELEASE_BRIEFING.id,
        );
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
  }

  function hide() {
    setActionPending(true);
    setActionError(null);
    startTransition(async () => {
      try {
        const result = await hidePortalReleaseAction(
          PORTAL_RELEASE_BRIEFING.id,
        );
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
  }

  function toggleQuick(animate: boolean) {
    setQuickMotion(animate);
    setQuickOpen((open) => !open);
  }

  const value: PortalReleaseContextValue = {
    available: available && !hidden,
    sealedVisible:
      eligible &&
      initialState.status === "unseen" &&
      !available &&
      !hidden,
    homeOpen,
    quickOpen,
    quickMotion,
    firstOpenMotion,
    actionPending,
    actionError,
    quickButtonRef,
    openHome,
    closeHome,
    acknowledge,
    hide,
    toggleQuick,
    closeQuick: () => setQuickOpen(false),
  };

  return (
    <PortalReleaseContext value={value}>
      {children}
      <span className="sr-only" aria-live="polite">
        {actionError}
      </span>
    </PortalReleaseContext>
  );
}

function ReleaseSeal({
  animate,
  broken,
  compact = false,
}: {
  animate: boolean;
  broken: boolean;
  compact?: boolean;
}) {
  return (
    <span
      aria-hidden="true"
      className="release-seal"
      data-animate={animate}
      data-broken={broken}
      data-compact={compact}
    >
      <span className="release-seal__half release-seal__half--top" />
      <span className="release-seal__half release-seal__half--bottom" />
      <svg className="release-seal__mark" viewBox="0 0 36 36">
        <path d="M8 19h7l4-7 4 12 5-5" />
        <circle cx="8" cy="19" r="1.8" />
        <circle cx="19" cy="12" r="1.8" />
        <circle cx="28" cy="19" r="1.8" />
      </svg>
      <svg className="release-seal__crack" viewBox="0 0 36 36">
        <path d="m19 3-3 9 4 4-5 6 3 11" />
        <path d="m18 16-7 2-4 5" />
        <path d="m16 22-6 3" />
      </svg>
    </span>
  );
}

function ReleaseSummary({
  animate,
  id,
  open,
  onClose,
}: {
  animate: boolean;
  id: string;
  open: boolean;
  onClose: () => void;
}) {
  const { acknowledge, actionError, actionPending, hide } = usePortalRelease();

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
          <p className="text-[0.8rem] font-bold text-[var(--color-amber-deep)]">
            Updated July 29
          </p>
          <h2
            id={`${id}-heading`}
            className="mt-1 text-[1.25rem] font-black leading-snug text-[var(--color-ink)]"
          >
            A smoother way to work requests
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
          ["Start with what happened.", "Choose Contacted, Scheduled, or Closed."],
          [
            "Save it once.",
            "The result, note, and callback date stay together.",
          ],
          [
            "Know what is next.",
            "Due callbacks return. Scheduled requests stay visible.",
          ],
        ].map(([term, detail], index) => (
          <div
            key={term}
            className="release-summary__row grid gap-1 py-3 sm:grid-cols-[10rem_1fr] sm:gap-4"
            style={{ "--release-row": index } as React.CSSProperties}
          >
            <dt className="font-black text-[var(--color-ink)]">{term}</dt>
            <dd className="text-[0.92rem] leading-relaxed text-[var(--color-body)]">
              {detail}
            </dd>
          </div>
        ))}
      </dl>

      <p className="mt-4 text-[0.86rem] leading-relaxed text-[var(--color-muted)]">
        Also improved: language help on the patient site now appears only
        when useful, and the review invitation is simpler.
      </p>

      {actionError ? (
        <p
          role="status"
          className="mt-4 rounded-[var(--radius-sm)] bg-[var(--color-amber-soft)] px-3 py-2 text-[0.86rem] leading-relaxed text-[var(--color-ink)]"
        >
          {actionError}
        </p>
      ) : null}

      <div className="mt-5 flex flex-wrap items-center gap-2.5">
        <Link
          href="/admin/requests"
          className="btn btn-amber btn-sm min-h-11"
        >
          Open requests
          <ArrowRight className="h-4 w-4" />
        </Link>
        <Link
          href={PORTAL_RELEASE_BRIEFING.guideHref}
          className="btn btn-outline btn-sm min-h-11"
        >
          See the 2-minute guide
        </Link>
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
        className="mt-3 min-h-11 text-[0.82rem] font-bold text-[var(--color-muted)] underline underline-offset-2 disabled:cursor-wait disabled:opacity-65"
      >
        Hide this update now
      </button>
    </section>
  );
}

export function PortalReleaseHomeAnnouncement() {
  const {
    closeHome,
    firstOpenMotion,
    homeOpen,
    openHome,
    sealedVisible,
  } = usePortalRelease();
  const pointerActivation = useRef(false);

  if (!sealedVisible && !homeOpen) return null;

  return (
    <aside
      aria-labelledby="portal-release-title"
      data-testid="portal-release-announcement"
      className="portal-release-home relative mt-6"
    >
      <div className="relative z-10 flex flex-col gap-4 rounded-[var(--radius-lg)] bg-[var(--color-mint)] px-5 py-5 shadow-[var(--shadow-soft)] sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <p className="text-[0.8rem] font-bold text-[var(--color-amber-deep)]">
            Updated July 29
          </p>
          <h2
            id="portal-release-title"
            className="mt-1 text-[1.08rem] font-black text-[var(--color-ink)]"
          >
            A smoother way to work requests is here.
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
          onClick={() => openHome(pointerActivation.current)}
          className="release-open-button min-h-12"
        >
          <ReleaseSeal
            animate={firstOpenMotion}
            broken={homeOpen}
          />
          <span>See what changed</span>
        </button>
      </div>
      <ReleaseSummary
        animate={firstOpenMotion}
        id="portal-release-home-summary"
        open={homeOpen}
        onClose={closeHome}
      />
    </aside>
  );
}

export function PortalReleaseUtility() {
  const {
    available,
    closeQuick,
    homeOpen,
    quickMotion,
    quickButtonRef,
    quickOpen,
    toggleQuick,
  } = usePortalRelease();
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
          onPointerDown={() => {
            pointerActivation.current = true;
          }}
          onKeyDown={() => {
            pointerActivation.current = false;
          }}
          onClick={() => toggleQuick(pointerActivation.current)}
          className="release-quick-button"
        >
          <ReleaseSeal animate={false} broken compact />
          <span>
            <strong className="font-black">What’s new</strong>
            <span className="ml-2 hidden text-[0.8rem] text-[var(--color-muted)] sm:inline">
              Opened recently
            </span>
          </span>
          <Check className="h-4 w-4 text-[var(--color-teal-ink)]" />
        </button>
        <ReleaseSummary
          animate={quickMotion}
          id="portal-release-quick-summary"
          open={quickOpen}
          onClose={closeQuick}
        />
      </div>
    </aside>
  );
}
