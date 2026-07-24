"use strict";

/* eslint-disable @typescript-eslint/no-require-imports -- node:test and the CommonJS workflow module intentionally use require(). */

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  classifyDependabot,
  evaluateGate,
  filesArePackageOnly,
  parseCodexResult,
} = require("./dependency-automation.cjs");

const eligible = {
  metadataVerified: true,
  prAuthor: "dependabot[bot]",
  baseRef: "main",
  targetBranch: "main",
  packageEcosystem: "npm_and_yarn",
  directory: "/",
  maintainerChanges: false,
  dependencyNames: "@types/react",
  dependencyType: "direct:development",
  updateType: "version-update:semver-patch",
  dependencyGroup: "",
  previousVersion: "19.2.7",
  newVersion: "19.2.8",
  changedFiles: ["package.json", "package-lock.json"],
};

test("permits single-package development patches outside self-verifying gates", () => {
  const result = classifyDependabot(eligible);
  assert.equal(result.safeToReview, true);
  assert.equal(result.autoMergeEligible, true);
  assert.equal(result.requiresSupabaseIntegration, false);

  for (const dependencyNames of [
    "tailwindcss",
    "@tailwindcss/postcss",
    "eslint",
  ]) {
    assert.equal(
      classifyDependabot({ ...eligible, dependencyNames }).autoMergeEligible,
      true,
    );
  }
});

test("keeps non-patch, grouped, multi-package, and gate-owning updates human-gated", () => {
  const cases = [
    { ...eligible, updateType: "version-update:semver-minor" },
    { ...eligible, dependencyGroup: "types" },
    { ...eligible, dependencyNames: "typescript" },
    { ...eligible, dependencyNames: "react-doctor" },
    { ...eligible, dependencyNames: "@playwright/test" },
    { ...eligible, dependencyNames: "@types/react, @types/node" },
  ];
  for (const input of cases) {
    assert.equal(classifyDependabot(input).autoMergeEligible, false);
  }
});

test("permits only integration-tested Supabase runtime patches", () => {
  for (const dependencyNames of [
    "@supabase/supabase-js",
    "@supabase/ssr",
  ]) {
    const result = classifyDependabot({
      ...eligible,
      dependencyNames,
      dependencyType: "direct:production",
      previousVersion: "2.110.6",
      newVersion: "2.110.7",
    });
    assert.equal(result.autoMergeEligible, true);
    assert.equal(result.requiresSupabaseIntegration, true);
  }

  for (const input of [
    {
      ...eligible,
      dependencyNames: "next",
      dependencyType: "direct:production",
    },
    {
      ...eligible,
      dependencyNames: "@supabase/supabase-js",
      dependencyType: "direct:production",
      updateType: "version-update:semver-minor",
    },
  ]) {
    assert.equal(classifyDependabot(input).autoMergeEligible, false);
  }
});

test("would have handled four of the six July 24 Dependabot PRs", () => {
  const july24 = [
    {
      number: 45,
      input: {
        ...eligible,
        dependencyNames: "@supabase/supabase-js",
        dependencyType: "direct:production",
      },
    },
    {
      number: 46,
      input: {
        ...eligible,
        dependencyNames: "typescript",
        updateType: "version-update:semver-major",
      },
    },
    {
      number: 47,
      input: {
        ...eligible,
        dependencyNames: "tailwindcss",
        changedFiles: ["package-lock.json"],
      },
    },
    {
      number: 48,
      input: {
        ...eligible,
        dependencyNames: "@tailwindcss/postcss",
        changedFiles: ["package-lock.json"],
      },
    },
    {
      number: 49,
      input: {
        ...eligible,
        dependencyNames: "react-doctor",
        updateType: "version-update:semver-minor",
      },
    },
    {
      number: 50,
      input: { ...eligible, dependencyNames: "eslint" },
    },
  ];

  assert.deepEqual(
    july24
      .filter(({ input }) => classifyDependabot(input).autoMergeEligible)
      .map(({ number }) => number),
    [45, 47, 48, 50],
  );
});

test("does not expose an unverified or source-changing PR to Codex", () => {
  assert.equal(
    classifyDependabot({ ...eligible, metadataVerified: false }).safeToReview,
    false,
  );
  assert.equal(
    classifyDependabot({
      ...eligible,
      changedFiles: ["package-lock.json", "src/app/page.tsx"],
    }).safeToReview,
    false,
  );
  assert.equal(
    classifyDependabot({ ...eligible, maintainerChanges: true }).safeToReview,
    false,
  );
});

test("package-file guard is exact", () => {
  assert.equal(filesArePackageOnly(["package-lock.json"]), true);
  assert.equal(
    filesArePackageOnly(["package.json", "package-lock.json"]),
    true,
  );
  assert.equal(filesArePackageOnly([]), false);
  assert.equal(filesArePackageOnly([".github/workflows/ci.yml"]), false);
});

test("malformed Codex output fails closed", () => {
  assert.equal(
    parseCodexResult(
      JSON.stringify({
        decision: "approve",
        summary: "No concrete blocker found.",
        risk_reasons: [],
        evidence: ["Manifest-only patch update"],
        recommended_actions: [],
      }),
    ).decision,
    "approve",
  );
  assert.equal(parseCodexResult("not-json").decision, "needs_human");
  assert.equal(
    parseCodexResult(JSON.stringify({ decision: "approve" })).decision,
    "needs_human",
  );
  assert.equal(
    parseCodexResult(JSON.stringify({ decision: "invented" })).decision,
    "needs_human",
  );
});

test("merge gates require deterministic checks and statuses", () => {
  const checks = [
    { name: "quality", status: "completed", conclusion: "success" },
    { name: "react-doctor", status: "completed", conclusion: "success" },
    {
      name: "supabase-integration",
      status: "completed",
      conclusion: "success",
    },
  ];
  const statuses = [
    { context: "Vercel", state: "success", description: "Deployment completed" },
    {
      context: "React Doctor",
      state: "success",
      description: "Skipped — no React files changed",
    },
    {
      context: "Dependabot Auto-Merge",
      state: "success",
      description: "Exact head approved",
    },
  ];
  assert.deepEqual(evaluateGate(checks, statuses), {
    passed: true,
    missing: [],
  });
  assert.equal(
    evaluateGate(
      checks,
      statuses.filter(
        (status) => status.context !== "Dependabot Auto-Merge",
      ),
    ).passed,
    false,
  );
  assert.equal(
    evaluateGate(
      [
        ...checks,
        { name: "production", status: "completed", conclusion: "success" },
      ],
      statuses,
      { production: true },
    ).passed,
    true,
  );
  assert.equal(
    evaluateGate(
      checks.filter((check) => check.name !== "supabase-integration"),
      statuses,
    ).passed,
    false,
  );
  assert.equal(
    evaluateGate(
      checks,
      statuses.map((status) =>
        status.context === "React Doctor"
          ? { ...status, description: "Score: 65/100 · 2 errors · 4 warnings" }
          : status,
      ),
    ).passed,
    false,
  );
});
