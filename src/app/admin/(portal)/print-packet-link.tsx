"use client";

import Link from "next/link";
import { useRef, type PointerEvent } from "react";
import { Printer } from "@/components/icons";

const PRINT_HREF = "/admin/requests/print?auto=1";
const EASE_OUT_EXPO = "cubic-bezier(0.16, 1, 0.3, 1)";

const INLINE_PAPER_PATHS = [
  ["-50%", "-34%", "-108%", "-98%", "-128%", "-132%", "-11deg"],
  ["-50%", "-34%", "-50%", "-118%", "-50%", "-154%", "0deg"],
  ["-50%", "-34%", "8%", "-98%", "28%", "-132%", "11deg"],
] as const;

const STACKED_PAPER_PATHS = [
  ["-50%", "-34%", "450%", "-36%", "500%", "-42%", "-8deg"],
  ["-50%", "-34%", "550%", "-30%", "610%", "-36%", "0deg"],
  ["-50%", "-34%", "650%", "-24%", "690%", "-30%", "8deg"],
] as const;

function paperKeyframes(index: number, stacked: boolean): Keyframe[] {
  const path = (stacked ? STACKED_PAPER_PATHS : INLINE_PAPER_PATHS)[index];
  const revealOffset = 0.06 + index * 0.05;

  return [
    {
      clipPath: "inset(0 0 100% 0)",
      easing: EASE_OUT_EXPO,
      filter: "blur(0)",
      opacity: 0,
      transform: `translate3d(${path[0]}, ${path[1]}, 0) rotate(0deg) scale(0.92)`,
    },
    {
      clipPath: "inset(0 0 0 0)",
      easing: EASE_OUT_EXPO,
      filter: "blur(0)",
      offset: revealOffset,
      opacity: 1,
      transform: `translate3d(${path[0]}, -8%, 0) rotate(0deg) scale(1)`,
    },
    {
      clipPath: "inset(0 0 0 0)",
      easing: EASE_OUT_EXPO,
      filter: "blur(0)",
      offset: 0.62,
      opacity: 1,
      transform: `translate3d(${path[2]}, ${path[3]}, 0) rotate(${path[6]}) scale(1)`,
    },
    {
      clipPath: "inset(0 0 0 0)",
      filter: "blur(0.7px)",
      opacity: 0,
      transform: `translate3d(${path[4]}, ${path[5]}, 0) rotate(${path[6]}) scale(0.98)`,
    },
  ];
}

function reducedPaperKeyframes(index: number, stacked: boolean): Keyframe[] {
  const path = (stacked ? STACKED_PAPER_PATHS : INLINE_PAPER_PATHS)[index];
  const staticY = stacked ? path[3] : "-82%";
  const transform = `translate3d(${path[2]}, ${staticY}, 0) rotate(${path[6]}) scale(1)`;

  return [
    { opacity: 0, transform },
    { offset: 0.3, opacity: 0.92, transform },
    { opacity: 0, transform },
  ];
}

export function PrintPacketLink({ count }: { count: number }) {
  const actionRef = useRef<HTMLSpanElement>(null);
  const linkRef = useRef<HTMLAnchorElement>(null);
  const printerRef = useRef<HTMLSpanElement>(null);
  const animationsRef = useRef<Animation[]>([]);

  function animatePrintPacket(event: PointerEvent<HTMLAnchorElement>) {
    if (event.button !== 0 || !event.isPrimary) return;
    if (animationsRef.current.some((animation) => animation.playState === "running")) {
      return;
    }

    const action = actionRef.current;
    const link = linkRef.current;
    const printer = printerRef.current;
    if (!action || !link || !printer) return;

    const papers = Array.from(
      action.querySelectorAll<HTMLElement>("[data-print-paper]"),
    );
    if (papers.length !== 3) return;

    for (const animation of animationsRef.current) animation.cancel();

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const nextAction = action.nextElementSibling;
    const stackedActions =
      nextAction instanceof HTMLElement &&
      nextAction.getBoundingClientRect().top >
        action.getBoundingClientRect().top + 8;

    const linkAnimation = link.animate(
      reducedMotion
        ? [
            { boxShadow: "0 0 0 0 rgb(226 177 65 / 0)", filter: "brightness(1)" },
            {
              boxShadow: "0 0 0 4px rgb(226 177 65 / 42%)",
              filter: "brightness(1.16)",
              offset: 0.32,
            },
            { boxShadow: "0 0 0 0 rgb(226 177 65 / 0)", filter: "brightness(1)" },
          ]
        : [
            { boxShadow: "0 0.3rem 0.7rem rgb(19 43 59 / 0)", transform: "scale(1) translateY(0)" },
            {
              boxShadow: "inset 0 -0.22rem 0 rgb(7 31 48 / 46%)",
              offset: 0.14,
              transform: "scale(0.94) translateY(2px)",
            },
            {
              boxShadow: "0 0.35rem 0.8rem rgb(19 43 59 / 22%)",
              offset: 0.46,
              transform: "scale(0.985) translateY(-1px)",
            },
            { boxShadow: "0 0.3rem 0.7rem rgb(19 43 59 / 0)", transform: "scale(1) translateY(0)" },
          ],
      {
        duration: reducedMotion ? 170 : 260,
        easing: EASE_OUT_EXPO,
      },
    );

    const paperAnimations = papers.map((paper, index) =>
      paper.animate(
        reducedMotion
          ? reducedPaperKeyframes(index, stackedActions)
          : paperKeyframes(index, stackedActions),
        {
          duration: reducedMotion ? 170 : 300,
          easing: "linear",
        },
      ),
    );

    if (reducedMotion) {
      animationsRef.current = [linkAnimation, ...paperAnimations];
      return;
    }

    const printerAnimation = printer.animate(
      [
        { transform: "translateY(0) scale(1)" },
        {
          offset: 0.14,
          transform: "translateY(2px) scaleX(1.06) scaleY(0.8)",
        },
        {
          offset: 0.36,
          transform: "translateY(-2px) scaleX(0.96) scaleY(1.1)",
        },
        { transform: "translateY(0) scale(1)" },
      ],
      {
        duration: 240,
        easing: EASE_OUT_EXPO,
      },
    );

    animationsRef.current = [
      linkAnimation,
      printerAnimation,
      ...paperAnimations,
    ];
  }

  return (
    <span ref={actionRef} className="portal-print-action">
      <Link
        ref={linkRef}
        href={PRINT_HREF}
        target="_blank"
        rel="noopener"
        className="btn btn-navy portal-print-packet-link min-h-11"
        aria-label={`Print all ${count} new appointment ${
          count === 1 ? "request" : "requests"
        }`}
        onPointerDown={animatePrintPacket}
      >
        <span ref={printerRef} className="portal-print-glyph" aria-hidden="true">
          <Printer className="h-4 w-4" />
        </span>
        <span data-testid="print-new-count">Print all {count}</span>
      </Link>
      <span className="portal-print-paper-stack" aria-hidden="true">
        <span data-print-paper className="portal-print-paper portal-print-paper--back" />
        <span data-print-paper className="portal-print-paper portal-print-paper--middle" />
        <span data-print-paper className="portal-print-paper portal-print-paper--front" />
      </span>
    </span>
  );
}
