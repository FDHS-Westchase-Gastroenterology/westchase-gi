# One encrypted topic carries every alert: security alarms, GuardDuty and
# Access Analyzer findings, and budget warnings. Environment roots publish
# their own alarms here too.

resource "aws_sns_topic" "alerts" {
  name              = local.alerts_topic_name
  kms_master_key_id = module.kms["alerts"].arn
}

locals {
  alert_rule_arns = [
    "arn:${local.partition}:events:${local.region}:${local.account_id}:rule/wgi-guardduty-findings",
    "arn:${local.partition}:events:${local.region}:${local.account_id}:rule/wgi-access-analyzer-findings",
  ]
}

data "aws_iam_policy_document" "alerts_topic" {
  statement {
    sid = "AccountManagesTopic"
    actions = [
      "sns:GetTopicAttributes",
      "sns:ListSubscriptionsByTopic",
      "sns:Publish",
      "sns:SetTopicAttributes",
      "sns:Subscribe",
    ]
    resources = [local.alerts_topic_arn]

    principals {
      type        = "AWS"
      identifiers = ["arn:${local.partition}:iam::${local.account_id}:root"]
    }
  }

  statement {
    sid       = "CloudWatchAlarms"
    actions   = ["sns:Publish"]
    resources = [local.alerts_topic_arn]

    principals {
      type        = "Service"
      identifiers = ["cloudwatch.amazonaws.com"]
    }

    condition {
      test     = "ArnLike"
      variable = "aws:SourceArn"
      values   = ["arn:${local.partition}:cloudwatch:${local.region}:${local.account_id}:alarm:*"]
    }
  }

  statement {
    sid       = "EventBridgeRules"
    actions   = ["sns:Publish"]
    resources = [local.alerts_topic_arn]

    principals {
      type        = "Service"
      identifiers = ["events.amazonaws.com"]
    }

    condition {
      test     = "ArnEquals"
      variable = "aws:SourceArn"
      values   = local.alert_rule_arns
    }
  }

  statement {
    sid       = "Budgets"
    actions   = ["sns:Publish"]
    resources = [local.alerts_topic_arn]

    principals {
      type        = "Service"
      identifiers = ["budgets.amazonaws.com"]
    }

    condition {
      test     = "StringEquals"
      variable = "aws:SourceAccount"
      values   = [local.account_id]
    }
  }

  statement {
    sid       = "DenyInsecureTransport"
    effect    = "Deny"
    actions   = ["sns:Publish"]
    resources = [local.alerts_topic_arn]

    principals {
      type        = "*"
      identifiers = ["*"]
    }

    condition {
      test     = "Bool"
      variable = "aws:SecureTransport"
      values   = ["false"]
    }
  }
}

resource "aws_sns_topic_policy" "alerts" {
  arn    = aws_sns_topic.alerts.arn
  policy = data.aws_iam_policy_document.alerts_topic.json
}

# AWS emails a confirmation link to this address. No alert is delivered until
# someone clicks it; see infra/README.md.
resource "aws_sns_topic_subscription" "alerts_email" {
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "email"
  endpoint  = var.alarm_email
}

resource "aws_cloudwatch_event_rule" "guardduty_findings" {
  name        = "wgi-guardduty-findings"
  description = "GuardDuty findings at or above the configured severity, from every baseline Region"

  event_pattern = jsonencode({
    source        = ["aws.guardduty"]
    "detail-type" = ["GuardDuty Finding"]
    detail = {
      severity = [{ numeric = [">=", var.guardduty_alert_min_severity] }]
    }
  })
}

# The email names the finding instead of carrying its full JSON: what fired,
# how severe, where, on which resource, when, and the ID to look it up or
# archive it by. The JSON stays in GuardDuty, behind the console link. A finding
# fills only the resource path for its own resource type; EventBridge leaves a
# path the event lacks out of the output. Nothing here carries the account ID.
resource "aws_cloudwatch_event_target" "guardduty_findings" {
  rule      = aws_cloudwatch_event_rule.guardduty_findings.name
  target_id = "wgi-alerts"
  arn       = aws_sns_topic.alerts.arn

  input_transformer {
    input_paths = {
      type         = "$.detail.type"
      title        = "$.detail.title"
      severity     = "$.detail.severity"
      region       = "$.detail.region"
      resourceType = "$.detail.resource.resourceType"
      instance     = "$.detail.resource.instanceDetails.instanceId"
      accessKey    = "$.detail.resource.accessKeyDetails.userName"
      bucket       = "$.detail.resource.s3BucketDetails[0].name"
      database     = "$.detail.resource.rdsDbInstanceDetails.dbInstanceIdentifier"
      ecsCluster   = "$.detail.resource.ecsClusterDetails.name"
      function     = "$.detail.resource.lambdaDetails.functionName"
      firstSeen    = "$.detail.service.eventFirstSeen"
      lastSeen     = "$.detail.service.eventLastSeen"
      count        = "$.detail.service.count"
      findingId    = "$.detail.id"
    }
    input_template = <<-EOT
      "GuardDuty finding, severity <severity>: <title>"
      ""
      "Type: <type>"
      "Severity: <severity>"
      "Region: <region>"
      "Resource type: <resourceType>"
      "Resource: <instance><accessKey><bucket><database><ecsCluster><function>"
      "First seen: <firstSeen>"
      "Last seen: <lastSeen> (<count> occurrences)"
      "Finding ID: <findingId>"
      ""
      "https://<region>.console.aws.amazon.com/guardduty/home?region=<region>#/findings?macros=current&fId=<findingId>"
    EOT
  }
}

resource "aws_cloudwatch_event_rule" "access_analyzer_findings" {
  name        = "wgi-access-analyzer-findings"
  description = "New active IAM Access Analyzer findings, from every baseline Region"

  event_pattern = jsonencode({
    source        = ["aws.access-analyzer"]
    "detail-type" = ["Access Analyzer Finding"]
    detail = {
      status = ["ACTIVE"]
    }
  })
}

resource "aws_cloudwatch_event_target" "access_analyzer_findings" {
  rule      = aws_cloudwatch_event_rule.access_analyzer_findings.name
  target_id = "wgi-alerts"
  arn       = aws_sns_topic.alerts.arn
}

resource "aws_budgets_budget" "monthly" {
  name         = "wgi-monthly-cost"
  budget_type  = "COST"
  limit_amount = tostring(var.monthly_budget_usd)
  limit_unit   = "USD"
  time_unit    = "MONTHLY"

  cost_types {
    include_credit = false
    include_refund = false
  }

  notification {
    comparison_operator       = "GREATER_THAN"
    threshold                 = 80
    threshold_type            = "PERCENTAGE"
    notification_type         = "ACTUAL"
    subscriber_sns_topic_arns = [aws_sns_topic.alerts.arn]
  }

  notification {
    comparison_operator       = "GREATER_THAN"
    threshold                 = 100
    threshold_type            = "PERCENTAGE"
    notification_type         = "FORECASTED"
    subscriber_sns_topic_arns = [aws_sns_topic.alerts.arn]
  }

  depends_on = [aws_sns_topic_policy.alerts]
}
