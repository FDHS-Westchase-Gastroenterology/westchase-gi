"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { PanelLeft } from "@/components/icons";
import {
  Sidebar,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";

/* The desktop sidebar and its compact rail (issue #351; Figma S5 1366×768
   and 1280×800 frames), on ui/sidebar in its icon mode (issue #360). Below
   1366px wide the sidebar folds to a 72px rail of the same destinations,
   each named by a tooltip on hover and focus (HIG Sidebars: consider
   collapsing it as the window narrows; let people show it again with the
   sidebar button).

   The sidebar button brings the full sidebar back over the canvas, as an
   iPad sidebar does in a compact window: the canvas keeps its width, focus
   moves to the current destination, and Escape, a press outside, focus
   leaving it or a move to another page puts it away, returning focus to
   the button unless it left on its own. Opened or put away from the
   keyboard, it moves at once. At 1366px and wider the sidebar is always
   whole and the button is gone. The layout is CSS alone
   (portal-workbench.css), so the rail holds without JavaScript; the recipe
   adds the button, the tooltips, the dismissals and the focus. */

const RAIL = "(min-width: 60rem) and (max-width: 85.3125rem)";

export function PortalSidebar({ children }: Readonly<{ children: ReactNode }>) {
  const pathname = usePathname();
  return (
    <SidebarProvider iconQuery={RAIL} location={pathname}>
      <Sidebar
        id="portal-sidebar"
        className="portal-sidebar print-hide"
        aria-label="Portal workspace"
      >
        {children}
        <SidebarRail />
      </Sidebar>
    </SidebarProvider>
  );
}

/** The sidebar button: shows the full sidebar over the canvas, or hides it. */
export function SidebarToggle() {
  const { open } = useSidebar();
  const label = open ? "Hide sidebar" : "Show sidebar";
  return (
    <SidebarTrigger
      tooltip={label}
      className="portal-sidebar-toggle"
      aria-label={label}
      aria-controls="portal-sidebar"
    >
      <PanelLeft className="h-5 w-5" />
    </SidebarTrigger>
  );
}
