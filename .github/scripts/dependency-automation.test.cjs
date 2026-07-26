"use strict";

/* eslint-disable @typescript-eslint/no-require-imports -- node:test and the CommonJS workflow module intentionally use require(). */

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  LABELS,
  classifyDependabot,
  evaluateGate,
  filesArePackageOnly,
  mergeNextDependabot,
  parseCodexResult,
  requestDependabotCommand,
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

test("permits every trusted manifest-only Dependabot update", () => {
  const cases = [
    { ...eligible, updateType: "version-update:semver-minor" },
    {
      ...eligible,
      dependencyNames: "typescript",
      updateType: "version-update:semver-major",
    },
    {
      ...eligible,
      dependencyNames: "react, react-dom",
      dependencyGroup: "react-runtime",
      dependencyType: "direct:production",
    },
    {
      ...eligible,
      dependencyNames: "next",
      dependencyType: "direct:production",
    },
    {
      ...eligible,
      dependencyNames: "@playwright/test",
      updateType: "version-update:semver-minor",
    },
  ];
  for (const input of cases) {
    const result = classifyDependabot(input);
    assert.equal(result.safeToReview, true);
    assert.equal(result.autoMergeEligible, true);
    assert.equal(result.requiresSupabaseIntegration, true);
    assert.deepEqual(result.autoMergeReasons, []);
  }
});

test("admits every July 26 Dependabot PR without human delegation", () => {
  const july26 = [
    {
      number: 103,
      input: {
        ...eligible,
        dependencyNames: "react-dom",
        dependencyType: "direct:production",
      },
    },
    {
      number: 104,
      input: {
        ...eligible,
        dependencyNames: "react",
        dependencyType: "direct:production",
      },
    },
    {
      number: 105,
      input: { ...eligible, dependencyNames: "@playwright/test" },
    },
    {
      number: 106,
      input: {
        ...eligible,
        dependencyNames: "next",
        dependencyType: "direct:production",
      },
    },
    {
      number: 107,
      input: { ...eligible, dependencyNames: "eslint-config-next" },
    },
    {
      number: 108,
      input: {
        ...eligible,
        dependencyNames: "@supabase/supabase-js",
        dependencyType: "direct:production",
      },
    },
    {
      number: 109,
      input: {
        ...eligible,
        dependencyNames: "resend",
        dependencyType: "direct:production",
        updateType: "version-update:semver-minor",
      },
    },
  ];

  assert.deepEqual(
    july26
      .filter(({ input }) => classifyDependabot(input).autoMergeEligible)
      .map(({ number }) => number),
    [103, 104, 105, 106, 107, 108, 109],
  );
});

test("exposes no human-routing automation state", () => {
  assert.equal(
    Object.values(LABELS).some(({ name }) => name.includes("human")),
    false,
  );
});

test("does not expose an unverified or source-changing PR to Codex", () => {
  const metadataFailure = classifyDependabot({
    ...eligible,
    metadataVerified: false,
  });
  assert.equal(metadataFailure.safeToReview, false);
  assert.equal(metadataFailure.retryable, true);

  const sourceChange = classifyDependabot({
    ...eligible,
    changedFiles: ["package-lock.json", "src/app/page.tsx"],
  });
  assert.equal(sourceChange.safeToReview, false);
  assert.equal(sourceChange.retryable, false);
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

test("ignores forged Dependabot command markers from untrusted commenters", async () => {
  const listComments = () => {};
  const created = [];
  const marker = "<!-- dependabot-automation:recreate:exact-head -->";
  const github = {
    paginate: async (method) => {
      assert.equal(method, listComments);
      return [
        {
          user: { login: "untrusted-user" },
          body: `forged\n\n${marker}`,
        },
      ];
    },
    rest: {
      issues: {
        listComments,
        createComment: async ({ body }) => created.push(body),
      },
    },
  };

  assert.equal(
    await requestDependabotCommand(
      github,
      "owner",
      "repo",
      123,
      "recreate",
      "exact-head",
    ),
    true,
  );
  assert.deepEqual(created, [`@dependabot recreate\n\n${marker}`]);
});

test("Codex outcomes are autonomous and malformed output retries", () => {
  for (const decision of ["approve", "retry", "repair", "reject"]) {
    assert.equal(
      parseCodexResult(
        JSON.stringify({
          decision,
          summary: "Exact-head decision.",
          risk_reasons: [],
          evidence: ["Manifest-only update"],
          recommended_actions: [],
        }),
      ).decision,
      decision,
    );
  }
  assert.equal(parseCodexResult("not-json").decision, "retry");
  assert.equal(
    parseCodexResult(JSON.stringify({ decision: "approve" })).decision,
    "retry",
  );
  assert.equal(
    parseCodexResult(JSON.stringify({ decision: "needs_human" })).decision,
    "retry",
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

test("queue skips a failing older PR and merges the next green sibling", async () => {
  const successfulChecks = [
    { name: "quality", status: "completed", conclusion: "success" },
    { name: "react-doctor", status: "completed", conclusion: "success" },
    {
      name: "supabase-integration",
      status: "completed",
      conclusion: "success",
    },
  ];
  const successfulStatuses = [
    { context: "Vercel", state: "success" },
    {
      context: "React Doctor",
      state: "success",
      description: "Skipped — no React files changed",
    },
    { context: "Dependabot Auto-Merge", state: "success" },
  ];
  const pulls = [
    {
      number: 103,
      user: { login: "dependabot[bot]" },
      head: {
        sha: "failing",
        repo: { full_name: "owner/repo" },
      },
      base: { ref: "main" },
      labels: [{ name: LABELS.ready.name }],
    },
    {
      number: 104,
      user: { login: "dependabot[bot]" },
      head: {
        sha: "green",
        repo: { full_name: "owner/repo" },
      },
      base: { ref: "main" },
      labels: [{ name: LABELS.ready.name }],
    },
  ];
  const listPulls = () => {};
  const listFiles = () => {};
  const listLabelsForRepo = () => {};
  const listLabelsOnIssue = () => {};
  const merged = [];
  const notices = [];
  const github = {
    paginate: async (method, args) => {
      if (method === listPulls) return pulls;
      if (method === listFiles) {
        return [
          { filename: "package.json" },
          { filename: "package-lock.json" },
        ];
      }
      if (method === listLabelsForRepo) {
        return Object.values(LABELS).map(({ name }) => ({ name }));
      }
      if (method === listLabelsOnIssue) {
        return pulls.find(({ number }) => number === args.issue_number).labels;
      }
      throw new Error("Unexpected pagination request");
    },
    rest: {
      actions: {
        createWorkflowDispatch: async () => {},
      },
      checks: {
        listForRef: async ({ ref }) => {
          return {
            data: {
              check_runs:
                ref === "main"
                  ? [
                      ...successfulChecks,
                      {
                        name: "production",
                        status: "completed",
                        conclusion: "success",
                      },
                    ]
                  : ref === "failing"
                    ? successfulChecks.map((check) =>
                        check.name === "quality"
                          ? { ...check, conclusion: "failure" }
                          : check,
                      )
                    : successfulChecks,
            },
          };
        },
      },
      issues: {
        addLabels: async () => {},
        createComment: async () => {},
        createLabel: async () => {},
        listLabelsForRepo,
        listLabelsOnIssue,
        removeLabel: async () => {},
      },
      pulls: {
        get: async ({ pull_number: pullNumber }) => ({
          data: {
            ...pulls.find(({ number }) => number === pullNumber),
            draft: false,
            state: "open",
            mergeable: true,
            mergeable_state: "clean",
          },
        }),
        list: listPulls,
        listFiles,
        merge: async ({ pull_number: pullNumber }) => {
          merged.push(pullNumber);
          return { data: { merged: true, sha: "merged" } };
        },
        update: async () => {},
      },
      repos: {
        getBranch: async () => ({ data: { commit: { sha: "main" } } }),
        getCombinedStatusForRef: async ({ ref }) => {
          return {
            data: {
              statuses:
                ref === "failing"
                  ? successfulStatuses.map((status) =>
                      status.context === "Vercel"
                        ? { ...status, state: "failure" }
                        : status,
                    )
                  : successfulStatuses,
            },
          };
        },
      },
    },
  };

  await mergeNextDependabot({
    github,
    context: { repo: { owner: "owner", repo: "repo" } },
    core: { notice: (message) => notices.push(message), warning: () => {} },
  });

  assert.equal(
    merged.join(","),
    "104",
    notices.join("\n"),
  );
});
