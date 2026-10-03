"use client";

import { useSyncExternalStore } from "react";

/* The browser's clock, by the minute: what the week's and the day's now
   line follow. The server renders without it (null), so SSR and hydration
   agree, and the line appears once the page is live. */

const MINUTE_MS = 60_000;

function subscribeMinute(onChange: () => void) {
  const timer = window.setInterval(onChange, MINUTE_MS / 4);
  return () => {
    window.clearInterval(timer);
  };
}

function minuteNow(): number {
  return Math.floor(Date.now() / MINUTE_MS) * MINUTE_MS;
}

function noClock(): number | null {
  return null;
}

/** The current minute in epoch milliseconds, or null before hydration. */
export function useMinuteClock(): number | null {
  return useSyncExternalStore(subscribeMinute, minuteNow, noClock);
}
