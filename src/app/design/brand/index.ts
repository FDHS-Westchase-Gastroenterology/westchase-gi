/* The brand side of the gallery, keyed by registry slug: one demo per
   component that has a brand recipe in src/components/ui/. Adding a
   brand adaptation means adding a row here so the before/after exists. */

import type { ExampleLoader } from "@/app/design/stock-examples/loaders";

export const brandExamples: ReadonlyMap<string, ExampleLoader> = new Map<string, ExampleLoader>([
  ["button", async () => import("./button")],
  ["badge", async () => import("./badge")],
  ["input", async () => import("./input")],
  ["textarea", async () => import("./textarea")],
  ["native-select", async () => import("./native-select")],
  ["field", async () => import("./field")],
  ["label", async () => import("./label")],
  ["separator", async () => import("./separator")],
  ["table", async () => import("./table")],
  ["card", async () => import("./card")],
  ["item", async () => import("./item")],
]);
