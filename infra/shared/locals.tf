locals {
  region     = "us-east-2"
  account_id = data.aws_caller_identity.current.account_id
  partition  = data.aws_partition.current.partition

  # Regions the account may use (the Organization's Region policy allows
  # us-east-1 and us-east-2; us-west-2 is Bedrock only). Regional detectors run
  # in both; the multi-Region trail covers every Region regardless.
  baseline_regions = toset(["us-east-2", "us-east-1"])

  # Names and ARNs that policies need before the resources exist. Building them
  # as strings breaks the cycles between keys, topics, trails and buckets.
  trail_name                = "wgi-account-trail"
  trail_arn                 = "arn:${local.partition}:cloudtrail:${local.region}:${local.account_id}:trail/${local.trail_name}"
  cloudtrail_log_group_name = "/wgi/audit/cloudtrail"
  audit_bucket_name         = "wgi-audit-${local.account_id}-${local.region}-an"
  alerts_topic_name         = "wgi-alerts"
  alerts_topic_arn          = "arn:${local.partition}:sns:${local.region}:${local.account_id}:${local.alerts_topic_name}"
  state_bucket_arn          = "arn:${local.partition}:s3:::${var.state_bucket_name}"
  ecr_repository_name       = "westchase-gi"
  github_subject_prefix     = "repo:${var.github_repository}"
}
