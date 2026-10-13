# The audit bucket receives CloudTrail, AWS Config and VPC flow log records.
# Only those three services may write, each only under its own prefix and only
# for this account's resources. No principal may delete a record version; the
# lifecycle rules below are the only way records leave the bucket.

locals {
  audit_bucket_arn = "arn:${local.partition}:s3:::${local.audit_bucket_name}"
}

data "aws_iam_policy_document" "audit_bucket" {
  statement {
    sid       = "CloudTrailAclCheck"
    actions   = ["s3:GetBucketAcl"]
    resources = [local.audit_bucket_arn]

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
    sid       = "CloudTrailWrite"
    actions   = ["s3:PutObject"]
    resources = ["${local.audit_bucket_arn}/cloudtrail/AWSLogs/${local.account_id}/*"]

    principals {
      type        = "Service"
      identifiers = ["cloudtrail.amazonaws.com"]
    }

    condition {
      test     = "StringEquals"
      variable = "s3:x-amz-acl"
      values   = ["bucket-owner-full-control"]
    }

    condition {
      test     = "StringEquals"
      variable = "aws:SourceArn"
      values   = [local.trail_arn]
    }
  }

  statement {
    sid       = "ConfigBucketCheck"
    actions   = ["s3:GetBucketAcl", "s3:ListBucket"]
    resources = [local.audit_bucket_arn]

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
    sid       = "ConfigWrite"
    actions   = ["s3:PutObject"]
    resources = ["${local.audit_bucket_arn}/config/AWSLogs/${local.account_id}/Config/*"]

    principals {
      type        = "Service"
      identifiers = ["config.amazonaws.com"]
    }

    condition {
      test     = "StringEquals"
      variable = "s3:x-amz-acl"
      values   = ["bucket-owner-full-control"]
    }

    condition {
      test     = "StringEquals"
      variable = "aws:SourceAccount"
      values   = [local.account_id]
    }
  }

  statement {
    sid       = "FlowLogsBucketCheck"
    actions   = ["s3:GetBucketAcl", "s3:ListBucket"]
    resources = [local.audit_bucket_arn]

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

  statement {
    sid       = "FlowLogsWrite"
    actions   = ["s3:PutObject"]
    resources = ["${local.audit_bucket_arn}/vpc-flow-logs/AWSLogs/${local.account_id}/*"]

    principals {
      type        = "Service"
      identifiers = ["delivery.logs.amazonaws.com"]
    }

    condition {
      test     = "StringEquals"
      variable = "s3:x-amz-acl"
      values   = ["bucket-owner-full-control"]
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

  statement {
    sid       = "DenyRecordDeletion"
    effect    = "Deny"
    actions   = ["s3:DeleteObject", "s3:DeleteObjectVersion"]
    resources = ["${local.audit_bucket_arn}/*"]

    principals {
      type        = "*"
      identifiers = ["*"]
    }
  }
}

module "audit_bucket" {
  source = "../modules/s3-bucket"

  name             = local.audit_bucket_name
  bucket_namespace = "account-regional"
  kms_key_arn      = module.kms["audit"].arn
  policy_documents = [data.aws_iam_policy_document.audit_bucket.json]
}

# HIPAA asks covered entities to keep required documentation for six years
# (45 CFR 164.316(b)(2)); the audit trail and configuration history are kept
# that long. Flow logs are operational and kept one year. Storage stays in S3
# Standard: at this volume a transition costs more in requests than it saves.
resource "aws_s3_bucket_lifecycle_configuration" "audit" {
  bucket = module.audit_bucket.id

  rule {
    id     = "abort-incomplete-uploads"
    status = "Enabled"

    filter {}

    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }
  }

  rule {
    id     = "cloudtrail-six-years"
    status = "Enabled"

    filter {
      prefix = "cloudtrail/"
    }

    expiration {
      days = 2190
    }

    noncurrent_version_expiration {
      noncurrent_days = 30
    }
  }

  rule {
    id     = "config-six-years"
    status = "Enabled"

    filter {
      prefix = "config/"
    }

    expiration {
      days = 2190
    }

    noncurrent_version_expiration {
      noncurrent_days = 30
    }
  }

  rule {
    id     = "vpc-flow-logs-one-year"
    status = "Enabled"

    filter {
      prefix = "vpc-flow-logs/"
    }

    expiration {
      days = 365
    }

    noncurrent_version_expiration {
      noncurrent_days = 30
    }
  }
}
