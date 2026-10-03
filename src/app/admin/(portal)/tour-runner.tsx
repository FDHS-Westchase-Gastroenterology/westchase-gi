"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  createContext,
  Suspense,
  use,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type { ComponentType, ReactNode } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";

import { Calendar, Check, ClipboardCheck, Clock, Home, Mail, Users, X } from "@/components/icons";
import type { IconProps } from "@/components/icons/base";
import { Button } from "@/components/ui/button";
import { Popover, PopoverArrow, PopoverContent, PopoverTitle } from "@/components/ui/popover";
import type { PopoverChangeDetails } from "@/components/ui/popover-behavior";
import type { StaffTour } from "@/lib/portal/contracts";
import { TOUR_LABELS, TOUR_STEPS, tourStepMatches } from "@/lib/portal/tours";
import type { TourIcon, TourStep } from "@/lib/portal/tours";

import { endTourAction } from "./tour-actions";

import "./tour.css";

/*
 * The first-sign-in tours (issue #358, Figma section 15). The session names
 * the tour to run (auth.ts pendingTour); this runner walks its steps
 * (tours.ts) across the screens they name. Each step rings its control and
 * sets a tip beside it: a ui/popover anchored to the ring, so it grows
 * from what it explains on the popover's own temperament, flips and
 * shifts to stay on screen, and follows the control through scroll and
 * resize. A step whose control is missing points at the screen's empty
 * state, or failing that its heading, and the tour keeps going.
 *
 * The tip takes focus. Return chooses Next (or Done), Esc skips, and when
 * the tour ends focus goes back to where it was when the tour began, or to
 * the page. Skipping or finishing is recorded (tour-actions.ts), so the
 * tour does not start again by itself; Help starts it again.
 *
 * The step is kept per run in sessionStorage, keyed by the tour and when
 * it was started, so Next survives the navigation between screens and a
 * restart from Help begins at the first step.
 */

const FALLBACK_MS = 1500;
const RING_GAP = 4;

/* ---------- The run's step, kept beside the page ---------- */

const ENDED = "ended";
const runs = new Map<string, string>();
const listeners = new Set<() => void>();

function readRun(key: string): string | null {
  const held = runs.get(key);
  if (held !== undefined) return held;
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeRun(key: string, value: string) {
  runs.set(key, value);
  try {
    window.sessionStorage.setItem(key, value);
  } catch {
    /* Storage refused (a private window): the run lives in memory for this page. */
  }
  for (const listener of listeners) listener();
}

function subscribeRuns(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function subscribeNothing() {
  return () => undefined;
}

/* ---------- Context: which step is showing, for the screens that act on it ---------- */

interface TourState {
  readonly tour: StaffTour;
  readonly runKey: string;
  readonly index: number;
  /** False before the run has a stored step: the first screen may still be on its way. */
  readonly begun: boolean;
  readonly ended: boolean;
}

const TourContext = createContext<TourState | null>(null);

function stepsOf(tour: StaffTour): readonly TourStep[] {
  return TOUR_STEPS[tour];
}

/** The id of the tour step showing on this screen, if a tour is running here. */
export function useTourStep(): string | null {
  const state = use(TourContext);
  const pathname = usePathname();
  if (state === null || state.ended) return null;
  const step = stepsOf(state.tour)[state.index];
  return step.pathname === pathname ? step.id : null;
}

export function TourProvider({
  tour,
  startedAt,
  children,
}: Readonly<{
  /** The tour the session says to run (auth.ts pendingTour), or none. */
  tour: StaffTour | null;
  /** When the running tour was started from Help; null for a first sign-in. */
  startedAt: string | null;
  children: ReactNode;
}>) {
  const runKey = tour === null ? null : `wgi-tour:${tour}:${startedAt ?? "first"}`;
  const hydrated = useSyncExternalStore(
    subscribeNothing,
    () => true,
    () => false,
  );
  const stored = useSyncExternalStore(
    subscribeRuns,
    () => (runKey === null ? null : readRun(runKey)),
    () => null,
  );

  const state = useMemo<TourState | null>(() => {
    if (tour === null || runKey === null || !hydrated) return null;
    const last = stepsOf(tour).length - 1;
    const parsed = stored === null || stored === ENDED ? 0 : Number.parseInt(stored, 10);
    return {
      tour,
      runKey,
      index: Number.isInteger(parsed) ? Math.min(Math.max(parsed, 0), last) : 0,
      begun: stored !== null,
      ended: stored === ENDED,
    };
  }, [tour, runKey, hydrated, stored]);

  return (
    <TourContext value={state}>
      {children}
      {state === null ? null : (
        <Suspense fallback={null}>
          <TourTip state={state} />
        </Suspense>
      )}
    </TourContext>
  );
}

/* ---------- Targets: the controls a step rings ---------- */

interface Box {
  readonly top: number;
  readonly left: number;
  readonly width: number;
  readonly height: number;
}

interface Measure {
  readonly step: string;
  readonly box: Box;
  /** The controls ringed, or the heading the tip falls back to. */
  readonly elements: readonly Element[];
  /** False when the step's controls are missing and the tip stands by the heading. */
  readonly found: boolean;
}

function shown(element: Readonly<Element>): boolean {
  if (element.closest("[data-ending-style]") !== null) return false;
  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

function resolveTargets(targets: readonly string[]): Element[] {
  for (const name of targets) {
    const found = [...document.querySelectorAll(`[data-tour="${CSS.escape(name)}"]`)].filter(shown);
    if (found.length > 0) return found;
  }
  return [];
}

function unionBox(elements: readonly Element[]): Box {
  let top = Infinity;
  let left = Infinity;
  let right = -Infinity;
  let bottom = -Infinity;
  for (const element of elements) {
    const rect = element.getBoundingClientRect();
    top = Math.min(top, rect.top);
    left = Math.min(left, rect.left);
    right = Math.max(right, rect.right);
    bottom = Math.max(bottom, rect.bottom);
  }
  return { top, left, width: right - left, height: bottom - top };
}

function sameBox(a: Readonly<Box>, b: Readonly<Box>): boolean {
  return a.top === b.top && a.left === b.left && a.width === b.width && a.height === b.height;
}

function offscreen(box: Readonly<Box>): boolean {
  return box.top < 0 || box.top + box.height > window.innerHeight;
}

/** Rings the step's controls and follows them: through scroll, resize, a card arriving. */
function useTourTarget(step: Readonly<TourStep>, enabled: boolean): Measure | null {
  const [measure, setMeasure] = useState<Measure | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const started = performance.now();
    let frame = 0;
    let scrolled = false;
    let fallbackTimer: ReturnType<typeof setTimeout> | null = null;
    const observed = new Set<Element>();
    const resize = new ResizeObserver(schedule);

    function settle(elements: readonly Element[], found: boolean) {
      const box = unionBox(elements);
      setMeasure((previous) =>
        previous !== null &&
        previous.step === step.id &&
        previous.found === found &&
        sameBox(previous.box, box) &&
        previous.elements.length === elements.length &&
        previous.elements.every((element, place) => element === elements[place])
          ? previous
          : { step: step.id, box, elements, found },
      );
    }

    function measureNow() {
      frame = 0;
      const found = resolveTargets(step.targets);
      if (found.length > 0) {
        for (const element of found) {
          if (!observed.has(element)) {
            observed.add(element);
            resize.observe(element);
          }
        }
        if (!scrolled) {
          scrolled = true;
          if (offscreen(unionBox(found))) {
            found[0].scrollIntoView({ block: "nearest", inline: "nearest" });
          }
        }
        settle(found, true);
        return;
      }
      if (performance.now() - started < FALLBACK_MS) return;
      const heading =
        document.querySelector("#portal-main h1") ?? document.getElementById("portal-main");
      if (heading !== null) settle([heading], false);
    }

    function schedule() {
      if (frame === 0) frame = requestAnimationFrame(measureNow);
    }

    const mutations = new MutationObserver(schedule);
    mutations.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["data-tour", "data-open", "data-ending-style", "class", "hidden"],
    });
    window.addEventListener("scroll", schedule, { capture: true, passive: true });
    window.addEventListener("resize", schedule);
    document.addEventListener("transitionend", schedule, true);
    document.addEventListener("animationend", schedule, true);
    fallbackTimer = setTimeout(schedule, FALLBACK_MS);
    schedule();

    return () => {
      if (frame !== 0) cancelAnimationFrame(frame);
      if (fallbackTimer !== null) clearTimeout(fallbackTimer);
      mutations.disconnect();
      resize.disconnect();
      window.removeEventListener("scroll", schedule, { capture: true });
      window.removeEventListener("resize", schedule);
      document.removeEventListener("transitionend", schedule, true);
      document.removeEventListener("animationend", schedule, true);
    };
  }, [enabled, step]);

  return enabled && measure?.step === step.id ? measure : null;
}

/* ---------- The tip ---------- */

const ICONS = {
  home: Home,
  clipboard: ClipboardCheck,
  calendar: Calendar,
  check: Check,
  clock: Clock,
  users: Users,
  mail: Mail,
} as const satisfies Readonly<Record<TourIcon, ComponentType<IconProps>>>;

function TourTip({ state }: Readonly<{ state: TourState }>) {
  const router = useRouter();
  const pathname = usePathname();
  const view = useSearchParams().get("view");
  const steps = stepsOf(state.tour);
  const step = steps[state.index];
  const last = state.index === steps.length - 1;
  const here = tourStepMatches(step, pathname, view);
  const measure = useTourTarget(step, here && !state.ended);
  const open = here && !state.ended && measure !== null;

  const titleId = useId();
  const bodyId = useId();
  const popupRef = useRef<HTMLDivElement>(null);
  const returnFocus = useRef<Element | null>(null);
  const routed = useRef<string | null>(null);

  /* A fresh run opens on its first screen: an admin's tour on Settings, a
     restart from Help wherever Help sent it. Once per run, so moving
     around the portal by choice is never undone by the tour. */
  useEffect(() => {
    if (state.ended || state.begun || routed.current === state.runKey) return;
    routed.current = state.runKey;
    returnFocus.current = document.activeElement;
    writeRun(state.runKey, "0");
    if (!here) router.replace(step.href);
  }, [state, here, step.href, router]);

  const anchor = useMemo(() => {
    if (measure === null) return null;
    const elements = measure.elements;
    return {
      getBoundingClientRect: () => {
        const box = unionBox(elements);
        return DOMRect.fromRect({ x: box.left, y: box.top, width: box.width, height: box.height });
      },
      contextElement: elements[0],
    };
  }, [measure]);

  function end(outcome: "finished" | "skipped") {
    writeRun(state.runKey, ENDED);
    const back = returnFocus.current;
    const target =
      back instanceof HTMLElement && back.isConnected && back !== document.body
        ? back
        : document.getElementById("portal-main");
    target?.focus({ preventScroll: true });
    endTourAction({ tour: state.tour, outcome })
      .then((result) => {
        if (!result.ok) throw new Error("Tour record refused");
      })
      .catch(() => {
        toast.error("The tour could not be saved, so it may start again next time.", {
          id: "tour-record",
        });
      });
  }

  function advance() {
    if (last) {
      end("finished");
      return;
    }
    const next = steps[state.index + 1];
    writeRun(state.runKey, String(state.index + 1));
    if (!tourStepMatches(next, pathname, view)) router.push(next.href);
  }

  // oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- Base UI event details carry DOM members that cannot be made readonly
  function onOpenChange(next: boolean, details: PopoverChangeDetails) {
    if (next) return;
    /* The tip stays while people look around and work the screen it is
       explaining; only its own controls and Esc end the tour. Esc is the
       tip's while focus is in it or on the page itself, not while a field
       or the card beside it holds focus. */
    if (details.reason === "escape-key") {
      const active = document.activeElement;
      const ours =
        active === null ||
        active === document.body ||
        active.id === "portal-main" ||
        (popupRef.current?.contains(active) ?? false);
      if (ours) {
        end("skipped");
        return;
      }
    }
    details.cancel();
  }

  const Icon = ICONS[step.icon];
  const ring =
    open && measure.found ? (
      <div
        key={step.id}
        className="wgi-tour-ring"
        aria-hidden="true"
        style={{
          top: measure.box.top - RING_GAP,
          left: measure.box.left - RING_GAP,
          width: measure.box.width + RING_GAP * 2,
          height: measure.box.height + RING_GAP * 2,
        }}
      />
    ) : null;

  return (
    <>
      {ring === null ? null : createPortal(ring, document.body)}
      <p className="sr-only" role="status" aria-live="polite">
        {open
          ? `${TOUR_LABELS[state.tour]}, step ${String(state.index + 1)} of ${String(steps.length)}: ${step.title}`
          : ""}
      </p>
      <Popover key={step.id} open={open} onOpenChange={onOpenChange}>
        <PopoverContent
          ref={popupRef}
          anchor={anchor}
          side={measure?.found === false ? "bottom" : step.side}
          align={measure?.found === false ? "start" : step.align}
          sideOffset={RING_GAP + 12}
          className="wgi-tour-tip"
          data-tour-tip=""
          data-testid="tour-tip"
          data-tour-step={step.id}
          tabIndex={-1}
          aria-labelledby={titleId}
          aria-describedby={bodyId}
          initialFocus={popupRef}
          finalFocus={false}
          onKeyDown={(event) => {
            if (event.key === "Enter" && event.target === event.currentTarget) {
              event.preventDefault();
              advance();
            }
          }}
        >
          <PopoverArrow className="wgi-tour-arrow" />
          <span className="wgi-tour-icon" aria-hidden="true">
            <Icon width={20} height={20} />
          </span>
          <div className="wgi-tour-text">
            <p className="wgi-tour-eyebrow">{TOUR_LABELS[state.tour]}</p>
            <PopoverTitle id={titleId} className="wgi-tour-title">
              {step.title}
            </PopoverTitle>
            <p id={bodyId} className="wgi-tour-body">
              {step.body}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="wgi-tour-close"
            aria-label="Close the tour"
            data-testid="tour-close"
            onClick={() => {
              end("skipped");
            }}
          >
            <X width={16} height={16} aria-hidden="true" />
          </Button>
          <div className="wgi-tour-foot">
            <span className="wgi-tour-dots" aria-hidden="true">
              {steps.map((entry, place) => (
                <span key={entry.id} data-current={place === state.index || undefined} />
              ))}
            </span>
            <span className="sr-only">
              Step {state.index + 1} of {steps.length}
            </span>
            <span className="wgi-tour-actions">
              <Button
                variant="ghost"
                size="sm"
                data-testid="tour-skip"
                onClick={() => {
                  end("skipped");
                }}
              >
                Skip tour
              </Button>
              <Button size="sm" data-testid="tour-next" onClick={advance}>
                {last ? "Done" : "Next"}
              </Button>
            </span>
          </div>
        </PopoverContent>
      </Popover>
    </>
  );
}
