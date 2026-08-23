"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";

export type PortalFeedbackTone = "status" | "alert";

export interface PortalFeedback {
  readonly source: string;
  readonly tone: PortalFeedbackTone;
  readonly message: string;
}

interface PortalFeedbackContextValue {
  readonly feedback: PortalFeedback | null;
  readonly publish: (feedback: Readonly<PortalFeedback>) => void;
  readonly dismiss: (source: string) => void;
}

const PortalFeedbackContext = createContext<PortalFeedbackContextValue | null>(null);

// Keeps one current result across the client islands on a portal page. A
// Later note, workflow command, or output handoff replaces an older banner
// Without moving focus away from the control staff used.
export function PortalFeedbackProvider({
  children,
  initialFeedback = null,
}: Readonly<{
  children: ReactNode;
  initialFeedback?: PortalFeedback | null;
}>) {
  const initialSource = initialFeedback?.source ?? null;
  const [appliedInitialSource, setAppliedInitialSource] = useState(initialSource);
  const [feedback, setFeedback] = useState<PortalFeedback | null>(initialFeedback);

  // A consumed initial message may disappear from the next Server Component
  // Payload while a newer client result stays mounted. Retire only that old
  // Initial source so a workflow or note result is not erased by refresh.
  if (appliedInitialSource !== initialSource) {
    setAppliedInitialSource(initialSource);
    if (feedback === null || feedback.source === appliedInitialSource) {
      setFeedback(initialFeedback);
    }
  }

  const publish = useCallback((next: Readonly<PortalFeedback>) => {
    setFeedback(next);
  }, []);
  const dismiss = useCallback((source: string) => {
    setFeedback((current) => (current?.source === source ? null : current));
  }, []);
  const value = useMemo(() => ({ feedback, publish, dismiss }), [dismiss, feedback, publish]);
  return <PortalFeedbackContext value={value}>{children}</PortalFeedbackContext>;
}

export function usePortalFeedback() {
  const context = useContext(PortalFeedbackContext);
  if (context === null) {
    throw new Error("usePortalFeedback must be used inside PortalFeedbackProvider");
  }
  return context;
}

export function PortalFeedbackMessage({
  source,
  testId,
  className = "",
}: Readonly<{
  source: string;
  testId?: string;
  className?: string;
}>) {
  const { feedback } = usePortalFeedback();
  if (feedback?.source !== source) return null;

  return (
    <p
      role={feedback.tone}
      aria-atomic="true"
      data-testid={testId}
      className={`portal-output-feedback ${className}`}
    >
      {feedback.message}
    </p>
  );
}
