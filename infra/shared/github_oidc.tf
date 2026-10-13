# GitHub Actions reaches AWS through OIDC: a job asks GitHub for a signed token
# and exchanges it for a one-hour role session. There are no access keys. Each
# role trusts exact token subjects:
#
#   wgi-github-plan               any pull request in the repository; reads
#                                 metadata and non-production state, writes nothing
#   wgi-github-deploy-staging     a workflow run on the staging branch
#   wgi-github-deploy-production  a job in the aws-production environment,
#                                 which Jason must approve
#
# A job that names an environment gets an environment subject instead of a
# branch subject, so the staging deploy job must not name one.

resource "aws_iam_openid_connect_provider" "github" {
  url            = "https://token.actions.githubusercontent.com"
  client_id_list = ["sts.amazonaws.com"]
}

locals {
  state_key_alias_arn = "arn:${local.partition}:kms:${local.region}:${local.account_id}:alias/wgi-tfstate"
  ecr_repository_arn  = "arn:${local.partition}:ecr:${local.region}:${local.account_id}:repository/${local.ecr_repository_name}"
  ecs_arn_prefix      = "arn:${local.partition}:ecs:${local.region}:${local.account_id}"
}

# Metadata reads that `terraform plan` needs to refresh this root. It grants no
# object, log, secret or finding contents. Environment roots extend it with
# their own services in the pull request that adds them.
data "aws_iam_policy_document" "terraform_read" {
  # checkov:skip=CKV_AWS_356: read-only metadata across every resource the roots manage
  statement {
    sid = "RefreshSharedRoot"
    actions = [
      "access-analyzer:GetAnalyzer",
      "access-analyzer:ListAnalyzers",
      "access-analyzer:ListTagsForResource",
      "budgets:ListTagsForResource",
      "budgets:ViewBudget",
      "cloudtrail:DescribeTrails",
      "cloudtrail:GetEventSelectors",
      "cloudtrail:GetInsightSelectors",
      "cloudtrail:GetTrail",
      "cloudtrail:GetTrailStatus",
      "cloudtrail:ListTags",
      "cloudwatch:DescribeAlarms",
      "cloudwatch:ListTagsForResource",
      "config:DescribeConfigurationRecorderStatus",
      "config:DescribeConfigurationRecorders",
      "config:DescribeDeliveryChannels",
      "config:ListTagsForResource",
      "ec2:Describe*",
      "ec2:GetEbsDefaultKmsKeyId",
      "ec2:GetEbsEncryptionByDefault",
      "ecr:DescribeRepositories",
      "ecr:GetLifecyclePolicy",
      "ecr:GetRepositoryPolicy",
      "ecr:ListTagsForResource",
      "events:DescribeRule",
      "events:ListTagsForResource",
      "events:ListTargetsByRule",
      "guardduty:GetDetector",
      "guardduty:ListDetectors",
      "guardduty:ListTagsForResource",
      "iam:Get*",
      "iam:List*",
      "kms:DescribeKey",
      "kms:GetKeyPolicy",
      "kms:GetKeyRotationStatus",
      "kms:ListAliases",
      "kms:ListResourceTags",
      "logs:DescribeLogGroups",
      "logs:DescribeMetricFilters",
      "logs:ListTagsForResource",
      "logs:ListTagsLogGroup",
      "route53:GetHostedZone",
      "route53:ListResourceRecordSets",
      "route53:ListTagsForResource",
      "s3:GetAccountPublicAccessBlock",
      "s3:GetBucket*",
      "s3:GetEncryptionConfiguration",
      "s3:GetLifecycleConfiguration",
      "s3:GetAccelerateConfiguration",
      "s3:GetReplicationConfiguration",
      "s3:ListAllMyBuckets",
      "s3:ListBucket",
      "sns:GetSubscriptionAttributes",
      "sns:GetTopicAttributes",
      "sns:ListSubscriptionsByTopic",
      "sns:ListTagsForResource",
    ]
    resources = ["*"]
  }
}

resource "aws_iam_policy" "terraform_read" {
  name        = "wgi-terraform-read"
  description = "Metadata reads Terraform needs to plan infra/ roots; no data, log, secret or finding contents"
  policy      = data.aws_iam_policy_document.terraform_read.json
}

# Read and write a set of state keys, and use the state key only through S3.
data "aws_iam_policy_document" "state_access" {
  for_each = {
    plan       = { read = ["bootstrap", "shared", "staging", "preview"], write = [] }
    staging    = { read = ["shared"], write = ["staging"] }
    production = { read = ["shared"], write = ["production"] }
  }

  statement {
    sid       = "ListStateBucket"
    actions   = ["s3:ListBucket"]
    resources = [local.state_bucket_arn]
  }

  statement {
    sid       = "ReadState"
    actions   = ["s3:GetObject"]
    resources = [for k in concat(each.value.read, each.value.write) : "${local.state_bucket_arn}/${k}/*"]
  }

  dynamic "statement" {
    for_each = length(each.value.write) > 0 ? [1] : []

    content {
      sid       = "WriteStateAndLock"
      actions   = ["s3:DeleteObject", "s3:PutObject"]
      resources = [for k in each.value.write : "${local.state_bucket_arn}/${k}/*"]
    }
  }

  statement {
    sid = "UseStateKeyThroughS3"
    actions = length(each.value.write) > 0 ? [
      "kms:Decrypt",
      "kms:Encrypt",
      "kms:GenerateDataKey",
    ] : ["kms:Decrypt"]
    resources = ["arn:${local.partition}:kms:${local.region}:${local.account_id}:key/*"]

    condition {
      test     = "ForAnyValue:StringEquals"
      variable = "kms:ResourceAliases"
      values   = ["alias/wgi-tfstate"]
    }

    condition {
      test     = "StringEquals"
      variable = "kms:ViaService"
      values   = ["s3.${local.region}.amazonaws.com"]
    }
  }
}

module "github_plan" {
  source = "../modules/github-oidc-role"

  name              = "wgi-github-plan"
  description       = "Terraform plan for pull requests: metadata and non-production state reads only"
  oidc_provider_arn = aws_iam_openid_connect_provider.github.arn
  subjects          = ["${local.github_subject_prefix}:pull_request"]
  policy_json       = data.aws_iam_policy_document.state_access["plan"].json
  managed_policy_arns = {
    terraform_read = aws_iam_policy.terraform_read.arn
  }
}

# Deploy permissions for one environment: push or pull the image, register task
# definitions, start one-off tasks and roll services, all limited to the
# environment's own ECS names and task roles.
data "aws_iam_policy_document" "deploy" {
  for_each = {
    staging    = { push = true }
    production = { push = false }
  }

  source_policy_documents = [data.aws_iam_policy_document.state_access[each.key].json]

  statement {
    sid       = "EcrLogin"
    actions   = ["ecr:GetAuthorizationToken"]
    resources = ["*"]
  }

  # Staging pushes each build. Production only pulls, and adds a production-
  # tag to the image it releases (PutImage with an existing manifest), which
  # keeps that image out of the lifecycle policy's reach.
  statement {
    sid = "EcrRepository"
    actions = concat(
      [
        "ecr:BatchCheckLayerAvailability",
        "ecr:BatchGetImage",
        "ecr:DescribeImageScanFindings",
        "ecr:DescribeImages",
        "ecr:DescribeRepositories",
        "ecr:GetDownloadUrlForLayer",
        "ecr:PutImage",
      ],
      each.value.push ? [
        "ecr:CompleteLayerUpload",
        "ecr:InitiateLayerUpload",
        "ecr:UploadLayerPart",
      ] : [],
    )
    resources = [local.ecr_repository_arn]
  }

  statement {
    sid       = "EcsTaskDefinitions"
    actions   = ["ecs:DescribeTaskDefinition", "ecs:RegisterTaskDefinition"]
    resources = ["*"]
  }

  statement {
    sid       = "EcsTagOnCreate"
    actions   = ["ecs:TagResource"]
    resources = ["*"]

    condition {
      test     = "StringEquals"
      variable = "ecs:CreateAction"
      values   = ["RegisterTaskDefinition", "RunTask"]
    }
  }

  statement {
    sid       = "EcsServices"
    actions   = ["ecs:DescribeServices", "ecs:UpdateService"]
    resources = ["${local.ecs_arn_prefix}:service/wgi-${each.key}*/*"]
  }

  statement {
    sid       = "EcsRunTask"
    actions   = ["ecs:RunTask"]
    resources = ["${local.ecs_arn_prefix}:task-definition/wgi-${each.key}*:*"]

    condition {
      test     = "ArnLike"
      variable = "ecs:cluster"
      values   = ["${local.ecs_arn_prefix}:cluster/wgi-${each.key}*"]
    }
  }

  statement {
    sid       = "EcsTasks"
    actions   = ["ecs:DescribeTasks", "ecs:StopTask"]
    resources = ["${local.ecs_arn_prefix}:task/wgi-${each.key}*/*"]
  }

  statement {
    sid       = "PassEnvironmentTaskRoles"
    actions   = ["iam:PassRole"]
    resources = ["arn:${local.partition}:iam::${local.account_id}:role/wgi-${each.key}-*"]

    condition {
      test     = "StringEquals"
      variable = "iam:PassedToService"
      values   = ["ecs-tasks.amazonaws.com"]
    }
  }

  # Staging one-off task output (migrations, e2e runs) is fictional data and
  # may be printed in a workflow log. Production task logs never are.
  dynamic "statement" {
    for_each = each.key == "staging" ? [1] : []

    content {
      sid       = "ReadStagingTaskLogs"
      actions   = ["logs:GetLogEvents"]
      resources = ["arn:${local.partition}:logs:${local.region}:${local.account_id}:log-group:/wgi/staging/*:log-stream:*"]
    }
  }
}

module "github_deploy_staging" {
  source = "../modules/github-oidc-role"

  name              = "wgi-github-deploy-staging"
  description       = "Staging deploys from workflow runs on the staging branch"
  oidc_provider_arn = aws_iam_openid_connect_provider.github.arn
  subjects          = ["${local.github_subject_prefix}:ref:refs/heads/${var.staging_branch}"]
  policy_json       = data.aws_iam_policy_document.deploy["staging"].json
  managed_policy_arns = {
    terraform_read = aws_iam_policy.terraform_read.arn
  }
  tags = { env = "staging" }
}

# The trust compares the token subject case-sensitively, so production deploy
# jobs write the environment name exactly as var.production_environment has it.
# The environment's protection rules (required reviewer, deployment branches)
# are what make this role safe; infra/README.md lists them as a step before
# apply. It is not the existing "Production" environment, which Vercel deploys
# the live site into until the cut-over.
module "github_deploy_production" {
  source = "../modules/github-oidc-role"

  name              = "wgi-github-deploy-production"
  description       = "Production deploys from jobs in the protected ${var.production_environment} environment"
  oidc_provider_arn = aws_iam_openid_connect_provider.github.arn
  subjects          = ["${local.github_subject_prefix}:environment:${var.production_environment}"]
  policy_json       = data.aws_iam_policy_document.deploy["production"].json
  managed_policy_arns = {
    terraform_read = aws_iam_policy.terraform_read.arn
  }
  tags = { env = "production" }
}
