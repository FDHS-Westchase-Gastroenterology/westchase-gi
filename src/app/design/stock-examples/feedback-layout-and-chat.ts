import type { ExampleLoader } from "./loaders";

export const feedbackLayoutAndChat: readonly (readonly [string, ExampleLoader])[] = [
  ["alert-example", async () => import("@/components/stock/examples/alert-example")],
  ["toast-example", async () => import("@/components/stock/examples/toast-example")],
  ["sonner-example", async () => import("@/components/stock/examples/sonner-example")],
  ["accordion-example", async () => import("@/components/stock/examples/accordion-example")],
  ["collapsible-example", async () => import("@/components/stock/examples/collapsible-example")],
  ["scroll-area-example", async () => import("@/components/stock/examples/scroll-area-example")],
  ["resizable-example", async () => import("@/components/stock/examples/resizable-example")],
  ["carousel-example", async () => import("@/components/stock/examples/carousel-example")],
  ["attachment-example", async () => import("@/components/stock/examples/attachment-example")],
];
