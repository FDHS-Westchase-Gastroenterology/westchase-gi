/* Node test-runner loader for this repository's TypeScript modules.

   Registered once by `npm run test:unit` (`node --import ./test/register.mjs`),
   so a unit test can `import` a product module exactly the way the app does:
   `@/` resolves to `src/`, extensionless relative imports resolve to `.ts`,
   the `server-only` / `client-only` markers become empty modules, and JSON
   modules get the import attribute the bundler adds for them. Node strips
   the types itself; nothing here transpiles. */
import { register } from "node:module";
import { pathToFileURL } from "node:url";

const srcRoot = new URL("../src/", import.meta.url).href;

register(
  `data:text/javascript,${encodeURIComponent(`
    const srcRoot = ${JSON.stringify(srcRoot)};
    const empty = { url: "data:text/javascript,export%20{}", shortCircuit: true };
    export async function resolve(specifier, context, nextResolve) {
      if (specifier === "server-only" || specifier === "client-only") return empty;
      if (specifier.startsWith("@/")) specifier = srcRoot + specifier.slice(2);
      if (specifier.endsWith(".json")) {
        const resolved = await nextResolve(specifier, context);
        return { ...resolved, importAttributes: { type: "json" } };
      }
      const relative =
        specifier.startsWith("./") || specifier.startsWith("../") || specifier.startsWith("file:");
      if (relative && !/\\.(?:[cm]?[jt]sx?|json)$/.test(specifier)) {
        try {
          return await nextResolve(specifier + ".ts", context);
        } catch {
          // Not a .ts module; fall through to the default resolution.
        }
      }
      return nextResolve(specifier, context);
    }
  `)}`,
  pathToFileURL("./"),
);
