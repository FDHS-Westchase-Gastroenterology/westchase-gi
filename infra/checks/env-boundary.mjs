#!/usr/bin/env node
/**
 * The plan-time environment boundary (hosting-pipeline-design §5.1).
 *
 * Every environment lives in one AWS account, so IAM resource scoping is the only
 * thing between staging and production. This reads `terraform show -json` of a
 * saved plan and fails when an Allow statement in any policy document the plan
 * would write:
 *
 *   1. names another environment's resource: "production" in a staging or
 *      preview policy; "staging", "preview" or "pr-" in a production policy; or
 *      an opaque identifier the plan traces to the other environment;
 *   2. uses a wildcard whose fixed prefix does not name its own environment,
 *      apart from the exceptions below;
 *   3. names an opaque identifier (KMS key ID, user pool ID, DbiResourceId, RDS
 *      master secret) that nothing in the plan's state or planned values holds.
 *
 * It also refuses ecr:BatchDeleteImage in any Allow (§11): image deletion
 * belongs to the repository's lifecycle policy. And it fails rule 4 when an
 * Allow of an action that widens a role (BOUNDED_ROLE_ACTIONS) lacks
 * StringEquals iam:PermissionsBoundary naming exactly the environment's own
 * boundary, wgi-<env>-boundary.
 *
 * Attachments (policy_arn, policy_arns, managed_policy_arns): each attached
 * policy is looked up in the plan, by ARN or by path and name in the plan's
 * own account. An AWS-managed policy, or one the plan does not hold, fails
 * ("attachment") unless ALLOWED_POLICY_ARNS lists it. An environment's role
 * that gets a policy named for or belonging to the other environment fails
 * rule 1. A shared policy attached to an environment's role is checked again,
 * rules 1 to 4 and ecr:BatchDeleteImage, under that role's environment, so a
 * shared policy cannot carry one environment's grants to the other's roles.
 * There, Resource "*" also passes for the METADATA_READS that
 * wgi-terraform-read grants.
 *
 * Trust ("trust"): in an environment root a role may trust only AWS services,
 * the plan's own account and the GitHub OIDC provider in it. No condition key
 * on iam:UpdateAssumeRolePolicy reads the trust policy's principals, so this
 * is the check on the trust an environment's deploy role writes.
 *
 * Usage: node infra/checks/env-boundary.mjs --root <root> plan.json
 *
 * In the staging, preview and production roots every policy belongs to the
 * root's environment. In the bootstrap and shared roots each policy belongs to
 * the environment its address, name, role or env tag carries; a policy that
 * carries none is shared, is listed as skipped, and is checked only for
 * ecr:BatchDeleteImage.
 *
 * Output names resource addresses, statement IDs and rule numbers, never ARNs
 * or other attribute values: the plan job's log is public.
 *
 * Limits, each failing closed:
 * - A policy attribute the plan cannot know yet fails, because it cannot be
 *   checked. Policies must come from data sources or literals the plan knows.
 * - An attribute that the configuration does not set is a copy of another
 *   resource's policy read back from state (aws_iam_role.inline_policy,
 *   aws_s3_bucket.policy), so it is not read; the resource that sets the policy
 *   is.
 * - Deny statements are not read: they only narrow.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOTS = {
  bootstrap: null,
  shared: null,
  staging: "staging",
  preview: "staging",
  production: "production",
};

const OTHER = { staging: "production", production: "staging" };

// Rule 1: a word that names the other environment anywhere in a value.
const OTHER_ENVIRONMENT_WORD = {
  staging: /production/i,
  production: /staging|preview|(?<![a-z0-9])pr-/i,
};

// Rule 2: the fixed prefix of a wildcard must name the policy's environment.
// Previews resolve to staging (§5.1).
const OWN_ENVIRONMENT_WORD = {
  staging: /(?:^|[^a-z0-9])(?:staging|preview|pr-\d+)(?=[^a-z0-9]|$)/i,
  production: /(?:^|[^a-z0-9])production(?=[^a-z0-9]|$)/i,
};

// Attribution of a resource from its address, name, role and env tag.
const ENVIRONMENT_WORD = /(?:^|[^a-z0-9])(staging|production|preview|pr-\d+)(?=[^a-z0-9]|$)/gi;

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";

// Opaque identifiers as they appear inside an ARN, and bare as attribute values.
const ANCHORED_IDENTIFIERS = [
  ["key", new RegExp(`:key/(mrk-[0-9a-f]{32}|${UUID})(?![0-9a-z-])`, "gi")],
  ["pool", /:userpool\/([a-z]{2}-[a-z]+-\d_[0-9a-z]+)/gi],
  ["dbi", /:dbuser:(db-[A-Z0-9]{10,})/g],
  ["secret", new RegExp(`:secret:(rds![a-z]+-${UUID})`, "gi")],
];

const BARE_IDENTIFIERS = [
  ["key", new RegExp(`^(mrk-[0-9a-f]{32}|${UUID})$`, "i")],
  ["pool", /^([a-z]{2}-[a-z]+-\d_[0-9a-z]+)$/i],
  ["dbi", /^(db-[A-Z0-9]{10,})$/],
];

// Attributes whose values identify a resource, read when tracing rule 3.
const IDENTITY_ATTRIBUTES = new Set([
  "arn",
  "arns",
  "id",
  "ids",
  "key_arn",
  "key_id",
  "kms_key_arn",
  "kms_key_id",
  "resource_id",
  "secret_arn",
  "target_key_arn",
  "target_key_id",
  "user_pool_id",
]);

// Actions whose only resource is "*", each with its Service Authorization
// Reference page.
export const ONLY_STAR_ACTIONS = {
  "ecr:GetAuthorizationToken":
    "https://docs.aws.amazon.com/service-authorization/latest/reference/list_ecr.html",
  "ecs:DescribeTaskDefinition":
    "https://docs.aws.amazon.com/service-authorization/latest/reference/list_ecs.html",
  "ecs:DeregisterTaskDefinition":
    "https://docs.aws.amazon.com/service-authorization/latest/reference/list_ecs.html",
  "elasticloadbalancing:SetWebAcl":
    "https://docs.aws.amazon.com/service-authorization/latest/reference/list_elbv2.html",
  "logs:CreateLogDelivery":
    "https://docs.aws.amazon.com/service-authorization/latest/reference/list_logs.html",
  "logs:DeleteLogDelivery":
    "https://docs.aws.amazon.com/service-authorization/latest/reference/list_logs.html",
};

/**
 * Creates whose only resource is "*" because the resource does not exist until
 * the call returns, each with the Service Authorization Reference page whose
 * row lists aws:RequestTag/${TagKey} for it. A statement holding one passes
 * only with StringEquals aws:RequestTag/env equal to its environment, so the
 * new resource is born carrying that environment's tag.
 */
export const REQUEST_TAG_STAR_ACTIONS = {
  "acm:RequestCertificate":
    "https://docs.aws.amazon.com/service-authorization/latest/reference/list_acm.html",
  "cognito-idp:CreateUserPool":
    "https://docs.aws.amazon.com/service-authorization/latest/reference/list_cognito-idp.html",
  "kms:CreateKey":
    "https://docs.aws.amazon.com/service-authorization/latest/reference/list_kms.html",
};

const words = (text) => text.trim().split(/\s+/);

/**
 * Role actions that widen what a role may do or who may use it. Each one's row
 * in the IAM Service Authorization Reference
 * (https://docs.aws.amazon.com/service-authorization/latest/reference/list_awsidentityandaccessmanagementiam.html,
 * read 2026-10-13) lists iam:PermissionsBoundary, so an Allow of one passes
 * only with StringEquals iam:PermissionsBoundary holding exactly
 * arn:<partition>:iam::<plan account>:policy/wgi-<env>-boundary (rule 4).
 */
export const BOUNDED_ROLE_ACTIONS = [
  "iam:AttachRolePolicy",
  "iam:CreateRole",
  "iam:PutRolePermissionsBoundary",
  "iam:PutRolePolicy",
  "iam:UpdateAssumeRolePolicy",
];

/**
 * The reads wgi-terraform-read grants on Resource "*" (shared/github_oidc.tf).
 * The plan and deploy roles of both environments carry that policy, so a
 * staging role reads production metadata through it. That is accepted because
 * none of these reads object, log, secret or finding contents, and S3 object
 * keys never carry patient data. A shared policy attached to an environment's
 * role passes Resource "*" when every action is written as one of these or is
 * a single action one of them covers. A change to wgi-terraform-read changes
 * this list in the same pull request.
 */
export const METADATA_READS = words(`
  access-analyzer:GetAnalyzer access-analyzer:ListAnalyzers access-analyzer:ListTagsForResource
  budgets:ListTagsForResource budgets:ViewBudget
  cloudtrail:DescribeTrails cloudtrail:GetEventSelectors cloudtrail:GetInsightSelectors
  cloudtrail:GetTrail cloudtrail:GetTrailStatus cloudtrail:ListTags
  cloudwatch:DescribeAlarms cloudwatch:ListTagsForResource
  cognito-idp:DescribeUserPool cognito-idp:ListUserPools
  config:DescribeConfigurationRecorderStatus config:DescribeConfigurationRecorders
  config:DescribeDeliveryChannels config:ListTagsForResource
  dynamodb:DescribeContinuousBackups dynamodb:DescribeTable dynamodb:DescribeTimeToLive
  dynamodb:ListTables dynamodb:ListTagsOfResource
  ec2:Describe* ec2:GetEbsDefaultKmsKeyId ec2:GetEbsEncryptionByDefault
  ecr:DescribeRepositories ecr:GetLifecyclePolicy ecr:GetRepositoryPolicy ecr:ListTagsForResource
  events:DescribeRule events:ListTagsForResource events:ListTargetsByRule
  guardduty:GetDetector guardduty:ListDetectors guardduty:ListTagsForResource
  iam:Get* iam:List*
  kms:DescribeKey kms:GetKeyPolicy kms:GetKeyRotationStatus kms:ListAliases kms:ListResourceTags
  logs:DescribeLogGroups logs:DescribeMetricFilters logs:DescribeResourcePolicies
  logs:ListTagsForResource logs:ListTagsLogGroup
  organizations:DescribeOrganization
  rds:DescribeDBInstances rds:ListTagsForResource
  route53:GetChange route53:GetHostedZone route53:ListResourceRecordSets route53:ListTagsForResource
  s3:GetAccelerateConfiguration s3:GetAccountPublicAccessBlock s3:GetBucket*
  s3:GetEncryptionConfiguration s3:GetLifecycleConfiguration s3:GetReplicationConfiguration
  s3:ListAllMyBuckets s3:ListBucket
  sns:GetSubscriptionAttributes sns:GetTopicAttributes sns:ListSubscriptionsByTopic
  sns:ListTagsForResource
`);

/**
 * Policies an attachment may name although the plan holds no document for
 * them, each ARN with its reason. AWS-managed policies are written with the
 * account "aws" (arn:aws:iam::aws:policy/...), so no entry needs an account
 * ID. Empty: every policy the roots attach is one the plan writes.
 */
export const ALLOWED_POLICY_ARNS = {};

/**
 * The tag carve-out (§5.1): resource types an apply role creates before it can
 * name them. For each, the actions whose Service Authorization Reference row
 * lists aws:ResourceTag/${TagKey} or aws:RequestTag/${TagKey}, read from
 * list_cognito-idp.html, list_kms.html, list_acm.html and list_ec2.html under
 * https://docs.aws.amazon.com/service-authorization/latest/reference/ on
 * 2026-10-13.
 *
 * `creates` are creates whose row for the type lists aws:RequestTag but not
 * aws:ResourceTag, because the resource has no tags until the call makes it;
 * `createAction` is the service's key naming the create that applies tags;
 * `tagActions` add or remove tags, and each row lists aws:TagKeys. A carve-out
 * statement passes in one of four forms:
 *
 *   F1  StringEquals aws:ResourceTag/env, plus aws:RequestTag/env when any
 *       action is a create or a tag action. Every action's row lists each key.
 *   F2  only `creates`, with StringEquals aws:RequestTag/env.
 *   F3  only `tagActions`, with StringEquals aws:RequestTag/env and a
 *       StringEquals `createAction` naming only `creates`: tags written by the
 *       create call itself.
 *   F4  only `tagActions`, with StringEquals aws:ResourceTag/env and
 *       ForAllValues:StringNotEqualsIgnoreCase aws:TagKeys holding "env":
 *       other tags change on the environment's own resources, and the env
 *       tag never does.
 */
export const CARVE_OUT = {
  "cognito-idp:userpool": {
    resourceTag: words(`
      AddCustomAttributes AddUserPoolClientSecret AdminAddUserToGroup AdminConfirmSignUp
      AdminCreateUser AdminDeleteSoftwareToken AdminDeleteUser AdminDeleteUserAttributes
      AdminDisableProviderForUser AdminDisableUser AdminEnableUser AdminForgetDevice
      AdminGetDevice AdminGetUser AdminGetUserAuthFactors AdminInitiateAuth
      AdminLinkProviderForUser AdminListDevices AdminListGroupsForUser AdminListUserAuthEvents
      AdminRemoveUserFromGroup AdminResetUserPassword AdminRespondToAuthChallenge
      AdminSetUserMFAPreference AdminSetUserPassword AdminSetUserSettings
      AdminUpdateAuthEventFeedback AdminUpdateDeviceStatus AdminUpdateUserAttributes
      AdminUserGlobalSignOut CreateGroup CreateIdentityProvider CreateManagedLoginBranding
      CreateResourceServer CreateTerms CreateUserImportJob CreateUserPool CreateUserPoolClient
      CreateUserPoolDomain CreateUserPoolReplica DeleteGroup DeleteIdentityProvider
      DeleteManagedLoginBranding DeleteResourceServer DeleteTerms DeleteUserPool
      DeleteUserPoolClient DeleteUserPoolClientSecret DeleteUserPoolDomain DeleteUserPoolReplica
      DescribeIdentityProvider DescribeManagedLoginBranding DescribeManagedLoginBrandingByClient
      DescribeResourceServer DescribeRiskConfiguration DescribeTerms DescribeUserImportJob
      DescribeUserPool DescribeUserPoolClient GetCSVHeader GetGroup
      GetIdentityProviderByIdentifier GetLogDeliveryConfiguration GetSigningCertificate
      GetUICustomization GetUserPoolMfaConfig ListGroups ListIdentityProviders
      ListResourceServers ListTagsForResource ListTerms ListUserImportJobs
      ListUserPoolClientSecrets ListUserPoolClients ListUserPoolReplicas ListUsers
      ListUsersInGroup SetLogDeliveryConfiguration SetRiskConfiguration SetUICustomization
      SetUserPoolMfaConfig StartUserImportJob StopUserImportJob TagResource UntagResource
      UpdateAuthEventFeedback UpdateGroup UpdateIdentityProvider UpdateManagedLoginBranding
      UpdateResourceServer UpdateTerms UpdateUserPool UpdateUserPoolClient UpdateUserPoolDomain
      UpdateUserPoolReplica
    `),
    requestTag: words("CreateUserPool TagResource UpdateUserPool"),
    creates: [],
    createAction: null,
    tagActions: words("TagResource UntagResource"),
  },
  "kms:key": {
    resourceTag: words(`
      CancelKeyDeletion CreateAlias CreateGrant CreateKey Decrypt DeleteAlias
      DeleteImportedKeyMaterial DeriveSharedSecret DescribeKey DisableKey DisableKeyRotation
      EnableKey EnableKeyRotation Encrypt GenerateDataKey GenerateDataKeyPair
      GenerateDataKeyPairWithoutPlaintext GenerateDataKeyWithoutPlaintext GenerateMac
      GetKeyLastUsage GetKeyPolicy GetKeyRotationStatus GetParametersForImport GetPublicKey
      ImportKeyMaterial ListGrants ListKeyPolicies ListKeyRotations ListResourceTags
      PutKeyPolicy ReEncryptFrom ReEncryptTo ReplicateKey RetireGrant RevokeGrant
      RotateKeyOnDemand ScheduleKeyDeletion Sign TagResource UntagResource UpdateAlias
      UpdateKeyDescription UpdatePrimaryRegion Verify VerifyMac
    `),
    requestTag: words("CreateKey TagResource"),
    creates: [],
    createAction: null,
    tagActions: words("TagResource UntagResource"),
  },
  "acm:certificate": {
    resourceTag: words(`
      AddTagsToCertificate DeleteCertificate DescribeCertificate ExportCertificate
      GetCertificate ImportCertificate ListCertificateDomainValidations ListTagsForCertificate
      RemoveTagsFromCertificate RenewCertificate ResendValidationEmail RevokeCertificate
      UpdateCertificate UpdateCertificateOptions
    `),
    requestTag: words(`
      AddTagsToCertificate CreateAcmeEndpoint ImportCertificate RemoveTagsFromCertificate
      RequestCertificate
    `),
    creates: [],
    createAction: null,
    tagActions: words("AddTagsToCertificate RemoveTagsFromCertificate"),
  },
  "ec2:security-group": {
    resourceTag: words(`
      ApplySecurityGroupsToClientVpnTargetNetwork AssociateSecurityGroupVpc AttachClassicLinkVpc
      AuthorizeSecurityGroupEgress AuthorizeSecurityGroupIngress CreateApplicationStatusCheck
      CreateClientVpnEndpoint CreateInstanceConnectEndpoint CreateNetworkInterface CreateTags
      CreateVerifiedAccessEndpoint CreateVpcEndpoint DeleteSecurityGroup DeleteTags
      DescribeSecurityGroupReferences DisassociateSecurityGroupVpc ImportInstance
      ModifyApplicationStatusCheck ModifyClientVpnEndpoint ModifyInstanceAttribute
      ModifyInstanceConnectEndpoint ModifyNetworkInterfaceAttribute ModifySecurityGroupRules
      ModifyVpcEndpoint RequestSpotFleet RequestSpotInstances RevokeSecurityGroupEgress
      RevokeSecurityGroupIngress RunInstances UpdateSecurityGroupRuleDescriptionsEgress
      UpdateSecurityGroupRuleDescriptionsIngress ValidateSecurityGroupQuotasForInterface
    `),
    requestTag: words("CreateSecurityGroup CreateTags DeleteTags"),
    creates: words("CreateSecurityGroup"),
    createAction: "ec2:CreateAction",
    tagActions: words("CreateTags DeleteTags"),
  },
};

const CARVE_OUT_RESOURCE =
  /^arn:[^:]+:(cognito-idp|kms|acm|ec2):[^:]*:[^:]*:(userpool|key|certificate|security-group)\/\*$/;

// Environment roots read the shared root's outputs from its state.
const SHARED_STATE = /^arn:[^:]+:s3:::westchase-gi-tfstate-use2\/shared\/\*$/;

// The GuardDuty runtime agent's AWS-owned repository, in an account per Region.
const GUARDDUTY_AGENT = /^arn:[^:]+:ecr:[^:]*:\*:repository\/aws-guardduty-agent-fargate$/;

const FORBIDDEN_ACTIONS = ["ecr:BatchDeleteImage"];

// A managed policy's ARN: account, path, name.
const POLICY_ARN = /^arn:[^:]+:iam::([^:]*):policy(\/(?:[^/]+\/)*)([^/]+)$/;

// An IAM principal or provider ARN: account, resource.
const IAM_ARN = /^arn:[^:]+:iam::([^:]*):(.+)$/;

const SERVICE_PRINCIPAL = /^[a-z0-9-]+(?:\.[a-z0-9-]+)*\.amazonaws\.com$/;

const GITHUB_OIDC_PROVIDER = "oidc-provider/token.actions.githubusercontent.com";

const asList = (value) => (value === undefined ? [] : Array.isArray(value) ? value : [value]);
const lower = (values) => new Set(values.map((value) => value.toLowerCase()));

function globMatches(pattern, value) {
  const source = pattern
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*/g, ".*")
    .replace(/\?/g, ".");
  return new RegExp(`^${source}$`, "i").test(value);
}

/** An action written as a metadata read, or a single action one of them covers. */
const isMetadataRead = (action) =>
  METADATA_READS.some(
    (read) =>
      read.toLowerCase() === action.toLowerCase() ||
      (!/[*?]/.test(action) && globMatches(read, action)),
  );

function* moduleResources(tree) {
  if (!tree) return;
  yield* tree.resources ?? [];
  for (const child of tree.child_modules ?? []) yield* moduleResources(child);
}

function environmentsIn(texts) {
  const found = new Set();
  for (const text of texts) {
    if (text === undefined || text === null) continue;
    for (const [, word] of String(text).matchAll(ENVIRONMENT_WORD)) {
      found.add(word.toLowerCase() === "production" ? "production" : "staging");
    }
  }
  return found;
}

/**
 * The environment a resource belongs to, from its address, name, role or roles
 * and env tag: staging, production, shared or conflict.
 */
function attribute(resource) {
  const values = resource.values ?? {};
  const tags = [values.tags, values.tags_all].flatMap((set) => [set?.env, set?.environment]);
  const roles = [values.role, values.role_name, ...asList(values.roles)];
  const found = environmentsIn([resource.address, values.name, ...roles, ...tags]);
  if (found.size > 1) return "conflict";
  return found.size === 1 ? [...found][0] : "shared";
}

/** Attribute names the configuration sets on the resource, or null if not found. */
function configuredAttributes(configuration, address) {
  const parts = address.replace(/\[[^\]]*\]/g, "").split(".");
  let tree = configuration?.root_module;
  let index = 0;
  while (parts[index] === "module") {
    tree = tree?.module_calls?.[parts[index + 1]]?.module;
    index += 2;
  }
  const local = parts.slice(index).join(".");
  const found = tree?.resources?.find((resource) => resource.address === local);
  return found ? new Set(Object.keys(found.expressions ?? {})) : null;
}

function identifiers(value, { bare }) {
  const found = [];
  for (const [kind, pattern] of ANCHORED_IDENTIFIERS) {
    for (const match of value.matchAll(pattern)) found.push(`${kind}:${normalize(kind, match[1])}`);
  }
  if (bare && found.length === 0) {
    for (const [kind, pattern] of BARE_IDENTIFIERS) {
      const match = pattern.exec(value);
      if (match) found.push(`${kind}:${normalize(kind, match[1])}`);
    }
  }
  return found;
}

const normalize = (kind, id) => (kind === "key" || kind === "secret" ? id.toLowerCase() : id);

/**
 * Every opaque identifier the plan holds, with the environments of the
 * resources holding it. A holder whose attribution conflicts counts for both
 * environments, so the identifier fails rule 1 everywhere.
 */
function traceIdentifiers(plan, rootEnvironment) {
  const owners = new Map();
  const add = (id, owner) => {
    if (!owners.has(id)) owners.set(id, new Set());
    for (const environment of owner === "conflict" ? ["staging", "production"] : [owner]) {
      owners.get(id).add(environment);
    }
  };
  // Arrays and objects are walked; every other JSON value is read as text.
  const collect = (value, key, owner, anyKey) => {
    if (Array.isArray(value)) {
      for (const item of value) collect(item, key, owner, anyKey);
    } else if (value instanceof Object) {
      for (const [childKey, child] of Object.entries(value)) {
        const named = environmentsIn([childKey]);
        const childOwner = named.size === 1 ? [...named][0] : owner;
        collect(child, childKey, childOwner, anyKey || childKey === "outputs");
      }
    } else if (value !== null && (anyKey || IDENTITY_ATTRIBUTES.has(key))) {
      const text = String(value);
      if (!text.trimStart().startsWith("{")) {
        for (const id of identifiers(text, { bare: true })) add(id, owner);
      }
    }
  };
  const trees = [plan.prior_state?.values?.root_module, plan.planned_values?.root_module];
  for (const tree of trees) {
    for (const resource of moduleResources(tree)) {
      if (resource.type === "aws_iam_policy_document") continue;
      let owner = attribute(resource);
      if (owner === "shared" && rootEnvironment) owner = rootEnvironment;
      collect(resource.values ?? {}, null, owner, false);
    }
  }
  return owners;
}

/** The account data.aws_caller_identity reads, or null unless exactly one. */
function planAccount(plan) {
  const found = new Set();
  for (const tree of [plan.prior_state?.values?.root_module, plan.planned_values?.root_module]) {
    for (const resource of moduleResources(tree)) {
      const account = resource.type === "aws_caller_identity" && resource.values?.account_id;
      if (account) found.add(String(account));
    }
  }
  return found.size === 1 ? [...found][0] : null;
}

/** The managed policies the plan writes, indexed by ARN and by path and name. */
function planPolicies(plan, rootEnvironment) {
  const byArn = new Map();
  const byName = new Map();
  for (const resource of moduleResources(plan.planned_values?.root_module)) {
    if (resource.mode !== "managed" || resource.type !== "aws_iam_policy") continue;
    const values = resource.values ?? {};
    const policy = {
      address: resource.address,
      document: values.policy,
      environment: rootEnvironment ?? attribute(resource),
    };
    if (values.arn) byArn.set(String(values.arn), policy);
    if (values.name) byName.set(`${values.path ?? "/"}${values.name}`, policy);
  }
  return { byArn, byName };
}

/**
 * Finds the managed policy the plan writes for an attached ARN: by the ARN the
 * plan knows, or, while the policy is still to be created, by path and name in
 * the plan's own account. Returns the policy, "aws" for an AWS-managed policy,
 * or null.
 */
function resolvePolicy(policies, account, value) {
  const match = POLICY_ARN.exec(value);
  if (!match) return null;
  if (match[1] === "aws") return "aws";
  if (policies.byArn.has(value)) return policies.byArn.get(value);
  return account !== null && match[1] === account
    ? (policies.byName.get(`${match[2]}${match[3]}`) ?? null)
    : null;
}

/** Whether a value is this plan's ARN for the environment's own boundary. */
function isOwnBoundary(value, environment, account) {
  const match = POLICY_ARN.exec(value);
  return (
    match !== null &&
    account !== null &&
    match[1] === account &&
    match[2] === "/" &&
    match[3] === `wgi-${environment}-boundary`
  );
}

/** Principals of a trust statement outside this account, its GitHub OIDC provider and AWS. */
function trustProblems(statement, account) {
  if ("NotPrincipal" in statement) return ["NotPrincipal"];
  const principal = statement.Principal;
  if (!(principal instanceof Object) || Array.isArray(principal)) return ["Principal"];
  const problems = [];
  for (const [type, values] of Object.entries(principal)) {
    for (const [index, value] of asList(values).entries()) {
      const arnParts = IAM_ARN.exec(String(value));
      const inAccount = account !== null && arnParts !== null && arnParts[1] === account;
      const allowed =
        (type === "Service" && SERVICE_PRINCIPAL.test(String(value))) ||
        (type === "AWS" && inAccount && /^(?:root|role\/.+)$/.test(arnParts[2])) ||
        (type === "Federated" && inAccount && arnParts[2] === GITHUB_OIDC_PROVIDER);
      if (!allowed) problems.push(`Principal ${type} ${index + 1}`);
    }
  }
  return problems;
}

function hasTrue(value) {
  if (value === true) return true;
  if (Array.isArray(value)) return value.some(hasTrue);
  if (value instanceof Object) return Object.values(value).some(hasTrue);
  return false;
}

/** Policy documents held as JSON text anywhere in an attribute value. */
function* policyDocuments(value, path) {
  if (Array.isArray(value)) {
    for (const [index, item] of value.entries()) yield* policyDocuments(item, `${path}[${index}]`);
  } else if (value instanceof Object) {
    for (const [key, child] of Object.entries(value))
      yield* policyDocuments(child, `${path}.${key}`);
  } else {
    const text = String(value);
    if (!text.trimStart().startsWith("{")) return;
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      return;
    }
    if (parsed instanceof Object && "Statement" in parsed) yield [path, parsed];
  }
}

const isNegated = (operator) => /Not|^Null$/.test(operator);

function tagCondition(statement, key, environment) {
  for (const [operator, entries] of Object.entries(statement.Condition ?? {})) {
    if (operator !== "StringEquals") continue;
    for (const [name, values] of Object.entries(entries)) {
      const list = asList(values);
      if (name.toLowerCase() === key && list.length === 1 && list[0] === environment) return true;
    }
  }
  return false;
}

/** The values one condition operator gives a key, or null when it gives none. */
function conditionValues(statement, operator, key) {
  for (const [name, values] of Object.entries(statement.Condition?.[operator] ?? {})) {
    if (name.toLowerCase() === key.toLowerCase()) return asList(values).map(String);
  }
  return null;
}

/** Reasons the tag carve-out refuses a statement, or an empty list. */
function carveOutProblems(type, statement, actions, environment) {
  const table = CARVE_OUT[type];
  const service = type.split(":")[0];
  const named = (list) => lower(list.map((action) => `${service}:${action}`));
  const resourceTag = named(table.resourceTag);
  const requestTag = named(table.requestTag);
  const lacking = (set) => actions.filter((action) => !set.has(action.toLowerCase()));
  const within = (list) => lacking(named(list)).length === 0;
  const hasResourceTag = tagCondition(statement, "aws:resourcetag/env", environment);
  const hasRequestTag = tagCondition(statement, "aws:requesttag/env", environment);
  const needs = (key) => `needs StringEquals aws:${key}/env = ${environment}`;
  const notListed = (key, set) => {
    const missing = lacking(set);
    return missing.length > 0 ? [`no aws:${key} in the reference for ${missing.join(", ")}`] : [];
  };

  // F2: a create, before the resource has tags.
  if (table.creates.length > 0 && within(table.creates)) {
    return [
      ...(hasRequestTag ? [] : [needs("RequestTag")]),
      ...notListed("RequestTag", requestTag),
    ];
  }

  if (within(table.tagActions) && !(hasResourceTag && hasRequestTag)) {
    const createActions = table.createAction
      ? conditionValues(statement, "StringEquals", table.createAction)
      : null;
    // F3: the tags a create call writes.
    if (createActions) {
      const creates = lower(table.creates);
      const strays = createActions.filter((action) => !creates.has(action.toLowerCase()));
      return [
        ...(hasRequestTag ? [] : [needs("RequestTag")]),
        ...(createActions.length === 0 || strays.length > 0
          ? [`${table.createAction} may name only ${table.creates.join(", ")}`]
          : []),
        ...notListed("RequestTag", requestTag),
      ];
    }
    // F4: other tags on the environment's own resources; never the env tag.
    const guarded = conditionValues(
      statement,
      "ForAllValues:StringNotEqualsIgnoreCase",
      "aws:TagKeys",
    );
    return [
      ...(hasResourceTag ? [] : [needs("ResourceTag")]),
      ...(guarded?.some((key) => key.toLowerCase() === "env")
        ? []
        : [
            "needs aws:RequestTag/env, or ForAllValues:StringNotEqualsIgnoreCase aws:TagKeys holding env",
          ]),
      ...notListed("ResourceTag", resourceTag),
    ];
  }

  // F1. A tag action here carries both keys.
  const problems = [];
  if (!hasResourceTag) problems.push(needs("ResourceTag"));
  const wantsRequestTag = lower([...requestTag, ...named(table.tagActions)]);
  if (actions.some((action) => wantsRequestTag.has(action.toLowerCase())) && !hasRequestTag) {
    problems.push(needs("RequestTag"));
  }
  problems.push(...notListed("ResourceTag", resourceTag));
  if (hasRequestTag) problems.push(...notListed("RequestTag", requestTag));
  return problems;
}

function prefixNamesEnvironment(value, environment, owners) {
  const prefix = value.split(/[*?]/)[0];
  if (OWN_ENVIRONMENT_WORD[environment].test(prefix)) return true;
  const ids = identifiers(prefix, { bare: false });
  return (
    ids.length > 0 &&
    ids.every((id) => owners.get(id)?.size === 1 && owners.get(id).has(environment))
  );
}

function checkStatement(context, statement, label) {
  const { environment, owners, finding, exception } = context;
  const actions = asList(statement.Action);

  for (const forbidden of FORBIDDEN_ACTIONS) {
    if (context.grants && actions.some((action) => globMatches(action, forbidden))) {
      finding(label, "forbidden", `allows ${forbidden}`);
    }
  }
  if (!environment) return;

  for (const field of ["NotAction", "NotResource", "NotPrincipal"]) {
    if (field in statement) finding(label, 2, `an Allow with ${field} can reach any environment`);
  }

  const bounded = BOUNDED_ROLE_ACTIONS.filter((name) =>
    actions.some((action) => globMatches(action, name)),
  );
  if (context.grants && bounded.length > 0) {
    const boundaries = conditionValues(statement, "StringEquals", "iam:PermissionsBoundary");
    if (boundaries?.length !== 1 || !isOwnBoundary(boundaries[0], environment, context.account)) {
      finding(
        label,
        4,
        `${bounded.join(", ")} needs StringEquals iam:PermissionsBoundary = wgi-${environment}-boundary in this account`,
      );
    }
  }

  /* Everything the statement names: resources, principals and the values of
     conditions that grant rather than exclude. A principal is "*" or a map of
     principal types to one value or a list. */
  const named = [];
  for (const [index, resource] of asList(statement.Resource).entries()) {
    named.push([`Resource ${index + 1}`, resource]);
  }
  const principal = statement.Principal;
  const principals =
    principal instanceof Object ? Object.values(principal).flatMap(asList) : asList(principal);
  for (const [index, value] of principals.entries()) named.push([`Principal ${index + 1}`, value]);
  for (const [operator, entries] of Object.entries(statement.Condition ?? {})) {
    if (isNegated(operator)) continue;
    for (const [key, values] of Object.entries(entries)) {
      for (const value of asList(values)) named.push([`Condition ${key}`, String(value)]);
    }
  }

  for (const [where, value] of named) {
    if (OTHER_ENVIRONMENT_WORD[environment].test(value)) {
      finding(label, 1, `names another environment (${where})`);
    }
    for (const id of identifiers(value, { bare: false })) {
      const holders = owners.get(id);
      if (!holders) finding(label, 3, `names an identifier this plan does not trace (${where})`);
      else if (holders.has(OTHER[environment])) {
        finding(label, 1, `names an identifier traced to another environment (${where})`);
      }
    }
  }

  for (const [where, value] of named) {
    if (!/[*?]/.test(value)) continue;
    const isResource = where.startsWith("Resource");
    if (!isResource && !(where.startsWith("Condition") && value.startsWith("arn:"))) continue;

    if (value === "*") {
      const creates = actions.filter((action) => action in REQUEST_TAG_STAR_ACTIONS);
      if (principals.length > 0) {
        exception(label, "Resource * in a resource policy is the resource itself");
      } else if (context.metadataReads && actions.length > 0 && actions.every(isMetadataRead)) {
        exception(label, "metadata reads a shared policy gives this environment's role");
      } else if (
        actions.length === 0 ||
        !actions.every((action) => action in ONLY_STAR_ACTIONS || creates.includes(action))
      ) {
        finding(label, 2, `Resource * with actions that accept a resource (${where})`);
      } else if (creates.length === 0) {
        exception(label, `actions that accept only * (${actions.join(", ")})`);
      } else if (tagCondition(statement, "aws:requesttag/env", environment)) {
        exception(label, `creates tagged env = ${environment} (${creates.join(", ")})`);
      } else {
        finding(
          label,
          2,
          `Resource * with ${creates.join(", ")} needs StringEquals aws:RequestTag/env = ${environment}`,
        );
      }
      continue;
    }
    if (isResource && GUARDDUTY_AGENT.test(value)) {
      exception(label, "the GuardDuty runtime agent's repository");
      continue;
    }
    if (isResource && SHARED_STATE.test(value)) {
      exception(label, "the shared root's state");
      continue;
    }
    const carveOut = isResource ? CARVE_OUT_RESOURCE.exec(value) : null;
    if (carveOut) {
      const tag = environment;
      const problems = carveOutProblems(`${carveOut[1]}:${carveOut[2]}`, statement, actions, tag);
      if (problems.length === 0) exception(label, `tag carve-out for ${carveOut[2]}/*`);
      for (const problem of problems) finding(label, 2, `tag carve-out (${where}): ${problem}`);
      continue;
    }
    if (!prefixNamesEnvironment(value, environment, owners)) {
      finding(label, 2, `wildcard prefix does not name ${environment} (${where})`);
    }
  }
}

/**
 * Checks a plan. Returns findings, exceptions, and the policies checked and
 * skipped, each by address and statement; no attribute values.
 * `allowedPolicyArns` replaces ALLOWED_POLICY_ARNS.
 */
export function checkPlan(plan, { root, allowedPolicyArns = ALLOWED_POLICY_ARNS }) {
  if (!(root in ROOTS)) throw new Error(`unknown root: ${root}`);
  const rootEnvironment = ROOTS[root];
  const owners = traceIdentifiers(plan, rootEnvironment);
  const account = planAccount(plan);
  const policies = planPolicies(plan, rootEnvironment);
  const changes = new Map((plan.resource_changes ?? []).map((change) => [change.address, change]));
  const result = { root, findings: [], exceptions: [], checked: [], skipped: [] };

  /** Checks a document's Allow statements for an environment, or lists it as skipped. */
  const checkDocument = (where, document, environment, options) => {
    (environment ? result.checked : result.skipped).push(where);
    const context = {
      environment,
      owners,
      account,
      grants: true,
      metadataReads: false,
      ...options,
      finding: (label, rule, reason) =>
        result.findings.push({ address: where, label, rule, reason }),
      exception: (label, reason) => result.exceptions.push({ address: where, label, reason }),
    };
    for (const [index, statement] of asList(document.Statement).entries()) {
      if (statement.Effect !== "Allow") continue;
      checkStatement(context, statement, statement.Sid || `#${index + 1}`);
    }
  };

  /** Resolves one attached policy and checks it for the role's environment. */
  const checkAttachment = (address, name, value, environment) => {
    const finding = (rule, reason) => result.findings.push({ address, rule, reason });
    const named = environment !== null && OTHER_ENVIRONMENT_WORD[environment].test(value);
    if (named) finding(1, `attaches a policy named for another environment (${name})`);

    const policy = resolvePolicy(policies, account, value);
    if (policy === null || policy === "aws") {
      if (Object.hasOwn(allowedPolicyArns, value)) {
        const reason = `allow-listed policy: ${allowedPolicyArns[value]}`;
        result.exceptions.push({ address, label: name, reason });
      } else if (policy === "aws") {
        finding("attachment", `attaches an AWS-managed policy (${name})`);
      } else {
        finding("attachment", `attaches a policy this plan does not write (${name})`);
      }
      return;
    }
    if (environment === null || policy.environment === environment) return;
    if (policy.environment !== "shared") {
      if (!named) finding(1, `attaches a policy that belongs to another environment (${name})`);
      return;
    }
    for (const [path, document] of policyDocuments(policy.document, "policy")) {
      checkDocument(`${address} -> ${policy.address} ${path}`, document, environment, {
        metadataReads: true,
      });
    }
  };

  /** In an environment root, a trust names only this account, its GitHub provider or AWS. */
  const checkTrust = (where, document) => {
    for (const [index, statement] of asList(document.Statement).entries()) {
      if (statement.Effect !== "Allow") continue;
      for (const problem of trustProblems(statement, account)) {
        result.findings.push({
          address: where,
          label: statement.Sid || `#${index + 1}`,
          rule: "trust",
          reason: `trusts a principal outside this account, its GitHub OIDC provider and AWS services (${problem})`,
        });
      }
    }
  };

  for (const resource of moduleResources(plan.planned_values?.root_module)) {
    if (resource.mode !== "managed") continue;
    const configured = configuredAttributes(plan.configuration, resource.address);
    const isConfigured = (attribute) => configured === null || configured.has(attribute);
    let environment = rootEnvironment;
    if (!environment) {
      const owner = attribute(resource);
      if (owner === "conflict") {
        result.findings.push({
          address: resource.address,
          rule: "attribution",
          reason: "the address, name, role or env tag names more than one environment",
        });
        continue;
      }
      environment = owner === "shared" ? null : owner;
    }

    const unknown = changes.get(resource.address)?.change?.after_unknown ?? {};
    for (const [name, value] of Object.entries(unknown)) {
      if (/policy/.test(name) && isConfigured(name) && hasTrue(value)) {
        result.findings.push({
          address: resource.address,
          rule: "unknown",
          reason: `${name} is not known at plan time, so it cannot be checked`,
        });
      }
    }

    for (const name of ["policy_arn", "policy_arns", "managed_policy_arns"]) {
      if (!isConfigured(name)) continue;
      for (const value of asList(resource.values?.[name])) {
        if (value) checkAttachment(resource.address, name, String(value), environment);
      }
    }

    for (const [name, value] of Object.entries(resource.values ?? {})) {
      if (!isConfigured(name)) continue;
      for (const [path, document] of policyDocuments(value, name)) {
        const where = `${resource.address} ${path}`;
        checkDocument(where, document, environment, {
          grants: resource.type !== "aws_vpc_endpoint",
        });
        if (name === "assume_role_policy" && rootEnvironment) checkTrust(where, document);
      }
    }
  }
  return result;
}

export function formatReport(result) {
  const lines = [`env-boundary: root ${result.root}`];
  for (const where of result.checked) lines.push(`checked  ${where}`);
  for (const where of result.skipped)
    lines.push(`skipped  ${where} (shared; ecr:BatchDeleteImage only)`);
  for (const { address, label, reason } of result.exceptions) {
    lines.push(`allowed  ${address} ${label}: ${reason}`);
  }
  for (const { address, label, rule, reason } of result.findings) {
    lines.push(`FAIL     ${address}${label ? ` ${label}` : ""} rule ${rule}: ${reason}`);
  }
  const summary = `${result.checked.length} checked, ${result.skipped.length} skipped`;
  lines.push(
    result.findings.length === 0
      ? `PASS (${summary})`
      : `FAIL (${result.findings.length} findings; ${summary})`,
  );
  return lines.join("\n");
}

function main(argv) {
  let root = "shared";
  const files = [];
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === "--root") root = argv[(index += 1)];
    else files.push(argv[index]);
  }
  if (files.length !== 1) {
    console.error("usage: node infra/checks/env-boundary.mjs --root <root> plan.json");
    return 2;
  }
  const plan = JSON.parse(readFileSync(files[0], "utf8"));
  const result = checkPlan(plan, { root });
  console.log(formatReport(result));
  return result.findings.length === 0 ? 0 : 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = main(process.argv.slice(2));
}
