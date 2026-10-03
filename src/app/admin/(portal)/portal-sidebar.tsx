"use client";

import { usePathname } from "next/navigation";
import {
  createContext,
  use,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type { FocusEvent, ReactElement, ReactNode } from "react";

import { PanelLeft } from "@/components/icons";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/* The desktop sidebar and its compact rail (issue #351; Figma S5 1366×768
   and 1280×800 frames). Below 1366px wide the sidebar folds to a 72px rail
   of the same destinations, each named by a tooltip on hover and focus
   (HIG Sidebars: consider collapsing it as the window narrows; let people
   show it again with the sidebar button).

   The sidebar button brings the full sidebar back over the canvas, as an
   iPad sidebar does in a compact window: the canvas keeps its width, and
   Escape, a press outside, focus leaving it or a move to another page puts
   it away. Opened or put away from the keyboard, it moves at once. At
   1366px and wider the sidebar is always whole and the button
   is gone. The layout is CSS alone (portal-workbench.css), so the rail
   holds without JavaScript; this component adds the button, the tooltips
   and the dismissals. */

const RAIL = "(min-width: 60rem) and (max-width: 85.3125rem)";

function subscribe(onChange: () => void) {
  const query = window.matchMedia(RAIL);
  query.addEventListener("change", onChange);
  return () => {
    query.removeEventListener("change", onChange);
  };
}

interface SidebarState {
  /** The rail is showing: labels live in tooltips. */
  readonly rail: boolean;
  readonly expanded: boolean;
  /** Shows or hides the full sidebar; `keyed` skips the transition. */
  readonly toggle: (keyed: boolean) => void;
}

const SidebarContext = createContext<SidebarState>({
  rail: false,
  expanded: false,
  toggle: () => {},
});

export function PortalSidebar({ children }: Readonly<{ children: ReactNode }>) {
  const pathname = usePathname();
  const narrow = useSyncExternalStore(
    subscribe,
    () => window.matchMedia(RAIL).matches,
    () => false,
  );
  /* The page the sidebar was opened on: moving to another page puts it
     away without an effect. */
  const [openOn, setOpenOn] = useState<string | null>(null);
  const expanded = narrow && openOn === pathname;
  /* The last open or close came from the keyboard. */
  const [keyed, setKeyed] = useState(false);
  const aside = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!expanded) return undefined;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !event.defaultPrevented) {
        setKeyed(true);
        setOpenOn(null);
      }
    }
    // oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- DOM events carry member types that cannot be made readonly
    function onPointerDown(event: PointerEvent) {
      if (event.target instanceof Node && aside.current?.contains(event.target) !== true) {
        setKeyed(false);
        setOpenOn(null);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [expanded]);

  const state = useMemo<SidebarState>(
    () => ({
      rail: narrow && !expanded,
      expanded,
      toggle: (byKey) => {
        setKeyed(byKey);
        setOpenOn(expanded ? null : pathname);
      },
    }),
    [narrow, expanded, pathname],
  );

  // oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React events carry DOM member types that cannot be made readonly
  function onBlur(event: FocusEvent<HTMLElement>) {
    const next = event.relatedTarget;
    if (expanded && next instanceof Node && !event.currentTarget.contains(next)) {
      setKeyed(true);
      setOpenOn(null);
    }
  }

  return (
    <SidebarContext value={state}>
      <aside
        ref={aside}
        id="portal-sidebar"
        className="portal-sidebar print-hide"
        aria-label="Portal workspace"
        data-expanded={expanded || undefined}
        data-instant={keyed || undefined}
        onBlur={onBlur}
      >
        {children}
      </aside>
    </SidebarContext>
  );
}

/** Names a rail control beside it while the labels are folded away. */
// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React elements carry framework member types that cannot be made readonly
export function RailTip({ label, children }: Readonly<{ label: string; children: ReactElement }>) {
  const { rail } = use(SidebarContext);
  return (
    <Tooltip disabled={!rail}>
      <TooltipTrigger render={children} />
      <TooltipContent side="right" sideOffset={10}>
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

/** The sidebar button: shows the full sidebar over the canvas, or hides it. */
export function SidebarToggle() {
  const { expanded, toggle } = use(SidebarContext);
  const label = expanded ? "Hide sidebar" : "Show sidebar";
  return (
    <RailTip label={label}>
      <button
        type="button"
        className="portal-sidebar-toggle"
        aria-label={label}
        aria-expanded={expanded}
        aria-controls="portal-sidebar"
        onClick={(event) => {
          /* A click with no pointer press behind it is Return or Space. */
          toggle(event.detail === 0);
        }}
      >
        <PanelLeft className="h-5 w-5" />
      </button>
    </RailTip>
  );
}
