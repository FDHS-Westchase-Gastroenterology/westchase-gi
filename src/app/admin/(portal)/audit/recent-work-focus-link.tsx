"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { focusAfterNavigate, isUnmodifiedPrimaryClick } from "./recent-work-focus";

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
  const router = useRouter();
  return (
    <Link
      href={href}
      className={className}
      onClick={(event) => {
        if (!isUnmodifiedPrimaryClick(event)) return;
        event.preventDefault();
        router.push(href);
        focusAfterNavigate(focusId);
      }}
    >
      {children}
    </Link>
  );
}
