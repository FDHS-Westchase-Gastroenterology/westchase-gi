/**
 * Fixture suite for the design-system docs check.
 *
 * The parsers are tested against the Markdown and comment forms the repository actually
 * writes: headings with code and links, citations wrapped across comment lines, fences with
 * misuse examples, "Real uses" tables and call-site restyle tables. In-memory repositories
 * exercise every `check` rule, and the last test runs the check over this checkout, so a doc
 * that drifts from the code fails `npm run test:unit` as well as `npm run design-system:check`.
 *
 * Run: node --test scripts/design-system-docs.test.mjs   (also part of npm run test:unit)
 */

import assert from "node:assert/strict";
import { test, describe } from "node:test";

import {
  BEGIN,
  END,
  blank,
  checkRepo,
  citations,
  docsSet,
  fencedBlocks,
  headings,
  inlineCodeSpans,
  inventory,
  loadRepo,
  markdownParts,
  measureCss,
  parseCss,
  realUseRows,
  renderInventory,
  resolveDestination,
  restyleRows,
  sections,
  setsLook,
  slugify,
  unreferencedRules,
} from "./design-system-docs.mjs";

/* ------------------------------------------------------------------ fixtures */

function memoryRepo(contents) {
  const byPath = new Map(Object.entries(contents));
  return { files: [...byPath.keys()].toSorted(), read: (path) => byPath.get(path) };
}

const problemsOf = (repo) =>
  checkRepo(repo)
    .map(({ file, line, message }) => `${file}:${line}  ${message}`)
    .toSorted();

const CHIP = [
  '"use client";',
  "",
  'import { Thing } from "@base-ui/react/thing";',
  'import { cva } from "class-variance-authority";',
  'import type { VariantProps } from "class-variance-authority";',
  'import { cn } from "cn";',
  "",
  'const chipVariants = cva("inline-flex", {',
  "  variants: {",
  '    tone: { calm: "bg-mint", loud: "bg-amber" },',
  '    size: { sm: "h-6", md: "h-8" },',
  "  },",
  '  defaultVariants: { tone: "calm", size: "md" },',
  "});",
  "",
  "type ChipProps = VariantProps<typeof chipVariants> & {",
  '  density?: "roomy" | "tight";',
  '  tone: NonNullable<VariantProps<typeof chipVariants>["tone"]>;',
  "};",
  "",
  'function Chip({ className, size = "sm", ...props }: ChipProps & { className?: string }) {',
  "  return <Thing.Root className={cn(chipVariants({ size, tone: props.tone }), className)} />;",
  "}",
  "",
  'function ChipGroup({ orientation = "horizontal" }: { orientation?: string }) {',
  "  return <div data-orientation={orientation} />;",
  "}",
  "",
  "export { Chip, ChipGroup, chipVariants };",
  "export type { ChipProps };",
  "",
].join("\n");

/* ------------------------------------------------------------------ markdown */

describe("headings and sections", () => {
  test("anchors follow GitHub's slugs", () => {
    assert.equal(slugify("Where does this belong?"), "where-does-this-belong");
    assert.equal(slugify("A — B"), "a--b");
    const found = headings("## `ui/` recipes\n\n## See [Motion](#motion)\n\n## snake_case_name\n");
    assert.deepEqual(
      found.map((heading) => heading.anchor),
      ["ui-recipes", "see-motion", "snake_case_name"],
    );
  });

  test("duplicate headings are numbered and fenced ones are ignored", () => {
    const text = "# Example\n\n```md\n# Not a heading\n```\n\n## Example\n";
    assert.deepEqual(
      headings(text).map((heading) => heading.anchor),
      ["example", "example-1"],
    );
  });

  test("bold lead-ins count as sections", () => {
    const keys = sections("## Motion\n\n- **Buttons feel pressed.** They lift.\n");
    assert.ok(keys.has("motion"));
    assert.ok(keys.has("buttons feel pressed"));
  });
});

describe("fences and inline code", () => {
  test("a fence closes on a marker at least as long as its opener", () => {
    const [block] = fencedBlocks("````\n```\nx\n````\n");
    assert.equal(block.body, "```\nx");
  });

  test("an unclosed fence runs to the end, and a backtick info string is not a fence", () => {
    assert.deepEqual(
      fencedBlocks("```\nabc\n").map((block) => block.body),
      ["abc\n"],
    );
    assert.deepEqual(fencedBlocks("```a`b```\n"), []);
    assert.equal(fencedBlocks("~~~js `x`\ncode\n~~~\n")[0].info, "js `x`");
  });

  test("inline spans match runs of equal length inside one paragraph", () => {
    assert.deepEqual(inlineCodeSpans("a `b` c"), [{ start: 2, end: 5, content: "b" }]);
    assert.deepEqual(
      inlineCodeSpans("it`s here\n\nand `code`").map((span) => span.content),
      ["code"],
    );
    assert.deepEqual(
      inlineCodeSpans("``a ` b`` and `` `x` ``").map((span) => span.content),
      ["a ` b", "`x`"],
    );
  });

  test("blanking keeps offsets and newlines", () => {
    assert.equal(blank("ab\ncd", [{ start: 1, end: 4 }]), "a \n d");
    const { prose } = markdownParts("see `[x](y.md)` and [z](w.md)");
    assert.ok(!prose.includes("[x](y.md)"));
    assert.ok(prose.includes("[z](w.md)"));
  });

  test("the docs set is DESIGN.md plus the guides directly under design-system/", () => {
    const files = [
      "DESIGN.md",
      "README.md",
      "design-system/archive/old.md",
      "design-system/data.json",
      "design-system/motion.md",
    ];
    assert.deepEqual(docsSet(files), ["DESIGN.md", "design-system/motion.md"]);
  });
});

/* ---------------------------------------------------------- links, citations */

describe("links and citations", () => {
  test("destinations resolve against the linking file", () => {
    assert.deepEqual(
      resolveDestination("design-system/a.md", "../src/app/admin/(portal)/x.tsx#L3"),
      { path: "src/app/admin/(portal)/x.tsx", anchor: "L3" },
    );
    assert.deepEqual(resolveDestination("design-system/motion.md", "#reduced-motion"), {
      path: "design-system/motion.md",
      anchor: "reduced-motion",
    });
    assert.equal(resolveDestination("DESIGN.md", "design-system/").path, "design-system");
    assert.equal(resolveDestination("DESIGN.md", "a%20b.md").path, "a b.md");
    assert.equal(resolveDestination("DESIGN.md", "https://example.com/a"), null);
    assert.equal(resolveDestination("AGENTS.md", "DESIGN.md:15").path, "DESIGN.md:15");
  });

  test("citations join sections wrapped across comment lines", () => {
    const block = ' * decoupled (DESIGN.md "Component API\n * rules"), mirroring Input';
    assert.deepEqual(
      citations(block).map(({ doc, section }) => [doc, section]),
      [["DESIGN.md", "Component API rules"]],
    );
    assert.deepEqual(
      citations('// See DESIGN.md "Where does\n// this belong?"').map(({ section }) => section),
      ["Where does this belong?"],
    );
  });

  test("citations accept backticks, relative prefixes and curly quotes", () => {
    const text = [
      '`DESIGN.md` "Adoption"',
      '../design-system/motion.md "Reduced motion"',
      "DESIGN.md “Motion”",
    ].join("\n");
    assert.deepEqual(
      citations(text).map(({ doc, section }) => `${doc} ${section}`),
      ["DESIGN.md Adoption", "design-system/motion.md Reduced motion", "DESIGN.md Motion"],
    );
  });

  test("a list of file names is not a citation", () => {
    assert.deepEqual(citations('["DESIGN.md", "docs/"]'), []);
  });
});

/* ------------------------------------------------------------------- tables */

describe("guide tables", () => {
  test("rows come from the table with a Real uses column", () => {
    const text = [
      "| Component | When | Real uses |",
      "| --- | --- | --- |",
      "| `Badge` | status | [record-card.tsx](../src/app/x/record-card.tsx) |",
      "| `Button` \\| `buttonVariants` | actions | `src/app/y.tsx` |",
      "",
      "| Other | Column |",
      "| --- | --- |",
      "| a | b |",
    ].join("\n");
    assert.deepEqual(realUseRows(text), [
      {
        line: 3,
        component: "`Badge`",
        uses: "[record-card.tsx](../src/app/x/record-card.tsx)",
      },
      { line: 4, component: "`Button` \\| `buttonVariants`", uses: "`src/app/y.tsx`" },
    ]);
  });

  test("restyle rows come from the table with Component, Classes and Call sites columns", () => {
    const text = [
      "| Component | Classes | Call sites | Disposition |",
      "| --- | --- | --- | --- |",
      "| `Button` | `disabled:opacity-60` | `notes.tsx`, [panel](../src/app/x/panel.tsx) | Item 17 |",
      "",
      "| Component | Real uses |",
      "| --- | --- |",
      "| `Badge` | `src/app/y.tsx` |",
    ].join("\n");
    assert.deepEqual(restyleRows(text), [
      {
        line: 3,
        component: "`Button`",
        classes: "`disabled:opacity-60`",
        sites: "`notes.tsx`, [panel](../src/app/x/panel.tsx)",
      },
    ]);
  });
});

/* ------------------------------------------------------------ call-site classes */

describe("call-site classes", () => {
  test("type, paint, shape and motion set a look; placement and size do not", () => {
    const look = [
      "hover:bg-mint",
      "md:text-[0.9rem]",
      "disabled:opacity-60",
      "aria-disabled:opacity-60",
      "motion-reduce:transition-none",
      "active:scale-[0.97]",
      "!rounded-none",
      "group-hover:text-teal",
      "font-bold",
    ];
    const layout = [
      "w-full",
      "mt-4",
      "min-h-11",
      "justify-between",
      "text-center",
      "border-collapse",
      "-translate-y-1",
      "aria-disabled:pointer-events-none",
      "[&_svg]:size-4",
    ];
    assert.deepEqual(
      look.filter((token) => !setsLook(token)),
      [],
    );
    assert.deepEqual(
      layout.filter((token) => setsLook(token)),
      [],
    );
  });
});

/* ---------------------------------------------------------------- inventory */

describe("inventory", () => {
  const repo = memoryRepo({ "src/components/ui/chip.tsx": CHIP });

  test("axes come from the recipe, the props type and destructured defaults", () => {
    const [entry] = inventory(repo);
    assert.equal(entry.useClient, true);
    assert.deepEqual(entry.builtOn, ["@base-ui/react/thing"]);
    assert.deepEqual(entry.components, [
      {
        name: "Chip",
        axes: [
          { name: "tone", values: ["calm", "loud"], fallback: "calm", required: true },
          { name: "size", values: ["sm", "md"], fallback: "sm", required: false },
          { name: "density", values: ["roomy", "tight"], fallback: null, required: false },
        ],
      },
      {
        name: "ChipGroup",
        axes: [{ name: "orientation", values: [], fallback: "horizontal", required: false }],
      },
    ]);
    assert.deepEqual(
      entry.recipes.map((recipe) => recipe.name),
      ["chipVariants"],
    );
    assert.deepEqual(entry.recipes[0].axes[1], {
      name: "size",
      values: ["sm", "md"],
      fallback: "md",
    });
    assert.deepEqual(entry.types, ["ChipProps"]);
  });

  test("props wrapped in Readonly keep their recipe axes", () => {
    const [entry] = inventory(
      memoryRepo({
        "src/components/ui/dial.tsx": [
          'import { cva } from "class-variance-authority";',
          'import type { VariantProps } from "class-variance-authority";',
          "",
          'const dialVariants = cva("grid", {',
          '  variants: { motion: { wgi: "transition-colors", none: "transition-none" } },',
          '  defaultVariants: { motion: "wgi" },',
          "});",
          "",
          "interface DialProps extends VariantProps<typeof dialVariants> {",
          "  readonly label: string;",
          "}",
          "",
          'function Dial({ label, motion = "wgi" }: Readonly<DialProps>) {',
          "  return <div aria-label={label} className={dialVariants({ motion })} />;",
          "}",
          "",
          "export { Dial, dialVariants };",
          "",
        ].join("\n"),
      }),
    );
    assert.deepEqual(entry.components, [
      {
        name: "Dial",
        axes: [{ name: "motion", values: ["wgi", "none"], fallback: "wgi", required: false }],
      },
    ]);
  });

  test("the rendered block bolds defaults and marks required props", () => {
    assert.equal(
      renderInventory(inventory(repo)),
      [
        BEGIN,
        "",
        "Bold marks the default; a required prop has none.",
        "",
        '- [`chip.tsx`](../src/components/ui/chip.tsx) · `"use client"` · built on `@base-ui/react/thing`',
        "  - `Chip`: `tone` (required) `calm` · `loud`; `size` **`sm`** · `md`; `density` `roomy` · `tight`",
        "  - `ChipGroup`: `orientation` **`horizontal`**",
        "  - Recipes: `chipVariants`",
        "  - Helpers and types: `ChipProps`",
        "",
        END,
      ].join("\n"),
    );
  });
});

/* -------------------------------------------------------------------- check */

describe("check", () => {
  test("links, anchors and citations", () => {
    const repo = memoryRepo({
      "AGENTS.md": "See [motion](DESIGN.md#motion) and [x](README.md#nope).\n",
      "DESIGN.md": [
        "# Design",
        "",
        "Read [tokens](design-system/tokens.md#spacing), [gone](design-system/gone.md) and [the inventory](design-system/inventory.md).",
        "",
        "Not links: `[a](design-system/nowhere.md)`.",
        "",
        "```md",
        "[b](design-system/nowhere-either.md)",
        "```",
        "",
      ].join("\n"),
      "design-system/inventory.md": `# Inventory\n\n${renderInventory([])}\n`,
      "design-system/tokens.md": "# Tokens\n\n## Color\n",
      "src/lib/a.ts": '// DESIGN.md "Nope" and DESIGN.md "Design"\nexport const a = 1;\n',
    });
    assert.deepEqual(problemsOf(repo), [
      "AGENTS.md:1  link to DESIGN.md#motion: no such heading",
      "DESIGN.md:3  link to design-system/tokens.md#spacing: no such heading",
      "DESIGN.md:3  link to missing design-system/gone.md",
      'src/lib/a.ts:1  cites DESIGN.md "Nope", which has no such heading or bold lead-in',
    ]);
  });

  test("names, paths, examples and real uses", () => {
    const repo = memoryRepo({
      "DESIGN.md": [
        "# Design",
        "",
        "Use `Chip` from `src/components/ui/chip.tsx`, not `Pill`. The sync anchor is `ds-bundle/_ds_sync.json`; the old map was `src/components/ui/map.tsx`.",
        "",
        "| Component | Real uses |",
        "| --- | --- |",
        "| `Chip` | [page](src/app/page.tsx), [other](src/app/other.tsx) |",
        "",
        "```tsx",
        '<Chip tone="loud" size="xl" />',
        "```",
        "",
        "```tsx incorrect",
        '<Chip size="lg" />',
        "```",
        "",
      ].join("\n"),
      "local-only-paths.json": '{ "localOnly": [{ "path": "ds-bundle/" }] }\n',
      "src/app/other.tsx": "export const other = 1;\n",
      "src/app/page.tsx":
        'import { Chip } from "@/components/ui/chip";\n\nexport default function Page() {\n  return <Chip tone="calm" />;\n}\n',
      "src/components/ui/chip.tsx": CHIP,
    });
    assert.deepEqual(problemsOf(repo), [
      'DESIGN.md:10  Chip has no size "xl"; it defines sm, md',
      "DESIGN.md:3  `Pill` is not an identifier in src/; write a name that does not exist without backticks",
      "DESIGN.md:3  missing path src/components/ui/map.tsx",
      "DESIGN.md:7  real use src/app/other.tsx does not import Chip",
    ]);
  });

  test("call-site restyles and stock imports", () => {
    const repo = memoryRepo({
      "DESIGN.md": [
        "# Design",
        "",
        "| Component | Classes | Call sites | Disposition |",
        "| --- | --- | --- | --- |",
        "| `Chip` | `rounded-lg` `opacity-60` | `recorded.tsx` | Item 1 |",
        "| `chipVariants` | `text-lg` | [recorded](src/app/recorded.tsx) | Item 1 |",
        "| `Chip` | `rounded-lg` `w-full` | `recorded.tsx`, `missing.tsx` | Item 1 |",
        "| Chip | `bg-white` | `page.tsx` | Item 1 |",
        "| `ChipGroup` | `bg-white` | `page.tsx` | Item 1 |",
        "| `Chip` | `hover:bg-mint` | [page](src/app/page.tsx) | Item 1 |",
        "| `Chip` | none | nowhere | Item 1 |",
        "",
        "| Component | Real uses |",
        "| --- | --- |",
        "| `Calendar` | `recorded.tsx` |",
        "",
      ].join("\n"),
      "src/app/page.tsx": [
        'import { cn } from "cn";',
        'import { Chip, chipVariants } from "@/components/ui/chip";',
        'import * as ui from "@/components/ui/chip";',
        "",
        "export default function Page({ state }: { state: string }) {",
        "  return (",
        "    <main>",
        '      <Chip tone="calm" className="bg-white w-full" />',
        '      <Chip tone="calm" className={cn("mt-2", state === "open" && "md:text-[0.9rem]")} />',
        '      <ui.Chip tone="loud" className="hover:bg-mint shadow-lg" />',
        '      <a className={cn(chipVariants({ tone: "loud" }), "rounded-lg text-center")} />',
        '      <a className={chipVariants({ className: "shadow-sm px-2" })} />',
        '      <a className={cn(chipVariants(), "justify-between")} />',
        "    </main>",
        "  );",
        "}",
        "",
      ].join("\n"),
      "src/app/recorded.tsx": [
        'import { cn } from "cn";',
        'import { Calendar } from "@/components/stock/calendar";',
        'import { Chip, chipVariants } from "@/components/ui/chip";',
        'import { Thing } from "../components/stock/thing";',
        "",
        "export default function Recorded() {",
        "  return (",
        "    <>",
        '      <Chip tone="calm" className="rounded-lg" />',
        '      <a className={cn(chipVariants(), "text-lg")} />',
        "      <Calendar />",
        "      <Thing />",
        "    </>",
        "  );",
        "}",
        "",
      ].join("\n"),
      "src/components/stock/calendar.tsx":
        'import { Thing } from "./thing";\n\nexport function Calendar() {\n  return <Thing />;\n}\n',
      "src/components/stock/thing.tsx": "export function Thing() {\n  return null;\n}\n",
      "src/components/ui/chip.tsx": CHIP,
    });
    const record = 'record it in design-system/styling.md "Recorded call-site restyles"';
    assert.deepEqual(problemsOf(repo), [
      "DESIGN.md:11  restyle row names no backticked class",
      "DESIGN.md:11  restyle row names no call site",
      "DESIGN.md:5  src/app/recorded.tsx no longer sets `opacity-60` on Chip",
      "DESIGN.md:7  `rounded-lg` on Chip at src/app/recorded.tsx is already recorded at DESIGN.md:5",
      "DESIGN.md:7  `w-full` sets no look; a call site's layout needs no record",
      "DESIGN.md:7  call site missing.tsx does not exist",
      "DESIGN.md:7  no file named missing.tsx",
      "DESIGN.md:8  restyle row names no backticked component",
      "DESIGN.md:9  src/app/page.tsx no longer sets `bg-white` on ChipGroup",
      `src/app/page.tsx:10  sets the look of <ui.Chip> with \`shadow-lg\`; move it into a recipe or ${record}`,
      `src/app/page.tsx:11  sets the look of chipVariants() with \`rounded-lg\`; move it into a recipe or ${record}`,
      `src/app/page.tsx:12  sets the look of chipVariants() with \`shadow-sm\`; move it into a recipe or ${record}`,
      `src/app/page.tsx:8  sets the look of <Chip> with \`bg-white\`; move it into a recipe or ${record}`,
      `src/app/page.tsx:9  sets the look of <Chip> with \`md:text-[0.9rem]\`; move it into a recipe or ${record}`,
      "src/app/recorded.tsx:4  imports Thing from src/components/stock/thing.tsx, which no guide's Real uses table records; adopt it into ui/ or record the exception",
    ]);
  });

  test("comments in src name tracked paths the checkout has", () => {
    const repo = memoryRepo({
      "local-only-paths.json": '{ "localOnly": [{ "path": "docs/" }, { "path": "plans/" }] }\n',
      "src/app/page.css":
        "/* Reads src/app/page.tsx and src/app/gone.css (plans/page.md, Phase 0). */\n.page {\n}\n",
      "src/app/page.tsx": [
        "// Census: docs/INVENTORY.md; the chip is src/components/ui/chip.tsx (see src/lib/).",
        'const note = "src/not/a-comment.ts";',
        "",
        "/* Wheels: (home)/parts/time-picker.tsx, node_modules/next/dist/docs/ and",
        " * src/app/.../page.tsx. */",
        "export default function Page() {",
        "  return (",
        "    <main>",
        "      {/* plans/page.md */}",
        "      src/app/also-not-a-comment.tsx",
        "      {note}",
        "      {",
        "        // src/app/removed.tsx",
        "      }",
        "    </main>",
        "  );",
        "}",
        "",
      ].join("\n"),
      "src/components/ui/chip.tsx": CHIP,
      "src/lib/a.ts": "export const a = 1;\n",
    });
    assert.deepEqual(problemsOf(repo), [
      "src/app/page.css:1  comment names missing path src/app/gone.css",
      "src/app/page.tsx:13  comment names missing path src/app/removed.tsx",
    ]);
  });

  test("the guide index, line budgets and a stale inventory", () => {
    const repo = memoryRepo({
      "DESIGN.md": [
        "# Design",
        "[Inventory](design-system/inventory.md)",
        ...Array.from({ length: 98 }, () => "x"),
        "",
      ].join("\n"),
      "design-system/extra.md": "# Extra\n",
      "design-system/inventory.md": `# Inventory\n\n${BEGIN}\nold\n${END}\n`,
    });
    assert.deepEqual(problemsOf(repo), [
      "DESIGN.md:1  does not link the guide design-system/extra.md",
      "DESIGN.md:100  100 lines; keep it under 100",
      "design-system/inventory.md:3  component inventory is stale; run npm run design-system:write",
    ]);
  });
});

/* ---------------------------------------------------------------------- css */

describe("css", () => {
  test("the parser tracks the line each rule and declaration starts on", () => {
    const root = parseCss("/* a\n b */ .a {\n  color: red;\n}\n\n.b { gap: 0 }");
    assert.deepEqual(
      root.children.map((node) => [node.prelude, node.line]),
      [
        [".a", 2],
        [".b", 6],
      ],
    );
    assert.equal(root.children[0].declarations[0].line, 3);
  });

  test("declarations are counted by whether they read a token", () => {
    const css = [
      ".a { padding: 1rem; margin: var(--ps-4); gap: 4px; font-size: var(--pt-sm); color: #fff; transition: opacity 200ms ease; }",
      ".b { --tint: oklch(0.5 0.1 200); background: color-mix(in oklab, var(--tint) 20%, white); transition: transform var(--motion-micro-duration) var(--motion-exit); }",
      "@keyframes spin { to { transform: rotate(1turn); transition: opacity 1s; } }",
    ].join("\n");
    assert.deepEqual(measureCss(css), {
      spacing: { total: 3, rem: 1, px: 1, psOnly: 1, otherVar: 0, other: 0 },
      fontSize: { total: 1, pt: 1, otherVar: 0, literal: 0 },
      color: { literal: 1, named: 0, colorMix: 1, inCustomProperties: 1 },
      motion: { total: 2, literalDuration: 1, literalEasing: 1, tokenOnly: 1 },
      radius: { total: 0, token: 0, pill: 0, otherVar: 0, literal: 0, zero: 0 },
      shadow: { total: 0, token: 0, otherVar: 0, literal: 0, insetOnly: 0, none: 0 },
    });
    assert.deepEqual(measureCss(".c { padding: 0 1.5rem; margin: 0px; }").spacing, {
      total: 2,
      rem: 1,
      px: 0,
      psOnly: 0,
      otherVar: 0,
      other: 1,
    });
  });

  test("radii and shadows are counted by what they read", () => {
    const css = [
      ".a { border-radius: var(--radius-sm); border-top-left-radius: 0.5rem; }",
      ".b { border-radius: 999px; border-radius: var(--radius) var(--radius) 0 0; }",
      ".c { border-radius: var(--wgi-row-radius); border-radius: 0 !important; }",
      ".d { box-shadow: var(--shadow-card); box-shadow: 0 1px 2px rgb(0 0 0 / 10%); }",
      ".e { box-shadow: inset 0 -2px 0 var(--color-teal); box-shadow: none; }",
      ".f { box-shadow: inset 0 0 0 1px red, var(--wgi-shadow); }",
    ].join("\n");
    const { radius, shadow } = measureCss(css);
    assert.deepEqual(radius, { total: 6, token: 2, pill: 1, otherVar: 1, literal: 1, zero: 1 });
    assert.deepEqual(shadow, {
      total: 5,
      token: 1,
      otherVar: 1,
      literal: 1,
      insetOnly: 1,
      none: 1,
    });
  });

  test("a rule is unreferenced only when every selector names an unused class", () => {
    const css = [
      ".used { color: red }",
      ".gone { color: red }",
      ".dyn-x-y { color: red }",
      ".used .gone { gap: 0 }",
      "@media (width > 1px) { .gone-too { gap: 0 } }",
      ".used, .gone { gap: 0 }",
    ].join("\n");
    assert.deepEqual(
      unreferencedRules(css, new Set(["used", "dyn-x-"])).map((rule) => [rule.prelude, rule.line]),
      [
        [".gone", 2],
        [".used .gone", 4],
        [".gone-too", 5],
      ],
    );
  });
});

/* --------------------------------------------------------------- repository */

test("DESIGN.md, the guides and the code agree in this checkout", () => {
  assert.deepEqual(problemsOf(loadRepo()), []);
});
