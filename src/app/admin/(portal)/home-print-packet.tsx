"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { createPortal } from "react-dom";
import { Check, Printer } from "@/components/icons";
import { prepareHomePrintPacket } from "./print-actions";
import { RequestPrintPacket } from "./requests/print/request-print-packet";

type PreparedPacket = Extract<
  Awaited<ReturnType<typeof prepareHomePrintPacket>>,
  { ok: true }
>;

type PrintHandoffState =
  | { status: "idle" }
  | { status: "preparing" }
  | { status: "ready"; packet: PreparedPacket; animateNames: boolean }
  | { status: "empty"; generatedAt: string }
  | { status: "error" };

type Flight = {
  element: HTMLSpanElement;
  animation: Animation;
};

const preparedTime = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
  timeZone: "America/New_York",
  timeZoneName: "short",
});

function requestNoun(count: number): string {
  return count === 1 ? "request" : "requests";
}

export function HomePrintPacket({
  homeCount,
  newestIds,
}: {
  homeCount: number;
  newestIds: string[];
}) {
  const router = useRouter();
  const [state, setState] = useState<PrintHandoffState>({ status: "idle" });
  const [liveMessage, setLiveMessage] = useState("");
  const [isTransitionPending, beginPreparation] = useTransition();
  const primaryButtonRef = useRef<HTMLButtonElement>(null);
  const inFlightRef = useRef(false);
  const flightsRef = useRef(new Set<Flight>());
  const readyPacket = state.status === "ready" ? state.packet : null;
  const packetCount = readyPacket?.requests.length ?? 0;

  const representedRequests = useMemo(() => {
    if (!readyPacket) return [];
    const packetById = new Map(
      readyPacket.requests.map((request) => [request.id, request]),
    );
    return newestIds.flatMap((id) => {
      const request = packetById.get(id);
      return request ? [request] : [];
    });
  }, [newestIds, readyPacket]);

  const clearFlights = useCallback(() => {
    for (const flight of flightsRef.current) {
      flight.animation.cancel();
      flight.element.remove();
    }
    flightsRef.current.clear();
  }, []);

  useEffect(() => {
    if (
      state.status !== "ready" ||
      !state.animateNames ||
      representedRequests.length === 0 ||
      document.visibilityState !== "visible" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    clearFlights();
    const flights = flightsRef.current;

    for (const [index, request] of representedRequests.entries()) {
      const source = document.querySelector<HTMLElement>(
        `[data-print-source-id="${request.id}"]`,
      );
      const target = document.querySelector<HTMLElement>(
        `[data-print-target-id="${request.id}"]`,
      );
      if (!source || !target) continue;

      const sourceRect = source.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      const sourceIsVisible =
        sourceRect.width > 0 &&
        sourceRect.height > 0 &&
        sourceRect.bottom > 0 &&
        sourceRect.top < window.innerHeight &&
        sourceRect.right > 0 &&
        sourceRect.left < window.innerWidth;
      if (!sourceIsVisible || targetRect.width === 0 || targetRect.height === 0) {
        continue;
      }

      const element = document.createElement("span");
      element.className = "portal-print-flight print-hide";
      element.textContent = request.name;
      element.setAttribute("aria-hidden", "true");
      element.setAttribute("data-ui-redact", "patient-name");
      element.style.left = `${sourceRect.left - 7}px`;
      element.style.top = `${sourceRect.top - 5}px`;
      element.style.width = `${targetRect.width}px`;
      document.body.append(element);

      const deltaX = targetRect.left - (sourceRect.left - 7);
      const deltaY = targetRect.top - (sourceRect.top - 5);
      const animation = element.animate(
        [
          {
            opacity: 0,
            clipPath: "inset(0 82% 0 0)",
            transform: "translate3d(0, 0, 0) scale(0.97)",
          },
          {
            offset: 0.18,
            opacity: 1,
            clipPath: "inset(0 0 0 0)",
            transform: "translate3d(0, -2px, 0) scale(1)",
          },
          {
            offset: 0.82,
            opacity: 1,
            clipPath: "inset(0 0 0 0)",
            transform: `translate3d(${deltaX}px, ${deltaY}px, 0) scale(0.985)`,
          },
          {
            opacity: 0,
            clipPath: "inset(0 0 0 0)",
            transform: `translate3d(${deltaX}px, ${deltaY}px, 0) scale(0.985)`,
          },
        ],
        {
          duration: 260,
          delay: index * 20,
          easing: "cubic-bezier(0.16, 1, 0.3, 1)",
          fill: "both",
        },
      );
      const flight = { element, animation };
      flights.add(flight);
      const removeFlight = () => {
        element.remove();
        flights.delete(flight);
      };
      animation.addEventListener("finish", removeFlight, { once: true });
      animation.addEventListener("cancel", removeFlight, { once: true });
    }

    return clearFlights;
  }, [clearFlights, representedRequests, state]);

  useEffect(() => {
    window.addEventListener("beforeprint", clearFlights);
    return () => {
      window.removeEventListener("beforeprint", clearFlights);
      clearFlights();
    };
  }, [clearFlights]);

  function prepare(event: React.MouseEvent<HTMLButtonElement>) {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    const animateNames =
      event.detail > 0 &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    clearFlights();
    setState({ status: "preparing" });
    setLiveMessage("Preparing the current New appointment-request packet.");

    beginPreparation(async () => {
      try {
        const result = await prepareHomePrintPacket();
        if (!result.ok) {
          setState({ status: "error" });
          setLiveMessage("");
          return;
        }
        if (result.requests.length === 0) {
          setState({ status: "empty", generatedAt: result.generatedAt });
          setLiveMessage("No New requests were in the packet when checked.");
          return;
        }

        setState({ status: "ready", packet: result, animateNames });
        setLiveMessage(
          `${result.requests.length} ${requestNoun(result.requests.length)} ${
            result.requests.length === 1 ? "is" : "are"
          } ready to print.`,
        );
      } catch {
        setState({ status: "error" });
        setLiveMessage("");
      } finally {
        inFlightRef.current = false;
      }
    });
  }

  function printPacket() {
    clearFlights();
    window.print();
    setLiveMessage(
      "The print dialog closed. The packet is still ready, and no appointment request changed.",
    );
  }

  function handlePrimary(event: React.MouseEvent<HTMLButtonElement>) {
    if (state.status === "ready") {
      printPacket();
      return;
    }
    prepare(event);
  }

  function beginPointerPress(event: React.PointerEvent<HTMLButtonElement>) {
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      event.currentTarget.dataset.pointerPress = "true";
    }
  }

  function endPointerPress(event: React.PointerEvent<HTMLButtonElement>) {
    delete event.currentTarget.dataset.pointerPress;
  }

  function closePacket() {
    clearFlights();
    setState({ status: "idle" });
    setLiveMessage("Print packet closed. Home is refreshing the live queue.");
    startTransition(() => router.refresh());
    requestAnimationFrame(() => primaryButtonRef.current?.focus());
  }

  const preparing = state.status === "preparing" || isTransitionPending;
  const remainingCount = Math.max(packetCount - representedRequests.length, 0);
  const descriptionId =
    state.status === "ready" || state.status === "empty" || state.status === "error"
      ? "home-print-packet-guidance"
      : undefined;
  const accessibleName =
    state.status === "ready"
      ? `Print ${packetCount} ${requestNoun(packetCount)}`
      : preparing
        ? "Preparing print packet"
        : state.status === "idle"
          ? "Prepare print packet"
          : "Try preparing print packet again";
  const printRoot =
    readyPacket && typeof document !== "undefined"
      ? document.getElementById("portal-print-root")
      : null;

  return (
    <div
      className="portal-print-handoff"
      data-state={state.status}
      data-testid="home-print-packet"
    >
      <button
        ref={primaryButtonRef}
        type="button"
        disabled={preparing}
        aria-busy={preparing}
        aria-label={accessibleName}
        aria-describedby={descriptionId}
        data-state={state.status}
        data-motion={state.status === "ready" && state.animateNames}
        data-testid="home-print-packet-primary"
        onClick={handlePrimary}
        onPointerDown={beginPointerPress}
        onPointerUp={endPointerPress}
        onPointerCancel={endPointerPress}
        onPointerLeave={endPointerPress}
        onBlur={(event) => {
          delete event.currentTarget.dataset.pointerPress;
        }}
        className="btn btn-navy min-h-11 portal-print-action"
      >
        {state.status === "ready" ? (
          <>
            <span className="portal-print-action-paper" aria-hidden="true">
              <span className="portal-print-action-ready">
                <Check className="h-3.5 w-3.5" />
                Packet ready
              </span>
              {representedRequests.length > 0 ? (
                <span className="portal-print-action-names">
                  {representedRequests.map((request, index) => (
                    <span
                      key={request.id}
                      data-print-target-id={request.id}
                      data-ui-redact="patient-name"
                      style={{ "--arrival-index": index } as React.CSSProperties}
                    >
                      {request.name}
                    </span>
                  ))}
                </span>
              ) : (
                <span className="portal-print-action-summary">
                  {packetCount} {requestNoun(packetCount)} prepared
                </span>
              )}
              {remainingCount > 0 ? (
                <span className="portal-print-action-more">
                  +{remainingCount} more in packet
                </span>
              ) : null}
            </span>
            <span className="portal-print-action-command">
              <Printer className="h-4 w-4" />
              <span data-testid="print-new-count">
                Print {packetCount} {requestNoun(packetCount)}
              </span>
            </span>
          </>
        ) : (
          <span className="portal-print-action-command">
            <Printer className="h-4 w-4" />
            <span>
              {preparing
                ? "Preparing current packet…"
                : state.status === "idle"
                  ? "Prepare print packet"
                  : "Try preparing again"}
            </span>
          </span>
        )}
      </button>

      {state.status === "ready" ? (
        <div id="home-print-packet-guidance" className="portal-print-handoff-guidance">
          <p>
            {packetCount !== homeCount
              ? "The queue changed while this packet was prepared. "
              : ""}
            Snapshot prepared {preparedTime.format(new Date(state.packet.generatedAt))}.{" "}
            The live queue did not change.
          </p>
          <button type="button" onClick={closePacket}>
            Close packet
          </button>
        </div>
      ) : state.status === "empty" ? (
        <div id="home-print-packet-guidance" className="portal-print-handoff-guidance">
          <p>
            No New requests were in the packet when checked. Nothing is ready to
            print.
          </p>
          <button type="button" onClick={closePacket}>
            Refresh Home
          </button>
        </div>
      ) : state.status === "error" ? (
        <p
          id="home-print-packet-guidance"
          className="portal-print-handoff-error"
          role="alert"
        >
          The packet could not be prepared. Nothing is ready to print; the queue
          did not change.
        </p>
      ) : null}

      <p className="sr-only" role="status" aria-live="polite">
        {liveMessage}
      </p>

      <noscript>
        <Link href="/admin/requests/print" className="btn btn-navy min-h-11">
          Open print packet
        </Link>
      </noscript>

      {printRoot && readyPacket
        ? createPortal(
            <RequestPrintPacket
              requests={readyPacket.requests}
              generatedAt={readyPacket.generatedAt}
            />,
            printRoot,
          )
        : null}
    </div>
  );
}
