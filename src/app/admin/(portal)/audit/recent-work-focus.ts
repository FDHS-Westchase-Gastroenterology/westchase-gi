"use client";

import { useEffect } from "react";
import type { RefObject } from "react";

// Navigation handlers name the focus target before the App Router changes.
// The target consumes that request in an effect keyed to its new server props,
// With no timing guess or focus move on direct loads.

let pendingFocusId: string | null = null;

export function requestFocusAfterNavigate(id: string): void {
  pendingFocusId = id;
}

export function useFocusAfterNavigate<T extends HTMLElement>(
  id: string,
  renderKey: string,
  ref: RefObject<T | null>,
): void {
  useEffect(() => {
    if (pendingFocusId !== id || ref.current === null) return;
    pendingFocusId = null;
    ref.current.focus();
  }, [id, ref, renderKey]);
}
