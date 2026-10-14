/**
 * Unit tests for the plan-time environment boundary (env-boundary.mjs).
 *
 * Each test builds the smallest `terraform show -json` shape the check reads:
 * planned values, prior state, configuration and resource changes. The
 * account is built at run time so no account-shaped number sits in the repo.
 *
 * Run: node --test infra/checks/env-boundary.test.mjs
 */

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import { checkPlan, formatReport, METADATA_READS } from "./env-boundary.mjs";

const ACCOUNT = "0".repeat(12);
const KEY = "1b2c3d4e-0000-4000-8000-00000000000a";
const OTHER_KEY = "1b2c3d4e-0000-4000-8000-00000000000b";

const arn = (service, resource) => `arn:aws:${service}:us-east-2:${ACCOUNT}:${resource}`;

const allow = (Action, Resource, extra = {}) => ({ Effect: "Allow", Action, Resource, ...extra });

const document = (...statements) =>
  JSON.stringify({ Version: "2012-10-17", Statement: statements });

/**
 * A plan holding the given resources. Each resource's configuration sets every
 * value it carries unless `configured` lists the attributes it sets, and
 * `unknown` holds its after_unknown.
 */
function plan({ resources = [], prior = [], configuration = true }) {
  return {
    planned_values: {
      root_module: {
        resources: resources.map(({ address, type, values }) => ({
          address,
          mode: "managed",
          type: type ?? address.split(".")[0],
          values,
        })),
      },
    },
    prior_state: { values: { root_module: { resources: prior } } },
    resource_changes: resources.map(({ address, unknown }) => ({
      address,
      change: { after_unknown: unknown ?? {} },
    })),
    configuration: configuration
      ? {
          root_module: {
            resources: resources.map(({ address, values, configured }) => ({
              address,
              expressions: Object.fromEntries(
                (configured ?? Object.keys(values)).map((name) => [name, {}]),
              ),
            })),
          },
        }
      : { root_module: { resources: [] } },
  };
}

const policyResource = (address, ...statements) => ({
  address,
  values: { name: address.split(".")[1], policy: document(...statements) },
});

const priorKey = (address, id, values = {}) => ({
  address,
  mode: address.startsWith("data.") ? "data" : "managed",
  type: "aws_kms_key",
  values: { arn: arn("kms", `key/${id}`), key_id: id, ...values },
});

const rules = (result) => result.findings.map(({ rule }) => rule);

const callerIdentity = () => ({
  address: "data.aws_caller_identity.current",
  mode: "data",
  type: "aws_caller_identity",
  values: { account_id: ACCOUNT },
});

test("a staging policy that names a production resource fails rule 1", () => {
  const result = checkPlan(
    plan({
      resources: [
        policyResource(
          "aws_iam_policy.staging_app",
          allow("secretsmanager:GetSecretValue", arn("secretsmanager", "secret:wgi/production/db")),
        ),
      ],
    }),
    { root: "shared" },
  );
  assert.ok(rules(result).includes(1));
});

test("a production policy that names a staging or preview resource fails rule 1", () => {
  for (const name of ["wgi-staging-mail", "wgi-pr-12-mail", "wgi-preview-mail"]) {
    const result = checkPlan(
      plan({
        resources: [
          policyResource(
            "aws_iam_policy.production_app",
            allow("dynamodb:GetItem", arn("dynamodb", `table/${name}`)),
          ),
        ],
      }),
      { root: "shared" },
    );
    assert.ok(rules(result).includes(1), name);
  }
});

test("an RDS master secret wildcard fails rule 2", () => {
  const result = checkPlan(
    plan({
      resources: [
        policyResource(
          "aws_iam_policy.staging_bootstrap",
          allow("secretsmanager:GetSecretValue", arn("secretsmanager", "secret:rds!db-*")),
        ),
      ],
    }),
    { root: "shared" },
  );
  assert.deepEqual(rules(result), [2]);
});

test("a wildcard whose prefix names its own environment passes", () => {
  const result = checkPlan(
    plan({
      resources: [
        policyResource(
          "aws_iam_policy.staging_app",
          allow("secretsmanager:GetSecretValue", [
            arn("secretsmanager", "secret:wgi/staging/*"),
            arn("dynamodb", "table/wgi-pr-12-*"),
          ]),
          allow("logs:PutLogEvents", arn("logs", "log-group:/wgi/staging/*")),
        ),
      ],
    }),
    { root: "shared" },
  );
  assert.deepEqual(result.findings, []);
  assert.equal(result.checked.length, 1);
});

test("a carve-out statement holding an action without aws:ResourceTag fails rule 2", () => {
  const result = checkPlan(
    plan({
      resources: [
        policyResource(
          "aws_iam_policy.staging_apply",
          allow(
            ["ec2:CreateSecurityGroup", "ec2:AuthorizeSecurityGroupIngress"],
            arn("ec2", "security-group/*"),
            {
              Condition: {
                StringEquals: { "aws:ResourceTag/env": "staging", "aws:RequestTag/env": "staging" },
              },
            },
          ),
        ),
      ],
    }),
    { root: "shared" },
  );
  assert.ok(
    result.findings.some(
      ({ rule, reason }) =>
        rule === 2 && /aws:ResourceTag/.test(reason) && reason.includes("ec2:CreateSecurityGroup"),
    ),
  );
});

test("a carve-out statement tagged for the other environment fails", () => {
  const result = checkPlan(
    plan({
      resources: [
        policyResource(
          "aws_iam_policy.staging_apply",
          allow("cognito-idp:DescribeUserPool", arn("cognito-idp", "userpool/*"), {
            Condition: { StringEquals: { "aws:ResourceTag/env": "production" } },
          }),
        ),
      ],
    }),
    { root: "shared" },
  );
  assert.ok(result.findings.some(({ rule, reason }) => rule === 2 && /= staging/.test(reason)));
});

test("a carve-out create statement without aws:RequestTag fails rule 2", () => {
  const result = checkPlan(
    plan({
      resources: [
        policyResource(
          "aws_iam_policy.staging_apply",
          allow("kms:CreateKey", arn("kms", "key/*"), {
            Condition: { StringEquals: { "aws:ResourceTag/env": "staging" } },
          }),
        ),
      ],
    }),
    { root: "shared" },
  );
  assert.ok(result.findings.some(({ rule, reason }) => rule === 2 && /RequestTag/.test(reason)));
});

test("a well-formed carve-out passes and is listed as an exception", () => {
  const tagged = (tags) => ({ Condition: { StringEquals: tags } });
  const result = checkPlan(
    plan({
      resources: [
        policyResource(
          "aws_iam_policy.staging_apply",
          allow(
            ["kms:CreateKey", "kms:TagResource"],
            arn("kms", "key/*"),
            tagged({ "aws:ResourceTag/env": "staging", "aws:RequestTag/env": "staging" }),
          ),
          allow(
            ["kms:DescribeKey", "kms:GetKeyPolicy"],
            arn("kms", "key/*"),
            tagged({ "aws:ResourceTag/env": "staging" }),
          ),
        ),
      ],
    }),
    { root: "shared" },
  );
  assert.deepEqual(result.findings, []);
  assert.equal(result.exceptions.length, 2);
});

/** Findings for one statement in a staging policy in the shared root. */
const staging = (statement) =>
  checkPlan(plan({ resources: [policyResource("aws_iam_policy.staging_apply", statement)] }), {
    root: "shared",
  });

const securityGroups = arn("ec2", "security-group/*");

test("a security group create passes with aws:RequestTag alone, and fails without it", () => {
  const create = (Condition) => allow("ec2:CreateSecurityGroup", securityGroups, { Condition });
  const passing = staging(create({ StringEquals: { "aws:RequestTag/env": "staging" } }));
  assert.deepEqual(passing.findings, []);
  assert.equal(passing.exceptions.length, 1);
  assert.deepEqual(
    rules(staging(create({ StringEquals: { "aws:RequestTag/env": "production" } }))).sort(),
    [1, 2],
  );
  assert.deepEqual(rules(staging(create(undefined))), [2]);
});

test("tags a create writes pass only when ec2:CreateAction names that create", () => {
  const tags = (createAction) => {
    const equals = { "aws:RequestTag/env": "staging" };
    if (createAction) equals["ec2:CreateAction"] = createAction;
    return allow("ec2:CreateTags", securityGroups, { Condition: { StringEquals: equals } });
  };
  assert.deepEqual(staging(tags("CreateSecurityGroup")).findings, []);
  assert.deepEqual(rules(staging(tags("RunInstances"))), [2]);
  assert.deepEqual(rules(staging(tags(["CreateSecurityGroup", "RunInstances"]))), [2]);
  assert.ok(rules(staging(tags(undefined))).includes(2));
});

test("a tag change passes only on its own resources and never touches the env key", () => {
  const retag = (environment, guard) => {
    const Condition = { StringEquals: { "aws:ResourceTag/env": environment } };
    if (guard) Condition[guard] = { "aws:TagKeys": ["env"] };
    return allow(
      ["cognito-idp:TagResource", "cognito-idp:UntagResource"],
      arn("cognito-idp", "userpool/*"),
      { Condition },
    );
  };
  const guard = "ForAllValues:StringNotEqualsIgnoreCase";
  assert.deepEqual(staging(retag("staging", guard)).findings, []);
  assert.deepEqual(rules(staging(retag("staging", undefined))), [2]);
  assert.deepEqual(rules(staging(retag("staging", "ForAllValues:StringNotEquals"))), [2]);
  assert.deepEqual(rules(staging(retag("production", guard))).sort(), [1, 2]);
});

test("a tag action beside other actions carries both tag keys", () => {
  const result = staging(
    allow(
      ["cognito-idp:UntagResource", "cognito-idp:DescribeUserPool"],
      arn("cognito-idp", "userpool/*"),
      {
        Condition: { StringEquals: { "aws:ResourceTag/env": "staging" } },
      },
    ),
  );
  assert.ok(result.findings.some(({ rule, reason }) => rule === 2 && /RequestTag/.test(reason)));
});

test("Resource * creates pass only when born with the environment's tag", () => {
  const create = (actions, tags) =>
    allow(actions, "*", tags ? { Condition: { StringEquals: tags } } : {});
  const own = { "aws:RequestTag/env": "staging" };
  const passing = staging(create(["kms:CreateKey", "cognito-idp:CreateUserPool"], own));
  assert.deepEqual(passing.findings, []);
  assert.match(passing.exceptions[0].reason, /creates tagged env = staging/);
  assert.deepEqual(rules(staging(create("acm:RequestCertificate", undefined))), [2]);
  assert.deepEqual(
    rules(staging(create("acm:RequestCertificate", { "aws:RequestTag/env": "production" }))).sort(),
    [1, 2],
  );
  assert.deepEqual(rules(staging(create(["kms:CreateKey", "kms:Decrypt"], own))), [2]);
  assert.deepEqual(rules(staging(create(["elasticloadbalancing:SetWebAcl"], undefined))), []);
});

test("Resource * fails unless every action accepts only *", () => {
  const holder = (statement) =>
    checkPlan(plan({ resources: [policyResource("aws_iam_policy.staging_app", statement)] }), {
      root: "shared",
    });
  assert.deepEqual(rules(holder(allow(["s3:GetObject"], "*"))), [2]);
  assert.deepEqual(rules(holder(allow(["ecr:GetAuthorizationToken"], "*"))), []);
  assert.deepEqual(rules(holder(allow(["ecr:GetAuthorizationToken", "ecr:PutImage"], "*"))), [2]);
});

test("an opaque identifier that nothing in the plan holds fails rule 3", () => {
  const result = checkPlan(
    plan({
      resources: [
        policyResource(
          "aws_iam_policy.staging_app",
          allow("kms:Decrypt", arn("kms", `key/${KEY}`)),
        ),
      ],
    }),
    { root: "shared" },
  );
  assert.deepEqual(rules(result), [3]);
});

test("an opaque identifier traced to the other environment fails rule 1", () => {
  const result = checkPlan(
    plan({
      resources: [
        policyResource(
          "aws_iam_policy.staging_app",
          allow("kms:Decrypt", arn("kms", `key/${KEY}`)),
        ),
      ],
      prior: [priorKey("data.aws_kms_key.data", KEY, { tags: { env: "production" } })],
    }),
    { root: "shared" },
  );
  assert.deepEqual(rules(result), [1]);
});

test("an opaque identifier traced to its own environment or to shared passes", () => {
  const result = checkPlan(
    plan({
      resources: [
        policyResource(
          "aws_iam_policy.staging_app",
          allow("kms:Decrypt", [arn("kms", `key/${KEY}`), arn("kms", `key/${OTHER_KEY}`)]),
        ),
      ],
      prior: [
        priorKey('module.kms["staging_data"].aws_kms_key.main', KEY),
        priorKey("data.aws_kms_alias.tfstate", OTHER_KEY),
      ],
    }),
    { root: "shared" },
  );
  assert.deepEqual(result.findings, []);
});

test("a configured policy the plan cannot know fails", () => {
  const result = checkPlan(
    plan({
      resources: [
        {
          address: "aws_iam_role_policy.staging_app",
          values: { name: "wgi-staging-app", role: "wgi-staging-app" },
          configured: ["name", "role", "policy"],
          unknown: { policy: true },
        },
      ],
    }),
    { root: "shared" },
  );
  assert.deepEqual(rules(result), ["unknown"]);
});

test("an attachment that gives a role the other environment's policy fails rule 1", () => {
  const attachment = (role, policy) => ({
    address: `module.github_deploy_${role}.aws_iam_role_policy_attachment.main["apply_edge"]`,
    values: {
      role: `wgi-github-deploy-${role}`,
      policy_arn: `arn:aws:iam::${ACCOUNT}:policy/wgi-terraform-apply-${policy}-edge`,
    },
  });
  const check = (...resources) =>
    checkPlan(
      plan({
        resources: [
          ...["staging", "production"].map((environment) => ({
            address: `aws_iam_policy.apply["${environment}-edge"]`,
            values: {
              name: `wgi-terraform-apply-${environment}-edge`,
              path: "/",
              policy: document(
                allow("logs:PutRetentionPolicy", arn("logs", `log-group:/wgi/${environment}/*`)),
              ),
            },
          })),
          ...resources,
        ],
        prior: [callerIdentity()],
      }),
      { root: "shared" },
    );
  assert.deepEqual(rules(check(attachment("staging", "production"))), [1]);
  assert.deepEqual(rules(check(attachment("production", "staging"))), [1]);
  const own = check(attachment("staging", "staging"), attachment("production", "production"));
  assert.deepEqual(own.findings, []);
  assert.doesNotMatch(formatReport(check(attachment("staging", "production"))), /arn:|\d{12}/);
});

/** The shared read policy, its role attachments and the plan's account. */
function sharedPolicyPlan(statements, roles, { identity = true } = {}) {
  return plan({
    resources: [
      {
        address: "aws_iam_policy.terraform_read",
        values: { name: "wgi-terraform-read", path: "/", policy: document(...statements) },
      },
      ...roles.map((role) => ({
        address: `module.github_plan_${role}.aws_iam_role_policy_attachment.managed["terraform_read"]`,
        values: {
          role: `wgi-github-plan-${role}`,
          policy_arn: `arn:aws:iam::${ACCOUNT}:policy/wgi-terraform-read`,
        },
      })),
    ],
    prior: identity ? [callerIdentity()] : [],
  });
}

const PRODUCTION_STATE = "arn:aws:s3:::westchase-gi-tfstate-use2/production/*";

test("a shared policy is checked again under each role it is attached to", () => {
  const reads = [
    allow(METADATA_READS, "*", { Sid: "RefreshSharedRoot" }),
    allow("s3:GetObject", PRODUCTION_STATE, { Sid: "ReadProductionState" }),
  ];
  const staging = checkPlan(sharedPolicyPlan(reads, ["staging"]), { root: "shared" });
  assert.deepEqual(rules(staging), [1, 2]);
  for (const { address, label } of staging.findings) {
    assert.match(address, /plan_staging.* -> aws_iam_policy\.terraform_read/);
    assert.equal(label, "ReadProductionState");
  }
  assert.ok(staging.exceptions.some(({ reason }) => /metadata reads/.test(reason)));

  const production = checkPlan(sharedPolicyPlan(reads, ["production"]), { root: "shared" });
  assert.deepEqual(production.findings, []);

  // Unattached, the same policy is shared and skipped.
  const unattached = checkPlan(sharedPolicyPlan(reads, []), { root: "shared" });
  assert.deepEqual(unattached.findings, []);
  assert.equal(unattached.skipped.length, 1);
});

test("a shared policy's Resource * passes only for the metadata reads", () => {
  const check = (Action) =>
    rules(checkPlan(sharedPolicyPlan([allow(Action, "*")], ["staging"]), { root: "shared" }));
  assert.deepEqual(check(METADATA_READS), []);
  assert.deepEqual(check(["iam:GetRole", "s3:GetBucketPolicy"]), []);
  assert.deepEqual(check(["kms:DescribeKey", "s3:GetObject"]), [2]);
  assert.deepEqual(check("s3:Get*"), [2]);
  assert.deepEqual(check("logs:GetLogEvents"), [2]);
});

test("ecr:BatchDeleteImage in a shared policy fails at the policy and at each attachment", () => {
  const result = checkPlan(
    sharedPolicyPlan([allow("ecr:*", arn("ecr", "repository/wgi-app"))], ["staging", "production"]),
    { root: "shared" },
  );
  const forbidden = result.findings.filter(({ rule }) => rule === "forbidden");
  assert.equal(forbidden.length, 3);
  assert.ok(forbidden.some(({ address }) => address === "aws_iam_policy.terraform_read policy"));
  assert.ok(forbidden.some(({ address }) => /plan_staging.* -> /.test(address)));
  assert.ok(forbidden.some(({ address }) => /plan_production.* -> /.test(address)));
});

test("an attached policy the plan does not write fails unless allow-listed", () => {
  const adminAccess = "arn:aws:iam::aws:policy/AdministratorAccess";
  const attach = (policy_arn, { identity = true } = {}) =>
    plan({
      resources: [
        {
          address: "aws_iam_policy.terraform_read",
          values: {
            name: "wgi-terraform-read",
            path: "/",
            policy: document(allow("iam:GetRole", "*")),
          },
        },
        {
          address: 'module.github_deploy_staging.aws_iam_role_policy_attachment.managed["x"]',
          values: { role: "wgi-github-deploy-staging", policy_arn },
        },
      ],
      prior: identity ? [callerIdentity()] : [],
    });
  const check = (policy_arn, options, extra = {}) =>
    checkPlan(attach(policy_arn, options), { root: "shared", ...extra });

  const aws = check(adminAccess);
  assert.deepEqual(rules(aws), ["attachment"]);
  assert.match(aws.findings[0].reason, /AWS-managed/);
  const listed = check(adminAccess, {}, { allowedPolicyArns: { [adminAccess]: "test only" } });
  assert.deepEqual(listed.findings, []);
  assert.ok(listed.exceptions.some(({ reason }) => reason === "allow-listed policy: test only"));

  assert.deepEqual(rules(check(`arn:aws:iam::${ACCOUNT}:policy/wgi-staging-missing`)), [
    "attachment",
  ]);
  const elsewhere = `arn:aws:iam::${"1".repeat(12)}:policy/wgi-terraform-read`;
  assert.deepEqual(rules(check(elsewhere)), ["attachment"]);
  const own = `arn:aws:iam::${ACCOUNT}:policy/wgi-terraform-read`;
  assert.deepEqual(rules(check(own)), []);
  assert.deepEqual(rules(check(own, { identity: false })), ["attachment"]);
  assert.deepEqual(rules(check(`arn:aws:iam::${ACCOUNT}:policy/team/wgi-terraform-read`)), [
    "attachment",
  ]);
  assert.doesNotMatch(formatReport(aws), /arn:|\d{12}/);
});

test("an attached policy the plan knows by ARN resolves without the caller identity", () => {
  const policyArn = `arn:aws:iam::${ACCOUNT}:policy/wgi-terraform-read`;
  const result = checkPlan(
    plan({
      resources: [
        {
          address: "aws_iam_policy.terraform_read",
          values: {
            name: "wgi-terraform-read",
            arn: policyArn,
            policy: document(allow("s3:GetObject", PRODUCTION_STATE)),
          },
        },
        {
          address: 'module.github_plan_staging.aws_iam_role_policy_attachment.managed["read"]',
          values: { role: "wgi-github-plan-staging", policy_arn: policyArn },
        },
      ],
    }),
    { root: "shared" },
  );
  assert.deepEqual(rules(result), [1, 2]);
});

test("an attached policy that belongs to the other environment fails rule 1 by tag alone", () => {
  const result = checkPlan(
    plan({
      resources: [
        {
          address: "aws_iam_policy.reader",
          values: {
            name: "wgi-reader",
            path: "/",
            tags: { env: "production" },
            policy: document(allow("s3:GetObject", "arn:aws:s3:::wgi-production-uploads/*")),
          },
        },
        {
          address: 'module.github_plan_staging.aws_iam_role_policy_attachment.managed["reader"]',
          values: {
            role: "wgi-github-plan-staging",
            policy_arn: `arn:aws:iam::${ACCOUNT}:policy/wgi-reader`,
          },
        },
      ],
      prior: [callerIdentity()],
    }),
    { root: "shared" },
  );
  assert.deepEqual(rules(result), [1]);
  assert.match(result.findings[0].reason, /belongs to another environment/);
});

test("a role-widening action needs the environment's own boundary (rule 4)", () => {
  const roles = `arn:aws:iam::${ACCOUNT}:role/wgi-staging-*`;
  const boundary = (environment) => ({
    Condition: {
      StringEquals: {
        "iam:PermissionsBoundary": `arn:aws:iam::${ACCOUNT}:policy/wgi-${environment}-boundary`,
      },
    },
  });
  const check = (statement, { identity = true } = {}) =>
    rules(
      checkPlan(
        plan({
          resources: [policyResource("aws_iam_policy.deploy_staging", statement)],
          prior: identity ? [callerIdentity()] : [],
        }),
        { root: "shared" },
      ),
    );
  const widen = ["iam:CreateRole", "iam:PutRolePolicy"];
  assert.deepEqual(check(allow(widen, roles)), [4]);
  assert.deepEqual(check(allow("iam:AttachRolePolicy", roles)), [4]);
  assert.deepEqual(check(allow("iam:PutRolePermissionsBoundary", roles)), [4]);
  assert.deepEqual(check(allow("iam:UpdateAssumeRolePolicy", roles)), [4]);
  assert.deepEqual(check(allow("iam:*", roles)), [4]);
  assert.deepEqual(check(allow("iam:Put*", roles)), [4]);
  assert.deepEqual(check(allow(widen, roles, boundary("production"))).sort(), [1, 4]);
  assert.deepEqual(check(allow(widen, roles, boundary("staging"))), []);
  assert.deepEqual(check(allow(widen, roles, boundary("staging")), { identity: false }), [4]);
  assert.deepEqual(check(allow(["iam:TagRole", "iam:UntagRole"], roles)), []);
});

test("in an environment root a trust names only this account, its GitHub provider or AWS", () => {
  const trust = (Principal, { identity = true } = {}) =>
    rules(
      checkPlan(
        plan({
          resources: [
            {
              address: "aws_iam_role.app",
              values: {
                name: "wgi-staging-app",
                assume_role_policy: document(allow("sts:AssumeRole", undefined, { Principal })),
              },
            },
          ],
          prior: identity ? [callerIdentity()] : [],
        }),
        { root: "staging" },
      ),
    );
  const github = `arn:aws:iam::${ACCOUNT}:oidc-provider/token.actions.githubusercontent.com`;
  assert.deepEqual(trust({ Service: "ecs-tasks.amazonaws.com" }), []);
  assert.deepEqual(trust({ Federated: github }), []);
  assert.deepEqual(trust({ AWS: `arn:aws:iam::${ACCOUNT}:role/wgi-staging-deploy` }), []);
  assert.deepEqual(trust({ AWS: `arn:aws:iam::${ACCOUNT}:root` }), []);
  assert.deepEqual(trust({ AWS: `arn:aws:iam::${"1".repeat(12)}:root` }), ["trust"]);
  assert.deepEqual(trust({ AWS: "*" }), ["trust"]);
  assert.deepEqual(trust("*"), ["trust"]);
  assert.deepEqual(trust({ Federated: "cognito-identity.amazonaws.com" }), ["trust"]);
  assert.deepEqual(trust({ Federated: `arn:aws:iam::${ACCOUNT}:saml-provider/Okta` }), ["trust"]);
  assert.deepEqual(trust({ Federated: github }, { identity: false }), ["trust"]);
  const otherProvider = github.replace(ACCOUNT, "1".repeat(12));
  assert.deepEqual(trust({ Federated: otherProvider }), ["trust"]);
  assert.deepEqual(trust({ Service: ["ecs-tasks.amazonaws.com", "evil.example.com"] }), ["trust"]);
});

test("METADATA_READS is exactly the actions wgi-terraform-read grants", () => {
  const source = readFileSync(
    fileURLToPath(new URL("../shared/github_oidc.tf", import.meta.url)),
    "utf8",
  );
  const block = /sid\s*=\s*"RefreshSharedRoot"\s*actions\s*=\s*\[([^\]]*)\]/.exec(source);
  assert.ok(block, "RefreshSharedRoot statement not found");
  const granted = [...block[1].matchAll(/"([^"]+)"/g)].map(([, action]) => action);
  assert.deepEqual([...granted].sort(), [...METADATA_READS].sort());
});

test("a policy attribute the configuration does not set is not read", () => {
  const stale = document(allow("s3:GetObject", "arn:aws:s3:::wgi-production-uploads/*"));
  const result = checkPlan(
    plan({
      resources: [
        {
          address: "aws_iam_role.staging_app",
          values: {
            name: "wgi-staging-app",
            assume_role_policy: document(
              allow("sts:AssumeRole", undefined, {
                Principal: { Service: "ecs-tasks.amazonaws.com" },
              }),
            ),
            inline_policy: [{ name: "main", policy: stale }],
          },
          configured: ["name", "assume_role_policy"],
          unknown: { inline_policy: [{ policy: true }] },
        },
      ],
    }),
    { root: "shared" },
  );
  assert.deepEqual(result.findings, []);
  assert.equal(result.checked.length, 1);
});

test("a resource missing from the configuration is still read", () => {
  const result = checkPlan(
    plan({
      resources: [
        policyResource(
          "aws_iam_policy.staging_app",
          allow("s3:GetObject", "arn:aws:s3:::wgi-production-uploads/*"),
        ),
      ],
      configuration: false,
    }),
    { root: "shared" },
  );
  assert.ok(rules(result).includes(1));
});

test("ecr:BatchDeleteImage fails in any holder, shared ones included", () => {
  const result = checkPlan(
    plan({
      resources: [
        policyResource(
          "aws_iam_policy.ci_images",
          allow("ecr:*", arn("ecr", "repository/wgi-app")),
        ),
        {
          address: "aws_vpc_endpoint.s3",
          values: { policy: document(allow("*", "*", { Principal: "*" })) },
        },
      ],
    }),
    { root: "shared" },
  );
  assert.deepEqual(rules(result), ["forbidden"]);
  assert.equal(result.skipped.length, 2);
});

test("an Allow with NotResource fails", () => {
  const result = checkPlan(
    plan({
      resources: [
        policyResource("aws_iam_policy.staging_app", {
          Effect: "Allow",
          Action: "s3:GetObject",
          NotResource: "arn:aws:s3:::wgi-staging-uploads/*",
        }),
      ],
    }),
    { root: "shared" },
  );
  assert.deepEqual(rules(result), [2]);
});

test("a holder whose address names both environments fails attribution", () => {
  const result = checkPlan(
    plan({
      resources: [
        policyResource(
          "aws_iam_policy.staging_reads_production",
          allow("s3:GetObject", "arn:aws:s3:::wgi-staging-uploads/*"),
        ),
      ],
    }),
    { root: "shared" },
  );
  assert.deepEqual(rules(result), ["attribution"]);
});

test("a policy that names no environment in a shared root is skipped and listed", () => {
  const result = checkPlan(
    plan({
      resources: [
        policyResource("aws_iam_policy.terraform_read", allow("rds:DescribeDBInstances", "*")),
      ],
    }),
    { root: "shared" },
  );
  assert.deepEqual(result.findings, []);
  assert.deepEqual(result.checked, []);
  assert.equal(result.skipped.length, 1);
  assert.match(formatReport(result), /^skipped {2}aws_iam_policy\.terraform_read policy/m);
});

test("in an environment root every policy belongs to the root", () => {
  const holder = (root, resource) =>
    checkPlan(
      plan({
        resources: [policyResource("aws_iam_role_policy.app", allow("s3:GetObject", resource))],
      }),
      {
        root,
      },
    );
  assert.ok(rules(holder("staging", "arn:aws:s3:::wgi-production-uploads/*")).includes(1));
  assert.ok(rules(holder("preview", "arn:aws:s3:::wgi-production-uploads/*")).includes(1));
  assert.ok(rules(holder("production", "arn:aws:s3:::wgi-pr-12-uploads/*")).includes(1));
  assert.deepEqual(rules(holder("production", "arn:aws:s3:::wgi-production-uploads/*")), []);
  assert.throws(() => checkPlan(plan({}), { root: "prod" }), /unknown root/);
});

test("the report names addresses and statements, never ARNs or account numbers", () => {
  const result = checkPlan(
    plan({
      resources: [
        policyResource(
          "aws_iam_policy.staging_app",
          allow("kms:Decrypt", arn("kms", `key/${KEY}`), { Sid: "UseKey" }),
          allow("s3:GetObject", "*"),
          allow("secretsmanager:GetSecretValue", arn("secretsmanager", "secret:wgi/production/db")),
        ),
      ],
    }),
    { root: "shared" },
  );
  const report = formatReport(result);
  assert.ok(result.findings.length >= 3);
  assert.match(report, /UseKey rule 3/);
  assert.doesNotMatch(report, /arn:/);
  assert.doesNotMatch(report, /\d{12}/);
  assert.doesNotMatch(report, new RegExp(KEY));
});

test("the command exits 1 on a finding and 0 on a clean plan", () => {
  const script = fileURLToPath(new URL("./env-boundary.mjs", import.meta.url));
  const directory = mkdtempSync(join(tmpdir(), "env-boundary-"));
  try {
    const run = (resource) => {
      const file = join(directory, "plan.json");
      writeFileSync(
        file,
        JSON.stringify(
          plan({
            resources: [policyResource("aws_iam_policy.app", allow("s3:GetObject", resource))],
          }),
        ),
      );
      return spawnSync(process.execPath, [script, "--root", "staging", file], { encoding: "utf8" });
    };
    const failing = run("arn:aws:s3:::wgi-production-uploads/*");
    assert.equal(failing.status, 1);
    assert.match(failing.stdout, /^FAIL \(/m);
    const passing = run("arn:aws:s3:::wgi-staging-uploads/*");
    assert.equal(passing.status, 0);
    assert.match(passing.stdout, /^PASS \(/m);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
