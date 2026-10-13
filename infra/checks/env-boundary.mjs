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
 * belongs to the repository's lifecycle policy.
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
};

const words = (text) => text.trim().split(/\s+/);

/**
 * The tag carve-out (§5.1): resource types an apply role creates before it can
 * name them. For each, the actions whose Service Authorization Reference row
 * lists aws:ResourceTag/${TagKey} or aws:RequestTag/${TagKey}, read from
 * list_cognito-idp.html, list_kms.html, list_acm.html and list_ec2.html under
 * https://docs.aws.amazon.com/service-authorization/latest/reference/ on
 * 2026-10-13.
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
  },
};

const CARVE_OUT_RESOURCE =
  /^arn:[^:]+:(cognito-idp|kms|acm|ec2):[^:]*:[^:]*:(userpool|key|certificate|security-group)\/\*$/;

// Environment roots read the shared root's outputs from its state.
const SHARED_STATE = /^arn:[^:]+:s3:::westchase-gi-tfstate-use2\/shared\/\*$/;

// The GuardDuty runtime agent's AWS-owned repository, in an account per Region.
const GUARDDUTY_AGENT = /^arn:[^:]+:ecr:[^:]*:\*:repository\/aws-guardduty-agent-fargate$/;

const FORBIDDEN_ACTIONS = ["ecr:BatchDeleteImage"];

const asList = (value) => (value === undefined ? [] : Array.isArray(value) ? value : [value]);
const lower = (values) => new Set(values.map((value) => value.toLowerCase()));

function globMatches(pattern, value) {
  const source = pattern
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*/g, ".*")
    .replace(/\?/g, ".");
  return new RegExp(`^${source}$`, "i").test(value);
}

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

/** The environment a resource belongs to: staging, production, shared or conflict. */
function attribute(resource) {
  const values = resource.values ?? {};
  const tags = [values.tags, values.tags_all].flatMap((set) => [set?.env, set?.environment]);
  const found = environmentsIn([resource.address, values.name, values.role, ...tags]);
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

/** Reasons the tag carve-out refuses a statement, or an empty list. */
function carveOutProblems(type, statement, actions, environment) {
  const table = CARVE_OUT[type];
  const resourceTag = lower(table.resourceTag.map((action) => `${type.split(":")[0]}:${action}`));
  const requestTag = lower(table.requestTag.map((action) => `${type.split(":")[0]}:${action}`));
  const problems = [];
  const hasResourceTag = tagCondition(statement, "aws:resourcetag/env", environment);
  const hasRequestTag = tagCondition(statement, "aws:requesttag/env", environment);
  if (!hasResourceTag) {
    problems.push(`needs StringEquals aws:ResourceTag/env = ${environment}`);
  }
  if (actions.some((action) => requestTag.has(action.toLowerCase())) && !hasRequestTag) {
    problems.push(`needs StringEquals aws:RequestTag/env = ${environment}`);
  }
  const lacking = (set) => actions.filter((action) => !set.has(action.toLowerCase()));
  const noResourceTag = lacking(resourceTag);
  if (noResourceTag.length > 0) {
    problems.push(`no aws:ResourceTag in the reference for ${noResourceTag.join(", ")}`);
  }
  const noRequestTag = hasRequestTag ? lacking(requestTag) : [];
  if (noRequestTag.length > 0) {
    problems.push(`no aws:RequestTag in the reference for ${noRequestTag.join(", ")}`);
  }
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
      if (principals.length > 0) {
        exception(label, "Resource * in a resource policy is the resource itself");
      } else if (actions.length > 0 && actions.every((action) => action in ONLY_STAR_ACTIONS)) {
        exception(label, `actions that accept only * (${actions.join(", ")})`);
      } else {
        finding(label, 2, `Resource * with actions that accept a resource (${where})`);
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
 */
export function checkPlan(plan, { root }) {
  if (!(root in ROOTS)) throw new Error(`unknown root: ${root}`);
  const rootEnvironment = ROOTS[root];
  const owners = traceIdentifiers(plan, rootEnvironment);
  const changes = new Map((plan.resource_changes ?? []).map((change) => [change.address, change]));
  const result = { root, findings: [], exceptions: [], checked: [], skipped: [] };

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

    for (const [name, value] of Object.entries(resource.values ?? {})) {
      if (!isConfigured(name)) continue;
      for (const [path, document] of policyDocuments(value, name)) {
        const where = `${resource.address} ${path}`;
        (environment ? result.checked : result.skipped).push(where);
        const context = {
          environment,
          owners,
          grants: resource.type !== "aws_vpc_endpoint",
          finding: (label, rule, reason) =>
            result.findings.push({ address: where, label, rule, reason }),
          exception: (label, reason) => result.exceptions.push({ address: where, label, reason }),
        };
        for (const [index, statement] of asList(document.Statement).entries()) {
          if (statement.Effect !== "Allow") continue;
          checkStatement(context, statement, statement.Sid || `#${index + 1}`);
        }
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
