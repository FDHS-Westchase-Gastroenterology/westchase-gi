"use client";

import { useCallback, useEffect, useRef } from "react";

import { PortalFeedbackMessage, usePortalFeedback } from "@/app/admin/(portal)/portal-feedback";
import { Printer } from "@/components/icons";
import { useOutputGuard } from "@/components/output-feedback";
import { Button } from "@/components/ui/button";

async function afterNextPaint(): Promise<void> {
  return new Promise((resolve) => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        resolve();
      });
    });
  });
}

export function PrintPacketControls({
  autoStart,
  count,
}: Readonly<{ autoStart: boolean; count: number }>) {
  const started = useRef(false);
  const { publish } = usePortalFeedback();
  const { begin, locked } = useOutputGuard({ releaseOnAfterPrint: true });

  const printPacket = useCallback((): void => {
    if (!begin()) return;
    started.current = true;
    publish({
      source: "print-packet",
      tone: "status",
      message: "Print dialog is opening for this packet.",
    });
    window.requestAnimationFrame(() => {
      window.print();
    });
  }, [begin, publish]);

  useEffect(() => {
    let cancelled = false;

    async function openPrintDialog() {
      if ("fonts" in document) {
        await document.fonts.ready.catch(() => undefined);
      }
      await afterNextPaint();
      if (cancelled || started.current) return;
      printPacket();
    }

    if (autoStart && !started.current) {
      void openPrintDialog();
    }

    return () => {
      cancelled = true;
    };
  }, [autoStart, printPacket]);

  return (
    <div className="portal-print-controls print-hide">
      <Button
        type="button"
        aria-disabled={locked || undefined}
        onClick={() => {
          printPacket();
        }}
        className="aria-disabled:pointer-events-none aria-disabled:opacity-60"
      >
        <Printer className="h-[1.05rem] w-[1.05rem]" />
        Print {count} {count === 1 ? "request" : "requests"}
      </Button>
      <PortalFeedbackMessage source="print-packet" testId="print-packet-feedback" />
      <p>
        Printing creates a paper copy only. It does not mark any appointment request as contacted or
        assign it to a staff member.
      </p>
    </div>
  );
}
