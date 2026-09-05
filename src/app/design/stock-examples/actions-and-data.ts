import type { ExampleLoader } from "./loaders";

export const actionsAndData: readonly (readonly [string, ExampleLoader])[] = [
  ["button-example", async () => import("@/components/stock/examples/button-example")],
  ["button-group-example", async () => import("@/components/stock/examples/button-group-example")],
  ["toggle-example", async () => import("@/components/stock/examples/toggle-example")],
  ["toggle-group-example", async () => import("@/components/stock/examples/toggle-group-example")],
  ["kbd-example", async () => import("@/components/stock/examples/kbd-example")],
  ["badge-example", async () => import("@/components/stock/examples/badge-example")],
  ["card-example", async () => import("@/components/stock/examples/card-example")],
  ["table-example", async () => import("@/components/stock/examples/table-example")],
  ["item-example", async () => import("@/components/stock/examples/item-example")],
  ["avatar-example", async () => import("@/components/stock/examples/avatar-example")],
  ["empty-example", async () => import("@/components/stock/examples/empty-example")],
  ["skeleton-example", async () => import("@/components/stock/examples/skeleton-example")],
  ["spinner-example", async () => import("@/components/stock/examples/spinner-example")],
  ["progress-example", async () => import("@/components/stock/examples/progress-example")],
  ["chart-example", async () => import("@/components/stock/examples/chart-example")],
  ["aspect-ratio-example", async () => import("@/components/stock/examples/aspect-ratio-example")],
  ["separator-example", async () => import("@/components/stock/examples/separator-example")],
];
