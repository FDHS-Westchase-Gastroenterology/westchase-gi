"use client";

import Link from "next/link";
import { useRef, type PointerEvent } from "react";
import { Printer } from "@/components/icons";

const PRINT_HREF = "/admin/requests/print?auto=1";
const EASE_OUT_EXPO = "cubic-bezier(0.16, 1, 0.3, 1)";

export function PrintPacketLink({ count }: { count: number }) {
  const cueRef = useRef<HTMLSpanElement>(null);
  const printerRef = useRef<HTMLSpanElement>(null);
  const animationsRef = useRef<Animation[]>([]);

  function animatePaperFeed(event: PointerEvent<HTMLAnchorElement>) {
    if (event.button !== 0) return;

    const cue = cueRef.current;
    const printer = printerRef.current;
    if (!cue || !printer) return;

    for (const animation of animationsRef.current) animation.cancel();

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const compactLayout = window.matchMedia("(max-width: 47.999rem)").matches;
    const cueAnimation = cue.animate(
      reducedMotion
        ? [
            { opacity: 0 },
            { opacity: 0.72, offset: 0.36 },
            { opacity: 0 },
          ]
        : compactLayout
          ? [
              {
                clipPath: "inset(0 0 100% 0)",
                opacity: 0,
                transform: "translate3d(-50%, -50%, 0) scale(0.94)",
              },
              {
                clipPath: "inset(0 0 0 0)",
                opacity: 1,
                offset: 0.14,
                transform: "translate3d(-50%, -10%, 0) scale(1)",
              },
              {
                clipPath: "inset(0 0 0 0)",
                opacity: 1,
                offset: 0.62,
                transform: "translate3d(-50%, 20%, 0) scale(1)",
              },
              {
                clipPath: "inset(0 0 0 0)",
                opacity: 0,
                transform: "translate3d(-50%, 42%, 0) scale(0.98)",
              },
            ]
        : [
            {
              clipPath: "inset(0 0 100% 0)",
              opacity: 0,
              transform: "translate3d(-50%, -42%, 0) scale(0.94)",
            },
            {
              clipPath: "inset(0 0 0 0)",
              opacity: 1,
              offset: 0.14,
              transform: "translate3d(-50%, 18%, 0) scale(1)",
            },
            {
              clipPath: "inset(0 0 0 0)",
              opacity: 1,
              offset: 0.62,
              transform: "translate3d(-50%, 155%, 0) scale(1)",
            },
            {
              clipPath: "inset(0 0 0 0)",
              opacity: 0,
              transform: "translate3d(-50%, 220%, 0) scale(0.98)",
            },
          ],
      {
        duration: reducedMotion ? 140 : 280,
        easing: EASE_OUT_EXPO,
      },
    );

    if (reducedMotion) {
      animationsRef.current = [cueAnimation];
      return;
    }

    const printerAnimation = printer.animate(
      [
        { transform: "translateY(0) scale(1)" },
        {
          offset: 0.24,
          transform: "translateY(1px) scale(0.94)",
        },
        { transform: "translateY(0) scale(1)" },
      ],
      {
        duration: 220,
        easing: EASE_OUT_EXPO,
      },
    );
    animationsRef.current = [cueAnimation, printerAnimation];
  }

  return (
    <Link
      href={PRINT_HREF}
      target="_blank"
      rel="noopener"
      className="btn btn-navy portal-print-packet-link min-h-11"
      aria-label={`Print all ${count} new appointment ${
        count === 1 ? "request" : "requests"
      }`}
      onPointerDown={animatePaperFeed}
    >
      <span ref={printerRef} className="portal-print-glyph" aria-hidden="true">
        <span ref={cueRef} className="portal-print-packet-cue" />
        <Printer className="h-4 w-4" />
      </span>
      <span data-testid="print-new-count">Print all {count}</span>
    </Link>
  );
}
