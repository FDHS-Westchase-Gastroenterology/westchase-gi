"use client";

import { useRef } from "react";

import { useFocusAfterNavigate } from "./recent-work-focus";

export function RecentWorkFocusTarget({
  id,
  testId,
  renderKey,
  live = false,
  className,
  children,
}: Readonly<{
  id: string;
  testId: string;
  renderKey: string;
  live?: boolean;
  className: string;
  children: React.ReactNode;
}>) {
  const ref = useRef<HTMLParagraphElement>(null);
  useFocusAfterNavigate(id, renderKey, ref);

  return (
    <p
      ref={ref}
      id={id}
      data-testid={testId}
      role={live ? "status" : undefined}
      tabIndex={-1}
      className={className}
    >
      {children}
    </p>
  );
}
