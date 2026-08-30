/* Lazy loaders for the vendored registry examples, keyed by example name.
   Split across the family files so each stays under the import budget; the
   gallery resolves one per page, so nothing here reaches a route bundle
   until that component's page is requested. */

import type { ComponentType } from "react";

export type ExampleLoader = () => Promise<{ readonly default: ComponentType }>;
