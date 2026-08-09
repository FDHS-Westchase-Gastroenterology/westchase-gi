"use client";

import { useEffect, useRef, useState } from "react";
import { Printer } from "@/components/icons";

export function PrintPacketControls({
  autoStart,
  count,
}: {
  autoStart: boolean;
  count: number;
}) {
  const started = useRef(false);
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    if (!autoStart || started.current) return;
    const timer = window.setTimeout(() => {
      if (started.current) return;
      started.current = true;
      setPrinting(true);
      window.print();
      setPrinting(false);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [autoStart]);

  return (
    <div className="portal-print-controls print-hide">
      <button
        type="button"
        onClick={() => {
          setPrinting(true);
          window.print();
          setPrinting(false);
        }}
        className="btn btn-navy min-h-11"
      >
        <Printer className="h-[1.05rem] w-[1.05rem]" />
        {printing
          ? "Opening print dialog…"
          : `Print ${count} ${count === 1 ? "request" : "requests"}`}
      </button>
      <p>
        Printing creates a paper copy only. It does not mark any appointment
        request as contacted or assign it to a staff member.
      </p>
    </div>
  );
}
