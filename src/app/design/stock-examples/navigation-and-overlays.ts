import type { ExampleLoader } from "./loaders";

export const navigationAndOverlays: readonly (readonly [string, ExampleLoader])[] = [
  ["breadcrumb-example", async () => import("@/components/stock/examples/breadcrumb-example")],
  [
    "navigation-menu-example",
    async () => import("@/components/stock/examples/navigation-menu-example"),
  ],
  ["sidebar-example", async () => import("@/components/stock/examples/sidebar-example")],
  ["tabs-example", async () => import("@/components/stock/examples/tabs-example")],
  ["pagination-example", async () => import("@/components/stock/examples/pagination-example")],
  ["menubar-example", async () => import("@/components/stock/examples/menubar-example")],
  ["command-example", async () => import("@/components/stock/examples/command-example")],
  ["dialog-example", async () => import("@/components/stock/examples/dialog-example")],
  ["alert-dialog-example", async () => import("@/components/stock/examples/alert-dialog-example")],
  ["sheet-example", async () => import("@/components/stock/examples/sheet-example")],
  ["drawer-example", async () => import("@/components/stock/examples/drawer-example")],
  ["popover-example", async () => import("@/components/stock/examples/popover-example")],
  ["hover-card-example", async () => import("@/components/stock/examples/hover-card-example")],
  ["tooltip-example", async () => import("@/components/stock/examples/tooltip-example")],
  [
    "dropdown-menu-example",
    async () => import("@/components/stock/examples/dropdown-menu-example"),
  ],
  ["context-menu-example", async () => import("@/components/stock/examples/context-menu-example")],
];
