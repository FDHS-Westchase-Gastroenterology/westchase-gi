"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const DEFAULT_OUTPUT_GUARD_MS = 1_500;

export function useOutputGuard({
  releaseOnAfterPrint = false,
  timeoutMs = DEFAULT_OUTPUT_GUARD_MS,
}: Readonly<{
  releaseOnAfterPrint?: boolean;
  timeoutMs?: number;
}> = {}) {
  const lockedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [locked, setLocked] = useState(false);

  const release = useCallback(() => {
    lockedRef.current = false;
    setLocked(false);
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!releaseOnAfterPrint) return undefined;
    window.addEventListener("afterprint", release);
    return () => {
      window.removeEventListener("afterprint", release);
    };
  }, [release, releaseOnAfterPrint]);

  useEffect(
    () => () => {
      if (timerRef.current !== null) clearTimeout(timerRef.current);
    },
    [],
  );

  const begin = useCallback((): boolean => {
    if (lockedRef.current) return false;
    lockedRef.current = true;
    setLocked(true);
    timerRef.current = setTimeout(release, timeoutMs);
    return true;
  }, [release, timeoutMs]);

  return { begin, locked, release } as const;
}
