# The ceiling on every role an environment root creates. A deploy role may
# create a wgi-<env>-* role, or change its policies, only when the role carries
# wgi-<env>-boundary (github_oidc.tf), so whatever an environment root's role
# policies say, the role can reach no more than its own environment's images,
# logs, secrets, parameters, Cognito pool, tables, buckets, run artifact
# prefixes, keys, database users and one-off tasks, and nothing else in IAM, the
# state bucket or the other environment. A boundary grants nothing on its own; each role's policy
# narrows it further.
#
# Every environment shares one account, so no Allow here names a pattern that
# could match the other environment's resources (hosting-pipeline-design §5.1,
# L441-445). Resources whose names carry no environment (the RDS master secret,
# the user pool, the database's resource ID, KMS keys) are named by their exact
# ARN from discovery.tf; until an environment root creates one, its statement
# is left out and the boundary allows nothing on it.

locals {
  # Built as strings so the deploy policies, which name the boundaries, are
  # known at plan time before the boundary policies exist.
  environment_boundary_arns = {
    for env in local.environment_names : env => "arn:${local.partition}:iam::${local.account_id}:policy/wgi-${env}-boundary"
  }

  # The GuardDuty runtime agent that runs beside each Fargate task comes from
  # this AWS-owned repository in another account.
  guardduty_agent_repository_arn = "arn:${local.partition}:ecr:${local.region}:*:repository/aws-guardduty-agent-fargate"
}

data "aws_iam_policy_document" "environment_boundary" {
  # checkov:skip=CKV_AWS_356: only ecr:GetAuthorizationToken is on *, because it accepts no resource; every other allow names its environment's resources
  # checkov:skip=CKV_AWS_111: writes are limited to the environment's own log groups, tables, buckets and tasks
  # checkov:skip=CKV_AWS_109: the one permissions-management allow passes the environment's own task roles to ECS tasks
  for_each = {
    staging    = "production"
    production = "staging"
  }

  # GetAuthorizationToken accepts only "*" (https://docs.aws.amazon.com/
  # service-authorization/latest/reference/list_ecr.html). The pulls name this
  # account's repository and the GuardDuty agent's.
  statement {
    sid       = "EcrLogin"
    actions   = ["ecr:GetAuthorizationToken"]
    resources = ["*"]
  }

  statement {
    sid = "PullImages"
    actions = [
      "ecr:BatchCheckLayerAvailability",
      "ecr:BatchGetImage",
      "ecr:GetDownloadUrlForLayer",
    ]
    resources = [local.ecr_repository_arn, local.guardduty_agent_repository_arn]
  }

  # Terraform creates every log group, so roles only write streams. The
  # trailing wildcard covers the group and its streams (§5.1, L458-459).
  statement {
    sid     = "WriteOwnLogs"
    actions = ["logs:CreateLogStream", "logs:PutLogEvents"]
    resources = [for g in ["/wgi/${each.key}/*", "/aws/lambda/wgi-${each.key}-*"] :
      "arn:${local.partition}:logs:${local.region}:${local.account_id}:log-group:${g}"
    ]
  }

  # Nothing inside an environment writes a secret value: database logins are
  # IAM, and values are moved in by the deploy jobs and break-glass (§5.1,
  # L458-459).
  statement {
    sid       = "OwnSecrets"
    actions   = ["secretsmanager:GetSecretValue"]
    resources = ["arn:${local.partition}:secretsmanager:${local.region}:${local.account_id}:secret:wgi/${each.key}/*"]
  }

  # An RDS master secret is named rds!db-<uuid>, which carries no environment,
  # so the boundary names this environment's instance's secret exactly, never
  # rds!db-* (§5.1, L447-450).
  dynamic "statement" {
    for_each = length(local.environment_resources[each.key].master_secret_arns) > 0 ? [1] : []

    content {
      sid       = "OwnMasterSecret"
      actions   = ["secretsmanager:GetSecretValue"]
      resources = local.environment_resources[each.key].master_secret_arns
    }
  }

  statement {
    sid       = "OwnParameters"
    actions   = ["ssm:GetParameter", "ssm:GetParameters"]
    resources = ["arn:${local.partition}:ssm:${local.region}:${local.account_id}:parameter/wgi/${each.key}/*"]
  }

  # Admin actions name the environment's own pool ARN (§5.1, L451).
  dynamic "statement" {
    for_each = length(local.environment_resources[each.key].user_pool_arns) > 0 ? [1] : []

    content {
      sid = "OwnUserPool"
      actions = [
        "cognito-idp:AdminCreateUser",
        "cognito-idp:AdminDeleteSoftwareToken",
        "cognito-idp:AdminDeleteUser",
        "cognito-idp:AdminDisableUser",
        "cognito-idp:AdminGetUser",
        "cognito-idp:AdminInitiateAuth",
        "cognito-idp:AdminRespondToAuthChallenge",
        "cognito-idp:AdminSetUserPassword",
        "cognito-idp:AdminUserGlobalSignOut",
        "cognito-idp:DescribeUserPool",
      ]
      resources = local.environment_resources[each.key].user_pool_arns
    }
  }

  statement {
    sid       = "OwnTables"
    actions   = ["dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:Query"]
    resources = ["arn:${local.partition}:dynamodb:${local.region}:${local.account_id}:table/wgi-${each.key}-*"]
  }

  # Bucket ARNs carry no account, and bucket names are global, so the account
  # condition keeps wgi-<env>-* to this account's buckets.
  statement {
    sid       = "OwnBucketObjects"
    actions   = ["s3:GetObject", "s3:PutObject"]
    resources = ["arn:${local.partition}:s3:::wgi-${each.key}-*/*"]

    condition {
      test     = "StringEquals"
      variable = "aws:ResourceAccount"
      values   = [local.account_id]
    }
  }

  # Writes only, under this environment's prefixes of the shared run artifacts
  # bucket (artifacts.tf). Its bucket policy refuses the same prefixes to the
  # other environment's roles, so neither side alone opens them.
  statement {
    sid       = "WriteOwnArtifacts"
    actions   = ["s3:PutObject"]
    resources = [for p in values(local.artifact_prefixes) : "${local.artifacts_bucket_arn}/${p.prefix}/*" if p.env == each.key]

    condition {
      test     = "StringEquals"
      variable = "aws:ResourceAccount"
      values   = [local.account_id]
    }
  }

  # The artifacts key, through S3 and for that bucket only: with an S3 Bucket
  # Key the encryption context is the bucket ARN. PutObject needs
  # GenerateDataKey, and a multipart upload's UploadPart needs Decrypt too
  # (https://docs.aws.amazon.com/AmazonS3/latest/API/API_UploadPart.html).
  # Neither boundary grants GetObject on the bucket, so Decrypt reads nothing.
  statement {
    sid       = "EncryptOwnArtifacts"
    actions   = ["kms:Decrypt", "kms:GenerateDataKey"]
    resources = [module.kms["artifacts"].arn]

    condition {
      test     = "StringEquals"
      variable = "kms:ViaService"
      values   = ["s3.${local.region}.amazonaws.com"]
    }

    condition {
      test     = "StringEquals"
      variable = "kms:EncryptionContext:aws:s3:arn"
      values   = [local.artifacts_bucket_arn]
    }
  }

  # The environment's own keys by exact ARN (§5.1, L458-459). No
  # kms:ViaService: the mail Lambda decrypts with its sender key directly.
  dynamic "statement" {
    for_each = length(local.environment_resources[each.key].key_arns) > 0 ? [1] : []

    content {
      sid       = "UseOwnKeys"
      actions   = ["kms:Decrypt", "kms:Encrypt", "kms:GenerateDataKey*"]
      resources = local.environment_resources[each.key].key_arns
    }
  }

  # rds-db:connect takes no tag condition and its resource is the instance's
  # opaque resource ID, so it names this environment's instance exactly.
  dynamic "statement" {
    for_each = length(local.environment_resources[each.key].db_resource_ids) > 0 ? [1] : []

    content {
      sid     = "ConnectToOwnDatabase"
      actions = ["rds-db:connect"]
      resources = [for id in local.environment_resources[each.key].db_resource_ids :
        "arn:${local.partition}:rds-db:${local.region}:${local.account_id}:dbuser:${id}/*"
      ]
    }
  }

  # The retention schedule starts its task with the scheduler's own role,
  # which must start the family's task in the environment's cluster, tag the
  # task it starts, and pass the family's execution and task roles (§2, L65
  # and L81; §5.1, L452-457).
  statement {
    sid       = "RunOwnTasks"
    actions   = ["ecs:RunTask"]
    resources = ["${local.ecs_arn_prefix}:task-definition/wgi-${each.key}-*:*"]

    condition {
      test     = "ArnEquals"
      variable = "ecs:cluster"
      values   = ["${local.ecs_arn_prefix}:cluster/wgi-${each.key}"]
    }
  }

  statement {
    sid       = "TagOwnTasks"
    actions   = ["ecs:TagResource"]
    resources = ["${local.ecs_arn_prefix}:task/wgi-${each.key}/*"]

    condition {
      test     = "StringEquals"
      variable = "ecs:CreateAction"
      values   = ["RunTask"]
    }
  }

  statement {
    sid     = "PassOwnTaskRoles"
    actions = ["iam:PassRole"]
    resources = [for suffix in ["exec", "task"] :
      "arn:${local.partition}:iam::${local.account_id}:role/wgi-${each.key}-*-${suffix}"
    ]

    condition {
      test     = "StringEquals"
      variable = "iam:PassedToService"
      values   = ["ecs-tasks.amazonaws.com"]
    }
  }

  # The allows above are already the whole ceiling. These denies also stop a
  # grant that a resource policy makes to a role session directly, which an
  # implicit deny in a boundary does not.
  #
  # Every IAM call is refused except passing a role to ECS tasks: a request
  # without iam:PassedToService (every other IAM action) fails a negated
  # condition.
  statement {
    sid       = "DenyIam"
    effect    = "Deny"
    actions   = ["iam:*"]
    resources = ["*"]

    condition {
      test     = "StringNotEquals"
      variable = "iam:PassedToService"
      values   = ["ecs-tasks.amazonaws.com"]
    }
  }

  statement {
    sid    = "DenyAccountControl"
    effect = "Deny"
    actions = [
      "kms:CreateGrant",
      "kms:DisableKey",
      "kms:PutKeyPolicy",
      "kms:ScheduleKeyDeletion",
      "organizations:*",
      "sts:AssumeRole",
    ]
    resources = ["*"]
  }

  statement {
    sid       = "DenyStateBucket"
    effect    = "Deny"
    actions   = ["s3:*"]
    resources = [local.state_bucket_arn, "${local.state_bucket_arn}/*"]
  }

  # Tag keys match without regard to case; values do not, so the denies
  # ignore case too. The Cognito design tags its resources "environment"
  # rather than "env", so both keys are refused.
  dynamic "statement" {
    for_each = {
      DenyOtherEnvironmentTagged     = "env"
      DenyOtherEnvironmentTaggedLong = "environment"
    }

    content {
      sid       = statement.key
      effect    = "Deny"
      actions   = ["*"]
      resources = ["*"]

      condition {
        test     = "StringEqualsIgnoreCase"
        variable = "aws:ResourceTag/${statement.value}"
        values   = [each.value]
      }
    }
  }

  statement {
    sid     = "DenyOtherEnvironmentPaths"
    effect  = "Deny"
    actions = ["secretsmanager:*", "ssm:*"]
    resources = [
      "arn:${local.partition}:secretsmanager:${local.region}:${local.account_id}:secret:wgi/${each.value}/*",
      "arn:${local.partition}:ssm:${local.region}:${local.account_id}:parameter/wgi/${each.value}/*",
    ]
  }
}

# Terraform refuses to destroy a boundary, as it refuses the GitHub roles:
# every environment role and the deploy roles' conditions name it by ARN.
resource "aws_iam_policy" "environment_boundary" {
  for_each = data.aws_iam_policy_document.environment_boundary

  name        = "wgi-${each.key}-boundary"
  description = "Permissions boundary for every role the ${each.key} environment root creates"
  policy      = each.value.json
  tags        = { env = each.key }

  lifecycle {
    prevent_destroy = true
  }
}
