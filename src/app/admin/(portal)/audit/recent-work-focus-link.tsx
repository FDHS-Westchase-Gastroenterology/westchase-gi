"use client";

import Link from "next/link";

import { requestFocusAfterNavigate } from "./recent-work-focus";

export function RecentWorkFocusLink({
  href,
  focusId,
  className,
  children,
}: Readonly<{
  href: string;
  focusId: string;
  className?: string;
  children: React.ReactNode;
}>) {
  return (
    <Link
      href={href}
      className={className}
      onNavigate={() => {
        requestFocusAfterNavigate(focusId);
      }}
    >
      {children}
    </Link>
  );
}
