/* Vendors the entire shadcn/ui registry (Base UI variant, `base-nova`) into
   src/components/stock/ exactly as it comes out of the box.

   Why a separate tier: DESIGN.md "Component tiers". `stock/` is the
   before; `ui/` is the after. Nothing in stock/ is ever hand-edited — this
   script regenerates it, and the design gallery (/design) renders the two
   tiers side by side so a stock/brand difference is always feelable.

   How it works: the shadcn CLI resolves every install path from the
   aliases in components.json. The script points those aliases at the stock
   tier for the duration of one run, installs every `ui` item plus every
   `example` item, then restores components.json byte for byte. The brand
   token bridge in src/app/globals.css is hashed before and after; a change
   aborts the run, because the CLI must never repaint the palette
   (AGENTS.md "shadcn/ui").

   Usage: node scripts/design-system/sync-stock.mjs [--dry-run] */

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const configPath = path.join(root, "components.json");
const cssPath = path.join(root, "src/app/globals.css");
const stockDir = path.join(root, "src/components/stock");
const manifestPath = path.join(stockDir, "MANIFEST.json");
const dryRun = process.argv.includes("--dry-run");

/* Registry examples that depend on the Vercel AI SDK (`ai`, `@ai-sdk/react`,
   a generated `@/lib/ai`). The practice site carries no AI stack (PRODUCT.md
   "Anti-references"), so these stay out. The ui items they demonstrate are
   still vendored. */
const excludedExamples = {
  "bubble-example": "requires the Vercel AI SDK",
  "marker-example": "requires the Vercel AI SDK",
  "message-example": "requires the Vercel AI SDK",
  "message-scroller-example": "requires the Vercel AI SDK",
  "questionnaire-example": "requires the Vercel AI SDK",
};

function sha(file) {
  return createHash("sha256").update(readFileSync(file)).digest("hex");
}

function shadcn(args, { capture = false } = {}) {
  const options = { cwd: root, encoding: "utf8", stdio: capture ? "pipe" : "inherit" };
  return execFileSync("npx", ["shadcn", ...args], options);
}

/* `example` is not a filterable type on the CLI, so examples are found by
   query and then filtered by the type the search prints beside each item. */
function listRegistry(type, query) {
  const args = ["search", "@shadcn", "-l", "200"];
  if (type !== "example") args.push("-t", type);
  if (query) args.push("-q", query);
  const out = shadcn(args, { capture: true });
  const names = new Set();
  for (const match of out.matchAll(/@shadcn\/([a-z0-9-]+) \((\w+)\)/g)) {
    if (match[2] === type) names.add(match[1]);
  }
  return [...names].sort();
}

const originalConfig = readFileSync(configPath, "utf8");
const config = JSON.parse(originalConfig);
const stockConfig = {
  ...config,
  aliases: {
    ...config.aliases,
    ui: "@/components/stock",
    components: "@/components/stock/examples",
    hooks: "@/components/stock/hooks",
  },
};

const cssBefore = sha(cssPath);
const uiItems = listRegistry("ui");
const exampleItems = listRegistry("example", "example").filter(
  (name) => !(name in excludedExamples),
);

console.log(`registry: ${uiItems.length} ui items, ${exampleItems.length} examples`);
if (dryRun) {
  console.log(uiItems.join(" "));
  console.log(exampleItems.join(" "));
  process.exit(0);
}

const failures = [];
try {
  // Start from nothing so an item the registry retired does not linger.
  if (existsSync(stockDir)) rmSync(stockDir, { recursive: true });
  mkdirSync(stockDir, { recursive: true });
  writeFileSync(configPath, JSON.stringify(stockConfig, null, 2) + "\n");

  shadcn(["add", ...uiItems.map((n) => `@shadcn/${n}`), "--overwrite", "--yes", "--silent"]);

  /* Examples install one at a time so a single registry miss cannot abort
     the whole tier. */
  for (const name of exampleItems) {
    try {
      shadcn(["add", `@shadcn/${name}`, "--overwrite", "--yes", "--silent"]);
    } catch (error) {
      failures.push(name);
      console.error(`example ${name} failed: ${error.message}`);
    }
  }
} finally {
  writeFileSync(configPath, originalConfig);
}

if (sha(cssPath) !== cssBefore) {
  console.error(
    "sync-stock: the shadcn CLI modified src/app/globals.css. Revert it before committing — " +
      'the brand token bridge is hands-off (AGENTS.md "shadcn/ui").',
  );
  process.exitCode = 1;
}

/* The registry lists a few items the Base UI style has no file for (`form`
   is Radix/react-hook-form only); the manifest records what actually landed. */
const landedUi = uiItems.filter((name) => existsSync(path.join(stockDir, `${name}.tsx`)));
const landedExamples = exampleItems.filter(
  (name) => !failures.includes(name) && existsSync(path.join(stockDir, "examples", `${name}.tsx`)),
);

const shadcnVersion = JSON.parse(
  readFileSync(path.join(root, "node_modules/shadcn/package.json"), "utf8"),
).version;

writeFileSync(
  manifestPath,
  JSON.stringify(
    {
      generatedBy: "scripts/design-system/sync-stock.mjs",
      shadcn: shadcnVersion,
      style: config.style,
      syncedAt: new Date().toISOString().slice(0, 10),
      ui: landedUi,
      examples: landedExamples,
      skippedUi: uiItems.filter((name) => !landedUi.includes(name)),
      excludedExamples,
      failedExamples: failures,
    },
    null,
    2,
  ) + "\n",
);

console.log(
  `stock tier written to src/components/stock (${landedUi.length} ui, ${landedExamples.length} examples)`,
);
