"use client";

import { useEffect } from "react";

export type PortalTourReturnState = "finished" | "not-now" | "restarted";

export function PortalTourReturnFocus({
  state,
}: Readonly<{
  state: PortalTourReturnState;
}>) {
  useEffect(() => {
    const targetId = state === "restarted" ? "portal-tour-launcher" : "home-heading";
    document.getElementById(targetId)?.focus();

    const url = new URL(window.location.href);
    url.searchParams.delete("tour");
    const query = url.searchParams.toString();
    window.history.replaceState(
      window.history.state,
      "",
      `${url.pathname}${query === "" ? "" : `?${query}`}${url.hash}`,
    );
  }, [state]);

  return state === "not-now" ? (
    <p
      role="status"
      aria-live="polite"
      aria-atomic="true"
      data-testid="portal-tour-return-status"
      className="sr-only"
    >
      The tour is hidden. You can restart it from Help.
    </p>
  ) : null;
}
