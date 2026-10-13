# One multi-Region trail records every management event in the account, plus
# object-level reads and writes on the Terraform state bucket and object-level
# reads of the audit bucket. Log file validation lets an auditor prove that no
# delivered file was altered. The trail also streams to CloudWatch Logs so the
# metric filters below can raise alarms within minutes.

resource "aws_cloudwatch_log_group" "cloudtrail" {
  name              = local.cloudtrail_log_group_name
  retention_in_days = 365
  kms_key_id        = module.kms["audit"].arn
}

data "aws_iam_policy_document" "cloudtrail_logs_trust" {
  statement {
    actions = ["sts:AssumeRole"]

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
}

data "aws_iam_policy_document" "cloudtrail_logs" {
  statement {
    actions   = ["logs:CreateLogStream", "logs:PutLogEvents"]
    resources = ["${aws_cloudwatch_log_group.cloudtrail.arn}:log-stream:*"]
  }
}

resource "aws_iam_role" "cloudtrail_logs" {
  name               = "wgi-cloudtrail-logs"
  description        = "Lets the account trail write to its CloudWatch Logs group"
  assume_role_policy = data.aws_iam_policy_document.cloudtrail_logs_trust.json
}

resource "aws_iam_role_policy" "cloudtrail_logs" {
  name   = "wgi-cloudtrail-logs"
  role   = aws_iam_role.cloudtrail_logs.id
  policy = data.aws_iam_policy_document.cloudtrail_logs.json
}

resource "aws_cloudtrail" "account" {
  # checkov:skip=CKV_AWS_252: alarms come from the CloudWatch Logs metric filters below
  name                          = local.trail_name
  s3_bucket_name                = module.audit_bucket.id
  s3_key_prefix                 = "cloudtrail"
  kms_key_id                    = module.kms["audit"].arn
  is_multi_region_trail         = true
  include_global_service_events = true
  enable_log_file_validation    = true
  cloud_watch_logs_group_arn    = "${aws_cloudwatch_log_group.cloudtrail.arn}:*"
  cloud_watch_logs_role_arn     = aws_iam_role.cloudtrail_logs.arn

  advanced_event_selector {
    name = "Management events"

    field_selector {
      field  = "eventCategory"
      equals = ["Management"]
    }
  }

  advanced_event_selector {
    name = "Terraform state object access"

    field_selector {
      field  = "eventCategory"
      equals = ["Data"]
    }

    field_selector {
      field  = "resources.type"
      equals = ["AWS::S3::Object"]
    }

    field_selector {
      field       = "resources.ARN"
      starts_with = ["${local.state_bucket_arn}/"]
    }
  }

  # Who read the audit records. Reads only: every write to this bucket is a
  # service delivery, including this trail's own, and logging those would feed
  # the trail its own output. Deletes are denied by the bucket policy.
  advanced_event_selector {
    name = "Audit record reads"

    field_selector {
      field  = "eventCategory"
      equals = ["Data"]
    }

    field_selector {
      field  = "resources.type"
      equals = ["AWS::S3::Object"]
    }

    field_selector {
      field  = "readOnly"
      equals = ["true"]
    }

    field_selector {
      field       = "resources.ARN"
      starts_with = ["${module.audit_bucket.arn}/"]
    }
  }

  depends_on = [module.audit_bucket]
}

# Security alarms on the trail's log group. Each pattern is one that should
# never happen in normal operation; a single match pages the alerts topic.
locals {
  security_alarms = {
    root-account-usage = {
      description = "The account root user made an API call"
      pattern     = "{ $.userIdentity.type = \"Root\" && $.userIdentity.invokedBy NOT EXISTS && $.eventType != \"AwsServiceEvent\" }"
    }
    cloudtrail-changed = {
      description = "A trail was stopped, deleted or changed"
      pattern     = "{ ($.eventSource = \"cloudtrail.amazonaws.com\") && (($.eventName = \"StopLogging\") || ($.eventName = \"DeleteTrail\") || ($.eventName = \"UpdateTrail\") || ($.eventName = \"PutEventSelectors\")) }"
    }
    kms-key-disabled-or-deleted = {
      description = "A KMS key was disabled or scheduled for deletion"
      pattern     = "{ ($.eventSource = \"kms.amazonaws.com\") && (($.eventName = \"DisableKey\") || ($.eventName = \"ScheduleKeyDeletion\")) }"
    }
    iam-user-or-access-key-created = {
      description = "An IAM user, access key or console password was created; this account uses none"
      pattern     = "{ ($.eventSource = \"iam.amazonaws.com\") && (($.eventName = \"CreateUser\") || ($.eventName = \"CreateAccessKey\") || ($.eventName = \"CreateLoginProfile\")) }"
    }
    # Both policies hold a deny that only a policy change can lift: production
    # state writes on the state bucket, record deletion on the audit bucket.
    protected-bucket-policy-changed = {
      description = "The Terraform state or audit bucket policy was changed (the break-glass path for production state and audit records)"
      pattern     = "{ ($.eventSource = \"s3.amazonaws.com\") && (($.eventName = \"PutBucketPolicy\") || ($.eventName = \"DeleteBucketPolicy\")) && (($.requestParameters.bucketName = \"${var.state_bucket_name}\") || ($.requestParameters.bucketName = \"${local.audit_bucket_name}\")) }"
    }
  }
}

resource "aws_cloudwatch_log_metric_filter" "security" {
  for_each = local.security_alarms

  name           = "wgi-${each.key}"
  log_group_name = aws_cloudwatch_log_group.cloudtrail.name
  pattern        = each.value.pattern

  metric_transformation {
    name          = each.key
    namespace     = "WGI/Security"
    value         = "1"
    default_value = "0"
  }
}

resource "aws_cloudwatch_metric_alarm" "security" {
  for_each = local.security_alarms

  alarm_name          = "wgi-${each.key}"
  alarm_description   = each.value.description
  namespace           = "WGI/Security"
  metric_name         = each.key
  statistic           = "Sum"
  period              = 300
  evaluation_periods  = 1
  threshold           = 1
  comparison_operator = "GreaterThanOrEqualToThreshold"
  treat_missing_data  = "notBreaching"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  depends_on = [aws_cloudwatch_log_metric_filter.security]
}
