# Account-wide guardrails. The S3 public-access block is account-wide; the rest
# are Regional and run in every Region the account may use.

resource "aws_s3_account_public_access_block" "account" {
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# New EBS volumes (and the snapshots made from them) are encrypted with the
# AWS managed aws/ebs key. Fargate tasks do not use EBS, so no CMK is needed.
resource "aws_ebs_encryption_by_default" "account" {
  for_each = local.baseline_regions

  region  = each.key
  enabled = true
}

resource "aws_guardduty_detector" "account" {
  # checkov:skip=CKV2_AWS_3: one workload account; Organization-wide delegation is a management-account step
  for_each = local.baseline_regions

  region                       = each.key
  enable                       = true
  finding_publishing_frequency = "FIFTEEN_MINUTES"
}

# Protection plans, set explicitly so a plan shows what is billed.
# Enabled: S3 data events, RDS login events and Lambda network activity, which
# cover the resources the app will run on and cost nothing while idle.
# Disabled: EKS (not used); EBS malware scans (Fargate has no EBS volumes);
# Runtime Monitoring, whose ECS agent creates VPC endpoints and security groups
# outside Terraform. The environment roots decide on Runtime Monitoring.
locals {
  guardduty_features = {
    S3_DATA_EVENTS         = "ENABLED"
    RDS_LOGIN_EVENTS       = "ENABLED"
    LAMBDA_NETWORK_LOGS    = "ENABLED"
    EKS_AUDIT_LOGS         = "DISABLED"
    EBS_MALWARE_PROTECTION = "DISABLED"
    RUNTIME_MONITORING     = "DISABLED"
  }

  guardduty_region_features = {
    for pair in setproduct(local.baseline_regions, keys(local.guardduty_features)) :
    "${pair[0]}/${pair[1]}" => {
      region  = pair[0]
      feature = pair[1]
      status  = local.guardduty_features[pair[1]]
    }
  }
}

resource "aws_guardduty_detector_feature" "account" {
  for_each = local.guardduty_region_features

  region      = each.value.region
  detector_id = aws_guardduty_detector.account[each.value.region].id
  name        = each.value.feature
  status      = each.value.status
}

# IAM Access Analyzer reports any resource in the Region that is shared outside
# the account: a public bucket, a key or role trusted by another account.
resource "aws_accessanalyzer_analyzer" "account" {
  for_each = local.baseline_regions

  region        = each.key
  analyzer_name = "wgi-account-${each.key}"
  type          = "ACCOUNT"
}

# Findings are Regional events. us-east-1 forwards its GuardDuty and Access
# Analyzer events to the us-east-2 default bus, where alerts.tf routes them.
data "aws_iam_policy_document" "event_forwarding_trust" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["events.amazonaws.com"]
    }

    condition {
      test     = "StringEquals"
      variable = "aws:SourceAccount"
      values   = [local.account_id]
    }
  }
}

data "aws_iam_policy_document" "event_forwarding" {
  statement {
    actions   = ["events:PutEvents"]
    resources = ["arn:${local.partition}:events:${local.region}:${local.account_id}:event-bus/default"]
  }
}

resource "aws_iam_role" "event_forwarding" {
  name               = "wgi-security-event-forwarding"
  description        = "Lets EventBridge in us-east-1 forward security findings to us-east-2"
  assume_role_policy = data.aws_iam_policy_document.event_forwarding_trust.json
}

resource "aws_iam_role_policy" "event_forwarding" {
  name   = "wgi-security-event-forwarding"
  role   = aws_iam_role.event_forwarding.id
  policy = data.aws_iam_policy_document.event_forwarding.json
}

resource "aws_cloudwatch_event_rule" "forward_security_findings" {
  region      = "us-east-1"
  name        = "wgi-forward-security-findings"
  description = "Forwards GuardDuty and Access Analyzer findings to us-east-2"

  event_pattern = jsonencode({
    source = ["aws.guardduty", "aws.access-analyzer"]
  })
}

resource "aws_cloudwatch_event_target" "forward_security_findings" {
  region    = "us-east-1"
  rule      = aws_cloudwatch_event_rule.forward_security_findings.name
  target_id = "us-east-2-default-bus"
  arn       = "arn:${local.partition}:events:${local.region}:${local.account_id}:event-bus/default"
  role_arn  = aws_iam_role.event_forwarding.arn
}
