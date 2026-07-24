"use strict";

/* eslint-disable @typescript-eslint/no-require-imports -- GitHub Script loads this CommonJS bridge with require(). */

const { appendFileSync } = require("node:fs");

const REVIEW_STATUS = "Dependabot Auto-Merge";
const REVIEW_MARKER = "<!-- dependabot-codex-review -->";
const ALLOWED_CHANGED_FILES = new Set(["package.json", "package-lock.json"]);
const AUTO_MERGE_PACKAGES = new Set([
  "@types/node",
  "@types/react",
  "@types/react-dom",
  "jsqr",
  "pdf-lib",
  "pngjs",
]);
const LABELS = {
  approved: {
    name: "dependencies:codex-approved",
    color: "0e8a16",
    description: "Codex found no concrete blocker on the reviewed commit",
  },
  ready: {
    name: "dependencies:auto-merge-ready",
    color: "1d76db",
    description: "Exact reviewed commit is eligible for guarded auto-merge",
  },
  pending: {
    name: "dependencies:auto-merge-pending",
    color: "5319e7",
    description: "Dependency update is the only PR currently allowed to merge",
  },
  human: {
    name: "dependencies:human-review",
    color: "fbca04",
    description: "Dependency update requires a maintainer decision",
  },
  blocked: {
    name: "dependencies:blocked",
    color: "d73a4a",
    description: "Codex or deterministic policy found a merge blocker",
  },
};
const AUTOMATION_LABEL_NAMES = new Set(
  Object.values(LABELS).map(({ name }) => name),
);

function asBoolean(value) {
  return value === true || String(value).toLowerCase() === "true";
}

function dependencyNames(value) {
  if (Array.isArray(value)) {
    return value.map(String).map((name) => name.trim()).filter(Boolean);
  }
  return String(value || "")
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean);
}

function changedFiles(value) {
  if (Array.isArray(value)) return value.map(String);
  try {
    const parsed = JSON.parse(String(value || "[]"));
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function filesArePackageOnly(files) {
  return (
    files.length > 0 &&
    files.every((filename) => ALLOWED_CHANGED_FILES.has(filename))
  );
}

function classifyDependabot(input) {
  const names = dependencyNames(input.dependencyNames);
  const files = changedFiles(input.changedFiles);
  const trustReasons = [];

  if (!asBoolean(input.metadataVerified)) {
    trustReasons.push("Dependabot metadata or commit verification did not pass");
  }
  if (input.prAuthor !== "dependabot[bot]") {
    trustReasons.push("PR author is not dependabot[bot]");
  }
  if (input.baseRef !== "main" || input.targetBranch !== "main") {
    trustReasons.push("update does not target main");
  }
  if (!["npm", "npm_and_yarn"].includes(input.packageEcosystem)) {
    trustReasons.push("package ecosystem is not npm");
  }
  if (input.directory !== "/") {
    trustReasons.push("Dependabot directory is not repository root");
  }
  if (asBoolean(input.maintainerChanges)) {
    trustReasons.push("PR contains maintainer changes");
  }
  if (!filesArePackageOnly(files)) {
    trustReasons.push("changed files are not limited to package manifests");
  }
  if (names.length === 0) {
    trustReasons.push("updated dependency could not be identified");
  }

  const safeToReview = trustReasons.length === 0;
  const autoMergeReasons = [...trustReasons];

  if (input.dependencyType !== "direct:development") {
    autoMergeReasons.push("dependency is not a direct development dependency");
  }
  if (input.updateType !== "version-update:semver-patch") {
    autoMergeReasons.push("update is not semver-patch");
  }
  if (names.length !== 1) {
    autoMergeReasons.push("update changes more than one direct dependency");
  }
  if (names.some((name) => !AUTO_MERGE_PACKAGES.has(name))) {
    autoMergeReasons.push("dependency is outside the low-risk allowlist");
  }
  if (String(input.dependencyGroup || "").trim()) {
    autoMergeReasons.push("grouped dependency updates require human review");
  }

  return {
    version: 1,
    safeToReview,
    autoMergeEligible: safeToReview && autoMergeReasons.length === 0,
    dependencyNames: names,
    changedFiles: files,
    dependencyType: String(input.dependencyType || ""),
    updateType: String(input.updateType || ""),
    previousVersion: String(input.previousVersion || ""),
    newVersion: String(input.newVersion || ""),
    trustReasons,
    autoMergeReasons,
  };
}

function policyFromEnvironment() {
  return classifyDependabot({
    metadataVerified: process.env.METADATA_VERIFIED,
    prAuthor: process.env.PR_AUTHOR,
    baseRef: process.env.BASE_REF,
    targetBranch: process.env.TARGET_BRANCH,
    packageEcosystem: process.env.PACKAGE_ECOSYSTEM,
    directory: process.env.DEPENDABOT_DIRECTORY,
    maintainerChanges: process.env.MAINTAINER_CHANGES,
    dependencyNames: process.env.DEPENDENCY_NAMES,
    dependencyType: process.env.DEPENDENCY_TYPE,
    updateType: process.env.UPDATE_TYPE,
    dependencyGroup: process.env.DEPENDENCY_GROUP,
    previousVersion: process.env.PREVIOUS_VERSION,
    newVersion: process.env.NEW_VERSION,
    changedFiles: process.env.CHANGED_FILES_JSON,
  });
}

function emitPolicy(policy) {
  const serialized = JSON.stringify(policy);
  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(
      process.env.GITHUB_OUTPUT,
      [
        `policy=${serialized}`,
        `safe_to_review=${policy.safeToReview}`,
        `auto_merge_eligible=${policy.autoMergeEligible}`,
        "",
      ].join("\n"),
      "utf8",
    );
    return;
  }
  process.stdout.write(`${serialized}\n`);
}

function sanitizeText(value, maxLength = 1200) {
  const clean = String(value || "")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .trim();
  return clean.length <= maxLength
    ? clean
    : `${clean.slice(0, maxLength - 1)}…`;
}

function sanitizeList(value, maxItems = 6) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, maxItems).map((item) => sanitizeText(item, 500));
}

function parseCodexResult(raw) {
  try {
    const parsed = JSON.parse(String(raw || "").trim());
    if (
      !["approve", "needs_human", "block"].includes(parsed.decision) ||
      typeof parsed.summary !== "string" ||
      !parsed.summary.trim() ||
      !Array.isArray(parsed.risk_reasons) ||
      !Array.isArray(parsed.evidence) ||
      !Array.isArray(parsed.recommended_actions)
    ) {
      throw new Error("invalid decision");
    }
    return {
      decision: parsed.decision,
      summary: sanitizeText(parsed.summary),
      riskReasons: sanitizeList(parsed.risk_reasons),
      evidence: sanitizeList(parsed.evidence),
      recommendedActions: sanitizeList(parsed.recommended_actions),
    };
  } catch {
    return {
      decision: "needs_human",
      summary: "Codex did not return a valid structured review.",
      riskReasons: ["Malformed or missing Codex output"],
      evidence: [],
      recommendedActions: ["Inspect the workflow run and review the PR manually"],
    };
  }
}

function latestStatus(statuses, contextName) {
  return statuses
    .filter((status) => status.context === contextName)
    .sort(
      (a, b) =>
        new Date(b.created_at || 0).getTime() -
        new Date(a.created_at || 0).getTime(),
    )[0];
}

function latestCheck(checkRuns, checkName) {
  return checkRuns
    .filter((check) => check.name === checkName)
    .sort(
      (a, b) =>
        new Date(b.completed_at || b.started_at || 0).getTime() -
        new Date(a.completed_at || a.started_at || 0).getTime(),
    )[0];
}

function evaluateGate(checkRuns, statuses, { production = false } = {}) {
  const requiredChecks = production
    ? ["quality", "react-doctor", "production"]
    : ["quality", "react-doctor"];
  const missing = [];

  for (const name of requiredChecks) {
    const check = latestCheck(checkRuns, name);
    if (!check || check.status !== "completed" || check.conclusion !== "success") {
      missing.push(`${name}=not-successful`);
    }
  }

  const vercel = latestStatus(statuses, "Vercel");
  if (!vercel || vercel.state !== "success") {
    missing.push("Vercel=not-successful");
  }

  const doctorStatus = latestStatus(statuses, "React Doctor");
  if (!doctorStatus || doctorStatus.state !== "success") {
    missing.push("React Doctor=not-successful");
  } else if (
    !production &&
    !doctorStatus.description?.startsWith("Skipped") &&
    !/\b0 errors?\b/.test(doctorStatus.description || "")
  ) {
    missing.push("React Doctor=errors-or-unreadable-result");
  }

  if (!production) {
    const review = latestStatus(statuses, REVIEW_STATUS);
    if (!review || review.state !== "success") {
      missing.push(`${REVIEW_STATUS}=not-successful`);
    }
  }

  return { passed: missing.length === 0, missing };
}

async function commitGate(github, owner, repo, sha, options) {
  const [checksResponse, statusesResponse] = await Promise.all([
    github.rest.checks.listForRef({
      owner,
      repo,
      ref: sha,
      filter: "latest",
      per_page: 100,
    }),
    github.rest.repos.getCombinedStatusForRef({
      owner,
      repo,
      ref: sha,
      per_page: 100,
    }),
  ]);

  return evaluateGate(
    checksResponse.data.check_runs,
    statusesResponse.data.statuses,
    options,
  );
}

async function ensureLabels(github, owner, repo) {
  const existing = new Set(
    (
      await github.paginate(github.rest.issues.listLabelsForRepo, {
        owner,
        repo,
        per_page: 100,
      })
    ).map((label) => label.name),
  );

  for (const label of Object.values(LABELS)) {
    if (existing.has(label.name)) continue;
    await github.rest.issues.createLabel({ owner, repo, ...label });
  }
}

async function replaceAutomationLabels(
  github,
  owner,
  repo,
  issueNumber,
  desiredNames,
) {
  const current = await github.paginate(
    github.rest.issues.listLabelsOnIssue,
    { owner, repo, issue_number: issueNumber, per_page: 100 },
  );
  const currentNames = new Set(current.map((label) => label.name));
  const desired = new Set(desiredNames);

  for (const name of currentNames) {
    if (!AUTOMATION_LABEL_NAMES.has(name) || desired.has(name)) continue;
    await github.rest.issues.removeLabel({
      owner,
      repo,
      issue_number: issueNumber,
      name,
    });
  }

  const toAdd = [...desired].filter((name) => !currentNames.has(name));
  if (toAdd.length) {
    await github.rest.issues.addLabels({
      owner,
      repo,
      issue_number: issueNumber,
      labels: toAdd,
    });
  }
}

async function upsertReviewComment(github, owner, repo, issueNumber, body) {
  const comments = await github.paginate(github.rest.issues.listComments, {
    owner,
    repo,
    issue_number: issueNumber,
    per_page: 100,
  });
  const prior = comments.find(
    (comment) =>
      comment.user?.type === "Bot" && comment.body?.includes(REVIEW_MARKER),
  );

  if (prior) {
    await github.rest.issues.updateComment({
      owner,
      repo,
      comment_id: prior.id,
      body,
    });
    return;
  }
  await github.rest.issues.createComment({
    owner,
    repo,
    issue_number: issueNumber,
    body,
  });
}

function listSection(title, items) {
  if (!items.length) return "";
  return `\n\n**${title}**\n${items.map((item) => `- ${item}`).join("\n")}`;
}

async function reportDependabotReview({ github, context, core }) {
  const { owner, repo } = context.repo;
  const pullNumber = Number.parseInt(process.env.PR_NUMBER || "", 10);
  const expectedHead = process.env.HEAD_SHA;
  const policy = JSON.parse(process.env.POLICY_JSON || "{}");
  const codexJobResult = process.env.CODEX_JOB_RESULT || "skipped";

  if (!Number.isInteger(pullNumber) || !expectedHead) {
    throw new Error("Missing pull request number or expected head SHA");
  }

  const { data: pull } = await github.rest.pulls.get({
    owner,
    repo,
    pull_number: pullNumber,
  });
  if (
    pull.state !== "open" ||
    pull.user?.login !== "dependabot[bot]" ||
    pull.base.ref !== "main"
  ) {
    core.notice("PR is no longer an open Dependabot update to main.");
    return;
  }
  if (pull.head.sha !== expectedHead) {
    core.notice("PR head changed during review; the synchronize event will rerun it.");
    return;
  }

  let review;
  if (!policy.safeToReview) {
    review = {
      decision: "needs_human",
      summary: "Deterministic trust checks did not permit an agent review.",
      riskReasons: policy.trustReasons || ["Untrusted review context"],
      evidence: [],
      recommendedActions: ["Review the PR and its commit provenance manually"],
    };
  } else if (codexJobResult !== "success") {
    review = {
      decision: "needs_human",
      summary: "The Codex review did not complete successfully.",
      riskReasons: [`Codex job result: ${sanitizeText(codexJobResult, 100)}`],
      evidence: [],
      recommendedActions: ["Inspect the workflow run and review the PR manually"],
    };
  } else {
    review = parseCodexResult(process.env.CODEX_RESULT);
  }

  const eligible =
    policy.autoMergeEligible === true && review.decision === "approve";
  const desiredLabels = eligible
    ? [LABELS.approved.name, LABELS.ready.name]
    : review.decision === "approve"
      ? [LABELS.approved.name, LABELS.human.name]
      : review.decision === "block"
        ? [LABELS.blocked.name]
        : [LABELS.human.name];

  await ensureLabels(github, owner, repo);
  await replaceAutomationLabels(
    github,
    owner,
    repo,
    pullNumber,
    desiredLabels,
  );

  const workflowUrl = `https://github.com/${owner}/${repo}/actions/runs/${context.runId}`;
  await github.rest.repos.createCommitStatus({
    owner,
    repo,
    sha: expectedHead,
    state: eligible ? "success" : "failure",
    context: REVIEW_STATUS,
    description: eligible
      ? "Exact head approved for guarded dependency auto-merge"
      : "Human dependency review required",
    target_url: workflowUrl,
  });

  const packages = (policy.dependencyNames || []).map((name) =>
    sanitizeText(name, 120),
  );
  const versions = [policy.previousVersion, policy.newVersion]
    .map((version) => sanitizeText(version, 80))
    .filter(Boolean)
    .join(" → ");
  const policyReasons = sanitizeList(policy.autoMergeReasons, 8);
  const body = [
    REVIEW_MARKER,
    "### Dependabot automation review",
    "",
    `- Reviewed commit: \`${expectedHead.slice(0, 12)}\``,
    `- Dependency: ${packages.length ? packages.map((name) => `\`${name}\``).join(", ") : "unknown"}${versions ? ` (${versions})` : ""}`,
    `- Deterministic auto-merge lane: **${policy.autoMergeEligible ? "eligible" : "not eligible"}**`,
    `- Codex decision: **${review.decision}**`,
    `- Queue result: **${eligible ? "ready for guarded auto-merge" : "human review required"}**`,
    "",
    review.summary,
    listSection("Deterministic policy reasons", policyReasons),
    listSection("Codex risk reasons", review.riskReasons),
    listSection("Evidence", review.evidence),
    listSection("Recommended actions", review.recommendedActions),
    "",
    "_This decision is bound to the exact commit above. Any Dependabot refresh removes its authority and starts a new review._",
  ]
    .filter((line) => line !== "")
    .join("\n");
  await upsertReviewComment(github, owner, repo, pullNumber, body);
}

async function allPullFiles(github, owner, repo, pullNumber) {
  return (
    await github.paginate(github.rest.pulls.listFiles, {
      owner,
      repo,
      pull_number: pullNumber,
      per_page: 100,
    })
  ).map((file) => file.filename);
}

async function dispatchWithRetry(github, request, attempts = 3) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await github.rest.actions.createWorkflowDispatch(request);
      return;
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
      }
    }
  }
  throw lastError;
}

async function mergeNextDependabot({ github, context, core }) {
  const { owner, repo } = context.repo;
  const { data: main } = await github.rest.repos.getBranch({
    owner,
    repo,
    branch: "main",
  });
  const mainSha = main.commit.sha;
  const mainGate = await commitGate(github, owner, repo, mainSha, {
    production: true,
  });
  if (!mainGate.passed) {
    core.notice(
      `Dependency queue paused until current main is verified: ${mainGate.missing.join(", ")}`,
    );
    return;
  }

  const pulls = await github.paginate(github.rest.pulls.list, {
    owner,
    repo,
    state: "open",
    base: "main",
    sort: "created",
    direction: "asc",
    per_page: 100,
  });
  const dependabotPulls = pulls.filter(
    (pull) =>
      pull.user?.login === "dependabot[bot]" &&
      pull.head.repo?.full_name === `${owner}/${repo}`,
  );
  const pending = dependabotPulls.filter((pull) =>
    pull.labels.some((label) => label.name === LABELS.pending.name),
  );
  if (pending.length > 1) {
    throw new Error("More than one Dependabot PR is marked merge-pending");
  }
  const ready = dependabotPulls.filter((pull) =>
    pull.labels.some((label) => label.name === LABELS.ready.name),
  );
  const candidate = pending[0] || ready[0];
  if (!candidate) {
    core.notice("No reviewed low-risk Dependabot PR is ready.");
    return;
  }

  const { data: pull } = await github.rest.pulls.get({
    owner,
    repo,
    pull_number: candidate.number,
  });
  const headSha = pull.head.sha;
  if (
    pull.state !== "open" ||
    pull.draft ||
    pull.user?.login !== "dependabot[bot]" ||
    pull.base.ref !== "main" ||
    pull.head.repo?.full_name !== `${owner}/${repo}`
  ) {
    core.warning(`PR #${pull.number} no longer meets Dependabot trust bounds.`);
    return;
  }

  const files = await allPullFiles(github, owner, repo, pull.number);
  if (!filesArePackageOnly(files)) {
    await replaceAutomationLabels(github, owner, repo, pull.number, [
      LABELS.human.name,
    ]);
    core.warning(`PR #${pull.number} changed files outside package manifests.`);
    return;
  }

  const headGate = await commitGate(github, owner, repo, headSha, {
    production: false,
  });
  if (!headGate.passed) {
    core.notice(
      `PR #${pull.number} is waiting on exact-head gates: ${headGate.missing.join(", ")}`,
    );
    return;
  }

  if (pull.mergeable === false || pull.mergeable_state === "dirty") {
    await replaceAutomationLabels(github, owner, repo, pull.number, [
      LABELS.human.name,
    ]);
    await github.rest.issues.createComment({
      owner,
      repo,
      issue_number: pull.number,
      body: "Dependabot automation stopped because the branch conflicts with `main`. Human review is required.",
    });
    return;
  }
  if (pull.mergeable !== true || pull.mergeable_state !== "clean") {
    core.notice(
      `PR #${pull.number} is not cleanly mergeable yet (${pull.mergeable_state}).`,
    );
    return;
  }

  await ensureLabels(github, owner, repo);
  await replaceAutomationLabels(github, owner, repo, pull.number, [
    LABELS.approved.name,
    LABELS.pending.name,
  ]);

  const merge = await github.rest.pulls.merge({
    owner,
    repo,
    pull_number: pull.number,
    sha: headSha,
    merge_method: "squash",
    commit_title: `build(deps): merge Dependabot update #${pull.number}`,
    commit_message:
      "Automated after exact-SHA policy, CI, Codex review, Vercel preview, and branch-protection gates.",
  });
  if (!merge.data.merged) {
    await replaceAutomationLabels(github, owner, repo, pull.number, [
      LABELS.approved.name,
      LABELS.ready.name,
    ]);
    core.warning(
      `GitHub did not merge PR #${pull.number}: ${sanitizeText(merge.data.message, 300)}`,
    );
    return;
  }

  const mergedSha = merge.data.sha;
  const dispatches = [
    { workflow_id: "ci.yml", ref: "main" },
    { workflow_id: "react-doctor.yml", ref: "main" },
    {
      workflow_id: "production-verification.yml",
      ref: "main",
      inputs: { expected_sha: mergedSha },
    },
  ];
  const dispatchErrors = [];
  for (const dispatch of dispatches) {
    try {
      await dispatchWithRetry(github, { owner, repo, ...dispatch });
    } catch (error) {
      dispatchErrors.push(
        `${dispatch.workflow_id}: ${sanitizeText(error.message, 200)}`,
      );
    }
  }

  await github.rest.issues.createComment({
    owner,
    repo,
    issue_number: pull.number,
    body: [
      `Merged exact reviewed commit \`${headSha.slice(0, 12)}\` as \`${mergedSha.slice(0, 12)}\`.`,
      "The dependency queue is paused until post-merge CI, React Doctor, Vercel Production, and the live-site smoke all succeed.",
      dispatchErrors.length
        ? `Post-merge dispatch warning: ${dispatchErrors.join("; ")}`
        : "",
    ]
      .filter(Boolean)
      .join("\n\n"),
  });

  if (dispatchErrors.length) {
    throw new Error(`Post-merge dispatch failed: ${dispatchErrors.join("; ")}`);
  }
}

async function productionDeploymentState(github, owner, repo, sha) {
  const deployments = await github.rest.repos.listDeployments({
    owner,
    repo,
    sha,
    environment: "Production",
    per_page: 20,
  });
  if (!deployments.data.length) return { state: "pending" };

  const deployment = deployments.data[0];
  const statuses = await github.rest.repos.listDeploymentStatuses({
    owner,
    repo,
    deployment_id: deployment.id,
    per_page: 100,
  });
  const latest = statuses.data[0];
  return {
    state: latest?.state || "pending",
    environmentUrl: latest?.environment_url || "",
  };
}

async function verifyProduction({ github, context, core }) {
  const { owner, repo } = context.repo;
  const { data: main } = await github.rest.repos.getBranch({
    owner,
    repo,
    branch: "main",
  });
  const expectedSha = process.env.EXPECTED_SHA || main.commit.sha;
  if (main.commit.sha !== expectedSha) {
    throw new Error(
      `Production verification expected ${expectedSha}, but main is ${main.commit.sha}`,
    );
  }

  const attempts = 20;
  let lastState = "pending";
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const deployment = await productionDeploymentState(
      github,
      owner,
      repo,
      expectedSha,
    );
    lastState = deployment.state;
    if (["error", "failure"].includes(deployment.state)) {
      throw new Error(`Vercel Production deployment ended in ${deployment.state}`);
    }

    const statusResponse = await github.rest.repos.getCombinedStatusForRef({
      owner,
      repo,
      ref: expectedSha,
      per_page: 100,
    });
    const vercel = latestStatus(statusResponse.data.statuses, "Vercel");
    if (deployment.state === "success" && vercel?.state === "success") {
      const response = await fetch("https://westchasegi.com/en", {
        redirect: "follow",
        headers: { "user-agent": "westchase-gi-production-verifier/1" },
        signal: AbortSignal.timeout(20_000),
      });
      const body = await response.text();
      if (
        response.ok &&
        new URL(response.url).hostname === "westchasegi.com" &&
        body.includes("Digestive health, in caring hands")
      ) {
        await core.summary
          .addHeading("Production verified")
          .addTable([
            [
              { data: "Check", header: true },
              { data: "Result", header: true },
            ],
            ["Commit", expectedSha],
            ["Vercel Production", deployment.state],
            ["Canonical live smoke", `${response.status} ${response.url}`],
          ])
          .write();
        return;
      }
      lastState = `live-smoke-${response.status}`;
    }

    if (attempt < attempts) {
      await new Promise((resolve) => setTimeout(resolve, 30_000));
    }
  }

  throw new Error(
    `Production did not become verifiably healthy for ${expectedSha} (${lastState})`,
  );
}

if (require.main === module) {
  if (process.argv[2] !== "policy") {
    throw new Error("Usage: node dependency-automation.cjs policy");
  }
  emitPolicy(policyFromEnvironment());
}

module.exports = {
  AUTO_MERGE_PACKAGES,
  LABELS,
  REVIEW_STATUS,
  classifyDependabot,
  evaluateGate,
  filesArePackageOnly,
  mergeNextDependabot,
  parseCodexResult,
  reportDependabotReview,
  sanitizeText,
  verifyProduction,
};
