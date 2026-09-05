import { actionsAndData } from "./actions-and-data";
import { feedbackLayoutAndChat } from "./feedback-layout-and-chat";
import { forms } from "./forms";
import type { ExampleLoader } from "./loaders";
import { navigationAndOverlays } from "./navigation-and-overlays";

export const stockExamples: ReadonlyMap<string, ExampleLoader> = new Map<string, ExampleLoader>([
  ...actionsAndData,
  ...forms,
  ...navigationAndOverlays,
  ...feedbackLayoutAndChat,
]);
