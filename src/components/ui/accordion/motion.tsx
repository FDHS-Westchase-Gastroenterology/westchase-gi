"use client";

import type { Accordion as AccordionPrimitive } from "@base-ui/react/accordion";
import { useRender } from "@base-ui/react/use-render";
import { animate, useMotionValue, useMotionValueEvent, useReducedMotion } from "motion/react";
import { createContext, useContext, useLayoutEffect, useRef, useState } from "react";
import type { ComponentPropsWithRef } from "react";

// A critically damped spring. Response is a physical tuning parameter, not a duration.
const frequency = (2 * Math.PI) / 0.3;
const panelSpring = {
  type: "spring",
  mass: 1,
  stiffness: frequency * frequency,
  damping: 2 * frequency,
  restDelta: 0.1,
  restSpeed: 0.1,
} as const;

export const AccordionMotionContext = createContext({
  keepMounted: false,
  hiddenUntilFound: false,
  activation: { current: { sequence: 0, instant: true } },
});

interface SpringPanelProps {
  readonly elementProps: ComponentPropsWithRef<"div">;
  readonly state: AccordionPrimitive.Panel.State;
  readonly render: AccordionPrimitive.Panel.Props["render"];
  readonly keepMounted: boolean;
  readonly hiddenUntilFound: boolean;
}

// Base UI owns disclosure semantics. This adapter owns the panel's animated presence.
// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React DOM props contain mutable refs; the adapter forwards them without mutation.
export function AccordionSpringPanel({
  elementProps,
  state,
  render,
  keepMounted,
  hiddenUntilFound,
}: SpringPanelProps) {
  const { activation } = useContext(AccordionMotionContext);
  const reducedMotion = useReducedMotion();
  const lastActivation = useRef(0);
  const instantInput = useRef(true);
  useLayoutEffect(() => {
    const input = activation.current;
    instantInput.current = input.instant || input.sequence === lastActivation.current;
    lastActivation.current = input.sequence;
  }, [activation, state.value]);
  const panelRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);
  const [initialOpen] = useState(state.open);
  const [closed, setClosed] = useState(true);
  const height = useMotionValue(0);
  const present = state.open || !closed || keepMounted || hiddenUntilFound;
  const open = state.open;

  useMotionValueEvent(height, "change", (value) => {
    if (panelRef.current) panelRef.current.style.height = `${Math.max(0, value)}px`;
    setClosed(value <= 0);
  });

  useLayoutEffect(() => {
    const panel = panelRef.current;
    if (!panel) {
      initialized.current = true;
      return undefined;
    }
    if (open) {
      panel.removeAttribute("hidden");
    }
    const content = panel.firstElementChild;
    if (!content) return undefined;
    const instant = (reducedMotion ?? false) || instantInput.current;
    let animation: ReturnType<typeof animate> | undefined;
    let target = -1;
    const retarget = () => {
      const next = open ? content.getBoundingClientRect().height : 0;
      if (next === target) return;
      target = next;
      const velocity = height.getVelocity();
      animation?.stop();
      if (!initialized.current || instant) {
        height.jump(next);
      } else {
        animation = animate(height, next, {
          ...panelSpring,
          velocity,
        });
      }
      initialized.current = true;
    };
    retarget();
    const observer = new ResizeObserver(retarget);
    if (open) observer.observe(content);
    return () => {
      observer.disconnect();
      animation?.stop();
    };
  }, [height, open, present, reducedMotion]);

  useLayoutEffect(() => {
    if (closed && !open && hiddenUntilFound)
      panelRef.current?.setAttribute("hidden", "until-found");
  }, [closed, hiddenUntilFound, open]);

  const { ref, style, ...props } = elementProps;
  return useRender({
    defaultTagName: "div",
    render,
    state: { ...state },
    ref: [panelRef, ref ?? null],
    enabled: present,
    props: {
      ...props,
      hidden: closed && !open && !hiddenUntilFound,
      "aria-hidden": !open || undefined,
      inert: (!open && !(closed && hiddenUntilFound)) || undefined,
      style: { ...style, height: initialOpen ? "auto" : 0 },
    },
  });
}
