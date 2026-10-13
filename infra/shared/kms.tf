# Customer managed keys, one per purpose. Staging and production never share a
# key, so a staging role granted a staging key can never read production data.
# Every key denies direct KMS calls by this account's IAM principals: they reach
# the key only through the services listed in via_services. The state key lives
# in infra/bootstrap.

locals {
  # CloudWatch Logs log groups each environment's data key may encrypt. RDS log
  # exports use fixed /aws/rds/... names, so those are listed too.
  environment_log_groups = {
    staging = [
      "arn:${local.partition}:logs:${local.region}:${local.account_id}:log-group:/wgi/staging/*",
      "arn:${local.partition}:logs:${local.region}:${local.account_id}:log-group:/aws/rds/instance/wgi-staging-*",
      "arn:${local.partition}:logs:${local.region}:${local.account_id}:log-group:/aws/rds/cluster/wgi-staging-*",
    ]
    production = [
      "arn:${local.partition}:logs:${local.region}:${local.account_id}:log-group:/wgi/production/*",
      "arn:${local.partition}:logs:${local.region}:${local.account_id}:log-group:/aws/rds/instance/wgi-production-*",
      "arn:${local.partition}:logs:${local.region}:${local.account_id}:log-group:/aws/rds/cluster/wgi-production-*",
    ]
  }

  keys = {
    audit = {
      name         = "wgi-audit-logs"
      env          = "shared"
      description  = "Encrypts CloudTrail, AWS Config and VPC flow log records and the CloudTrail log group"
      via_services = ["s3.${local.region}.amazonaws.com"]
      policies     = [data.aws_iam_policy_document.audit_key.json]
    }
    alerts = {
      name         = "wgi-alerts"
      env          = "shared"
      description  = "Encrypts messages on the wgi-alerts SNS topic"
      via_services = ["sns.${local.region}.amazonaws.com"]
      policies     = [data.aws_iam_policy_document.alerts_key.json]
    }
    artifacts = {
      name         = "wgi-artifacts"
      env          = "shared"
      description  = "Encrypts container images in ECR"
      via_services = ["ecr.${local.region}.amazonaws.com"]
      policies     = []
    }
    staging_data = {
      name         = "wgi-staging-data"
      env          = "staging"
      description  = "Encrypts staging and preview databases, buckets and application logs (fictional data only)"
      via_services = ["rds.${local.region}.amazonaws.com", "s3.${local.region}.amazonaws.com"]
      policies     = [data.aws_iam_policy_document.environment_logs["staging"].json]
    }
    staging_secrets = {
      name         = "wgi-staging-secrets"
      env          = "staging"
      description  = "Encrypts staging and preview secrets in Secrets Manager"
      via_services = ["secretsmanager.${local.region}.amazonaws.com"]
      policies     = []
    }
    production_data = {
      name         = "wgi-production-data"
      env          = "production"
      description  = "Encrypts production databases, buckets and application logs (patient data)"
      via_services = ["rds.${local.region}.amazonaws.com", "s3.${local.region}.amazonaws.com"]
      policies     = [data.aws_iam_policy_document.environment_logs["production"].json]
    }
    production_secrets = {
      name         = "wgi-production-secrets"
      env          = "production"
      description  = "Encrypts production secrets in Secrets Manager"
      via_services = ["secretsmanager.${local.region}.amazonaws.com"]
      policies     = []
    }
  }
}

module "kms" {
  source   = "../modules/kms-key"
  for_each = local.keys

  name             = each.value.name
  description      = each.value.description
  via_services     = each.value.via_services
  policy_documents = each.value.policies
  tags             = { env = each.value.env }
}

# CloudTrail, CloudWatch Logs, AWS Config and VPC flow log delivery write audit
# records as service principals, each limited to this account's resources.
data "aws_iam_policy_document" "audit_key" {
  statement {
    sid       = "CloudTrailEncryptLogs"
    actions   = ["kms:GenerateDataKey*"]
    resources = ["*"]

    principals {
      type        = "Service"
      identifiers = ["cloudtrail.amazonaws.com"]
    }

    condition {
      test     = "StringEquals"
      variable = "aws:SourceArn"
      values   = [local.trail_arn]
    }

    condition {
      test     = "StringLike"
      variable = "kms:EncryptionContext:aws:cloudtrail:arn"
      values   = ["arn:${local.partition}:cloudtrail:*:${local.account_id}:trail/*"]
    }
  }

  statement {
    sid       = "CloudTrailDescribeKey"
    actions   = ["kms:DescribeKey"]
    resources = ["*"]

    principals {
      type        = "Service"
      identifiers = ["cloudtrail.amazonaws.com"]
    }

    condition {
      test     = "StringEquals"
      variable = "aws:SourceArn"
      values   = [local.trail_arn]
    }
  }

  statement {
    sid = "CloudWatchLogsAuditGroups"
    actions = [
      "kms:Decrypt*",
      "kms:Describe*",
      "kms:Encrypt*",
      "kms:GenerateDataKey*",
      "kms:ReEncrypt*",
    ]
    resources = ["*"]

    principals {
      type        = "Service"
      identifiers = ["logs.${local.region}.amazonaws.com"]
    }

    condition {
      test     = "ArnLike"
      variable = "kms:EncryptionContext:aws:logs:arn"
      values   = ["arn:${local.partition}:logs:${local.region}:${local.account_id}:log-group:/wgi/audit/*"]
    }
  }

  statement {
    sid       = "ConfigDelivery"
    actions   = ["kms:Decrypt", "kms:GenerateDataKey"]
    resources = ["*"]

    principals {
      type        = "Service"
      identifiers = ["config.amazonaws.com"]
    }

    condition {
      test     = "StringEquals"
      variable = "aws:SourceAccount"
      values   = [local.account_id]
    }
  }

  statement {
    sid = "VpcFlowLogDelivery"
    actions = [
      "kms:Decrypt",
      "kms:DescribeKey",
      "kms:Encrypt",
      "kms:GenerateDataKey*",
      "kms:ReEncrypt*",
    ]
    resources = ["*"]

    principals {
      type        = "Service"
      identifiers = ["delivery.logs.amazonaws.com"]
    }

    condition {
      test     = "StringEquals"
      variable = "aws:SourceAccount"
      values   = [local.account_id]
    }

    condition {
      test     = "ArnLike"
      variable = "aws:SourceArn"
      values   = ["arn:${local.partition}:logs:${local.region}:${local.account_id}:*"]
    }
  }
}

# CloudWatch alarms, EventBridge rules and AWS Budgets publish to the encrypted
# topic. SNS binds every data key to the topic ARN, so each service can use the
# key for wgi-alerts and nothing else.
data "aws_iam_policy_document" "alerts_key" {
  statement {
    sid       = "AlertPublishers"
    actions   = ["kms:Decrypt", "kms:GenerateDataKey*"]
    resources = ["*"]

    principals {
      type = "Service"
      identifiers = [
        "budgets.amazonaws.com",
        "cloudwatch.amazonaws.com",
        "events.amazonaws.com",
      ]
    }

    condition {
      test     = "StringEquals"
      variable = "kms:EncryptionContext:aws:sns:topicArn"
      values   = [local.alerts_topic_arn]
    }
  }
}

# Application and database log groups for one environment.
data "aws_iam_policy_document" "environment_logs" {
  for_each = local.environment_log_groups

  statement {
    sid = "CloudWatchLogs${title(each.key)}Groups"
    actions = [
      "kms:Decrypt*",
      "kms:Describe*",
      "kms:Encrypt*",
      "kms:GenerateDataKey*",
      "kms:ReEncrypt*",
    ]
    resources = ["*"]

    principals {
      type        = "Service"
      identifiers = ["logs.${local.region}.amazonaws.com"]
    }

    condition {
      test     = "ArnLike"
      variable = "kms:EncryptionContext:aws:logs:arn"
      values   = each.value
    }
  }
}
