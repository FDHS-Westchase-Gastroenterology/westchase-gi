"use client";

import { LazyMotion, domAnimation, m, useReducedMotion } from "motion/react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { transitionFor } from "@/lib/motion";

/* Two engines, one temperament. The top puck rides the CSS registry
   (--motion-spring in, --motion-exit out); the bottom rides the same
   presets through motion.dev (src/lib/motion.ts). If they ever drift
   apart, the bindings are wrong, not the tokens. */

const TRAVEL_PX = 220;

export function MotionDemo() {
  const [away, setAway] = useState(false);
  const reducedMotion = useReducedMotion() ?? false;
  const transition = reducedMotion
    ? { duration: 0 }
    : transitionFor(away ? "arrive" : "leave", reducedMotion);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setAway((value) => !value);
          }}
        >
          {away ? "Leave (exit, 160ms)" : "Arrive (spring, 440ms)"}
        </Button>
      </div>
      <Track label="CSS — --motion-spring / --motion-exit">
        <div className="design-puck" data-engine="css" data-away={away} />
      </Track>
      <Track label="motion.dev — arrive / leave from src/lib/motion.ts">
        <LazyMotion features={domAnimation} strict>
          <m.div
            className="design-puck"
            data-engine="motion"
            animate={{ transform: `translateX(${away ? TRAVEL_PX : 0}px)` }}
            transition={transition}
          />
        </LazyMotion>
      </Track>
      <p className="text-xs text-muted-ink">
        Reduced motion: both engines drop the travel and jump — the change is never withheld, only
        the physics.
      </p>
    </div>
  );
}

type TrackProps = Readonly<{ label: string; children: React.ReactNode }>;

function Track({ label, children }: TrackProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold text-muted-ink">{label}</span>
      <div className="design-track">{children}</div>
    </div>
  );
}
