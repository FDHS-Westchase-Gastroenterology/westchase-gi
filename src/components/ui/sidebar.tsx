"use client";

import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { cn } from "cn";
import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type { ComponentProps, FocusEvent, ReactElement, ReactNode, RefObject } from "react";

import { Tooltip, TooltipContent, TooltipTrigger } from "./tooltip";

/*
 * A sidebar: the portal's persistent index of destinations, which folds to
 * a rail of icons when the window narrows and lays itself back over the
 * canvas from the sidebar button (issue #351; adopted here by issue #360).
 * Adapted from the shadcn Sidebar (src/components/stock/sidebar.tsx) in
 * its `collapsible="icon"` mode.
 *
 * Changes from the registry:
 * - Icon mode follows a media query (`iconQuery`), not a stored preference:
 *   inside it the sidebar is collapsed until the trigger opens it, and the
 *   open sidebar lies over the canvas rather than pushing it. Escape, a
 *   press outside, focus leaving it or a change of `location` (the page)
 *   collapses it. Opening moves focus to the current destination (else the
 *   first); collapsing by Escape, an outside press or a move to another
 *   page returns focus to the trigger. Focus that leaves on its own stays
 *   where it went. The registry's cookie and ⌘B shortcut are left out.
 * - The provider renders no wrapper: the shell already lays out the
 *   sidebar beside its stage. The mobile sheet path and SidebarMenuSkeleton
 *   are left out; the phone has its own bar, and skeletons are authored per
 *   surface (design-system/adoption.md "Standing findings").
 * - No paint. The registry's utilities would outrank the shell's layered
 *   CSS, so the sidebar's frame, rail and links are drawn in
 *   portal-workbench.css on the navy `--sidebar-*` bridge. The parts carry
 *   the registry's data attributes (data-state, data-collapsible,
 *   data-sidebar, data-active) for that CSS and for tests.
 * - SidebarRail, the edge that opens or collapses it under a pointer, is
 *   inside the sidebar's edge rather than straddling it (the sidebar clips
 *   its overflow) and hidden from assistive technology.
 * - Navigation stays links: SidebarMenuButton renders whatever `render`
 *   names (a Next Link with aria-current), and its tooltip names it only
 *   while the sidebar is collapsed to icons.
 *
 * The open/collapse transition belongs to the shell's CSS (the staff
 * home's base beat opening, fast beat closing, on --motion-standard);
 * `data-instant` marks an open or collapse that came from the keyboard, so
 * it moves at once. Reduced motion: the blanket reset in globals.css.
 */

type CloseReason = "blur" | "escape" | "outside" | "toggle";

interface SidebarContextValue {
  readonly state: "collapsed" | "expanded";
  /** Icon mode is in force: the sidebar is a rail, or lies over the canvas from it. */
  readonly iconMode: boolean;
  readonly open: boolean;
  /** The last open or collapse came from the keyboard. */
  readonly instant: boolean;
  /** Opens or collapses the sidebar; `byKey` skips the transition. */
  readonly toggleSidebar: (byKey: boolean) => void;
  readonly close: (reason: CloseReason, byKey: boolean) => void;
  readonly closedBy: RefObject<CloseReason | null>;
  readonly triggerRef: RefObject<HTMLButtonElement | null>;
}

const SidebarContext = createContext<SidebarContextValue | null>(null);

function useSidebar(): SidebarContextValue {
  const context = use(SidebarContext);
  if (!context) throw new Error("useSidebar must be used within a SidebarProvider.");
  return context;
}

function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => {
        list.removeEventListener("change", onChange);
      };
    },
    [query],
  );
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}

function SidebarProvider({
  iconQuery,
  location,
  children,
}: Readonly<{
  /** The media query inside which the sidebar folds to its icon rail. */
  iconQuery: string;
  /** The current page: a change collapses an open sidebar. */
  location: string;
  children: ReactNode;
}>) {
  const iconMode = useMediaQuery(iconQuery);
  /* The page the sidebar was opened on: a move to another page collapses
     it without an effect. */
  const [openOn, setOpenOn] = useState<string | null>(null);
  const [instant, setInstant] = useState(false);
  const closedBy = useRef<CloseReason | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const open = iconMode && openOn === location;

  const value = useMemo<SidebarContextValue>(
    () => ({
      state: iconMode && !open ? "collapsed" : "expanded",
      iconMode,
      open,
      instant,
      toggleSidebar: (byKey) => {
        closedBy.current = open ? "toggle" : null;
        setInstant(byKey);
        setOpenOn(open ? null : location);
      },
      close: (reason, byKey) => {
        closedBy.current = reason;
        setInstant(byKey);
        setOpenOn(null);
      },
      closedBy,
      triggerRef,
    }),
    [iconMode, open, instant, location],
  );

  return <SidebarContext value={value}>{children}</SidebarContext>;
}

/** The current destination on screen, else the first, inside the sidebar. */
function firstStop(sidebar: HTMLElement): HTMLElement | undefined {
  const shown = [...sidebar.querySelectorAll<HTMLElement>('[data-sidebar="menu-button"]')].filter(
    (button) => button.checkVisibility(),
  );
  return shown.find((button) => button.hasAttribute("data-active")) ?? shown.at(0);
}

/** Focus has nowhere of its own: it sits on the body or inside the sidebar. */
function focusIsAdrift(sidebar: HTMLElement): boolean {
  const active = document.activeElement;
  return active === null || active === document.body || sidebar.contains(active);
}

/* Moves focus in as the sidebar opens, and back to the trigger as it
   collapses, unless focus left on its own. */
function useSidebarFocus(sidebar: RefObject<HTMLElement | null>) {
  const { open, closedBy, triggerRef } = useSidebar();
  const wasOpen = useRef(open);

  useEffect(() => {
    const element = sidebar.current;
    if (element === null || wasOpen.current === open) return;
    wasOpen.current = open;
    if (open) {
      firstStop(element)?.focus({ preventScroll: true });
    } else if (closedBy.current !== "blur" && focusIsAdrift(element)) {
      triggerRef.current?.focus({ preventScroll: true });
    }
    closedBy.current = null;
  }, [open, sidebar, closedBy, triggerRef]);
}

/* While open: Escape and a press outside collapse it. A press on nothing
   focusable leaves focus on the body once the press lands, so the trigger
   takes it back then. */
function useSidebarDismissal(sidebar: RefObject<HTMLElement | null>) {
  const { open, close, triggerRef } = useSidebar();

  useEffect(() => {
    if (!open) return undefined;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !event.defaultPrevented) close("escape", true);
    }
    // oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- DOM events carry member types that cannot be made readonly
    function onPointerDown(event: PointerEvent) {
      const element = sidebar.current;
      if (element === null || !(event.target instanceof Node) || element.contains(event.target)) {
        return;
      }
      close("outside", false);
      /* Not cleared on cleanup: the collapse this press causes runs the
         cleanup before the press lands. */
      window.setTimeout(() => {
        if (document.activeElement === document.body) {
          triggerRef.current?.focus({ preventScroll: true });
        }
      });
    }
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open, close, sidebar, triggerRef]);
}

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React props carry framework member types that cannot be made readonly
function Sidebar({
  collapsible = "icon",
  className,
  onBlur,
  ...props
}: ComponentProps<"aside"> & { collapsible?: "icon" }) {
  const { state, open, iconMode, instant, close } = useSidebar();
  const sidebar = useRef<HTMLElement>(null);
  useSidebarFocus(sidebar);
  useSidebarDismissal(sidebar);

  return (
    <aside
      ref={sidebar}
      data-slot="sidebar"
      data-state={state}
      data-collapsible={state === "collapsed" ? collapsible : ""}
      data-expanded={(iconMode && open) || undefined}
      data-instant={instant || undefined}
      className={cn(className)}
      // oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React events carry DOM member types that cannot be made readonly
      onBlur={(event: FocusEvent<HTMLElement>) => {
        onBlur?.(event);
        const next = event.relatedTarget;
        if (open && next instanceof Node && !event.currentTarget.contains(next)) {
          close("blur", true);
        }
      }}
      {...props}
    />
  );
}

/** Names a control beside it while the sidebar is collapsed to icons. */
// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React elements carry framework member types that cannot be made readonly
function SidebarTooltip({ label, trigger }: Readonly<{ label: string; trigger: ReactElement }>) {
  const { state } = useSidebar();
  return (
    <Tooltip disabled={state !== "collapsed"}>
      {trigger}
      <TooltipContent side="right" sideOffset={10}>
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React props carry framework member types that cannot be made readonly
function SidebarTrigger({
  tooltip,
  className,
  onClick,
  ...props
}: ComponentProps<"button"> & { tooltip?: string }) {
  const { open, toggleSidebar, triggerRef } = useSidebar();
  const button = (
    <button
      ref={triggerRef}
      type="button"
      data-slot="sidebar-trigger"
      data-sidebar="trigger"
      aria-expanded={open}
      className={cn(className)}
      onClick={(event) => {
        onClick?.(event);
        /* A click with no pointer press behind it is Return or Space. */
        toggleSidebar(event.detail === 0);
      }}
      {...props}
    />
  );
  if (tooltip === undefined) return button;
  return <SidebarTooltip label={tooltip} trigger={<TooltipTrigger render={button} />} />;
}

/** The sidebar's edge: a pointer target that opens or collapses it, in icon
    mode only. Hidden from assistive technology, where the trigger already
    does the same (the registry names it, which reads as a second button). */
// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React props carry framework member types that cannot be made readonly
function SidebarRail({ className, ...props }: ComponentProps<"button">) {
  const { iconMode, open, toggleSidebar } = useSidebar();
  if (!iconMode) return null;
  return (
    <button
      type="button"
      data-slot="sidebar-rail"
      data-sidebar="rail"
      aria-hidden="true"
      tabIndex={-1}
      title={open ? "Hide sidebar" : "Show sidebar"}
      onClick={() => {
        toggleSidebar(false);
      }}
      className={cn(
        "absolute inset-y-0 right-0 z-10 w-2 cursor-e-resize",
        "after:absolute after:inset-y-0 after:right-0 after:w-[2px] hover:after:bg-sidebar-border",
        "in-data-expanded:cursor-w-resize",
        className,
      )}
      {...props}
    />
  );
}

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React props carry framework member types that cannot be made readonly
function SidebarMenu({ className, ...props }: ComponentProps<"ul">) {
  return <ul data-slot="sidebar-menu" data-sidebar="menu" className={cn(className)} {...props} />;
}

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React props carry framework member types that cannot be made readonly
function SidebarMenuItem({ className, ...props }: ComponentProps<"li">) {
  return (
    <li
      data-slot="sidebar-menu-item"
      data-sidebar="menu-item"
      className={cn(className)}
      {...props}
    />
  );
}

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React props carry framework member types that cannot be made readonly
function SidebarMenuButton({
  render,
  isActive = false,
  tooltip,
  className,
  ...props
}: useRender.ComponentProps<"button"> & {
  isActive?: boolean;
  /** The destination's name, shown beside it while the sidebar is collapsed. */
  tooltip?: string;
}) {
  const element = useRender({
    defaultTagName: "button",
    props: mergeProps<"button">({ className: cn(className) }, props),
    render: tooltip === undefined ? render : <TooltipTrigger render={render} />,
    state: { slot: "sidebar-menu-button", sidebar: "menu-button", active: isActive },
  });
  if (tooltip === undefined) return element;
  return <SidebarTooltip label={tooltip} trigger={element} />;
}

export {
  Sidebar,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
};
