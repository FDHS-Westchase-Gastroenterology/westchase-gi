/**
 * Fixture suite for the local-only guard.
 *
 * Two fixture sets carry the weight: VIOLATING paths the guard must flag, and CLEAN
 * paths it must stay quiet about. The clean set is the more important of the two —
 * it is where the 2026-09-02 regression lives. Untracking scripts/ because it looked
 * like tooling broke the supabase-integration CI job, so scripts/seed-portal.mjs and
 * scripts/verify-schema.mjs are asserted clean by name.
 *
 * Run: node --test scripts/check-local-only.test.mjs   (also part of npm run test:unit)
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test, describe } from "node:test";

import {
  loadManifest,
  assertManifestSane,
  classifyPath,
  findViolations,
  renderGitignoreBlock,
  spliceBlock,
  repoRoot,
} from "./check-local-only.mjs";

const manifest = loadManifest();

/* ------------------------------------------------------------------ fixtures */

/** Paths the guard MUST flag. One per local-only entry, plus nested and edge cases. */
const VIOLATING = [
  ".agents/skills/CODEX.md",
  ".agents/lessons/release-metaphors.md",
  ".agents/setup",
  ".claude/settings.json",
  ".claude/rules/local-only-directories.md",
  ".codex/skills/review.md",
  ".cursor/hooks/pre.js",
  ".design-sync/ds/styles.css",
  ".design-sync/node_modules/pkg/index.js",
  ".ds-sync/manifest.json",
  ".impeccable/surfaces/portal.json",
  ".logs/dev-3100.log",
  ".product-design-audit/pr224-remediation-2026-08-26/before/session.json",
  ".product-design-audit/pr-224-save-wiring-accepted-2026-08-26/hosted-save-workflow.mp4",
  ".vercel/project.json",
  "backend-memos/2026-08-30-schema.md",
  "ds-bundle/index.js",
  "plans/portal-home-redesign.md",
  "screenshots/home-2026-09-05.png",
  "MEMORY.md",
  // Docs/ is local-only by owner decision on 2026-09-05: the whole tree was deleted
  // Deliberately, including the architecture decision records, and is not to return.
  "docs/portal-home-redesign-brief/audit-01-resting-suggestion-pills.jpg",
  "docs/portal-home-redesign-brief.md",
  "docs/COMPONENT-INVENTORY.md",
  "docs/adr/0001-storage-keeps-closure-disposition.md",
  "docs/appointment-request-workflow-specification.md",
  "docs/roles/lead-of-product-experience.md",
];

/**
 * Paths the guard MUST NOT flag. Everything CI, package.json, the framework or an
 * import statement depends on, plus the near-miss lookalikes.
 */
const CLEAN = [
  // The 2026-09-02 incident, encoded by name.
  "scripts/seed-portal.mjs",
  "scripts/verify-schema.mjs",
  "scripts/design-system/sync-stock.mjs",
  "scripts/capture-ui-reference.mjs",
  "scripts/dev-patients.mjs",
  "scripts/verify-no-secrets.mjs",
  // Shared toolchain config, not machine-local.
  ".vscode/settings.json",
  ".vscode/extensions.json",
  // CI and product.
  ".github/workflows/ci.yml",
  ".github/workflows/supabase-dependency-integration.yml",
  ".github/scripts/dependency-automation.cjs",
  "src/app/admin/(portal)/(home)/filter-bar.tsx",
  "src/components/stock/button.tsx",
  "src/components/stock/examples/button-example.tsx",
  "e2e/portal-requests.spec.ts",
  "e2e/target-guard.test.mjs",
  "supabase/migrations/0001_init.sql",
  "tools/oxlint/anti-slop/plugin.test.mjs",
  "public/favicon.ico",
  "private/review-flyers/WGI-Master-Review-Hub-Flyer.pdf",
  "ui-reference/mobile-portal-settings.png",
  "package.json",
  "package-lock.json",
  ".gitignore",
  "local-only-paths.json",
  "README.md",
  "DESIGN.md",
  // Lookalikes: a prefix must match a whole path segment, never a substring.
  "src/agents/registry.ts",
  "src/lib/plans/pricing.ts",
  "docs-site/index.md",
  "plansmith/config.json",
  "MEMORY.md.bak",
  "src/components/MEMORY.md",
];

/* --------------------------------------------------------------------- tests */

describe("the manifest is safe to act on", () => {
  test("no local-only entry overlaps a load-bearing path", () => {
    assert.equal(assertManifestSane(manifest), true);
  });

  test("a manifest that would untrack scripts/ is rejected outright", () => {
    const sabotaged = {
      localOnly: [{ path: "scripts/", gitignore: "/scripts/", reason: "looks like tooling" }],
      loadBearing: manifest.loadBearing,
    };
    assert.throws(() => assertManifestSane(sabotaged), /overlaps load-bearing path "scripts\/"/);
  });

  test("a manifest that would untrack the CI workflows is rejected outright", () => {
    const sabotaged = {
      localOnly: [{ path: ".github/", gitignore: "/.github/", reason: "looks like config" }],
      loadBearing: manifest.loadBearing,
    };
    assert.throws(() => assertManifestSane(sabotaged), /overlaps load-bearing path "\.github\/"/);
  });

  test("duplicate entries are rejected", () => {
    assert.throws(
      () =>
        assertManifestSane({
          localOnly: [
            { path: "plans/", gitignore: "/plans/" },
            { path: "plans/", gitignore: "/plans/" },
          ],
          loadBearing: [],
        }),
      /duplicate localOnly entry/,
    );
  });
});

describe("the guard fires on every violating fixture", () => {
  for (const path of VIOLATING) {
    test(`flags ${path}`, () => {
      const hit = classifyPath(path, manifest);
      assert.ok(hit, `expected ${path} to be flagged as local-only`);
      assert.ok(hit.reason, `entry for ${path} must carry a reason`);
    });
  }

  test("all violating fixtures are reported together", () => {
    assert.equal(findViolations(VIOLATING, manifest).length, VIOLATING.length);
  });

  test("every local-only manifest entry is covered by at least one fixture", () => {
    const covered = new Set(findViolations(VIOLATING, manifest).map((v) => v.entry.path));
    const missing = manifest.localOnly.map((e) => e.path).filter((p) => !covered.has(p));
    assert.deepEqual(missing, [], `manifest entries with no violating fixture: ${missing}`);
  });
});

describe("the guard stays quiet on every clean fixture", () => {
  for (const path of CLEAN) {
    test(`ignores ${path}`, () => {
      assert.equal(classifyPath(path, manifest), null, `${path} must not be flagged`);
    });
  }

  test("no clean fixture is reported", () => {
    assert.deepEqual(findViolations(CLEAN, manifest), []);
  });

  test("every load-bearing path has at least one clean fixture beneath it", () => {
    const uncovered = manifest.loadBearing
      .map((e) => e.path)
      .filter((p) => !CLEAN.some((c) => (p.endsWith("/") ? c.startsWith(p) : c === p)));
    assert.deepEqual(uncovered, [], `load-bearing paths with no clean fixture: ${uncovered}`);
  });
});

describe("load-bearing always beats local-only", () => {
  test("a path listed in both is treated as clean", () => {
    const both = {
      localOnly: [{ path: "docs/", gitignore: "/docs/", reason: "x" }],
      loadBearing: [{ path: "docs/", reason: "kept for some reason" }],
    };
    assert.equal(classifyPath("docs/adr/0001.md", both), null);
  });
});

describe("the generated .gitignore block stays in sync", () => {
  test("the committed .gitignore block matches the manifest", () => {
    const gi = readFileSync(join(repoRoot, ".gitignore"), "utf8");
    const expected = renderGitignoreBlock(manifest);
    assert.ok(
      gi.includes(expected),
      "the .gitignore managed block has drifted; run `npm run local-only:write`",
    );
  });

  test("every local-only entry appears in the generated block", () => {
    const block = renderGitignoreBlock(manifest);
    for (const e of manifest.localOnly) {
      assert.ok(block.includes(e.gitignore), `${e.gitignore} missing from the generated block`);
    }
  });

  test("no load-bearing path is ever written into the generated block", () => {
    const block = renderGitignoreBlock(manifest);
    for (const e of manifest.loadBearing) {
      assert.ok(
        !block.split("\n").some((line) => line.trim() === `/${e.path}`),
        `${e.path} must never be ignored`,
      );
    }
  });

  test("rewriting is idempotent", () => {
    const begin = renderGitignoreBlock(manifest).split("\n")[0];
    const end = "# END generated from local-only-paths.json";
    const once = spliceBlock("a\nb\n", renderGitignoreBlock(manifest), begin, end);
    const twice = spliceBlock(once, renderGitignoreBlock(manifest), begin, end);
    assert.equal(once, twice);
  });
});
