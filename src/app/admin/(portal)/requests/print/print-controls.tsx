"use client";

import { useEffect, useRef } from "react";
import { Printer } from "@/components/icons";

function afterNextPaint(): Promise<void> {
  return new Promise((resolve) => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => resolve());
    });
  });
}

export function PrintPacketControls({
  autoStart,
  count,
}: {
  autoStart: boolean;
  count: number;
}) {
  const started = useRef(false);

  useEffect(() => {
    if (!autoStart || started.current) return;

    let cancelled = false;
    async function openPrintDialog() {
      if ("fonts" in document) {
        await document.fonts.ready.catch(() => undefined);
      }
      await afterNextPaint();
      if (cancelled || started.current) return;
      started.current = true;
      window.print();
    }

    void openPrintDialog();
    return () => {
      cancelled = true;
    };
  }, [autoStart]);

  return (
    <div className="portal-print-controls print-hide">
      <button
        type="button"
        onClick={() => {
          started.current = true;
          window.print();
        }}
        className="btn btn-navy min-h-11"
      >
        <Printer className="h-[1.05rem] w-[1.05rem]" />
        Print {count} {count === 1 ? "request" : "requests"}
      </button>
      <p>
        Printing creates a paper copy only. It does not mark any appointment
        request as contacted or assign it to a staff member.
      </p>
    </div>
  );
}
