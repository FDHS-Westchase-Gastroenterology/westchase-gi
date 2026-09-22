"use client";

import Link from "next/link";

import { requestFocusAfterNavigate } from "./recent-work-focus";

export function RecentWorkFocusLink({
  href,
  focusId,
  className,
  "data-slot": dataSlot,
  children,
}: Readonly<{
  href: string;
  focusId: string;
  className?: string;
  "data-slot"?: string;
  children: React.ReactNode;
}>) {
  return (
    <Link
      href={href}
      data-slot={dataSlot}
      className={className}
      onNavigate={() => {
        requestFocusAfterNavigate(focusId);
      }}
    >
      {children}
    </Link>
  );
}
