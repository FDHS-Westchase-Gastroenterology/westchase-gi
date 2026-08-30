import type { ExampleLoader } from "./loaders";

export const forms: readonly (readonly [string, ExampleLoader])[] = [
  ["input-example", async () => import("@/components/stock/examples/input-example")],
  ["textarea-example", async () => import("@/components/stock/examples/textarea-example")],
  [
    "native-select-example",
    async () => import("@/components/stock/examples/native-select-example"),
  ],
  ["field-example", async () => import("@/components/stock/examples/field-example")],
  ["label-example", async () => import("@/components/stock/examples/label-example")],
  ["select-example", async () => import("@/components/stock/examples/select-example")],
  ["combobox-example", async () => import("@/components/stock/examples/combobox-example")],
  ["checkbox-example", async () => import("@/components/stock/examples/checkbox-example")],
  ["radio-group-example", async () => import("@/components/stock/examples/radio-group-example")],
  ["switch-example", async () => import("@/components/stock/examples/switch-example")],
  ["slider-example", async () => import("@/components/stock/examples/slider-example")],
  ["input-group-example", async () => import("@/components/stock/examples/input-group-example")],
  ["input-otp-example", async () => import("@/components/stock/examples/input-otp-example")],
  ["calendar-example", async () => import("@/components/stock/examples/calendar-example")],
];
